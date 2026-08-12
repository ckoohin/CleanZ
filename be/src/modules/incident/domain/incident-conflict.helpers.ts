/**
 * Nhận diện va chạm ràng buộc "một booking chỉ có một sự cố đang xử lý".
 *
 * Schema cũ dùng `uq_inc_active_per_booking`; schema tổng quát respondent tách riêng
 * CUSTOMER_UNREACHABLE và dùng `uq_inc_active_per_booking_generic` cho các sự cố còn
 * lại. Cả hai tên phải được dịch thành cùng lỗi 409 để rollout không phụ thuộc thứ tự
 * deploy code/migration.
 *
 * Đặt ở đây thay vì nằm private trong một service vì có BA lối tạo hồ sơ ở hai module
 * khác nhau: khách tự báo cáo, mở từ vi phạm check-in, và mở từ vi phạm no-show.
 */
export const ACTIVE_INCIDENT_PER_BOOKING_CONSTRAINT =
  'uq_inc_active_per_booking';

const ACTIVE_INCIDENT_PER_BOOKING_CONSTRAINTS = new Set([
  ACTIVE_INCIDENT_PER_BOOKING_CONSTRAINT,
  'uq_inc_active_per_booking_generic',
]);

/** Postgres: unique_violation. */
const PG_UNIQUE_VIOLATION = '23505';

export function isActiveIncidentPerBookingConflict(error: unknown): boolean {
  const pgError = error as { code?: string; constraint?: string } | null;
  return (
    pgError?.code === PG_UNIQUE_VIOLATION &&
    pgError.constraint != null &&
    ACTIVE_INCIDENT_PER_BOOKING_CONSTRAINTS.has(pgError.constraint)
  );
}

export function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === PG_UNIQUE_VIOLATION;
}
