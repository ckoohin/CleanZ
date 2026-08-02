import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { UserRole } from 'src/common/enums/user-role.enum';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';
import { TicketSource } from 'src/common/enums/ticket-source.enum';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketMessageEntity } from '../entity/ticket-message.entity';
import { TicketStatusLogEntity } from '../entity/ticket-status-log.entity';
import { TicketResolutionEntity } from '../entity/ticket-resolution.entity';
import { TicketAttachmentEntity } from '../entity/ticket-attachment.entity';
import { TicketSurveyEntity } from '../entity/ticket-survey.entity';
import { UploadService } from 'src/modules/upload/upload.service';
import { AdminQueryTicketDto } from '../dto/admin-query-ticket.dto';
import { ChangeStatusDto } from '../dto/change-status.dto';
import { AssignTicketDto, BulkAssignTicketDto } from '../dto/assign-ticket.dto';
import { ReclassifyTicketDto } from '../dto/reclassify-ticket.dto';
import { CreateTicketAdminDto } from '../dto/create-ticket-admin.dto';
import {
  AdminMessage,
  AdminMessagePage,
  InternalNoteView,
  PaginatedTickets,
  TicketAdminView,
  toAdminMessages,
  toAdminView,
  toAdminTicketSummary,
  senderRoleOf,
} from '../dto/ticket-response.dto';
import { MessageCryptoService } from './message-crypto.service';
import { MESSAGE_PAGE_SIZE } from '../support-ticket.constants';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { TicketRealtimeService } from '../realtime/ticket-realtime.service';
import { MarkReadAdminDto } from '../dto/mark-read.dto';
import { CreateAdminMessageDto } from '../dto/create-message.dto';
import { TicketService } from './ticket.service';
import { TicketSlaService } from './ticket-sla.service';
import { TicketConfigService } from './ticket-config.service';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';

const TRANSITIONS: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  [SupportTicketStatus.NEW]: [SupportTicketStatus.IN_PROGRESS],
  [SupportTicketStatus.IN_PROGRESS]: [
    SupportTicketStatus.PENDING,
    SupportTicketStatus.RESOLVED,
  ],
  [SupportTicketStatus.PENDING]: [SupportTicketStatus.IN_PROGRESS],
  [SupportTicketStatus.RESOLVED]: [
    SupportTicketStatus.CLOSED,
    SupportTicketStatus.IN_PROGRESS,
  ],
  // Mở lại ticket đã đóng — có giới hạn thời gian (TICKET_REOPEN_WINDOW_DAYS).
  // Trước đây `CLOSED` là ngõ cụt: sau auto-close 48h, khách không chat được,
  // không mở lại được, chỉ còn cách tạo ticket mới và mất toàn bộ ngữ cảnh.
  [SupportTicketStatus.CLOSED]: [SupportTicketStatus.IN_PROGRESS],
};

@Injectable()
export class TicketAdminService {
  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(TicketMessageEntity)
    private readonly messageRepo: Repository<TicketMessageEntity>,
    @InjectRepository(TicketStatusLogEntity)
    private readonly statusLogRepo: Repository<TicketStatusLogEntity>,
    @InjectRepository(TicketResolutionEntity)
    private readonly resolutionRepo: Repository<TicketResolutionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(TicketAttachmentEntity)
    private readonly attachmentRepo: Repository<TicketAttachmentEntity>,
    @InjectRepository(TicketSurveyEntity)
    private readonly surveyRepo: Repository<TicketSurveyEntity>,
    private readonly ticketService: TicketService,
    private readonly sla: TicketSlaService,
    private readonly notification: NotificationService,
    private readonly uploadService: UploadService,
    private readonly realtime: TicketRealtimeService,
    private readonly crypto: MessageCryptoService,
    private readonly config: TicketConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Chặn hai admin cùng thao tác trên một ticket.
   *
   * Cho phép khi ticket CHƯA GÁN (ai xử lý trước thì thành người phụ trách —
   * xem {@link claimIfUnassigned}) hoặc đang thuộc về chính người đang thao tác.
   * KHÔNG áp cho `assign`, vì bàn giao ticket là thao tác hợp lệ của người khác.
   */
  private assertCanAct(
    ticket: SupportTicketEntity,
    actingAdminId: string,
  ): void {
    const owner = ticket.assignedAdmin?.id;
    if (owner && owner !== actingAdminId) {
      throw new UnprocessableEntityException(
        `Ticket đang do ${ticket.assignedAdmin?.fullName ?? 'admin khác'} phụ trách. Hãy gán lại cho bạn trước khi xử lý.`,
      );
    }
  }

