import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { SupportTicketEntity } from './entity/support-ticket.entity';
import { TicketStatusLogEntity } from './entity/ticket-status-log.entity';
import { TicketSurveyEntity } from './entity/ticket-survey.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import {
  ST_JOB_AUTO_CLOSE,
  ST_JOB_CSAT_INVITE,
  ST_JOB_FIRST_RESPONSE_BREACH,
  ST_JOB_SLA_BREACH,
  SUPPORT_TICKET_QUEUE,
} from './support-ticket.constants';

interface JobData {
  ticketId: string;
}

@Processor(SUPPORT_TICKET_QUEUE)
export class SupportTicketProcessor extends WorkerHost {
  private readonly logger = new Logger(SupportTicketProcessor.name);

  constructor(
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(TicketStatusLogEntity)
    private readonly statusLogRepo: Repository<TicketStatusLogEntity>,
    @InjectRepository(TicketSurveyEntity)
    private readonly surveyRepo: Repository<TicketSurveyEntity>,
    private readonly notification: NotificationService,
  ) {
    super();
  }

  async process(job: Job<JobData>): Promise<void> {
    const { ticketId } = job.data;
    switch (job.name) {
      case ST_JOB_SLA_BREACH:
        await this.handleBreach(ticketId);
        break;
      case ST_JOB_FIRST_RESPONSE_BREACH:
        await this.handleFirstResponseBreach(ticketId);
        break;
      case ST_JOB_AUTO_CLOSE:
        await this.handleAutoClose(ticketId);
        break;
      case ST_JOB_CSAT_INVITE:
        await this.handleCsat(ticketId);
        break;
      default:
        this.logger.warn(`Job lạ: ${job.name}`);
    }
  }

  private async handleBreach(ticketId: string): Promise<void> {
    const t = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['assignedAdmin'],
    });
    if (!t) return;
    if (
      t.status === SupportTicketStatus.RESOLVED ||
      t.status === SupportTicketStatus.CLOSED ||
      t.slaBreached
    ) {
      return;
    }
    t.slaBreached = true;
    await this.ticketRepo.save(t);
    this.logger.warn(
      `[metric] notification.ticket.sla_breach ticket=${ticketId} priority=${t.priority}`,
    );
    if (t.assignedAdmin?.id) {
      await this.safeNotify(
        t.assignedAdmin.id,
        ticketId,
        'Ticket vi phạm SLA',
        t.ticketCode,
      );
    }
  }

  /**
   * Quá hạn PHẢN HỒI LẦN ĐẦU. Bỏ qua nếu admin đã trả lời, ticket đã xong, hoặc
   * đã đánh dấu rồi (job có thể chạy lại sau retry). Cảnh báo cho admin phụ
   * trách; nếu ticket còn chưa ai nhận thì báo cho toàn phòng admin, vì đây
   * chính là tình huống "ticket bị bỏ quên" mà SLA phản hồi sinh ra để bắt.
   */
  private async handleFirstResponseBreach(ticketId: string): Promise<void> {
    const t = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['assignedAdmin'],
    });
    if (!t) return;
    if (
      t.firstRespondedAt ||
      t.firstResponseBreached ||
      t.status === SupportTicketStatus.RESOLVED ||
      t.status === SupportTicketStatus.CLOSED
    ) {
      return;
    }
    t.firstResponseBreached = true;
    await this.ticketRepo.save(t);
    this.logger.warn(
      `[metric] notification.ticket.first_response_breach ticket=${ticketId} priority=${t.priority}`,
    );
    if (t.assignedAdmin?.id) {
      await this.safeNotify(
        t.assignedAdmin.id,
        ticketId,
        'Ticket quá hạn phản hồi lần đầu',
        t.ticketCode,
      );
    } else {
      this.logger.warn(
        `[metric] notification.ticket.unassigned_first_response_breach ticket=${ticketId}`,
      );
    }
  }

  private async handleAutoClose(ticketId: string): Promise<void> {
    const t = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!t) return;
    if (t.status !== SupportTicketStatus.RESOLVED) return;
    t.status = SupportTicketStatus.CLOSED;
    t.closedAt = new Date();
    await this.ticketRepo.save(t);
    await this.statusLogRepo.save(
      this.statusLogRepo.create({
        ticket: { id: ticketId },
        oldStatus: SupportTicketStatus.RESOLVED,
        newStatus: SupportTicketStatus.CLOSED,
        changedBy: null,
        note: 'Tự đóng sau thời gian RESOLVED không phản hồi',
      }),
    );
    this.logger.log(`Auto-closed ticket ${ticketId}`);
  }

  private async handleCsat(ticketId: string): Promise<void> {
    const existed = await this.surveyRepo.findOne({
      where: { ticket: { id: ticketId } },
    });
    if (!existed) {
      await this.surveyRepo.save(
        this.surveyRepo.create({ ticket: { id: ticketId } }),
      );
    }
    // Mời reporter đánh giá
    const t = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['reporter'],
    });
    if (t?.reporter?.id) {
      await this.safeNotify(
        t.reporter.id,
        ticketId,
        'Đánh giá chất lượng hỗ trợ',
        t.ticketCode,
      );
    }
    this.logger.log(
      `[metric] notification.ticket.csat_invite ticket=${ticketId}`,
    );
  }

  private async safeNotify(
    userId: string,
    ticketId: string,
    title: string,
    code?: string | null,
  ): Promise<void> {
    try {
      await this.notification.notify({
        userId,
        type: NotificationType.SUPPORT_REPLY,
        title,
        content: code ? `Mã ticket: ${code}` : undefined,
        referenceType: NotificationRefType.SUPPORT_TICKET,
        referenceId: ticketId,
        dedupeKey: `ticket-${ticketId}-${title}`,
      });
    } catch {
      this.logger.warn(`notify lỗi cho ticket ${ticketId}`);
    }
  }
}
