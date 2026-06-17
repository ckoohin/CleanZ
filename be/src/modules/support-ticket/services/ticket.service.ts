import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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

      const msg = await this.messageRepo.save(
        this.messageRepo.create({
          ticket: { id: ticket.id },
          sender: { id: userId },
          body: dto.body,
          isInternal: false,
        }),
      );
      if (dto.attachmentIds?.length) {
        await this.attachmentRepo
          .createQueryBuilder()
          .update()
          .set({ message: { id: msg.id }, ticket: { id: ticket.id } })
          .whereInIds(dto.attachmentIds)
          .execute();
      }

      const isReporter = ticket.reporter?.id === userId;
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

      return {
        id: msg.id,
        senderUserId: userId,
        body: msg.body,
        createdAt: msg.createdAt,
      };
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
      return {
        data: rows.map(toTicketSummary),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }, 'Lỗi khi lấy danh sách ticket');
  }

  async findOneForUser(
    userId: string,
    ticketId: string,
  ): Promise<TicketPublicView> {
    return asyncHandleOperation(async () => {
      const ticket = await this.loadAccessible(ticketId, userId);
      const messages = await this.messageRepo.find({
        where: { ticket: { id: ticketId } },
        relations: ['sender'],
        order: { createdAt: 'ASC' },
      });
      return toPublicView(ticket, messages);
    }, 'Lỗi khi lấy chi tiết ticket');
  }

  private async loadAccessible(
    ticketId: string,
    userId: string,
  ): Promise<SupportTicketEntity> {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['booking', 'reporter', 'counterparty'],
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
