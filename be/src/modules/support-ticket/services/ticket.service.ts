import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { UploadService } from 'src/modules/upload/upload.service';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketMessageEntity } from '../entity/ticket-message.entity';
import { TicketAttachmentEntity } from '../entity/ticket-attachment.entity';
import { TicketStatusLogEntity } from '../entity/ticket-status-log.entity';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { QueryTicketDto } from '../dto/query-ticket.dto';
import {
  PaginatedTickets,
  PublicMessage,
  TicketPublicView,
  toPublicView,
  toTicketSummary,
} from '../dto/ticket-response.dto';
import { CreateMessageDto } from '../dto/create-message.dto';
import { TicketCodeService } from './ticket-code.service';
import { TicketConfigService } from './ticket-config.service';
import { TicketSlaService } from './ticket-sla.service';
import { TicketSource } from 'src/common/enums/ticket-source.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { senderRoleOf } from '../dto/ticket-response.dto';
import { TicketThreadReadEntity } from '../entity/ticket-thread-read.entity';
import { TicketRealtimeService } from '../realtime/ticket-realtime.service';
import { MarkReadDto } from '../dto/mark-read.dto';

const NO_BOOKING_CATEGORIES = [
  TicketCategory.ACCOUNT_TECHNICAL,
  TicketCategory.OTHER,
];

