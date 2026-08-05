import type { TaskerEarningsPeriod } from 'src/modules/wallet/dto/tasker-earnings-breakdown-query.dto';

/**
 * Logic biên kỳ thu nhập theo GIỜ VIỆT NAM, tách ra khỏi `wallet.service.ts` để
 * màn hình in-app và bảng kê PDF dùng chung đúng một định nghĩa "đầu kỳ / cuối kỳ".
 * Trước đây logic này là module-private trong wallet.service; thêm một bản sao thứ
 * hai cho báo cáo sẽ khiến số trong PDF lệch số trong app khi một bên được sửa.
 *
 * Quy ước xuyên suốt: mọi mốc thời gian "local" là **giờ VN được gói trong epoch
 * UTC** (cộng sẵn offset +7), nên đọc bằng các hàm `getUTC*`.
 */

export const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Kỳ có biên lịch rõ ràng — dùng cho cả breakdown in-app lẫn bảng kê định kỳ. */
export type EarningsReportPeriod = Exclude<TaskerEarningsPeriod, 'today'>;

export type CalendarPeriod = 'day' | 'week' | 'month' | 'year';

export interface EarningsPeriodOption {
  value: string;
  label: string;
  isCurrent: boolean;
}

export interface EarningsBucketTemplate {
  key: string;
  label: string;
  dateLabel: string;
  rangeStart: string;
  rangeEnd: string;
}

export interface EarningsWindow {
  startAt: string;
  endAt: string;
  availableFrom: string;
  availableTo: string;
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
  selectedValue: string;
  options: EarningsPeriodOption[];
  bucketUnit: 'hour' | 'day' | 'month';
  bucketFormat: 'YYYY-MM-DD HH24' | 'YYYY-MM-DD' | 'YYYY-MM';
  points: EarningsBucketTemplate[];
}

/** Cửa sổ truy vấn của một kỳ báo cáo đã chốt. */
export interface EarningsReportWindow {
  /** Biên dưới cho cột `timestamp` (giờ VN), đã bao gồm. */
  startAt: string;
  /** Biên trên (giờ VN), **không** bao gồm — luôn dùng `>= startAt AND < endAt`. */
  endAt: string;
  /** Ngày đầu kỳ `YYYY-MM-DD` — khoá định danh kỳ, dùng cho claim và tên file. */
  periodStartKey: string;
  rangeLabel: string;
  periodStart: Date;
  periodEnd: Date;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

export const localDateKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

export const localMonthKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;

/**
 * Biên truy vấn cho cột `timestamp` trong DB — nay lưu theo GIỜ VIỆT NAM
 * (migration NormalizeTimestampsToVietnamTime) nên KHÔNG trừ offset nữa.
 * `localTime` vốn đã là giờ VN được gói trong epoch UTC, nên lấy thẳng chữ số.
 */
export const databaseVietnamTimestamp = (localTime: number): string =>
  new Date(localTime).toISOString().slice(0, 23).replace('T', ' ');

export const utcIsoFromLocal = (localTime: number): string =>
  new Date(localTime - VIETNAM_UTC_OFFSET_MS).toISOString();

export const localDateLabel = (
  localTime: number,
  includeYear = false,
): string => {
  const date = new Date(localTime);
  const value = `${pad2(date.getUTCDate())}/${pad2(date.getUTCMonth() + 1)}`;
  return includeYear ? `${value}/${date.getUTCFullYear()}` : value;
};

export const startOfLocalWeek = (localTime: number): number => {
  const date = new Date(localTime);
  const daysFromMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysFromMonday,
  );
};

export const startOfLocalMonth = (localTime: number): number => {
  const date = new Date(localTime);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
};

export const startOfLocalYear = (localTime: number): number => {
  const date = new Date(localTime);
  return Date.UTC(date.getUTCFullYear(), 0, 1);
};

