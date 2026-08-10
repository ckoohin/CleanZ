import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { AuditOutboxStatus } from 'src/common/enums/audit-outbox-status.enum';
import { AdminActivityLogEntity } from '../entities/admin-activity-log.entity';
import { AuditOutboxEntity } from '../entities/audit-outbox.entity';
import { IncidentAlertService } from 'src/modules/incident/services/incident-alert.service';

export interface AuditOutboxRunResult {
  processed: number;
  applied: number;
  failed: number;
  terminalFailed: number;
}

const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 5 * 60_000;
const LAST_ERROR_MAX_LENGTH = 2_000;

/**
 * Chuyển các bản ghi trong `audit_outbox` sang `admin_activity_logs`.
 *
 * Dựng theo đúng khuôn `IncidentNotificationOutboxWorkerService` đang chạy trong
 * hệ thống — cùng cơ chế khoá `FOR UPDATE SKIP LOCKED`, cùng backoff luỹ thừa,
 * cùng cách đọc/ghi thời gian bằng đồng hồ DB.
 */
@Injectable()
export class AuditOutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditOutboxWorkerService.name);
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly alert: IncidentAlertService,
    configService: ConfigService,
  ) {
    this.intervalMs = this.readPositiveNumber(
      configService.get<string>('AUDIT_OUTBOX_INTERVAL_MS'),
      DEFAULT_INTERVAL_MS,
    );
    this.batchSize = this.readPositiveNumber(
      configService.get<string>('AUDIT_OUTBOX_BATCH_SIZE'),
      DEFAULT_BATCH_SIZE,
    );
    this.maxRetries = this.readPositiveNumber(
      configService.get<string>('AUDIT_OUTBOX_MAX_RETRIES'),
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

  async runDueBatch(): Promise<AuditOutboxRunResult> {
    if (this.isRunning) {
      return { processed: 0, applied: 0, failed: 0, terminalFailed: 0 };
    }

    this.isRunning = true;
    try {
      const result: AuditOutboxRunResult = {
        processed: 0,
        applied: 0,
        failed: 0,
        terminalFailed: 0,
      };

      for (let i = 0; i < this.batchSize; i += 1) {
        const one = await this.processOneDueRow();
        if (!one) break;

        result.processed += 1;
        if (one.status === AuditOutboxStatus.APPLIED) {
          result.applied += 1;
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
      .getRepository(AuditOutboxEntity)
      .createQueryBuilder('outbox')
      .where('outbox.status = :failed', { failed: AuditOutboxStatus.FAILED })
      .andWhere('outbox.retryCount >= :maxRetries', {
        maxRetries: this.maxRetries,
      })
      .getCount();
  }

  private async runSilently(): Promise<void> {
    try {
      const result = await this.runDueBatch();
      if (result.terminalFailed > 0) {
        const totalFailed = await this.countTerminalFailedRows();
        const message =
          `Nhật ký kiểm toán ghi thất bại vĩnh viễn: thêm ${result.terminalFailed} ` +
          `(tổng ${totalFailed}) sau ${this.maxRetries} lần thử. Các thao tác admin ` +
          `tương ứng KHÔNG có nhật ký — payload còn trong bảng "audit_outbox".`;
        this.logger.error(message);
        // Ra kênh cảnh báo thật, không chỉ log console. Nghịch lý trước đây: một
        // thông báo gửi hỏng thì bắn alert, còn mất vĩnh viễn bằng chứng "ai đã
        // chuyển tiền" thì chỉ nằm im trong log. Mất nhật ký nặng hơn nhiều, và
        // càng phát hiện muộn thì càng không còn gì để dựng lại.
        await this.alert.send(
          'audit-outbox-terminal-failed',
          message,
          'CRITICAL',
        );
      }
    } catch (e) {
      this.logger.error(`Audit outbox worker error: ${String(e)}`);
    }
  }

  private async processOneDueRow(): Promise<{
    status: AuditOutboxStatus.APPLIED | AuditOutboxStatus.FAILED;
    terminalFailed: boolean;
  } | null> {
    return this.dataSource.transaction(async (manager) => {
      const row = await this.lockNextDueRow(manager);
      if (!row) return null;

      try {
        const logRepo = manager.getRepository(AdminActivityLogEntity);
        // `createdAt` lấy từ `occurredAt` chứ không để `@CreateDateColumn` tự
        // điền: nếu không, dấu thời gian của nhật ký là giờ worker chạy, và hai
        // thao tác sẽ đảo thứ tự chỉ vì một trong hai phải retry.
        await logRepo.save(
          logRepo.create({ ...row.payload, createdAt: row.occurredAt }),
        );
        row.status = AuditOutboxStatus.APPLIED;
        row.appliedAt = await this.getDatabaseNow(manager);
        row.nextRetryAt = null;
        row.lastError = null;
        await manager.getRepository(AuditOutboxEntity).save(row);
        return { status: AuditOutboxStatus.APPLIED, terminalFailed: false };
      } catch (e) {
        const dbNow = await this.getDatabaseNow(manager);
        const nextRetryCount = row.retryCount + 1;
        const terminalFailed = nextRetryCount >= this.maxRetries;

        row.status = AuditOutboxStatus.FAILED;
        row.retryCount = nextRetryCount;
        row.lastError = this.serializeError(e);
        row.nextRetryAt = terminalFailed
          ? null
          : this.calculateNextRetryAt(dbNow, nextRetryCount);

        await manager.getRepository(AuditOutboxEntity).save(row);
        return { status: AuditOutboxStatus.FAILED, terminalFailed };
      }
    });
  }

  /**
   * `nextRetryAt` được GHI bằng đồng hồ DB nên phải ĐỌC cũng bằng `now()` của DB —
   * so bằng đồng hồ app tạo lệch có hệ thống chứ không phải nhiễu ngẫu nhiên.
   */
  private lockNextDueRow(
    manager: EntityManager,
  ): Promise<AuditOutboxEntity | null> {
    return manager
      .getRepository(AuditOutboxEntity)
      .createQueryBuilder('outbox')
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .where(
        '(outbox.status = :pending AND (outbox.nextRetryAt IS NULL OR outbox.nextRetryAt <= now()))',
        { pending: AuditOutboxStatus.PENDING },
      )
      .orWhere(
        '(outbox.status = :failed AND outbox.retryCount < :maxRetries AND outbox.nextRetryAt IS NOT NULL AND outbox.nextRetryAt <= now())',
        { failed: AuditOutboxStatus.FAILED, maxRetries: this.maxRetries },
      )
      .orderBy('outbox.createdAt', 'ASC')
      .addOrderBy('outbox.id', 'ASC')
      .getOne();
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
    return (raw ?? String(e)).slice(0, LAST_ERROR_MAX_LENGTH);
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
    const rows = await manager.query('SELECT now() AS now');
    return new Date(rows[0].now);
  }
}
