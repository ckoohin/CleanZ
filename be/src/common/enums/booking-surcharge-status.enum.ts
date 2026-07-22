/**
 * Trạng thái thu phần phụ phí phát sinh thêm giờ của booking.
 * Thay cho cờ boolean `surcharge_pending` cũ để phân biệt được im lặng, từ chối
 * và chờ tasker xác nhận đã nhận tiền mặt.
 */
export enum BookingSurchargeStatus {
  /** Đơn không có phần phát sinh. */
  NONE = 'NONE',
  /** Tasker đã checkout, chờ khách xác nhận/thanh toán phần phát sinh. */
  PENDING_CUSTOMER = 'PENDING_CUSTOMER',
  /** Khách đồng ý trả tiền mặt, chờ tasker xác nhận đã nhận đủ tiền. */
  PENDING_TASKER_CONFIRM = 'PENDING_TASKER_CONFIRM',
  /** Đã thu xong phần phát sinh. */
  PAID = 'PAID',
  /** Miễn phần phát sinh (admin hoặc tasker tự bỏ). */
  WAIVED = 'WAIVED',
  /** Khách từ chối hoặc ví không đủ → nền tảng ứng trả tasker, chờ admin xử lý. */
  DISPUTED = 'DISPUTED',
}

/**
 * Đơn đang treo chờ một bên xác nhận phần phát sinh (chưa quyết toán xong).
 * Dùng cho guard nghiệp vụ và cho field `workTiming.surchargePending` mà FE đang
 * đọc — giữ API cũ không vỡ sau khi đổi cờ boolean thành enum.
 */
export function isSurchargePending(
  status: BookingSurchargeStatus | null | undefined,
): boolean {
  return (
    status === BookingSurchargeStatus.PENDING_CUSTOMER ||
    status === BookingSurchargeStatus.PENDING_TASKER_CONFIRM
  );
}