@Injectable()
export class TicketService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(TicketMessageEntity)
    private readonly messageRepo: Repository<TicketMessageEntity>,
    @InjectRepository(TicketAttachmentEntity)
    private readonly attachmentRepo: Repository<TicketAttachmentEntity>,
    @InjectRepository(TicketStatusLogEntity)
    private readonly statusLogRepo: Repository<TicketStatusLogEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    private readonly ticketCode: TicketCodeService,
    private readonly config: TicketConfigService,
    private readonly uploadService: UploadService,
    private readonly sla: TicketSlaService,
    private readonly realtime: TicketRealtimeService,
    @InjectRepository(TicketThreadReadEntity)
    private readonly threadReadRepo: Repository<TicketThreadReadEntity>,
  ) {}

  async create(
    reporterUserId: string,
    dto: CreateTicketDto,
    source: TicketSource = TicketSource.CUSTOMER_APP,
  ): Promise<TicketPublicView> {
    return asyncHandleOperation(async () => {
      let bookingId: string | null = null;
      let counterpartyUserId: string | null = null;

      if (!NO_BOOKING_CATEGORIES.includes(dto.category)) {
        if (!dto.bookingId) {
          throw new UnprocessableEntityException(
            'bookingId là bắt buộc với loại khiếu nại này',
          );
        }
        const booking = await this.bookingRepo.findOne({
          where: { id: dto.bookingId },
          relations: ['customer', 'customer.user', 'tasker', 'tasker.user'],
        });
        if (!booking) throw new NotFoundException('Không tìm thấy đơn dịch vụ');

        const customerUserId = booking.customer?.user?.id;
        const taskerUserId = booking.tasker?.user?.id ?? null;

        if (reporterUserId === customerUserId) {
          counterpartyUserId = taskerUserId;
        } else if (taskerUserId && reporterUserId === taskerUserId) {
          counterpartyUserId = customerUserId ?? null;
        } else {
          throw new NotFoundException('Không tìm thấy đơn dịch vụ');
        }

        if (booking.status === BookingStatus.COMPLETED && booking.completedAt) {
          const windowDays = await this.config.getComplaintWindowDays();
          const deadline = new Date(
            booking.completedAt.getTime() + windowDays * 86400000,
          );
          if (new Date() > deadline) {
            throw new UnprocessableEntityException(
              'Quá hạn khiếu nại cho đơn này',
            );
          }
        }
        bookingId = booking.id;
      }

      const priority =
        dto.priority ?? (await this.config.getDefaultPriority(dto.category));
      const sla = await this.config.getSlaWindow(priority);
      const now = new Date();
      const code = await this.ticketCode.next(now);

      const saved = await this.dataSource.transaction(async (manager) => {
        const ticket = manager.getRepository(SupportTicketEntity).create({
          ticketCode: code,
          subject: dto.subject,
          description: dto.description ?? null,
          category: dto.category,
          subtype: dto.subtype ?? null,
          priority,
          status: SupportTicketStatus.NEW,
          source,
          booking: bookingId ? ({ id: bookingId } as BookingEntity) : null,
          reporter: { id: reporterUserId },
          counterparty: counterpartyUserId ? { id: counterpartyUserId } : null,
          firstResponseDueAt: new Date(
            now.getTime() + sla.responseMins * 60000,
          ),
          resolutionDueAt: new Date(now.getTime() + sla.resolutionMins * 60000),
        });
        const result = await manager
          .getRepository(SupportTicketEntity)
          .save(ticket);

        await manager.getRepository(TicketStatusLogEntity).save(
          manager.getRepository(TicketStatusLogEntity).create({
            ticket: { id: result.id },
            oldStatus: null,
            newStatus: SupportTicketStatus.NEW,
            changedBy: { id: reporterUserId },
            note: 'Tạo ticket',
          }),
        );

        if (dto.attachmentIds?.length) {
          await manager
            .getRepository(TicketAttachmentEntity)
            .createQueryBuilder()
            .update()
            .set({ ticket: { id: result.id } })
            .whereInIds(dto.attachmentIds)
            .andWhere('ticket_id IS NULL')
            .execute();
        }
        return result;
      });

      await this.sla.scheduleBreach(saved);

      return toPublicView(saved, []);
    }, 'Lỗi khi tạo ticket');
  }

  async uploadAttachment(
    userId: string,
    ticketId: string,
    file: Express.Multer.File,
  ): Promise<{ id: string; url: string }> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadAccessible(ticketId, userId);
      const uploaded = await this.uploadService.uploadImage(file);
      const att = await this.attachmentRepo.save(
        this.attachmentRepo.create({
          ticket: { id: ticket.id },
          url: uploaded.url,
          publicId: uploaded.public_id,
          uploadedBy: { id: userId },
        }),
      );
      return { id: att.id, url: att.url };
    }, 'Lỗi khi tải ảnh đính kèm');
  }

  async addUserMessage(
    userId: string,
    ticketId: string,
    dto: CreateMessageDto,
  ): Promise<PublicMessage> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadAccessible(ticketId, userId);
      if (ticket.status === SupportTicketStatus.CLOSED) {
        throw new ConflictException('Ticket đã đóng');
      }
      const body = dto.body?.trim() ?? '';
      if (!body && !dto.attachmentIds?.length) {
        throw new UnprocessableEntityException(
          'Tin nhắn phải có nội dung hoặc ảnh đính kèm',
        );
      }

      const isReporter = ticket.reporter?.id === userId;
      // Định tuyến luồng theo người gửi (mô hình admin trung gian 2 thread).
      const audience = isReporter
        ? TicketMessageAudience.REPORTER
        : TicketMessageAudience.COUNTERPARTY;

      const msg = await this.messageRepo.save(
        this.messageRepo.create({
          ticket: { id: ticket.id },
          sender: { id: userId },
          body,
          isInternal: false,
          audience,
        }),
      );
      let attachments: { id: string; url: string }[] = [];
      if (dto.attachmentIds?.length) {
        await this.attachmentRepo
          .createQueryBuilder()
          .update()
          .set({ message: { id: msg.id }, ticket: { id: ticket.id } })
          .whereInIds(dto.attachmentIds)
          .execute();
        const rows = await this.attachmentRepo.find({
          where: { message: { id: msg.id } },
        });
        attachments = rows.map((a) => ({ id: a.id, url: a.url }));
      }

      const awaitsThisParty =
        ticket.status === SupportTicketStatus.PENDING &&
        ((ticket.pendingReason === TicketPendingReason.WAIT_CUSTOMER &&
          isReporter) ||
          (ticket.pendingReason === TicketPendingReason.WAIT_TASKER &&
            !isReporter));
      if (awaitsThisParty) {
        const from = ticket.status;
        ticket.status = SupportTicketStatus.IN_PROGRESS;
        ticket.pendingReason = null;
        await this.sla.onResume(ticket);
        await this.ticketRepo.save(ticket);
        await this.statusLogRepo.save(
          this.statusLogRepo.create({
            ticket: { id: ticket.id },
            oldStatus: from,
            newStatus: SupportTicketStatus.IN_PROGRESS,
            changedBy: { id: userId },
            note: 'Tự mở lại khi bên liên quan phản hồi',
          }),
        );
      }

      const result: PublicMessage = {
        id: msg.id,
        senderUserId: userId,
        senderRole: senderRoleOf(
          isReporter ? ticket.reporter : ticket.counterparty,
        ),
        body: msg.body,
        attachments,
        createdAt: msg.createdAt,
      };
      // Realtime: phát vào room của luồng (người đang mở ticket nhận tin ngay).
      this.realtime.emitMessage(ticket, audience, result);
      // Ping badge "tin chưa đọc": admin phụ trách (nếu có), ngược lại broadcast
      // cho mọi admin (ticket chưa gán) — để hàng đợi admin cập nhật realtime.
      if (ticket.assignedAdmin?.id) {
        this.realtime.emitUnread(ticket.assignedAdmin.id, ticket.id);
      } else {
        this.realtime.emitUnreadToAdmins(ticket.id);
      }
      return result;
    }, 'Lỗi khi gửi tin nhắn');
  }

  async listMine(
    userId: string,
    query: QueryTicketDto,
  ): Promise<PaginatedTickets> {
    return asyncHandleOperation(async () => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const qb = this.ticketRepo
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.booking', 'b')
        .orderBy('t.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);

      if (query.role === 'reporter') {
        qb.where('t.reporter_user_id = :uid', { uid: userId });
      } else if (query.role === 'counterparty') {
        qb.where('t.counterparty_user_id = :uid', { uid: userId });
      } else {
        qb.where(
          '(t.reporter_user_id = :uid OR t.counterparty_user_id = :uid)',
          { uid: userId },
        );
      }
      if (query.status)
        qb.andWhere('t.status = :status', { status: query.status });
      if (query.category)
        qb.andWhere('t.category = :category', { category: query.category });
      if (query.priority)
        qb.andWhere('t.priority = :priority', { priority: query.priority });

      const [rows, total] = await qb.getManyAndCount();
      const unread = await this.unreadCountMap(
        userId,
        false,
        rows.map((r) => r.id),
      );
      return {
        data: rows.map((r) => ({
          ...toTicketSummary(r),
          unreadCount: unread[r.id] ?? 0,
        })),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }, 'Lỗi khi lấy danh sách ticket');
  }

  /**
   * Số tin CHƯA ĐỌC theo từng ticket cho 1 người xem (badge ngoài ticket).
   * Unread = message trong luồng người đó thấy, KHÔNG do họ gửi, tạo SAU mốc
   * last-read của họ (ticket_thread_reads). Admin tính cả REPORTER+COUNTERPARTY.
   */
  async unreadCountMap(
    viewerId: string,
    isAdmin: boolean,
    ticketIds: string[],
  ): Promise<Record<string, number>> {
    if (ticketIds.length === 0) return {};
    const audienceFilter = isAdmin
      ? `m.audience IN ('REPORTER','COUNTERPARTY')`
      : `m.audience = (CASE WHEN t.reporter_user_id = $1 THEN 'REPORTER'::ticket_message_audience
                            WHEN t.counterparty_user_id = $1 THEN 'COUNTERPARTY'::ticket_message_audience END)`;
    const rows: { ticketId: string; count: string }[] =
      await this.dataSource.query(
        `SELECT m.ticket_id AS "ticketId", COUNT(*)::int AS "count"
         FROM ticket_messages m
         JOIN support_tickets t ON t.id = m.ticket_id
         LEFT JOIN ticket_thread_reads r
           ON r.ticket_id = m.ticket_id AND r.user_id = $1 AND r.audience = m.audience
         LEFT JOIN ticket_messages lr ON lr.id = r.last_read_message_id
         WHERE m.ticket_id = ANY($2::uuid[])
           AND m.sender_user_id IS DISTINCT FROM $1
           AND ${audienceFilter}
           AND (lr.created_at IS NULL OR m.created_at > lr.created_at)
         GROUP BY m.ticket_id`,
        [viewerId, ticketIds],
      );
    const map: Record<string, number> = {};
    for (const row of rows) map[row.ticketId] = Number(row.count);
    return map;
  }

  /** Tổng số tin chưa đọc trên TẤT CẢ ticket của người xem (badge trên nav). */
  async unreadTotal(viewerId: string, isAdmin: boolean): Promise<number> {
    const scope = isAdmin
      ? `m.audience IN ('REPORTER','COUNTERPARTY')`
      : `(t.reporter_user_id = $1 OR t.counterparty_user_id = $1)
         AND m.audience = (CASE WHEN t.reporter_user_id = $1 THEN 'REPORTER'::ticket_message_audience
                                WHEN t.counterparty_user_id = $1 THEN 'COUNTERPARTY'::ticket_message_audience END)`;
    const rows: { c: string }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS c
       FROM ticket_messages m
       JOIN support_tickets t ON t.id = m.ticket_id
       LEFT JOIN ticket_thread_reads r
         ON r.ticket_id = m.ticket_id AND r.user_id = $1 AND r.audience = m.audience
       LEFT JOIN ticket_messages lr ON lr.id = r.last_read_message_id
       WHERE m.sender_user_id IS DISTINCT FROM $1
         AND ${scope}
         AND (lr.created_at IS NULL OR m.created_at > lr.created_at)`,
      [viewerId],
    );
    return Number(rows[0]?.c ?? 0);
  }

  async findOneForUser(
    userId: string,
    ticketId: string,
  ): Promise<TicketPublicView> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadAccessible(ticketId, userId);
      // Chỉ trả message thuộc ĐÚNG luồng của người xem (admin trung gian):
      // reporter thấy luồng REPORTER, counterparty thấy COUNTERPARTY; không bao
      // giờ thấy INTERNAL hay luồng của bên kia (AD7/BR-8/FR-D2).
      const viewerAudience =
        ticket.reporter?.id === userId
          ? TicketMessageAudience.REPORTER
          : TicketMessageAudience.COUNTERPARTY;
      const messages = await this.messageRepo.find({
        where: { ticket: { id: ticketId }, audience: viewerAudience },
        relations: ['sender'],
        order: { createdAt: 'ASC' },
      });
      const attachments = messages.length
        ? await this.attachmentRepo.find({
            where: { message: { id: In(messages.map((m) => m.id)) } },
            relations: ['message'],
          })
        : [];
      return toPublicView(ticket, messages, attachments);
    }, 'Lỗi khi lấy chi tiết ticket');
  }

  async markThreadRead(
    userId: string,
    ticketId: string,
    dto: MarkReadDto,
  ): Promise<{
    audience: TicketMessageAudience;
    lastReadMessageId: string | null;
    readAt: Date;
  }> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadAccessible(ticketId, userId);
      const audience =
        ticket.reporter?.id === userId
          ? TicketMessageAudience.REPORTER
          : TicketMessageAudience.COUNTERPARTY;
      const record = await this.upsertThreadRead(
        ticket,
        userId,
        audience,
        dto.lastMessageId,
      );
      this.realtime.emitRead(
        ticket,
        audience,
        userId,
        record.lastReadMessageId,
        record.readAt,
      );
      return {
        audience,
        lastReadMessageId: record.lastReadMessageId,
        readAt: record.readAt,
      };
    }, 'Lỗi khi đánh dấu đã đọc');
  }

  /**
   * Upsert mốc đã đọc theo (ticket,user,audience). Nếu không truyền message thì
   * lấy message mới nhất của luồng. Dùng chung cho user & admin.
   */
  async upsertThreadRead(
    ticket: SupportTicketEntity,
    userId: string,
    audience: TicketMessageAudience,
    lastMessageId?: string,
  ): Promise<{ lastReadMessageId: string | null; readAt: Date }> {
    let resolvedId = lastMessageId ?? null;
    if (!resolvedId) {
      const latest = await this.messageRepo.findOne({
        where: { ticket: { id: ticket.id }, audience },
        order: { createdAt: 'DESC' },
      });
      resolvedId = latest?.id ?? null;
    }
    let row = await this.threadReadRepo.findOne({
      where: { ticket: { id: ticket.id }, user: { id: userId }, audience },
    });
    if (!row) {
      row = this.threadReadRepo.create({
        ticket: { id: ticket.id },
        user: { id: userId },
        audience,
      });
    }
    row.lastReadMessage = resolvedId ? ({ id: resolvedId } as never) : null;
    const saved = await this.threadReadRepo.save(row);
    return { lastReadMessageId: resolvedId, readAt: saved.readAt };
  }

  private async loadAccessible(
    ticketId: string,
    userId: string,
  ): Promise<SupportTicketEntity> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['booking', 'reporter', 'counterparty', 'assignedAdmin'],
    });
    if (
      !ticket ||
      (ticket.reporter?.id !== userId && ticket.counterparty?.id !== userId)
    ) {
      throw new NotFoundException('Không tìm thấy ticket');
    }
    return ticket;
  }
}