  /**
   * Ticket chưa có người phụ trách → người thao tác đầu tiên tự nhận.
   * Trả về `true` nếu vừa nhận (để nơi gọi ghi vết). Mutate tại chỗ, chưa lưu.
   */
  private claimIfUnassigned(
    ticket: SupportTicketEntity,
    actingAdminId: string,
  ): boolean {
    if (ticket.assignedAdmin?.id) return false;
    ticket.assignedAdmin = { id: actingAdminId } as UserEntity;
    return true;
  }

  /**
   * Ghi vết thao tác quản trị vào luồng INTERNAL — hiển thị ở panel "Ghi chú
   * nội bộ" dạng timeline. `assign`/`reclassify` trước đây chỉ `save()` rồi
   * thôi: không ai biết ai đã đổi phân loại hay bàn giao cho ai, trong khi
   * phân loại lại chính là cửa bắt buộc trước khi RESOLVED.
   */
  private async audit(
    ticketId: string,
    actingAdminId: string,
    body: string,
  ): Promise<void> {
    await this.messageRepo.save(
      this.messageRepo.create({
        ticket: { id: ticketId },
        sender: { id: actingAdminId },
        body: this.crypto.encrypt(`[Hệ thống] ${body}`),
        isInternal: true,
        audience: TicketMessageAudience.INTERNAL,
      }),
    );
  }

  private notify(
    userId: string | undefined | null,
    ticketId: string,
    title: string,
    content: string,
    dedupeKey: string,
  ): void {
    if (!userId) return;
    void this.notification
      .notify({
        userId,
        type: NotificationType.SUPPORT_REPLY,
        title,
        content,
        referenceType: NotificationRefType.SUPPORT_TICKET,
        referenceId: ticketId,
        dedupeKey,
      })
      .catch(() => undefined);
  }

