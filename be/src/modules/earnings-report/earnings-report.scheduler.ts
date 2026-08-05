import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  resolvePreviousReportWindow,
  type EarningsReportPeriod,
} from 'src/common/helpers/earnings-period.helper';
import { EarningsReportDispatchService } from './services/earnings-report-dispatch.service';

const PERIODS: EarningsReportPeriod[] = ['week', 'month', 'year'];

/**
 * Tự động gửi bảng kê khi sang kỳ mới.
 *
 * Repo không dùng `@nestjs/schedule`; theo đúng mẫu `BookingExpirationService`:
 * `setInterval` + `unref()` + cờ `isRunning`, và đặt biến môi trường về `<= 0`
 * để tắt hẳn job cho môi trường test/dev.
 *
 * Mỗi tick thử **claim** kỳ vừa kết thúc của cả tuần/tháng/năm. Claim dựa trên
 * partial unique index ở DB nên chạy nhiều instance vẫn chỉ gửi một lần.
 */
@Injectable()
export class EarningsReportScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EarningsReportScheduler.name);
  private readonly intervalMs: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dispatchService: EarningsReportDispatchService,
    configService: ConfigService,
  ) {
    this.intervalMs = Number(
      configService.get<string>('EARNINGS_REPORT_SCHEDULER_INTERVAL_MS') ??
        900_000,
    );
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) {
      this.logger.log('Scheduler bảng kê thu nhập đang TẮT (interval <= 0).');
      return;
    }

    this.interval = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    this.interval.unref?.();

    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  /** Quét cả 3 loại kỳ; lỗi của một kỳ không chặn các kỳ còn lại. */
  async tick(now = new Date()): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      for (const period of PERIODS) {
        const window = resolvePreviousReportWindow(period, now);
        try {
          const run = await this.dispatchService.claimSchedulerRun(
            period,
            window,
          );
          if (!run) continue;

          await this.dispatchService.enqueueForRun(run, period, window);
        } catch (err) {
          this.logger.error(
            `Không xử lý được kỳ ${period}/${window.periodStartKey}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}
