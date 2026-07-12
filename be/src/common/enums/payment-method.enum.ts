/**
 * Chỉ còn 2 hình thức, và cả hai đều cân sổ:
 *  - CASH:   khách đưa tiền mặt cho tasker, tasker trả ngược hoa hồng bằng ví.
 *  - WALLET: trừ ví khách lúc tạo đơn, giữ ở ví SYSTEM tới khi hoàn thành/hủy.
 *
 * MOMO/ZALOPAY/VNPAY/VIETQR đã bị bỏ: chưa từng có dòng code tích hợp nào, chỉ là
 * nhãn suông — đơn tạo ra không ai thu tiền khách, nhưng lúc hoàn thành vẫn cộng
 * tiền vào ví tasker → tiền sinh ra từ hư không. Tiền thật vào hệ thống chỉ qua
 * PayPal (nạp ví). Giá trị cũ vẫn nằm trong enum Postgres cho dữ liệu lịch sử.
 */
export enum PaymentMethod {
  CASH = 'CASH',
  WALLET = 'WALLET',
}