  async list(
    query: AdminQueryTicketDto,
    actingAdminId: string,
  ): Promise<PaginatedTickets> {
    return asyncHandleOperation(async () => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;
      const qb = this.ticketRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.booking', 'b')
        .leftJoinAndSelect('t.assignedAdmin', 'aa')
        .leftJoinAndSelect('t.reporter', 'rp')
        .skip((page - 1) * limit)
        .take(limit);

      if (query.status)
        qb.andWhere('t.status = :status', { status: query.status });
      if (query.priority)
        qb.andWhere('t.priority = :priority', { priority: query.priority });
      if (query.category)
        qb.andWhere('t.category = :category', { category: query.category });
      if (query.reporterUserId)
        qb.andWhere('t.reporter_user_id = :rid', { rid: query.reporterUserId });
      if (query.assignedAdminId)
        qb.andWhere('t.assigned_admin_id = :aid', {
          aid: query.assignedAdminId,
        });
      if (query.bookingId)
        qb.andWhere('t.booking_id = :bid', { bid: query.bookingId });
      if (query.slaBreached !== undefined)
        qb.andWhere('t.sla_breached = :sb', { sb: query.slaBreached });
      if (query.keyword)
        qb.andWhere('(t.ticket_code ILIKE :kw OR t.subject ILIKE :kw)', {
          kw: `%${query.keyword}%`,
        });

      // Sắp xếp: priority (URGENT→LOW), dueAt (gần hạn trước), mặc định createdAt DESC
      if (query.sort === 'priority') {
        qb.orderBy(
          `CASE t.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END`,
          'ASC',
        ).addOrderBy('t.createdAt', 'DESC');
      } else if (query.sort === 'dueAt') {
        qb.orderBy('t.resolutionDueAt', 'ASC', 'NULLS LAST');
      } else {
        qb.orderBy('t.createdAt', 'DESC');
      }

      const [rows, total] = await qb.getManyAndCount();
      const unread = await this.ticketService.unreadCountMap(
        actingAdminId,
        true,
        rows.map((r) => r.id),
      );
      return {
        data: rows.map((r) => ({
          ...toAdminTicketSummary(r),
          unreadCount: unread[r.id] ?? 0,
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }, 'Lỗi khi lấy hàng đợi ticket');
  }

  async findOne(id: string): Promise<TicketAdminView> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadOrFail(id);
      // Chỉ tải TRANG MỚI NHẤT của 2 luồng hội thoại (REPORTER + COUNTERPARTY) —
      // tránh kéo toàn bộ tin của ticket dài. INTERNAL nằm ở drawer ghi chú riêng.
      const [
        reporter,
        counterparty,
        logs,
        resolutions,
        ticketAttachments,
        survey,
      ] = await Promise.all([
        this.ticketService.loadMessagePage(id, TicketMessageAudience.REPORTER),
        this.ticketService.loadMessagePage(
          id,
          TicketMessageAudience.COUNTERPARTY,
        ),
        this.statusLogRepo.find({
          where: { ticket: { id } },
          relations: ['changedBy'],
          order: { createdAt: 'ASC' },
        }),
        this.resolutionRepo.find({
          where: { ticket: { id } },
          relations: ['proposedBy'],
          order: { createdAt: 'ASC' },
        }),
        this.attachmentRepo.find({
          where: { ticket: { id } },
          relations: ['message'],
          order: { createdAt: 'ASC' },
        }),
        this.surveyRepo.findOne({ where: { ticket: { id } } }),
      ]);

      const [reporterTotal, counterpartyTotal] = await Promise.all([
        this.messageRepo.count({
          where: { ticket: { id }, audience: TicketMessageAudience.REPORTER },
        }),
        this.messageRepo.count({
          where: {
            ticket: { id },
            audience: TicketMessageAudience.COUNTERPARTY,
          },
        }),
      ]);

      const messages = [...reporter.messages, ...counterparty.messages];
      // Gộp attachment 2 trang + attachment cấp ticket (lọc trùng theo id).
      const attachments = [
        ...reporter.attachments,
        ...counterparty.attachments,
        ...ticketAttachments,
      ].filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i);

      return toAdminView(
        ticket,
        messages,
        logs,
        resolutions,
        attachments,
        {
          REPORTER: { hasMore: reporter.hasMore, total: reporterTotal },
          COUNTERPARTY: {
            hasMore: counterparty.hasMore,
            total: counterpartyTotal,
          },
        },
        survey
          ? {
              rating: survey.rating ?? null,
              comment: survey.comment ?? null,
              submittedAt: survey.submittedAt ?? null,
            }
          : null,
      );
    }, 'Lỗi khi lấy chi tiết ticket');
  }

  /** "Tải tin cũ hơn" cho admin theo 1 luồng (REPORTER/COUNTERPARTY). */
  async getMessagePage(
    id: string,
    audience: TicketMessageAudience,
    beforeId?: string,
    limit = MESSAGE_PAGE_SIZE,
  ): Promise<AdminMessagePage> {
    return asyncHandleOperation(async () => {
      await this.loadOrFail(id);
      const { messages, attachments, hasMore } =
        await this.ticketService.loadMessagePage(id, audience, beforeId, limit);
      return { messages: toAdminMessages(messages, attachments), hasMore };
    }, 'Lỗi khi tải tin nhắn');
  }

  async assign(
    id: string,
    dto: AssignTicketDto,
    actingAdminId: string,
  ): Promise<TicketAdminView> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadOrFail(id);
      const targetId = dto.assignedAdminId ?? actingAdminId;
      const admin = await this.userRepo.findOne({ where: { id: targetId } });
      if (!admin || admin.role !== UserRole.ADMIN) {
        throw new UnprocessableEntityException('Người được gán phải là ADMIN');
      }
      const previous = ticket.assignedAdmin;
      if (previous?.id === targetId) return this.findOne(id);

      ticket.assignedAdmin = { id: targetId } as UserEntity;
      await this.ticketRepo.save(ticket);

      await this.audit(
        id,
        actingAdminId,
        previous?.id
          ? `Bàn giao phụ trách: ${previous.fullName ?? previous.id} → ${admin.fullName}`
          : `Nhận phụ trách: ${admin.fullName}`,
      );
      // Người được gán cần biết mình vừa nhận việc (trừ khi tự nhận).
      if (targetId !== actingAdminId) {
        this.notify(
          targetId,
          id,
          'Bạn được gán xử lý một ticket',
          `Ticket ${ticket.ticketCode ?? id} đã được chuyển cho bạn.`,
          `ticket-${id}-ASSIGN-${targetId}`,
        );
      }
      return this.findOne(id);
    }, 'Lỗi khi gán ticket');
  }

  /**
   * Gán hàng loạt. Bỏ qua (không lỗi) những ticket đã thuộc người khác — thao
   * tác hàng loạt nên "làm được gì làm nấy" rồi báo cáo, thay vì hỏng cả lô chỉ
   * vì một dòng vướng. Trả về số đã gán và danh sách bị bỏ qua để FE nói rõ.
   */
  async bulkAssign(
    dto: BulkAssignTicketDto,
    actingAdminId: string,
  ): Promise<{ assigned: number; skipped: string[] }> {
    return asyncHandleOperation(async () => {
      const targetId = dto.assignedAdminId ?? actingAdminId;
      const admin = await this.userRepo.findOne({ where: { id: targetId } });
      if (!admin || admin.role !== UserRole.ADMIN) {
        throw new UnprocessableEntityException('Người được gán phải là ADMIN');
      }

      const tickets = await this.ticketRepo.find({
        where: { id: In(dto.ticketIds) },
        relations: ['assignedAdmin'],
      });

      const skipped: string[] = [];
      let assigned = 0;
      for (const ticket of tickets) {
        const owner = ticket.assignedAdmin?.id;
        if (owner && owner !== actingAdminId && owner !== targetId) {
          skipped.push(ticket.ticketCode ?? ticket.id);
          continue;
        }
        if (owner === targetId) continue; // đã đúng người, không ghi vết thừa
        ticket.assignedAdmin = { id: targetId } as UserEntity;
        await this.ticketRepo.save(ticket);
        await this.audit(
          ticket.id,
          actingAdminId,
          `Gán hàng loạt: ${admin.fullName}`,
        );
        assigned += 1;
      }
      return { assigned, skipped };
    }, 'Lỗi khi gán hàng loạt');
  }

  async reclassify(
    id: string,
    dto: ReclassifyTicketDto,
    actingAdminId: string,
  ): Promise<TicketAdminView> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadOrFail(id);
      this.assertCanAct(ticket, actingAdminId);
      const claimed = this.claimIfUnassigned(ticket, actingAdminId);

      const oldCategory = ticket.category;
      const oldPriority = ticket.priority;

      ticket.category = dto.category;
      if (dto.subtype !== undefined) ticket.subtype = dto.subtype;
      if (dto.priority) {
        ticket.priority = dto.priority;
      } else if (dto.category !== oldCategory) {
        // Đổi phân loại mà không chỉ định ưu tiên → lấy mặc định của loại mới.
        // Giữ nguyên ưu tiên cũ sẽ sai hẳn: chuyển "Khác" (LOW) sang "Hư hỏng
        // tài sản" (URGENT) mà vẫn để LOW thì SLA không phản ánh mức nghiêm trọng.
        ticket.priority = await this.config.getDefaultPriority(dto.category);
      }

      // Ưu tiên đổi ⇒ cửa sổ SLA đổi ⇒ phải tính lại hạn, nếu không ticket vừa
      // nâng lên URGENT vẫn giữ hạn 24h của mức LOW.
      const priorityChanged = ticket.priority !== oldPriority;
      if (priorityChanged) {
        await this.sla.recomputeForPriority(ticket);
      }

      await this.ticketRepo.save(ticket);

      const parts = [
        `Phân loại: ${oldCategory} → ${ticket.category}`,
        priorityChanged
          ? `ưu tiên: ${oldPriority} → ${ticket.priority} (đã tính lại hạn SLA)`
          : null,
        claimed ? 'tự nhận phụ trách' : null,
      ].filter(Boolean);
      await this.audit(id, actingAdminId, parts.join('; '));

      return this.findOne(id);
    }, 'Lỗi khi phân loại lại ticket');
  }

  async changeStatus(
    id: string,
    dto: ChangeStatusDto,
    actingAdminId: string,
  ): Promise<TicketAdminView> {
    return asyncHandleOperation(async () => {
      // Hàng đợi job và thông báo KHÔNG rollback được, nên chỉ chạy SAU KHI
      // transaction commit. Trong transaction chỉ gom chúng lại.
      const effects: (() => Promise<void>)[] = [];

      const { ticket, from, to } = await this.dataSource.transaction(
        async (manager) => {
          const ticket = await this.lockTicket(manager, id);
          const from = ticket.status;
          const to = dto.status;

          if (!TRANSITIONS[from].includes(to)) {
            throw new UnprocessableEntityException(
              `Không thể chuyển trạng thái ${from} → ${to}`,
            );
          }
          this.assertCanAct(ticket, actingAdminId);
          const claimed = this.claimIfUnassigned(ticket, actingAdminId);

          const ticketRepo = manager.getRepository(SupportTicketEntity);
          const logRepo = manager.getRepository(TicketStatusLogEntity);
          const now = new Date();

          // ── Mở lại ticket đã đóng ───────────────────────────────────────
          // Toàn bộ reset cờ + tính lại SLA nằm ở `prepareReopen` (dùng chung
          // với đường người dùng tự mở lại) nên xử lý riêng, không lẫn vào các
          // nhánh chuyển trạng thái thông thường.
          if (
            from === SupportTicketStatus.CLOSED &&
            to === SupportTicketStatus.IN_PROGRESS
          ) {
            await this.ticketService.prepareReopen(ticket);
            await ticketRepo.save(ticket);
            await logRepo.save(
              logRepo.create({
                ticket: { id },
                oldStatus: from,
                newStatus: to,
                changedBy: { id: actingAdminId },
                note: dto.note ?? 'Admin mở lại ticket',
              }),
            );
            effects.push(() => {
              this.notify(
                ticket.reporter?.id,
                id,
                'Yêu cầu hỗ trợ đã được mở lại',
                'CleanZ đang tiếp tục xử lý yêu cầu của bạn.',
                `ticket-${id}-REOPEN-${Date.now()}`,
              );
              return Promise.resolve();
            });
            return { ticket, from, to };
          }

          if (to === SupportTicketStatus.PENDING && !dto.pendingReason) {
            throw new UnprocessableEntityException(
              'pendingReason là bắt buộc khi chuyển sang PENDING',
            );
          }

          if (to === SupportTicketStatus.RESOLVED) {
            if (ticket.category === TicketCategory.OTHER) {
              throw new UnprocessableEntityException(
                'Phải phân loại lại ticket (đang OTHER) trước khi RESOLVED',
              );
            }
            const resCount = await manager
              .getRepository(TicketResolutionEntity)
              .count({ where: { ticket: { id } } });
            if (resCount === 0) {
              throw new UnprocessableEntityException(
                'Cần ít nhất 1 kết luận xử lý trước khi RESOLVED',
              );
            }
          }

          ticket.status = to;
          ticket.pendingReason =
            to === SupportTicketStatus.PENDING
              ? (dto.pendingReason as TicketPendingReason)
              : null;
          if (to === SupportTicketStatus.RESOLVED) ticket.resolvedAt = now;
          if (to === SupportTicketStatus.CLOSED) ticket.closedAt = now;
          if (
            from === SupportTicketStatus.RESOLVED &&
            to === SupportTicketStatus.IN_PROGRESS
          ) {
            ticket.resolvedAt = null;
          }

          // Chỉ TÍNH mốc SLA ở đây; việc hẹn/huỷ job đẩy sang `effects`.
          if (to === SupportTicketStatus.PENDING) {
            const paused = await this.sla.applyPause(
              ticket,
              dto.pendingReason as TicketPendingReason,
            );
            if (paused) effects.push(() => this.sla.cancelBreach(id));
          } else if (
            from === SupportTicketStatus.PENDING &&
            to === SupportTicketStatus.IN_PROGRESS
          ) {
            this.sla.applyResume(ticket);
            effects.push(() => this.sla.scheduleBreach(ticket));
          }

          await ticketRepo.save(ticket);
          await logRepo.save(
            logRepo.create({
              ticket: { id },
              oldStatus: from,
              newStatus: to,
              changedBy: { id: actingAdminId },
              note: dto.note ?? null,
            }),
          );
          if (claimed) {
            effects.push(() =>
              this.audit(id, actingAdminId, 'Tự nhận phụ trách khi xử lý'),
            );
          }

          if (to === SupportTicketStatus.RESOLVED) {
            effects.push(async () => {
              await this.sla.cancelBreach(id);
              await this.sla.cancelFirstResponse(id);
              await this.sla.scheduleAutoClose(id);
              await this.sla.enqueueCsat(id);
            });
          } else if (
            from === SupportTicketStatus.RESOLVED &&
            to === SupportTicketStatus.IN_PROGRESS
          ) {
            effects.push(async () => {
              await this.sla.cancelAutoClose(id);
              await this.sla.scheduleBreach(ticket);
            });
          } else if (to === SupportTicketStatus.CLOSED) {
            effects.push(async () => {
              await this.sla.cancelAutoClose(id);
              await this.sla.cancelBreach(id);
              await this.sla.cancelFirstResponse(id);
            });
          }

          return { ticket, from, to };
        },
      );

      // ── Sau commit: hàng đợi + thông báo ────────────────────────────────
      for (const run of effects) await run();
      if (from === SupportTicketStatus.CLOSED) return this.findOne(id);

      if (to === SupportTicketStatus.RESOLVED) {
        this.notify(
          ticket.reporter?.id,
          id,
          'Yêu cầu hỗ trợ đã được xử lý',
          'Vui lòng kiểm tra kết quả và đánh giá mức độ hài lòng.',
          `ticket-${id}-RESOLVED`,
        );
      } else if (to === SupportTicketStatus.CLOSED) {
        this.notify(
          ticket.reporter?.id,
          id,
          'Yêu cầu hỗ trợ đã đóng',
          'Ticket của bạn đã được đóng.',
          `ticket-${id}-CLOSED`,
        );
      } else if (
        to === SupportTicketStatus.PENDING &&
        dto.pendingReason === TicketPendingReason.WAIT_TASKER
      ) {
        this.notify(
          ticket.counterparty?.id,
          id,
          'Bạn được mời phản hồi một khiếu nại',
          'Vui lòng cung cấp thông tin/giải trình cho yêu cầu hỗ trợ liên quan.',
          `ticket-${id}-WAIT_TASKER`,
        );
      }

      return this.findOne(id);
    }, 'Lỗi khi đổi trạng thái ticket');
  }

  async createOnBehalf(
    dto: CreateTicketAdminDto,
    actingAdminId: string,
  ): Promise<TicketAdminView> {
    return asyncHandleOperation(async () => {
      const created = await this.ticketService.create(
        dto.reporterUserId,
        dto,
        TicketSource.ADMIN,
      );
      if (dto.assignToSelf) {
        const ticket = await this.loadOrFail(created.id);
        ticket.assignedAdmin = { id: actingAdminId } as UserEntity;
        ticket.status = SupportTicketStatus.IN_PROGRESS;
        await this.ticketRepo.save(ticket);
        await this.statusLogRepo.save(
          this.statusLogRepo.create({
            ticket: { id: created.id },
            oldStatus: SupportTicketStatus.NEW,
            newStatus: SupportTicketStatus.IN_PROGRESS,
            changedBy: { id: actingAdminId },
            note: 'Admin tự nhận khi tạo hộ',
          }),
        );
      }
      return this.findOne(created.id);
    }, 'Lỗi khi tạo ticket hộ');
  }

  async addMessage(
    id: string,
    dto: CreateAdminMessageDto,
    actingAdminId: string,
  ): Promise<AdminMessage> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadOrFail(id);
      const body = dto.body?.trim() ?? '';
      const attachmentIds = TicketService.normalizeIds(dto.attachmentIds);
      if (!body && attachmentIds.length === 0) {
        throw new UnprocessableEntityException(
          'Tin nhắn phải có nội dung hoặc ảnh đính kèm',
        );
      }
      // Ảnh phải thuộc đúng ticket này, chưa gắn message và do chính admin đang
      // gửi upload — chặn re-parent ảnh từ ticket khác. Kiểm TRƯỚC khi lưu message.
      await this.ticketService.assertAttachmentsUsable(
        id,
        actingAdminId,
        attachmentIds,
      );

      // Xác định luồng đích: isInternal (back-compat) ưu tiên; ngược lại lấy
      // targetAudience (mặc định REPORTER). isInternal được suy lại cho nhất quán.
      const audience: TicketMessageAudience = dto.isInternal
        ? TicketMessageAudience.INTERNAL
        : (dto.targetAudience ?? TicketMessageAudience.REPORTER);
      const isInternal = audience === TicketMessageAudience.INTERNAL;

      // Trả lời khách/tasker là thao tác xử lý → áp quyền sở hữu. Ghi chú NỘI BỘ
      // thì không: đó là chỗ để mọi admin trao đổi, chặn sẽ cản phối hợp.
      if (!isInternal) {
        this.assertCanAct(ticket, actingAdminId);
        if (this.claimIfUnassigned(ticket, actingAdminId)) {
          await this.ticketRepo.save(ticket);
          await this.audit(id, actingAdminId, 'Tự nhận phụ trách khi trả lời');
        }
      }

      if (
        audience === TicketMessageAudience.COUNTERPARTY &&
        !ticket.counterparty?.id
      ) {
        throw new UnprocessableEntityException(
          'Ticket chưa có bên liên quan (counterparty) để gửi vào luồng này',
        );
      }

      const msg = await this.messageRepo.save(
        this.messageRepo.create({
          ticket: { id },
          sender: { id: actingAdminId },
          // Lưu DB mã hoá at-rest; `body` plaintext dùng cho response + realtime.
          body: this.crypto.encrypt(body),
          isInternal,
          audience,
        }),
      );

      // Gắn ảnh đã upload trước (đang ở cấp ticket, message_id NULL) vào message này
      const attachments = await this.ticketService.attachToMessage(
        id,
        msg.id,
        actingAdminId,
        attachmentIds,
      );

      if (!isInternal) {
        if (!ticket.firstRespondedAt) {
          ticket.firstRespondedAt = new Date();
          await this.ticketRepo.save(ticket);
          // Đã phản hồi → thôi theo dõi hạn phản hồi lần đầu.
          await this.sla.cancelFirstResponse(id);
        }
        // Badge "tin chưa đọc" cho đúng người của luồng (không đẩy inbox/email
        // cho từng tin — thiết kế hiển thị số lượng ngay ngoài ticket).
        const recipientId =
          audience === TicketMessageAudience.COUNTERPARTY
            ? ticket.counterparty?.id
            : ticket.reporter?.id;
        this.realtime.emitUnread(recipientId, id);
      }

      const result: AdminMessage = {
        id: msg.id,
        senderUserId: actingAdminId,
        senderRole: 'ADMIN',
        body,
        isInternal: msg.isInternal,
        audience: msg.audience,
        createdAt: msg.createdAt,
        attachments,
      };
      // Realtime: phát vào room của luồng (mọi người đang mở đều nhận).
      this.realtime.emitMessage(ticket, audience, result);
      return result;
    }, 'Lỗi khi gửi tin nhắn');
  }

  /**
   * Danh sách ghi chú nội bộ (luồng INTERNAL) — hiển thị dạng LOG/timeline ở
   * panel riêng ngoài bảng ticket, KHÔNG lẫn với hội thoại khách/tasker.
   */
  async listInternalNotes(id: string): Promise<InternalNoteView[]> {
    return asyncHandleOperation(async () => {
      await this.loadOrFail(id);
      const notes = await this.messageRepo.find({
        where: { ticket: { id }, audience: TicketMessageAudience.INTERNAL },
        relations: ['sender'],
        order: { createdAt: 'ASC' },
      });
      this.crypto.decryptEntities(notes);
      return notes.map((n) => ({
        id: n.id,
        authorId: n.sender?.id ?? null,
        authorName: n.sender?.fullName ?? 'Hệ thống',
        authorRole: senderRoleOf(n.sender),
        body: n.body,
        createdAt: n.createdAt,
      }));
    }, 'Lỗi khi lấy ghi chú nội bộ');
  }

  /** Thêm 1 ghi chú nội bộ (text-only). Tái dùng addMessage với audience INTERNAL. */
  async addInternalNote(
    id: string,
    body: string,
    actingAdminId: string,
  ): Promise<InternalNoteView> {
    return asyncHandleOperation(async () => {
      const msg = await this.addMessage(
        id,
        { body, isInternal: true },
        actingAdminId,
      );
      const author = await this.userRepo.findOne({
        where: { id: actingAdminId },
      });
      return {
        id: msg.id,
        authorId: actingAdminId,
        authorName: author?.fullName ?? 'Admin',
        authorRole: 'ADMIN',
        body: msg.body,
        createdAt: msg.createdAt,
      };
    }, 'Lỗi khi thêm ghi chú nội bộ');
  }

  async unreadTotal(actingAdminId: string): Promise<{ count: number }> {
    return { count: await this.ticketService.unreadTotal(actingAdminId, true) };
  }

  async markThreadRead(
    id: string,
    dto: MarkReadAdminDto,
    actingAdminId: string,
  ): Promise<{
    audience: TicketMessageAudience;
    lastReadMessageId: string | null;
    readAt: Date;
  }> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadOrFail(id);
      const record = await this.ticketService.upsertThreadRead(
        ticket,
        actingAdminId,
        dto.audience,
        dto.lastMessageId,
      );
      this.realtime.emitRead(
        ticket,
        dto.audience,
        actingAdminId,
        record.lastReadMessageId,
        record.readAt,
      );
      return {
        audience: dto.audience,
        lastReadMessageId: record.lastReadMessageId,
        readAt: record.readAt,
      };
    }, 'Lỗi khi đánh dấu đã đọc');
  }

  /** Upload 1 ảnh (cấp ticket) — admin lấy attachmentId để gắn vào reply hoặc lưu kèm hồ sơ. */
  async uploadAttachment(
    id: string,
    actingAdminId: string,
    file: Express.Multer.File,
  ): Promise<{ id: string; url: string }> {
    return asyncHandleOperation(async () => {
      await this.loadOrFail(id);
      const uploaded = await this.uploadService.uploadImage(file);
      const att = await this.attachmentRepo.save(
        this.attachmentRepo.create({
          ticket: { id },
          url: uploaded.url,
          publicId: uploaded.public_id,
          uploadedBy: { id: actingAdminId },
        }),
      );
      return { id: att.id, url: att.url };
    }, 'Lỗi khi tải ảnh đính kèm');
  }

  /**
   * Nạp ticket kèm KHOÁ GHI để hai admin không thể cùng chuyển trạng thái.
   *
   * Khoá được lấy bằng một truy vấn KHÔNG join: Postgres không cho `FOR UPDATE`
   * áp lên nhánh nullable của outer join, mà `reporter`/`counterparty`/
   * `assignedAdmin` đều nullable. Sau khi giữ khoá mới nạp quan hệ ở truy vấn
   * thứ hai — vẫn an toàn vì không ai khác sửa được dòng này tới lúc commit.
   */
  private async lockTicket(
    manager: EntityManager,
    id: string,
  ): Promise<SupportTicketEntity> {
    const repo = manager.getRepository(SupportTicketEntity);
    const locked = await repo.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) throw new NotFoundException('Không tìm thấy ticket');
    const withRelations = await repo.findOne({
      where: { id },
      relations: ['booking', 'reporter', 'counterparty', 'assignedAdmin'],
    });
    return withRelations ?? locked;
  }

  private async loadOrFail(id: string): Promise<SupportTicketEntity> {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['booking', 'reporter', 'counterparty', 'assignedAdmin'],
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy ticket');
    return ticket;
  }
}
