const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_TIMEZONE_OFFSET = '+07:00';

/**
 * "Bây giờ" theo GIỜ VIỆT NAM, dạng `timestamp without time zone`.
 *
 * Toàn bộ cột timestamp trong DB lưu theo giờ VN (migration
 * NormalizeTimestampsToVietnamTime). `NOW()` trần trả timestamptz và khi so sánh
 * với cột timestamp sẽ được ép theo TimeZone của SESSION — mà session qua pooler
 * Supabase là UTC ⇒ lệch 7 tiếng. Luôn dùng hằng này thay cho `NOW()` khi so sánh
 * hoặc ghi vào cột `timestamp without time zone`.
 *
 * Ngoại lệ: cột kiểu `timestamptz` (vd. taskers.location_updated_at) thì dùng
 * `NOW()` trần vì so sánh theo mốc tuyệt đối, không phụ thuộc timezone.
 */
export const VN_NOW_SQL = `(NOW() AT TIME ZONE '${VIETNAM_TIMEZONE}')`;

export function createVietnamDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${VIETNAM_TIMEZONE_OFFSET}`);
}

/**
 * Cận dưới của một kỳ lọc: 00:00:00.000 giờ VN của ngày `date`.
 * Nhận cả 'YYYY-MM-DD' lẫn chuỗi ISO đầy đủ.
 */
export function vietnamStartOfDay(date: string): Date {
  return new Date(
    `${date.slice(0, 10)}T00:00:00.000${VIETNAM_TIMEZONE_OFFSET}`,
  );
}

/**
 * Cận trên của một kỳ lọc: 23:59:59.999 giờ VN của ngày `date`.
 * `new Date('2026-07-31')` là nửa đêm UTC = 07:00 sáng giờ VN, nên dùng thẳng
 * làm cận trên của `BETWEEN` sẽ cắt mất gần trọn ngày cuối kỳ.
 */
export function vietnamEndOfDay(date: string): Date {
  return new Date(
    `${date.slice(0, 10)}T23:59:59.999${VIETNAM_TIMEZONE_OFFSET}`,
  );
}

export function formatVietnamDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatVietnamTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: VIETNAM_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Chuỗi SQL expression tính mốc đầu kỳ ('day' | 'week' | 'month') theo giờ
 * Việt Nam, trả về `timestamp without time zone` để so sánh trực tiếp với các
 * cột timestamp (đã chuẩn hoá về giờ VN) và vẫn dùng được index.
 * Tuần bắt đầu thứ 2 (chuẩn DATE_TRUNC của Postgres).
 */
export function vietnamPeriodStartSqlExpr(
  unit: 'day' | 'week' | 'month',
  nowExpr = 'NOW()',
): string {
  return `DATE_TRUNC('${unit}', ${nowExpr} AT TIME ZONE '${VIETNAM_TIMEZONE}')`;
}

/** Wrapper tương thích ngược — xem vietnamPeriodStartSqlExpr. */
export function vietnamWeekStartSqlExpr(nowExpr = 'NOW()'): string {
  return vietnamPeriodStartSqlExpr('week', nowExpr);
}
