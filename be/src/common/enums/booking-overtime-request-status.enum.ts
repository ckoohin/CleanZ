/**
 * Trạng thái thông báo/yêu cầu thêm giờ tasker gửi cho khách.
 * Luồng mới chỉ thông báo; các state duyệt cũ được giữ để đọc dữ liệu cũ.
 */
export enum BookingOvertimeRequestStatus {
  /** Chưa có yêu cầu nào. */
  NONE = 'NONE',
  /** Tasker đã báo khách có thể phát sinh; tiền chốt lúc checkout. */
  NOTIFIED = 'NOTIFIED',
  /** Đã gửi, đang chờ khách phản hồi. */
  PENDING = 'PENDING',
  /** Khách đồng ý — phần phát sinh trong hạn mức này được thu chắc chắn. */
  APPROVED = 'APPROVED',
  /** Khách từ chối — tasker checkout đúng giờ. */
  REJECTED = 'REJECTED',
  /** Khách không phản hồi kịp cửa sổ chờ. */
  EXPIRED = 'EXPIRED',
}
