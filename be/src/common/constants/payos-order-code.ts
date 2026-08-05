/**
 * Phân dải `orderCode` cho PayOS.
 *
 * Chỉ có MỘT webhook PayOS cho cả hệ thống (`POST /booking/payment/webhook`), và nó
 * gọi lần lượt handler đơn nháp booking rồi handler nạp ví. Mỗi handler nhận ra
 * giao dịch của mình bằng cách tra `orderCode` trong bảng của nó.
 *
 * Vì vậy hai dải KHÔNG được phép giao nhau. Nếu giao, một lần thanh toán booking có
 * thể trùng `orderCode` với một đơn nạp ví cũ và ví được cộng tiền theo số của đơn
 * nạp đó — khách nhận tiền không mất gì.
 *
 * Trước đây hai dải được mô tả bằng comment ở hai file khác nhau, và phần nạp ví
 * dùng `Date.now() % 1e9` — trùm lên cả dải booking đúng như comment cảnh báo là
 * không được xảy ra. Gom về đây để hai bên không thể lệch nhau nữa.
 */

/** Booking: 100.000.000 – 499.999.999 */
export const BOOKING_ORDER_CODE_MIN = 100_000_000;
export const BOOKING_ORDER_CODE_SIZE = 400_000_000;

/** Nạp ví: 500.000.000 – 899.999.999 */
export const TOPUP_ORDER_CODE_MIN = 500_000_000;
export const TOPUP_ORDER_CODE_SIZE = 400_000_000;

/**
 * Sinh mã theo dải.
 *
 * Dùng mốc mili-giây để hai request trong cùng một giây không đụng nhau. Chu kỳ lặp
 * lại của một dải là `size` mili-giây (~4,6 ngày với dải 400 triệu), nên mã cũ đã
 * quá hạn từ lâu trước khi bị dùng lại.
 */
function generateInRange(min: number, size: number): number {
  return min + (Date.now() % size);
}

export function generateBookingPayosOrderCode(): number {
  return generateInRange(BOOKING_ORDER_CODE_MIN, BOOKING_ORDER_CODE_SIZE);
}

export function generateTopupPayosOrderCode(): number {
  return generateInRange(TOPUP_ORDER_CODE_MIN, TOPUP_ORDER_CODE_SIZE);
}
