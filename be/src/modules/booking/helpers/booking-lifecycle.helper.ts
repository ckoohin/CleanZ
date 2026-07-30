/** Sau mốc này booking IN_PROGRESS phải xuất hiện trong "Cần xử lý ngay". */
export const BOOKING_COMPLETION_REVIEW_AFTER_MINUTES = 30;

/**
 * Các cột timestamp của CleanZ lưu theo giờ Việt Nam, không kèm timezone.
 * `nowSql` phải cùng kiểu, mặc định dùng VN_NOW_SQL tại call site.
 */
export function overdueCompletionSql(
  alias: 'booking' | 'b',
  nowSql: string,
): string {
  return `COALESCE(
    ${alias}.scheduled_end,
    ${alias}.scheduled_end_date + ${alias}.scheduled_end_time
  ) <= ${nowSql} - INTERVAL '${BOOKING_COMPLETION_REVIEW_AFTER_MINUTES} minutes'`;
}
