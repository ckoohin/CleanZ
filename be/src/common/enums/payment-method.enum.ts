/**
 * 3 hình thức thanh toán, tất cả đều cân sổ:
 *  - CASH:   khách đưa tiền mặt cho tasker, tasker trả ngược hoa hồng bằng ví.
 *  - WALLET: trừ ví khách lúc tạo đơn, giữ ở ví SYSTEM tới khi hoàn thành/hủy.
 *  - ONLINE: khách quét QR PayOS sau khi tạo đơn; webhook xác nhận PAID → dispatch Tasker.
 *            Khi hủy sau khi đã thanh toán, hoàn tiền vào ví CleanZ của khách.
 *
 * MOMO/ZALOPAY/VNPAY/VIETQR đã bị bỏ: chưa từng có dòng code tích hợp nào.
 * Giá trị cũ vẫn nằm trong enum Postgres cho dữ liệu lịch sử.
 */
export enum PaymentMethod {
  CASH = 'CASH',
  WALLET = 'WALLET',
  ONLINE = 'ONLINE',
}
