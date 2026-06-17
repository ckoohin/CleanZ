import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketConfigService } from './ticket-config.service';
import {
  ST_JOB_SLA_BREACH,
  ST_JOB_AUTO_CLOSE,
  ST_JOB_CSAT_INVITE,
  SUPPORT_TICKET_QUEUE,
  stJobId,
} from '../support-ticket.constants';

@Injectable()
export class TicketSlaService {
  private readonly logger = new Logger(TicketSlaService.name);

  constructor(
    @InjectQueue(SUPPORT_TICKET_QUEUE) private readonly queue: Queue,
    private readonly config: TicketConfigService,
  ) {}

  async computeDue(
    priority: TicketPriority,
    createdAt: Date,
  ): Promise<{ firstResponseDueAt: Date; resolutionDueAt: Date }> {
    const sla = await this.config.getSlaWindow(priority);
    return {
      firstResponseDueAt: new Date(
        createdAt.getTime() + sla.responseMins * 60000,
      ),
      resolutionDueAt: new Date(
        createdAt.getTime() + sla.resolutionMins * 60000,
      ),
    };
  }

  async scheduleBreach(ticket: SupportTicketEntity): Promise<void> {
    if (!ticket.resolutionDueAt) return;
    const delay = Math.max(0, ticket.resolutionDueAt.getTime() - Date.now());
    const jobId = stJobId(ST_JOB_SLA_BREACH, ticket.id);
    await this.safeRemove(jobId);
    await this.queue.add(
      ST_JOB_SLA_BREACH,
      { ticketId: ticket.id },
      { jobId, delay, removeOnComplete: 1000, removeOnFail: 1000 },
    );
  }

  async cancelBreach(ticketId: string): Promise<void> {
    await this.safeRemove(stJobId(ST_JOB_SLA_BREACH, ticketId));
  }

  async onPause(ticket: SupportTicketEntity): Promise<void> {
    ticket.slaPausedAt = new Date();
    await this.cancelBreach(ticket.id);
  }

  async onResume(ticket: SupportTicketEntity): Promise<void> {
    if (ticket.slaPausedAt) {
      const delta = Date.now() - ticket.slaPausedAt.getTime();
      const accum = Number(ticket.slaPausedAccumMs ?? 0) + delta;
      ticket.slaPausedAccumMs = String(accum);
      if (ticket.resolutionDueAt) {
        ticket.resolutionDueAt = new Date(
          ticket.resolutionDueAt.getTime() + delta,
        );
      }
      ticket.slaPausedAt = null;
    }
    await this.scheduleBreach(ticket);
  }

  async scheduleAutoClose(ticketId: string): Promise<void> {
    const hours = await this.config.getAutoCloseHours();
    const jobId = stJobId(ST_JOB_AUTO_CLOSE, ticketId);
    await this.safeRemove(jobId);
    await this.queue.add(
      ST_JOB_AUTO_CLOSE,
      { ticketId },
      {
        jobId,
        delay: hours * 3600000,
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }

  async cancelAutoClose(ticketId: string): Promise<void> {
    await this.safeRemove(stJobId(ST_JOB_AUTO_CLOSE, ticketId));
  }

  async enqueueCsat(ticketId: string): Promise<void> {
    await this.queue.add(
      ST_JOB_CSAT_INVITE,
      { ticketId },
      {
        jobId: stJobId(ST_JOB_CSAT_INVITE, ticketId),
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }

  private async safeRemove(jobId: string): Promise<void> {
    try {
      await this.queue.remove(jobId);
    } catch {
      this.logger.debug(`Job ${jobId} không tồn tại để xoá (bỏ qua)`);
    }
  }
}
