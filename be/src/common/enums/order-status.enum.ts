export enum OrderStatus {
  PENDING = 'PENDING', // Chờ xác nhận
  CONFIRMED = 'CONFIRMED', // Đã xác nhận, đang chuẩn bị
  COMPLETED = 'COMPLETED', // Đã phục vụ
  CANCELLED = 'CANCELLED', // Đã hủy
}
