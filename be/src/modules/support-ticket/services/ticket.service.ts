import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { UploadService } from 'src/modules/upload/upload.service';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketMessageEntity } from '../entity/ticket-message.entity';
import { TicketAttachmentEntity } from '../entity/ticket-attachment.entity';
import { TicketStatusLogEntity } from '../entity/ticket-status-log.entity';
import { TicketResolutionEntity } from '../entity/ticket-resolution.entity';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { QueryTicketDto } from '../dto/query-ticket.dto';
import {
  AttachmentView,
  EligibleBooking,
  MessagePage,
  PaginatedTickets,
  PublicMessage,
  TicketPublicView,
  toPublicMessages,
  toPublicResolutions,
  toPublicView,
  toTicketSummary,
} from '../dto/ticket-response.dto';
import { MESSAGE_PAGE_SIZE } from '../support-ticket.constants';
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
import { MessageCryptoService } from './message-crypto.service';

/**
 * Tin KHÔNG do admin gửi. Dùng cho badge chưa đọc phía admin: hàng đợi chỉ nên
 * sáng lên khi có tin mới từ KHÁCH/TASKER, không phải khi đồng nghiệp trả lời.
 */
const NOT_FROM_ADMIN = `(sender.role IS NULL OR sender.role <> 'ADMIN')`;

