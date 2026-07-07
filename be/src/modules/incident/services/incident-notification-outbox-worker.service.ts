import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationOutboxStatus } from 'src/common/enums/notification-outbox-status.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotifyInput } from 'src/modules/notification/types/notify-input.interface';
import {
  INCIDENT_NOTIFICATION_OUTBOX_BATCH_SIZE,
  INCIDENT_NOTIFICATION_OUTBOX_INTERVAL_MS,
  INCIDENT_NOTIFICATION_OUTBOX_MAX_RETRIES,
} from '../incident.constants';
import { NotificationOutboxEntity } from '../entity/notification-outbox.entity';

export interface NotificationOutboxRunResult {
  processed: number;
  sent: number;
  failed: number;
  terminalFailed: number;
}

const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 5 * 60_000;
const LAST_ERROR_MAX_LENGTH = 2_000;

@Injectable()
export class IncidentNotificationOutboxWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    IncidentNotificationOutboxWorkerService.name,
  );
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notification: NotificationService,
    configService: ConfigService,
  ) {
    this.intervalMs = this.readPositiveNumber(
      configService.get<string>(INCIDENT_NOTIFICATION_OUTBOX_INTERVAL_MS),
      DEFAULT_INTERVAL_MS,
    );
    this.batchSize = this.readPositiveNumber(
      configService.get<string>(INCIDENT_NOTIFICATION_OUTBOX_BATCH_SIZE),
      DEFAULT_BATCH_SIZE,
    );
    this.maxRetries = this.readPositiveNumber(
      configService.get<string>(INCIDENT_NOTIFICATION_OUTBOX_MAX_RETRIES),
      DEFAULT_MAX_RETRIES,
    );
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) return;
    this.interval = setInterval(() => {
      void this.runSilently();
    }, this.intervalMs);
    this.interval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async runDueBatch(): Promise<NotificationOutboxRunResult> {
    if (this.isRunning) {
      return { processed: 0, sent: 0, failed: 0, terminalFailed: 0 };
    }

    this.isRunning = true;
    try {
      const result: NotificationOutboxRunResult = {
        processed: 0,
        sent: 0,
        failed: 0,
        terminalFailed: 0,
      };

      for (let i = 0; i < this.batchSize; i += 1) {
        const one = await this.processOneDueRow();
        if (!one) break;

        result.processed += 1;
        if (one.status === NotificationOutboxStatus.SENT) {
          result.sent += 1;
        } else {
          result.failed += 1;
          if (one.terminalFailed) result.terminalFailed += 1;
        }
      }

      return result;
    } finally {
      this.isRunning = false;
    }
  }

  async countTerminalFailedRows(): Promise<number> {
    return this.dataSource
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder('outbox')
      .where('outbox.status = :failed', {
        failed: NotificationOutboxStatus.FAILED,
      })
      .andWhere('outbox.retryCount >= :maxRetries', {
        maxRetries: this.maxRetries,
      })
      .getCount();
  }

  private async runSilently(): Promise<void> {
    try {
      const result = await this.runDueBatch();
      if (result.processed > 0) {
        this.logger.log(
          `Notification outbox: processed=${result.processed} sent=${result.sent} failed=${result.failed} terminalFailed=${result.terminalFailed}`,
        );
      }

      if (result.terminalFailed > 0) {
        const totalFailed = await this.countTerminalFailedRows();
        this.logger.warn(
          `Notification outbox terminal failures: new=${result.terminalFailed} total=${totalFailed}`,
        );
      }
    } catch (e) {
      this.logger.error(`Notification outbox worker error: ${String(e)}`);
    }
  }

  private async processOneDueRow(): Promise<{
    status: NotificationOutboxStatus.SENT | NotificationOutboxStatus.FAILED;
    terminalFailed: boolean;
  } | null> {
    return this.dataSource.transaction(async (manager) => {
      const row = await this.lockNextDueRow(manager);
      if (!row) return null;

      try {
        await this.notification.notify(this.toNotifyInput(row));
        row.status = NotificationOutboxStatus.SENT;
        row.sentAt = await this.getDatabaseNow(manager);
        row.nextRetryAt = null;
        row.lastError = null;
        await manager.getRepository(NotificationOutboxEntity).save(row);
        return { status: NotificationOutboxStatus.SENT, terminalFailed: false };
      } catch (e) {
        const dbNow = await this.getDatabaseNow(manager);
        const nextRetryCount = row.retryCount + 1;
        const terminalFailed = nextRetryCount >= this.maxRetries;

        row.status = NotificationOutboxStatus.FAILED;
        row.retryCount = nextRetryCount;
        row.sentAt = null;
        row.lastError = this.serializeError(e);
        row.nextRetryAt = terminalFailed
          ? null
          : this.calculateNextRetryAt(dbNow, nextRetryCount);

        await manager.getRepository(NotificationOutboxEntity).save(row);
        if (terminalFailed) {
          this.logger.warn(
            `Notification outbox ${row.id} failed permanently after ${nextRetryCount} attempts`,
          );
        }
        return {
          status: NotificationOutboxStatus.FAILED,
          terminalFailed,
        };
      }
    });
  }

  private lockNextDueRow(
    manager: EntityManager,
  ): Promise<NotificationOutboxEntity | null> {
    const now = new Date();
    return manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder('outbox')
      .leftJoinAndSelect('outbox.recipient', 'recipient')
      // Postgres cấm FOR UPDATE trên nhánh nullable của outer join (recipient là
      // ManyToOne nullable) → chỉ khóa bảng outbox: FOR UPDATE OF outbox SKIP LOCKED.
      .setLock('pessimistic_write', undefined, ['outbox'])
      .setOnLocked('skip_locked')
      .where(
        '(outbox.status = :pending AND (outbox.nextRetryAt IS NULL OR outbox.nextRetryAt <= :now))',
        {
          pending: NotificationOutboxStatus.PENDING,
          now,
        },
      )
      .orWhere(
        '(outbox.status = :failed AND outbox.retryCount < :maxRetries AND outbox.nextRetryAt IS NOT NULL AND outbox.nextRetryAt <= :now)',
        {
          failed: NotificationOutboxStatus.FAILED,
          maxRetries: this.maxRetries,
          now,
        },
      )
      .orderBy('outbox.createdAt', 'ASC')
      .addOrderBy('outbox.id', 'ASC')
      .getOne();
  }

  private toNotifyInput(row: NotificationOutboxEntity): NotifyInput {
    return {
      userId: row.recipient.id,
      type: NotificationType.INCIDENT_UPDATE,
      title: this.buildTitle(row),
      content: this.buildContent(row),
      referenceType: NotificationRefType.INCIDENT,
      referenceId: row.refId,
      dedupeKey: row.dedupeKey,
    };
  }

  private buildTitle(row: NotificationOutboxEntity): string {
    switch (row.eventType) {
      case 'INCIDENT_DECISION_DRAFT_SUBMITTED':
        return 'Quyết định sự cố cần bạn phản hồi';
      case 'INCIDENT_TASKER_DECISION_RESPONDED':
        return 'Tasker đã phản hồi quyết định sự cố';
      case 'INCIDENT_DECISION_FINALIZED':
        return 'Quyết định sự cố đã được chốt';
      case 'INCIDENT_SECOND_APPROVAL_REQUESTED_CHANGES':
        return 'Yêu cầu chỉnh sửa quyết định sự cố';
      case 'INCIDENT_COMPENSATION_RECORDED':
        return 'Đã ghi nhận bồi thường sự cố';
      default:
        return 'Cập nhật sự cố';
    }
  }

  private buildContent(row: NotificationOutboxEntity): string {
    const code = this.payloadString(row, 'incidentCode');
    const suffix = code ? ` (mã ${code})` : '';

    switch (row.eventType) {
      case 'INCIDENT_DECISION_DRAFT_SUBMITTED': {
        const deadline = this.payloadDate(row, 'taskerResponseDeadline');
        const deadlineText = deadline ? ` trước ${deadline}` : '';
        return `CleanZ đã gửi quyết định xử lý sự cố${suffix} và cần bạn phản hồi (đồng ý hoặc phản đối)${deadlineText}. Vui lòng mở sự cố để xem chi tiết và phản hồi.`;
      }
      case 'INCIDENT_TASKER_DECISION_RESPONDED': {
        const t = this.payloadString(row, 'responseType');
        const verb =
          t === 'AGREE' ? 'đồng ý' : t === 'DISAGREE' ? 'phản đối' : 'phản hồi';
        return `Tasker đã ${verb} quyết định xử lý sự cố${suffix}. Vui lòng xem xét phản hồi để chốt quyết định.`;
      }
      case 'INCIDENT_DECISION_FINALIZED': {
        const status = this.payloadString(row, 'status');
        const approved = this.payloadNumber(row, 'approvedAmount');
        if (status === 'REJECTED') {
          return `CleanZ đã chốt từ chối yêu cầu bồi thường cho sự cố${suffix}.`;
        }
        const amountText =
          approved != null ? ` với số tiền ${this.formatVnd(approved)}` : '';
        return `CleanZ đã chốt duyệt bồi thường cho sự cố${suffix}${amountText}.`;
      }
      case 'INCIDENT_SECOND_APPROVAL_REQUESTED_CHANGES': {
        const note = this.payloadString(row, 'note');
        const noteText = note ? ` Ghi chú: ${note}` : '';
        return `Admin duyệt cấp 2 yêu cầu chỉnh sửa quyết định xử lý sự cố${suffix}.${noteText}`;
      }
      case 'INCIDENT_COMPENSATION_RECORDED': {
        // Payload của Tasker có taskerBorneAmount, của Khách hàng thì không.
        const taskerBorne = this.payloadNumber(row, 'taskerBorneAmount');
        if (taskerBorne != null) {
          return `Phần trách nhiệm bồi thường của bạn (${this.formatVnd(taskerBorne)}) cho sự cố${suffix} đã được trừ từ ví/cọc.`;
        }
        const approved = this.payloadNumber(row, 'approvedAmount');
        const amountText =
          approved != null ? ` ${this.formatVnd(approved)}` : '';
        // P0.4 — chi trả thủ công: khách nhận chuyển khoản ngân hàng, không vào ví.
        if (row.payload?.manual === true) {
          return `Khoản bồi thường${amountText} cho sự cố${suffix} đã được chuyển khoản tới tài khoản ngân hàng của bạn.`;
        }
        return `Khoản bồi thường${amountText} cho sự cố${suffix} đã được hoàn vào ví của bạn.`;
      }
      default: {
        const message = row.payload?.message;
        if (typeof message === 'string' && message.trim()) {
          return message.trim();
        }
        return `${this.buildTitle(row)}${suffix}`.trim();
      }
    }
  }

  private payloadString(
    row: NotificationOutboxEntity,
    key: string,
  ): string | null {
    const v = row.payload?.[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  }

  private payloadNumber(
    row: NotificationOutboxEntity,
    key: string,
  ): number | null {
    const v = row.payload?.[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) {
      return Number(v);
    }
    return null;
  }

  private payloadDate(
    row: NotificationOutboxEntity,
    key: string,
  ): string | null {
    const v = row.payload?.[key];
    if (typeof v !== 'string' && !(v instanceof Date)) return null;
    const d = new Date(v as string);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('vi-VN');
  }

  private formatVnd(amount: number): string {
    return `${amount.toLocaleString('vi-VN')}đ`;
  }

  private calculateNextRetryAt(base: Date, retryCount: number): Date {
    const exponent = Math.max(0, retryCount - 1);
    const backoffMs = Math.min(2 ** exponent * 5_000, MAX_BACKOFF_MS);
    return new Date(base.getTime() + backoffMs);
  }

  private serializeError(e: unknown): string {
    const raw =
      e instanceof Error
        ? `${e.name}: ${e.message}`
        : typeof e === 'string'
          ? e
          : JSON.stringify(e);
    const text = raw ?? String(e);
    return text.slice(0, LAST_ERROR_MAX_LENGTH);
  }

  private readPositiveNumber(
    value: string | undefined,
    fallback: number,
  ): number {
    if (value == null || value.trim() === '') return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  private async getDatabaseNow(manager: EntityManager): Promise<Date> {
    const rows = (await manager.query('SELECT now() AS now')) as Array<{
      now: Date | string;
    }>;
    return new Date(rows[0].now);
  }
}
