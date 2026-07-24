/**
 * Trạng thái xác minh bộ dụng cụ chuyên dụng của tasker.
 * Chỉ APPROVED mới vào được pool nhận đơn PREMIUM.
 */
export enum TaskerEquipmentStatus {
  /** Chưa nộp hồ sơ dụng cụ */
  NONE = 'NONE',
  /** Đã nộp ảnh, chờ admin duyệt */
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