const NO_BOOKING_CATEGORIES = [
  TicketCategory.ACCOUNT_TECHNICAL,
  TicketCategory.APPEAL,
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
    private readonly crypto: MessageCryptoService,
    @InjectRepository(TicketResolutionEntity)
    private readonly resolutionRepo: Repository<TicketResolutionEntity>,
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

        if (
          dto.category === TicketCategory.CUSTOMER_ABSENCE_DISPUTE &&
          (reporterUserId !== customerUserId ||
            booking.status !== BookingStatus.CANCELLED ||
            booking.cancelledBy !== CancelledBy.CUSTOMER_ABSENT)
        ) {
          throw new UnprocessableEntityException(
            'Loại khiếu nại này chỉ dành cho khách của đơn đã hủy do báo vắng mặt',
          );
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
          subtype:
            dto.category === TicketCategory.CUSTOMER_ABSENCE_DISPUTE
              ? 'ABSENCE_REPORT_DISPUTE'
              : (dto.subtype ?? null),
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

        // Chỉ nhận ảnh CHƯA thuộc ticket nào, CHƯA gắn message và do CHÍNH
        // người tạo upload — không cho kéo ảnh của ticket/người khác vào đây.
        const stagedIds = TicketService.normalizeIds(dto.attachmentIds);
        if (stagedIds.length) {
          await manager
            .getRepository(TicketAttachmentEntity)
            .createQueryBuilder()
            .update()
            .set({ ticket: { id: result.id } })
            .whereInIds(stagedIds)
            .andWhere('ticket_id IS NULL')
            .andWhere('message_id IS NULL')
            .andWhere('uploaded_by_user_id = :uid', { uid: reporterUserId })
            .execute();
        }
        return result;
      });

      await this.sla.scheduleBreach(saved);
      await this.sla.scheduleFirstResponse(saved);

      return toPublicView(saved, []);
    }, 'Lỗi khi tạo ticket');
  }

  /**
   * Danh sách đơn mà NGƯỜI ĐANG ĐĂNG NHẬP được phép khiếu nại — dùng cho select
   * "Đơn liên quan" ở form tạo ticket.
   *
   * Dùng chung cho CUSTOMER và TASKER: điều kiện lấy đơn khớp ĐÚNG luật phân
   * quyền của {@link create} (là customer HOẶC tasker của đơn), nên FE không cần
   * rẽ nhánh theo role và không còn phụ thuộc `/booking/my-bookings` vốn chỉ mở
   * cho CUSTOMER (trước đây tasker nhận 403 → không tạo được ticket gắn đơn).
   *
   * Đồng thời LOẠI TRƯỚC các đơn đã hết hạn khiếu nại, để người dùng không chọn
   * xong mới bị 422 "Quá hạn khiếu nại cho đơn này".
   */
  async listEligibleBookings(userId: string): Promise<EligibleBooking[]> {
    return asyncHandleOperation(async () => {
      const windowDays = await this.config.getComplaintWindowDays();
      // Mốc sớm nhất còn khiếu nại được: completedAt phải sau thời điểm này.
      const earliestCompletedAt = new Date(Date.now() - windowDays * 86400000);

      const rows = await this.bookingRepo
        .createQueryBuilder('b')
        .leftJoin('b.customer', 'c')
        .leftJoin('c.user', 'cu')
        .leftJoin('b.tasker', 't')
        .leftJoin('t.user', 'tu')
        .leftJoin('b.package', 'p')
        .select([
          'b.id AS "id"',
          'b.booking_code AS "bookingCode"',
          'b.status AS "status"',
          'b.scheduled_start AS "scheduledStart"',
          'p.name AS "serviceName"',
          "CASE WHEN cu.id = :uid THEN 'CUSTOMER' ELSE 'TASKER' END AS \"myRole\"",
        ])
        .where('(cu.id = :uid OR tu.id = :uid)', { uid: userId })
        // Còn trong hạn khiếu nại: chưa hoàn thành, hoặc hoàn thành chưa quá hạn.
        .andWhere(
          `(b.status <> :completed OR b.completed_at IS NULL OR b.completed_at > :earliest)`,
          {
            completed: BookingStatus.COMPLETED,
            earliest: earliestCompletedAt,
          },
        )
        .orderBy('b.created_at', 'DESC')
        .limit(50)
        .getRawMany<EligibleBooking>();

      return rows;
    }, 'Lỗi khi lấy danh sách đơn có thể khiếu nại');
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
      const attachmentIds = TicketService.normalizeIds(dto.attachmentIds);
      if (!body && attachmentIds.length === 0) {
        throw new UnprocessableEntityException(
          'Tin nhắn phải có nội dung hoặc ảnh đính kèm',
        );
      }
      // Kiểm quyền ảnh TRƯỚC khi lưu message (tránh message mồ côi khi 422).
      await this.assertAttachmentsUsable(ticket.id, userId, attachmentIds);

      const isReporter = ticket.reporter?.id === userId;
      // Định tuyến luồng theo người gửi (mô hình admin trung gian 2 thread).
      const audience = isReporter
        ? TicketMessageAudience.REPORTER
        : TicketMessageAudience.COUNTERPARTY;

      const msg = await this.messageRepo.save(
        this.messageRepo.create({
          ticket: { id: ticket.id },
          sender: { id: userId },
          // Lưu DB ở dạng mã hoá at-rest; biến `body` giữ plaintext để trả response.
          body: this.crypto.encrypt(body),
          isInternal: false,
          audience,
        }),
      );
      const attachments = await this.attachToMessage(
        ticket.id,
        msg.id,
        userId,
        attachmentIds,
      );

      if (TicketService.awaitsParty(ticket, isReporter)) {
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
        body,
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
        // Chỉ lấy id reporter (không nạp cả UserEntity) để suy ra `myRole`:
        // người xem là người GỬI khiếu nại hay là bên BỊ khiếu nại.
        .leftJoin('t.reporter', 'rp')
        .addSelect('rp.id')
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
        data: rows.map((r) => {
          const myRole = this.viewerAudience(r, userId);
          return {
            ...toTicketSummary(r),
            unreadCount: unread[r.id] ?? 0,
            myRole,
            pendingReason: r.pendingReason ?? null,
            awaitingMe: TicketService.awaitsParty(
              r,
              myRole === TicketMessageAudience.REPORTER,
            ),
          };
        }),
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
    // Với admin: chỉ đếm tin đến TỪ NGƯỜI DÙNG. Trước đây điều kiện duy nhất là
    // "không phải tin của tôi", nên tin do ADMIN KHÁC gửi cũng bị tính — admin A
    // trả lời khách thì admin B lập tức thấy badge "1 tin chưa đọc" dù không có
    // gì mới từ phía khách.
    const audienceFilter = isAdmin
      ? `m.audience IN ('REPORTER','COUNTERPARTY') AND ${NOT_FROM_ADMIN}`
      : `m.audience = (CASE WHEN t.reporter_user_id = $1 THEN 'REPORTER'::ticket_message_audience
                            WHEN t.counterparty_user_id = $1 THEN 'COUNTERPARTY'::ticket_message_audience END)`;
    const rows: { ticketId: string; count: string }[] =
      await this.dataSource.query(
        `SELECT m.ticket_id AS "ticketId", COUNT(*)::int AS "count"
         FROM ticket_messages m
         JOIN support_tickets t ON t.id = m.ticket_id
         LEFT JOIN users sender ON sender.id = m.sender_user_id
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
      ? `m.audience IN ('REPORTER','COUNTERPARTY') AND ${NOT_FROM_ADMIN}`
      : `(t.reporter_user_id = $1 OR t.counterparty_user_id = $1)
         AND m.audience = (CASE WHEN t.reporter_user_id = $1 THEN 'REPORTER'::ticket_message_audience
                                WHEN t.counterparty_user_id = $1 THEN 'COUNTERPARTY'::ticket_message_audience END)`;
    const rows: { c: string }[] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS c
       FROM ticket_messages m
       JOIN support_tickets t ON t.id = m.ticket_id
       LEFT JOIN users sender ON sender.id = m.sender_user_id
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
      // Chỉ tải TRANG MỚI NHẤT (cursor pagination) để tránh ứ đọng ticket dài.
      const viewerAudience = this.viewerAudience(ticket, userId);
      const [{ messages, attachments, hasMore }, resolutions] =
        await Promise.all([
          this.loadMessagePage(ticketId, viewerAudience),
          this.resolutionRepo.find({
            where: { ticket: { id: ticketId } },
            order: { createdAt: 'ASC' },
          }),
        ]);
      // `myRole` trùng chính luồng của người xem — nguồn sự thật duy nhất.
      const deadline = await this.reopenDeadline(ticket);
      return {
        ...toPublicView(ticket, messages, attachments, hasMore),
        myRole: viewerAudience,
        resolutions: toPublicResolutions(resolutions),
        resolutionDueAt: ticket.resolutionDueAt ?? null,
        pendingReason: ticket.pendingReason ?? null,
        awaitingMe: TicketService.awaitsParty(
          ticket,
          viewerAudience === TicketMessageAudience.REPORTER,
        ),
        // Điều kiện mở lại tính ở BE (cửa sổ thời gian nằm trong config) để FE
        // chỉ việc hiện/ẩn nút, không phải chép lại luật.
        canReopen:
          ticket.status === SupportTicketStatus.CLOSED &&
          viewerAudience === TicketMessageAudience.REPORTER &&
          (!deadline || new Date() <= deadline),
        reopenDeadline: deadline,
      };
    }, 'Lỗi khi lấy chi tiết ticket');
  }

  /**
   * "Tải tin cũ hơn" cho user — cursor là `beforeId` (id tin cũ nhất đang hiển
   * thị). Trả 1 trang tin (ASC) thuộc luồng của người xem + cờ còn-tin-cũ-hơn.
   */
  async getUserMessagePage(
    userId: string,
    ticketId: string,
    beforeId?: string,
    limit = MESSAGE_PAGE_SIZE,
  ): Promise<MessagePage> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadAccessible(ticketId, userId);
      const viewerAudience = this.viewerAudience(ticket, userId);
      const { messages, attachments, hasMore } = await this.loadMessagePage(
        ticketId,
        viewerAudience,
        beforeId,
        limit,
      );
      return { messages: toPublicMessages(messages, attachments), hasMore };
    }, 'Lỗi khi tải tin nhắn');
  }

  /** Hạn chót còn mở lại được ticket đã đóng (null nếu chưa đóng). */
  private async reopenDeadline(
    ticket: SupportTicketEntity,
  ): Promise<Date | null> {
    if (!ticket.closedAt) return null;
    const days = await this.config.getReopenWindowDays();
    return new Date(ticket.closedAt.getTime() + days * 86400000);
  }

  /**
   * Đưa ticket đã đóng/đã giải quyết trở lại IN_PROGRESS.
   *
   * MUTATE `ticket` tại chỗ và xếp lại hàng đợi job — KHÔNG lưu; nơi gọi tự
   * `save()` rồi ghi status log theo ngữ cảnh của mình (admin đổi trạng thái vs
   * người dùng bấm "Mở lại"). Dùng chung để hai đường không lệch nhau.
   *
   * SLA được tính LẠI TỪ BÂY GIỜ: hạn cũ đã trôi qua từ lâu, nếu giữ nguyên thì
   * ticket vừa mở lại đã vi phạm ngay. Vì đặt hạn mới nên các cờ vi phạm cũ
   * cũng được xoá — nếu không, ticket sẽ mang cờ "vi phạm SLA" vĩnh viễn.
   */
  async prepareReopen(
    ticket: SupportTicketEntity,
    now: Date = new Date(),
  ): Promise<void> {
    const deadline = await this.reopenDeadline(ticket);
    if (deadline && now > deadline) {
      const days = await this.config.getReopenWindowDays();
      throw new UnprocessableEntityException(
        `Quá hạn mở lại ticket (${days} ngày kể từ khi đóng)`,
      );
    }

    const due = await this.sla.computeDue(ticket.priority, now);
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    ticket.pendingReason = null;
    ticket.closedAt = null;
    ticket.resolvedAt = null;
    ticket.slaPausedAt = null;
    ticket.slaBreached = false;
    ticket.resolutionDueAt = due.resolutionDueAt;
    // Nếu chưa từng có phản hồi đầu tiên thì đặt lại hạn phản hồi; đã phản hồi
    // rồi thì mốc lịch sử giữ nguyên (không "xoá" thành tích cũ).
    if (!ticket.firstRespondedAt) {
      ticket.firstResponseDueAt = due.firstResponseDueAt;
      ticket.firstResponseBreached = false;
    }

    await this.sla.cancelAutoClose(ticket.id);
    await this.sla.scheduleBreach(ticket);
    if (!ticket.firstRespondedAt) {
      await this.sla.scheduleFirstResponse(ticket);
    }
  }

  /**
   * NGƯỜI GỬI tự mở lại ticket đã đóng trong thời hạn cho phép. Counterparty
   * không được mở lại khiếu nại của người khác.
   */
  async reopenByUser(
    userId: string,
    ticketId: string,
    reason: string,
  ): Promise<TicketPublicView> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadAccessible(ticketId, userId);
      if (ticket.reporter?.id !== userId) {
        throw new UnprocessableEntityException(
          'Chỉ người gửi yêu cầu mới có thể mở lại ticket này',
        );
      }
      if (ticket.status !== SupportTicketStatus.CLOSED) {
        throw new ConflictException('Ticket chưa đóng nên không cần mở lại');
      }

      await this.prepareReopen(ticket);
      await this.ticketRepo.save(ticket);
      await this.statusLogRepo.save(
        this.statusLogRepo.create({
          ticket: { id: ticket.id },
          oldStatus: SupportTicketStatus.CLOSED,
          newStatus: SupportTicketStatus.IN_PROGRESS,
          changedBy: { id: userId },
          note: `Người gửi mở lại: ${reason}`,
        }),
      );

      // Báo cho admin phụ trách; chưa gán thì đánh động cả phòng admin.
      if (ticket.assignedAdmin?.id) {
        this.realtime.emitUnread(ticket.assignedAdmin.id, ticket.id);
      } else {
        this.realtime.emitUnreadToAdmins(ticket.id);
      }

      return this.findOneForUser(userId, ticketId);
    }, 'Lỗi khi mở lại ticket');
  }

  /**
   * Ticket có đang chờ ĐÚNG bên này phản hồi không.
   *
   * Đây là NGUỒN SỰ THẬT DUY NHẤT cho quy ước `WAIT_CUSTOMER` ⇔ reporter và
   * `WAIT_TASKER` ⇔ counterparty. Dùng ở 2 chỗ phải luôn khớp nhau:
   *  - {@link addUserMessage}: bên được chờ nhắn tin → tự mở lại IN_PROGRESS;
   *  - {@link listMine}/{@link findOneForUser}: cờ `awaitingMe` để UI hiện
   *    "Đang chờ bạn phản hồi".
   * Tách ra hàm riêng để nhãn hiển thị không thể lệch khỏi hành vi thật.
   */
  static awaitsParty(
    ticket: Pick<SupportTicketEntity, 'status' | 'pendingReason'>,
    isReporter: boolean,
  ): boolean {
    if (ticket.status !== SupportTicketStatus.PENDING) return false;
    return isReporter
      ? ticket.pendingReason === TicketPendingReason.WAIT_CUSTOMER
      : ticket.pendingReason === TicketPendingReason.WAIT_TASKER;
  }

  /** Luồng (và cũng là vai) của người xem trong ticket — không bao giờ INTERNAL. */
  private viewerAudience(
    ticket: SupportTicketEntity,
    userId: string,
  ): TicketMessageAudience.REPORTER | TicketMessageAudience.COUNTERPARTY {
    return ticket.reporter?.id === userId
      ? TicketMessageAudience.REPORTER
      : TicketMessageAudience.COUNTERPARTY;
  }

  /**
   * Tải 1 TRANG tin của (ticket, audience) theo con trỏ `beforeId` (id tin cũ
   * nhất đang có ở client). Lấy `limit+1` bản (DESC) để biết còn tin cũ hơn,
   * cắt còn `limit`, ĐẢO về ASC, giải mã body, kèm attachments. Dùng chung cho
   * cả user & admin → một nguồn sự thật cho phân trang.
   */
  async loadMessagePage(
    ticketId: string,
    audience: TicketMessageAudience,
    beforeId?: string,
    limit = MESSAGE_PAGE_SIZE,
  ): Promise<{
    messages: TicketMessageEntity[];
    attachments: TicketAttachmentEntity[];
    hasMore: boolean;
  }> {
    // Dùng tên PROPERTY (createdAt) cho orderBy + `.limit()` (không `.take()`):
    // sender là quan hệ to-one nên limit không nhân dòng, tránh cơ chế distinct
    // của TypeORM (đòi ánh xạ orderBy→metadata, vốn lỗi với cột DB thô).
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .where('m.ticket_id = :tid', { tid: ticketId })
      .andWhere('m.audience = :aud', { aud: audience })
      .orderBy('m.createdAt', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .limit(limit + 1);

    if (beforeId) {
      // Neo theo (created_at, id) của tin mốc → lấy các tin CŨ HƠN chặt chẽ.
      const anchor = await this.messageRepo.findOne({
        where: { id: beforeId },
        select: { id: true, createdAt: true },
      });
      if (anchor) {
        qb.andWhere(
          '(m.createdAt < :ca OR (m.createdAt = :ca AND m.id < :bid))',
          { ca: anchor.createdAt, bid: beforeId },
        );
      }
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = (hasMore ? rows.slice(0, limit) : rows).reverse(); // → ASC
    this.crypto.decryptEntities(page);
    const attachments = page.length
      ? await this.attachmentRepo.find({
          where: { message: { id: In(page.map((m) => m.id)) } },
          relations: ['message'],
        })
      : [];
    return { messages: page, attachments, hasMore };
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

  /**
   * Chuẩn hoá danh sách attachmentId người dùng gửi lên: bỏ rỗng + bỏ trùng.
   * Trùng id sẽ làm sai phép đối chiếu số lượng ở {@link assertAttachmentsUsable}.
   */
  static normalizeIds(ids?: string[] | null): string[] {
    return [...new Set((ids ?? []).filter(Boolean))];
  }

  /**
   * KIỂM QUYỀN ảnh đính kèm TRƯỚC khi tạo message.
   *
   * Một attachment chỉ được gắn khi thoả ĐỦ 3 điều kiện:
   *  1. thuộc ĐÚNG ticket này (`ticket_id = ticketId`),
   *  2. CHƯA gắn vào message nào (`message_id IS NULL`) — chống gắn lại/di chuyển,
   *  3. do CHÍNH người đang gửi upload (`uploaded_by_user_id = uploaderUserId`).
   *
   * Thiếu bất kỳ điều kiện nào → 422 (không phải 404) để không xác nhận sự tồn
   * tại của ảnh thuộc ticket khác. Trước đây chỉ dùng `whereInIds` nên ai biết
   * UUID của ảnh ở ticket khác đều re-parent được sang ticket mình — vừa lộ bằng
   * chứng của người khác, vừa xoá bằng chứng khỏi ticket gốc.
   *
   * Gọi TRƯỚC khi lưu message để không để lại message mồ côi khi validate hỏng.
   */
  async assertAttachmentsUsable(
    ticketId: string,
    uploaderUserId: string,
    attachmentIds: string[],
  ): Promise<void> {
    if (attachmentIds.length === 0) return;
    const usable = await this.attachmentRepo.count({
      where: {
        id: In(attachmentIds),
        ticket: { id: ticketId },
        message: IsNull(),
        uploadedBy: { id: uploaderUserId },
      },
    });
    if (usable !== attachmentIds.length) {
      throw new UnprocessableEntityException(
        'Ảnh đính kèm không hợp lệ: không thuộc yêu cầu hỗ trợ này, đã được gửi trước đó, hoặc không do bạn tải lên',
      );
    }
  }

  /**
   * Gắn ảnh vào message vừa tạo. Lặp lại ĐÚNG bộ điều kiện của
   * {@link assertAttachmentsUsable} ngay trong mệnh đề UPDATE (không chỉ dựa vào
   * lần kiểm trước đó) → hai request đồng thời cũng không thể cùng chiếm 1 ảnh.
   * Trả về danh sách ảnh THỰC SỰ đã gắn cho response.
   */
  async attachToMessage(
    ticketId: string,
    messageId: string,
    uploaderUserId: string,
    attachmentIds: string[],
  ): Promise<AttachmentView[]> {
    if (attachmentIds.length === 0) return [];
    await this.attachmentRepo
      .createQueryBuilder()
      .update()
      .set({ message: { id: messageId } })
      .whereInIds(attachmentIds)
      .andWhere('ticket_id = :tid', { tid: ticketId })
      .andWhere('message_id IS NULL')
      .andWhere('uploaded_by_user_id = :uid', { uid: uploaderUserId })
      .execute();
    const rows = await this.attachmentRepo.find({
      where: { message: { id: messageId } },
    });
    return rows.map((a) => ({ id: a.id, url: a.url }));
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
