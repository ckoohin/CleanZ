import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuditOutboxStatus } from 'src/common/enums/audit-outbox-status.enum';

export interface AuditRetentionRunResult {
  deletedLogs: number;
  deletedOutboxRows: number;
}

export interface AuditStorageMetrics {
  totalLogs: number;
  logsLast24h: number;
  logsPerDayLast30d: number;
  averageBytesPerLog: number;
  tableSizeBytes: number;
  oldestLogAt: Date | null;
  outboxPending: number;
  outboxFailed: number;
  outboxOldestPendingAt: Date | null;
}

/**
 * Hạn lưu trữ TỐI THIỂU, khớp với trigger `audit_log_guard` trong DB.
 *
 * Cấu hình chỉ được phép GIỮ LÂU HƠN, không được rút ngắn: rút ngắn bằng biến môi
 * trường nghĩa là đổi một dòng `.env` là xoá được nhật ký của tuần trước. DB sẽ
 * từ chối, nhưng chặn ngay ở đây thì thông điệp lỗi rõ ràng hơn nhiều so với một
 * exception từ trigger.
 */
const MIN_RETENTION_MONTHS = 12;

/** Bản ghi outbox đã áp dụng chỉ còn giá trị đối chiếu ngắn hạn. */
const APPLIED_OUTBOX_RETENTION_DAYS = 7;

const DEFAULT_INTERVAL_MS = 6 * 60 * 60_000;
const DEFAULT_BATCH_SIZE = 5_000;

/**
 * Dọn nhật ký quá hạn và đo mức tiêu thụ lưu trữ.
 *
 * Xoá theo lô thay vì một câu `DELETE` duy nhất: sau vài tháng, lần dọn đầu tiên
 * có thể chạm hàng trăm nghìn dòng, và một transaction dài như thế giữ khoá cùng
 * lúc làm phình WAL trên đúng cái bảng mà mọi thao tác admin đang ghi vào.
 *
 * Dùng `setInterval` chứ không phải `@nestjs/schedule` — hệ thống chưa có
 * dependency đó, và các worker hiện tại (outbox thông báo, outbox audit) đều theo
 * cùng khuôn này.
 */
