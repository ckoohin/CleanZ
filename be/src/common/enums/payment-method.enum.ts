/**
 * 3 hình thức, tất cả đều cân sổ:
 *  - CASH:   khách đưa tiền mặt cho tasker, tasker trả ngược hoa hồng bằng ví.
 *  - WALLET: trừ ví khách lúc tạo đơn, giữ ở ví SYSTEM tới khi hoàn thành/hủy.
 *  - ADYEN:  charge thẻ (sandbox) lúc tạo đơn, tiền vào thẳng ví SYSTEM giống WALLET
 *            (không debit ví khách vì đã thu qua thẻ) — xem BookingWalletPaymentService.
 *
 * MOMO/ZALOPAY/VNPAY/VIETQR đã bị bỏ: chưa từng có dòng code tích hợp nào, chỉ là
 * nhãn suông — đơn tạo ra không ai thu tiền khách, nhưng lúc hoàn thành vẫn cộng
 * tiền vào ví tasker → tiền sinh ra từ hư không. Giá trị cũ vẫn nằm trong enum
 * Postgres cho dữ liệu lịch sử.
 */
export enum PaymentMethod {
  CASH = 'CASH',
  WALLET = 'WALLET',
  ADYEN = 'ADYEN',
}