export const parseLocalAnchor = (
  anchor: string | undefined,
  fallback: number,
): number => {
  if (!anchor) return fallback;
  const [year, month, day] = anchor.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

export const nextPeriodStart = (
  period: EarningsReportPeriod,
  localTime: number,
): number => {
  const date = new Date(localTime);
  if (period === 'week') return localTime + 7 * 24 * 60 * 60 * 1000;
  if (period === 'month') {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  }
  return Date.UTC(date.getUTCFullYear() + 1, 0, 1);
};

export const periodStart = (
  period: EarningsReportPeriod,
  localTime: number,
): number => {
  if (period === 'week') return startOfLocalWeek(localTime);
  if (period === 'month') return startOfLocalMonth(localTime);
  return startOfLocalYear(localTime);
};

export const periodOptionLabel = (
  period: EarningsReportPeriod,
  localTime: number,
): string => {
  const date = new Date(localTime);
  if (period === 'week') {
    const end = localTime + 6 * 24 * 60 * 60 * 1000;
    const crossesYear =
      date.getUTCFullYear() !== new Date(end).getUTCFullYear();
    return crossesYear
      ? `${localDateLabel(localTime, true)} - ${localDateLabel(end, true)}`
      : `${localDateLabel(localTime)} - ${localDateLabel(end, true)}`;
  }
  if (period === 'month') {
    return `Tháng ${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
  }
  return `Năm ${date.getUTCFullYear()}`;
};

const buildPeriodOptions = (
  period: EarningsReportPeriod,
  accountCreatedLocal: number,
  currentLocal: number,
): EarningsPeriodOption[] => {
  const first = periodStart(period, accountCreatedLocal);
  const current = periodStart(period, currentLocal);
  const options: EarningsPeriodOption[] = [];

  for (
    let cursor = first;
    cursor <= current;
    cursor = nextPeriodStart(period, cursor)
  ) {
    options.push({
      value: localDateKey(new Date(cursor)),
      label: periodOptionLabel(period, cursor),
      isCurrent: cursor === current,
    });
  }

  return options.reverse();
};

export const buildEarningsWindow = (
  period: TaskerEarningsPeriod,
  accountCreatedAt: Date,
  anchor?: string,
  now = new Date(),
): EarningsWindow => {
  const vietnamNow = new Date(now.getTime() + VIETNAM_UTC_OFFSET_MS);
  const vietnamAccountCreated = new Date(
    accountCreatedAt.getTime() + VIETNAM_UTC_OFFSET_MS,
  );
  const currentLocal = Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    vietnamNow.getUTCDate(),
  );
  const accountCreatedLocal = Date.UTC(
    vietnamAccountCreated.getUTCFullYear(),
    vietnamAccountCreated.getUTCMonth(),
    vietnamAccountCreated.getUTCDate(),
  );
  let startLocal: number;
  let endLocal: number;
  let rangeLabel: string;
  let selectedValue: string;
  let options: EarningsPeriodOption[];
  let bucketUnit: EarningsWindow['bucketUnit'];
  let bucketFormat: EarningsWindow['bucketFormat'];
  let points: EarningsBucketTemplate[];
  const availableFrom = localDateKey(new Date(accountCreatedLocal));
  const availableTo = localDateKey(new Date(currentLocal));

  if (period === 'today') {
    const requestedDay = parseLocalAnchor(anchor, currentLocal);
    startLocal = Math.min(
      currentLocal,
      Math.max(accountCreatedLocal, requestedDay),
    );
    endLocal = startLocal + 24 * 60 * 60 * 1000;
    bucketUnit = 'day';
    bucketFormat = 'YYYY-MM-DD';
    rangeLabel = `Ngày ${localDateLabel(startLocal, true)}`;
    selectedValue = localDateKey(new Date(startLocal));
    options = [];
    points = [
      {
        key: selectedValue,
        label: localDateLabel(startLocal),
        dateLabel: localDateLabel(startLocal, true),
        rangeStart: utcIsoFromLocal(startLocal),
        rangeEnd: utcIsoFromLocal(endLocal),
      },
    ];
  } else {
    const firstStart = periodStart(period, accountCreatedLocal);
    const currentStart = periodStart(period, currentLocal);
    const requestedStart = periodStart(
      period,
      parseLocalAnchor(anchor, currentStart),
    );
    startLocal = Math.min(currentStart, Math.max(firstStart, requestedStart));
    endLocal = nextPeriodStart(period, startLocal);
    rangeLabel = periodOptionLabel(period, startLocal);
    selectedValue = localDateKey(new Date(startLocal));
    options = buildPeriodOptions(period, accountCreatedLocal, currentLocal);

    if (period === 'year') {
      const selectedYear = new Date(startLocal).getUTCFullYear();
      bucketUnit = 'month';
      bucketFormat = 'YYYY-MM';
      points = Array.from({ length: 12 }, (_, index) => {
        const pointStart = Date.UTC(selectedYear, index, 1);
        const pointEnd = Date.UTC(selectedYear, index + 1, 1);
        return {
          key: localMonthKey(new Date(pointStart)),
          label: `T${index + 1}`,
          dateLabel: `Tháng ${index + 1}/${selectedYear}`,
          rangeStart: utcIsoFromLocal(pointStart),
          rangeEnd: utcIsoFromLocal(pointEnd),
        };
      });
    } else {
      const daysInPeriod =
        period === 'week' ? 7 : new Date(endLocal - 1).getUTCDate();
      const startDate = new Date(startLocal);
      bucketUnit = 'day';
      bucketFormat = 'YYYY-MM-DD';
      points = Array.from({ length: daysInPeriod }, (_, index) => {
        const pointStart =
          period === 'week'
            ? startLocal + index * 24 * 60 * 60 * 1000
            : Date.UTC(
                startDate.getUTCFullYear(),
                startDate.getUTCMonth(),
                index + 1,
              );
        const pointEnd = pointStart + 24 * 60 * 60 * 1000;
        return {
          key: localDateKey(new Date(pointStart)),
          label: period === 'week' ? WEEKDAY_LABELS[index] : String(index + 1),
          dateLabel: localDateLabel(pointStart),
          rangeStart: utcIsoFromLocal(pointStart),
          rangeEnd: utcIsoFromLocal(pointEnd),
        };
      });
    }
  }

  return {
    startAt: databaseVietnamTimestamp(startLocal),
    endAt: databaseVietnamTimestamp(endLocal),
    availableFrom,
    availableTo,
    rangeStart: utcIsoFromLocal(startLocal),
    rangeEnd: utcIsoFromLocal(endLocal),
    rangeLabel,
    selectedValue,
    options,
    bucketUnit,
    bucketFormat,
    points,
  };
};

/**
 * `created_at` lưu theo GIỜ VIỆT NAM (migration NormalizeTimestampsToVietnamTime).
 * Mốc đầu kỳ cũng tính theo giờ VN để so sánh trực tiếp và vẫn dùng được index.
 */
export const vietnamPeriodStartUtc = (period: CalendarPeriod): string =>
  `DATE_TRUNC('${period}', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')`;

/**
 * Đổi `YYYY-MM-DD` thành biên trên **mở** (00:00 ngày kế tiếp) để truy vấn dùng
 * `< endAt`. So với cách chốt `23:59:59.999`, cách này không bỏ sót giao dịch rơi
 * vào phần lẻ micro-giây cuối ngày mà Postgres vẫn lưu.
 */
export const exclusiveEndOfDay = (date: string): string => {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return databaseVietnamTimestamp(Date.UTC(year, month - 1, day + 1));
};

/** Mốc 00:00 giờ VN của ngày chứa `now`, dạng epoch-gói-giờ-VN. */
export const vietnamLocalDay = (now = new Date()): number => {
  const vietnamNow = new Date(now.getTime() + VIETNAM_UTC_OFFSET_MS);
  return Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    vietnamNow.getUTCDate(),
  );
};

/** Đầu kỳ liền trước kỳ chứa `localTime`. */
export const previousPeriodStart = (
  period: EarningsReportPeriod,
  localTime: number,
): number => {
  const current = periodStart(period, localTime);
  const date = new Date(current);
  if (period === 'week') return current - 7 * 24 * 60 * 60 * 1000;
  if (period === 'month') {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1);
  }
  return Date.UTC(date.getUTCFullYear() - 1, 0, 1);
};

/**
 * Cửa sổ truy vấn của kỳ chứa `anchorLocalMs`. Biên trên là đầu kỳ kế tiếp và
 * **không bao gồm** — tránh lệ thuộc vào `23:59:59.999` vốn bỏ sót mili-giây cuối.
 */
export const resolveReportWindow = (
  period: EarningsReportPeriod,
  anchorLocalMs: number,
): EarningsReportWindow => {
  const startLocal = periodStart(period, anchorLocalMs);
  const endLocal = nextPeriodStart(period, startLocal);

  return {
    startAt: databaseVietnamTimestamp(startLocal),
    endAt: databaseVietnamTimestamp(endLocal),
    periodStartKey: localDateKey(new Date(startLocal)),
    rangeLabel: periodOptionLabel(period, startLocal),
    periodStart: new Date(startLocal),
    periodEnd: new Date(endLocal),
  };
};

/** Cửa sổ của kỳ **vừa kết thúc** tính tới `now` — đầu vào của scheduler. */
export const resolvePreviousReportWindow = (
  period: EarningsReportPeriod,
  now = new Date(),
): EarningsReportWindow =>
  resolveReportWindow(
    period,
    previousPeriodStart(period, vietnamLocalDay(now)),
  );