@Injectable()
export class AuditRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditRetentionService.name);
  private readonly intervalMs: number;
  private readonly retentionMonths: number;
  private readonly batchSize: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.intervalMs = this.readPositiveNumber(
      configService.get<string>('AUDIT_RETENTION_INTERVAL_MS'),
      DEFAULT_INTERVAL_MS,
    );
    this.batchSize = this.readPositiveNumber(
      configService.get<string>('AUDIT_RETENTION_BATCH_SIZE'),
      DEFAULT_BATCH_SIZE,
    );

    const configured = this.readPositiveNumber(
      configService.get<string>('AUDIT_RETENTION_MONTHS'),
      MIN_RETENTION_MONTHS,
    );
    this.retentionMonths = Math.max(configured, MIN_RETENTION_MONTHS);
    if (configured < MIN_RETENTION_MONTHS) {
      this.logger.warn(
        `AUDIT_RETENTION_MONTHS=${configured} thấp hơn mức tối thiểu ` +
          `${MIN_RETENTION_MONTHS} tháng — dùng mức tối thiểu. DB cũng sẽ từ chối ` +
          `xoá nhật ký chưa quá hạn.`,
      );
    }
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) return;
    // Trễ một nhịp để lần dọn đầu không tranh tài nguyên với lúc ứng dụng khởi động.
    this.interval = setInterval(() => {
      void this.runSilently();
    }, this.intervalMs);
    this.interval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async runOnce(): Promise<AuditRetentionRunResult> {
    if (this.isRunning) return { deletedLogs: 0, deletedOutboxRows: 0 };

    this.isRunning = true;
    try {
      return {
        deletedLogs: await this.deleteExpiredLogs(),
        deletedOutboxRows: await this.deleteAppliedOutboxRows(),
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Số liệu để quyết định khi nào cần partition. Đo bằng thống kê thật của bảng
   * thay vì ước lượng: `pg_total_relation_size` tính cả index và TOAST, mà
   * `changes`/`business_data` là jsonb nên phần TOAST không nhỏ.
   */
  async getStorageMetrics(): Promise<AuditStorageMetrics> {
    const [row] = await this.dataSource.query<
      Array<Record<string, string | null>>
    >(`
      SELECT
        (SELECT count(*) FROM admin_activity_logs) AS total_logs,
        (SELECT count(*) FROM admin_activity_logs
           WHERE created_at > now() - interval '24 hours') AS logs_last_24h,
        (SELECT count(*) FROM admin_activity_logs
           WHERE created_at > now() - interval '30 days') AS logs_last_30d,
        (SELECT min(created_at) FROM admin_activity_logs) AS oldest_log_at,
        pg_total_relation_size('admin_activity_logs') AS table_size_bytes,
        (SELECT count(*) FROM audit_outbox WHERE status = '${AuditOutboxStatus.PENDING}') AS outbox_pending,
        (SELECT count(*) FROM audit_outbox WHERE status = '${AuditOutboxStatus.FAILED}') AS outbox_failed,
        (SELECT min(created_at) FROM audit_outbox
           WHERE status <> '${AuditOutboxStatus.APPLIED}') AS outbox_oldest_pending_at
    `);

    const totalLogs = Number(row.total_logs ?? 0);
    const tableSizeBytes = Number(row.table_size_bytes ?? 0);
    const logsLast30d = Number(row.logs_last_30d ?? 0);

    return {
      totalLogs,
      logsLast24h: Number(row.logs_last_24h ?? 0),
      logsPerDayLast30d: Math.round(logsLast30d / 30),
      averageBytesPerLog:
        totalLogs > 0 ? Math.round(tableSizeBytes / totalLogs) : 0,
      tableSizeBytes,
      oldestLogAt: row.oldest_log_at ? new Date(row.oldest_log_at) : null,
      outboxPending: Number(row.outbox_pending ?? 0),
      outboxFailed: Number(row.outbox_failed ?? 0),
      outboxOldestPendingAt: row.outbox_oldest_pending_at
        ? new Date(row.outbox_oldest_pending_at)
        : null,
    };
  }

  private async deleteExpiredLogs(): Promise<number> {
    let deleted = 0;

    for (;;) {
      // `ctid` thay cho `id`: không cần đọc index, và lô nào cũng là các dòng cũ
      // nhất còn lại vì đã lọc theo `created_at`.
      const result = await this.dataSource.query<Array<unknown>>(
        `DELETE FROM admin_activity_logs
         WHERE ctid IN (
           SELECT ctid FROM admin_activity_logs
           WHERE created_at < now() - ($1 || ' months')::interval
           LIMIT $2
         )
         RETURNING id`,
        [this.retentionMonths, this.batchSize],
      );

      deleted += result.length;
      if (result.length < this.batchSize) break;
    }

    return deleted;
  }

  /**
   * Dòng outbox đã `APPLIED` là bản sao của thứ đã nằm trong `admin_activity_logs`.
   * Giữ thêm vài ngày để đối chiếu khi nghi ngờ worker ghi sai, rồi bỏ — nếu không
   * bảng hàng đợi sẽ phình ngang bảng nhật ký mà không mang thêm thông tin nào.
   *
   * Bản ghi `FAILED` thì KHÔNG bao giờ tự xoá: đó là những thao tác admin chưa có
   * nhật ký, tức là bằng chứng duy nhất còn lại về chúng.
   */
  private async deleteAppliedOutboxRows(): Promise<number> {
    const result = await this.dataSource.query<Array<unknown>>(
      `DELETE FROM audit_outbox
       WHERE status = $1
         AND applied_at IS NOT NULL
         AND applied_at < now() - ($2 || ' days')::interval
       RETURNING id`,
      [AuditOutboxStatus.APPLIED, APPLIED_OUTBOX_RETENTION_DAYS],
    );
    return result.length;
  }

  private async runSilently(): Promise<void> {
    try {
      const result = await this.runOnce();
      if (result.deletedLogs > 0 || result.deletedOutboxRows > 0) {
        this.logger.log(
          `Dọn nhật ký: xoá ${result.deletedLogs} bản ghi quá ${this.retentionMonths} tháng, ` +
            `${result.deletedOutboxRows} dòng outbox đã áp dụng.`,
        );
      }
    } catch (e) {
      // Dọn được hay không là việc của vận hành, không được làm sập tiến trình.
      this.logger.error(`Audit retention job lỗi: ${String(e)}`);
    }
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
}
