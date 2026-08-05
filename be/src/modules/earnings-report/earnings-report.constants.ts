import { EarningsReportPeriodType } from 'src/common/enums/earnings-report-period-type.enum';
import type { EarningsReportPeriod } from 'src/common/helpers/earnings-period.helper';

/**
 * Queue riêng thay vì nhồi vào `mailQueue`: processor báo cáo phải gọi
 * `EarningsReportDataService` + `PdfService`, nếu đặt trong MailModule sẽ tạo phụ
 * thuộc vòng `MailModule ↔ EarningsReportModule`.
 */
export const EARNINGS_REPORT_QUEUE = 'earningsReportQueue';
export const EARNINGS_REPORT_JOB_SEND = 'earnings-report-send';

export const EARNINGS_REPORT_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

/**
 * Job chỉ mang ID — PDF được sinh trong processor. Nhét Buffer vào job data sẽ
 * đẩy vài trăm KB mỗi đơn vào Redis.
 */
export interface EarningsReportJobData {
  runId: string;
  taskerId: string;
  period: EarningsReportPeriod;
  periodStartKey: string;
}

/** Số đơn tối đa in trong bảng chi tiết — chặn file đính kèm phình to. */
export const MAX_DETAIL_ROWS = 1000;

/** `:` là ký tự phân tách khoá Redis của BullMQ nên phải đổi sang `-`. */
export function toEarningsReportJobId(
  period: EarningsReportPeriod,
  periodStartKey: string,
  taskerId: string,
): string {
  return `earnings-report-${period}-${periodStartKey}-${taskerId}`;
}

export const PERIOD_TO_TYPE: Record<
  EarningsReportPeriod,
  EarningsReportPeriodType
> = {
  week: EarningsReportPeriodType.WEEK,
  month: EarningsReportPeriodType.MONTH,
  year: EarningsReportPeriodType.YEAR,
};

export const TYPE_TO_PERIOD: Record<
  EarningsReportPeriodType,
  EarningsReportPeriod
> = {
  [EarningsReportPeriodType.WEEK]: 'week',
  [EarningsReportPeriodType.MONTH]: 'month',
  [EarningsReportPeriodType.YEAR]: 'year',
};

/** Nhãn tiếng Việt dùng cho tên file đính kèm. */
export const PERIOD_FILE_LABEL: Record<EarningsReportPeriod, string> = {
  week: 'tuan',
  month: 'thang',
  year: 'nam',
};
