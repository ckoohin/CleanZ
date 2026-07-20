export enum TopupStatus {
  CREATED = 'CREATED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  /** Đã hoàn tiền về thẻ/tài khoản gốc qua cổng thanh toán (admin thao tác). */
  REFUNDED = 'REFUNDED',
  /** Đã gửi yêu cầu hoàn tiền Adyen, chưa trừ ví — chờ webhook REFUND xác nhận. */
  REFUND_PENDING = 'REFUND_PENDING',
}
