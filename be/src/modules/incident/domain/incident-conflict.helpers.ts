/**
 * Nhận diện va chạm ràng buộc "một booking chỉ có một sự cố đang xử lý".
 *
 * Ràng buộc thật nằm ở partial unique index `uq_inc_active_per_booking` (migration
 * 1787000000000). Mọi lối tạo hồ sơ đều phải dịch lỗi Postgres 23505 của index này thành
 * 409 có nghĩa — nếu không, một cú double-submit sẽ hiện ra dưới dạng lỗi 500 và người
 * dùng không biết là hồ sơ đã tồn tại.
 *
 * Đặt ở đây thay vì nằm private trong một service vì có BA lối tạo hồ sơ ở hai module
 * khác nhau: khách tự báo cáo, mở từ vi phạm check-in, và mở từ vi phạm no-show.
 */
export const ACTIVE_INCIDENT_PER_BOOKING_CONSTRAINT =
  'uq_inc_active_per_booking';

/** Postgres: unique_violation. */
const PG_UNIQUE_VIOLATION = '23505';

export function isActiveIncidentPerBookingConflict(error: unknown): boolean {
  const pgError = error as { code?: string; constraint?: string } | null;
  return (
    pgError?.code === PG_UNIQUE_VIOLATION &&
    pgError?.constraint === ACTIVE_INCIDENT_PER_BOOKING_CONSTRAINT
  );
}

export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === PG_UNIQUE_VIOLATION;
}
