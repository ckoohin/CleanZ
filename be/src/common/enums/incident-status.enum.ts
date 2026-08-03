/**
 * Vòng đời sự cố — MỘT trục trạng thái duy nhất.
 *
 * Thay cho mô hình cũ 4 trục song song (status × decisionStatus × responseWindowStatus ×
 * compensationStatus = 750 tổ hợp), vốn lưu cùng một sự thật ở nhiều nơi và buộc mọi guard
 * phải kiểm tra chéo. Trạng thái cửa sổ phản hồi Tasker nay được SUY RA từ
 * `taskerResponseDeadline` + sự tồn tại của decision response, không lưu riêng.
 */
export enum IncidentStatus {
  /** Khách vừa gửi, chờ Admin tiếp nhận. */
  REPORTED = 'REPORTED',
  /** Admin đang thẩm định + soạn quyết định (gộp DRAFT cũ). */
  REVIEWING = 'REVIEWING',
  /** Đã gửi quyết định dự kiến cho Tasker, đang chờ phản biện. */
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  /** Đã chốt, có tiền phải chi — chờ chi trả. */
  AWAITING_PAYOUT = 'AWAITING_PAYOUT',
  /** Đã chi trả xong. */
  COMPENSATED = 'COMPENSATED',
  /** Bác bỏ — báo cáo sai sự thật. */
  REJECTED = 'REJECTED',
  /** Kết thúc: công nhận nhưng không bồi thường / khách rút / hết hạn / nguội sau xử lý. */
  CLOSED = 'CLOSED',
}
