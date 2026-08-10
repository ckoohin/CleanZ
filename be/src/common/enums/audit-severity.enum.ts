/**
 * Mức độ hệ trọng của một thao tác admin, dùng để lọc/cảnh báo trên nhật ký.
 *
 * Đây KHÔNG phải mức độ thành công (đã có `AdminActivityStatus`), mà là mức độ
 * rủi ro của bản thân hành động: một lần `CRITICAL` thất bại vẫn đáng chú ý hơn
 * một trăm lần `NORMAL` thành công.
 */
export enum AuditSeverity {
  /** Dịch chuyển tiền, đổi quyền, xoá vĩnh viễn — không đảo ngược được. */
  CRITICAL = 'CRITICAL',
  /** Ảnh hưởng trực tiếp tới sinh kế/danh tiếng người dùng (khoá, duyệt, gán việc). */
  HIGH = 'HIGH',
  /** Thao tác quản trị thông thường. Mặc định khi handler không khai báo gì. */
  NORMAL = 'NORMAL',
  /** Hành động ĐỌC dữ liệu nhạy cảm: export, xem giấy tờ, xem ví/PII của một người. */
  READ_SENSITIVE = 'READ_SENSITIVE',
}
