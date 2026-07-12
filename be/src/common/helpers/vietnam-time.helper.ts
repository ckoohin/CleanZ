const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_TIMEZONE_OFFSET = '+07:00';

export function createVietnamDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${VIETNAM_TIMEZONE_OFFSET}`);
}

/**
 * Cận dưới của một kỳ lọc: 00:00:00.000 giờ VN của ngày `date`.
 * Nhận cả 'YYYY-MM-DD' lẫn chuỗi ISO đầy đủ.
 */
export function vietnamStartOfDay(date: string): Date {
  return new Date(`${date.slice(0, 10)}T00:00:00.000${VIETNAM_TIMEZONE_OFFSET}`);
}

/**
 * Cận trên của một kỳ lọc: 23:59:59.999 giờ VN của ngày `date`.
 * `new Date('2026-07-31')` là nửa đêm UTC = 07:00 sáng giờ VN, nên dùng thẳng
 * làm cận trên của `BETWEEN` sẽ cắt mất gần trọn ngày cuối kỳ.
 */
export function vietnamEndOfDay(date: string): Date {
  return new Date(`${date.slice(0, 10)}T23:59:59.999${VIETNAM_TIMEZONE_OFFSET}`);
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
