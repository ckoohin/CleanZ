import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketConfigService } from './ticket-config.service';
import {
  ST_JOB_SLA_BREACH,
  ST_JOB_FIRST_RESPONSE_BREACH,
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

  /**
   * Hẹn kiểm tra QUÁ HẠN PHẢN HỒI LẦN ĐẦU. Trước đây `firstResponseDueAt` được
   * ghi lúc tạo ticket nhưng không ai so sánh, nên cấu hình `responseMins`
   * (15/30/120 phút) hoàn toàn không sinh cảnh báo.
   */
  async scheduleFirstResponse(ticket: SupportTicketEntity): Promise<void> {
    if (!ticket.firstResponseDueAt || ticket.firstRespondedAt) return;
    const delay = Math.max(0, ticket.firstResponseDueAt.getTime() - Date.now());
    const jobId = stJobId(ST_JOB_FIRST_RESPONSE_BREACH, ticket.id);
    await this.safeRemove(jobId);
    await this.queue.add(
      ST_JOB_FIRST_RESPONSE_BREACH,
      { ticketId: ticket.id },
      { jobId, delay, removeOnComplete: 1000, removeOnFail: 1000 },
    );
  }

  async cancelFirstResponse(ticketId: string): Promise<void> {
    await this.safeRemove(stJobId(ST_JOB_FIRST_RESPONSE_BREACH, ticketId));
  }

  /**
   * Lý do tạm chờ nào được phép DỪNG đồng hồ SLA.
   *
   * Chỉ dừng khi đang chờ BÊN NGOÀI (khách/tasker) — thứ nằm ngoài tầm kiểm
   * soát của CleanZ. `WAIT_INTERNAL` là việc của chính CleanZ nên đồng hồ vẫn
   * chạy: trước đây mọi lý do đều dừng SLA, tức admin chỉ cần chọn "Chờ nội bộ"
   * là tự tắt được đồng hồ đo hiệu suất của mình.
   *
   * `WAIT_TASKER` có thể tắt qua cấu hình `TICKET_SLA_PAUSE_ON_WAIT_TASKER`
   * (khoá này trước đây được khai báo nhưng không service nào đọc).
   */
  async shouldPause(reason?: TicketPendingReason | null): Promise<boolean> {
    if (reason === TicketPendingReason.WAIT_CUSTOMER) return true;
    if (reason === TicketPendingReason.WAIT_TASKER) {
      return this.config.getPauseOnWaitTasker();
    }
    return false; // WAIT_INTERNAL hoặc không rõ lý do → SLA vẫn chạy
  }

  /**
   * Đồng bộ cờ vi phạm với hạn HIỆN TẠI. Gọi mỗi khi `resolutionDueAt` đổi
   * (gia hạn sau tạm dừng, phân loại lại đổi độ ưu tiên). Trước đây cờ chỉ được
   * bật, không bao giờ gỡ — ticket đã gia hạn hợp lệ vẫn mang nhãn "vi phạm SLA"
   * vĩnh viễn, làm sai mọi thống kê.
   */
  refreshBreachFlag(ticket: SupportTicketEntity): void {
    ticket.slaBreached = ticket.resolutionDueAt
      ? new Date() > ticket.resolutionDueAt
      : false;
  }

  /**
   * Phần THUẦN TÍNH TOÁN của tạm dừng: chỉ mutate entity, không đụng hàng đợi.
   * Tách ra để nơi gọi ghi DB trong transaction rồi mới xử lý job SAU KHI COMMIT
   * — job đã hẹn/đã huỷ không thể rollback theo transaction.
   *
   * @returns có thật sự dừng đồng hồ không (nơi gọi dùng để quyết định huỷ job).
   */
  async applyPause(
    ticket: SupportTicketEntity,
    reason?: TicketPendingReason | null,
  ): Promise<boolean> {
    if (!(await this.shouldPause(reason))) {
      ticket.slaPausedAt = null;
      return false;
    }
    ticket.slaPausedAt = new Date();
    return true;
  }

  /** Phần THUẦN TÍNH TOÁN của tiếp tục chạy SLA (xem {@link applyPause}). */
  applyResume(ticket: SupportTicketEntity): void {
    if (!ticket.slaPausedAt) return;
    const delta = Date.now() - ticket.slaPausedAt.getTime();
    ticket.slaPausedAccumMs = String(
      Number(ticket.slaPausedAccumMs ?? 0) + delta,
    );
    if (ticket.resolutionDueAt) {
      ticket.resolutionDueAt = new Date(
        ticket.resolutionDueAt.getTime() + delta,
      );
    }
    ticket.slaPausedAt = null;
    // Hạn vừa được đẩy lùi → cờ vi phạm cũ có thể không còn đúng.
    this.refreshBreachFlag(ticket);
  }

  async onPause(
    ticket: SupportTicketEntity,
    reason?: TicketPendingReason | null,
  ): Promise<void> {
    if (await this.applyPause(ticket, reason)) {
      await this.cancelBreach(ticket.id);
    }
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
      // Hạn vừa được đẩy lùi → cờ vi phạm cũ có thể không còn đúng.
      this.refreshBreachFlag(ticket);
    }
    await this.scheduleBreach(ticket);
  }

  /**
   * Tính lại hạn khi ĐỘ ƯU TIÊN đổi (phân loại lại). Mốc gốc vẫn là thời điểm
   * TẠO ticket, cộng thêm tổng thời gian đã tạm dừng — không tính từ "bây giờ",
   * vì một ticket URGENT nằm 2 ngày thì đúng là đã trễ, không nên được xoá nợ.
   */
  async recomputeForPriority(ticket: SupportTicketEntity): Promise<void> {
    const sla = await this.config.getSlaWindow(ticket.priority);
    const pausedMs = Number(ticket.slaPausedAccumMs ?? 0);
    const base = ticket.createdAt?.getTime() ?? Date.now();
    ticket.firstResponseDueAt = new Date(
      base + sla.responseMins * 60000 + pausedMs,
    );
    ticket.resolutionDueAt = new Date(
      base + sla.resolutionMins * 60000 + pausedMs,
    );
    this.refreshBreachFlag(ticket);
    await this.scheduleBreach(ticket);
    if (!ticket.firstRespondedAt) {
      await this.scheduleFirstResponse(ticket);
    }
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
