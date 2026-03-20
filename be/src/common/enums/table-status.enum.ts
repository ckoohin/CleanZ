export enum TableStatus {
  AVAILABLE = 'AVAILABLE', // Bàn trống, sẵn sàng đón khách
  RESERVED = 'RESERVED', // Bàn đã được đặt trước
  OCCUPIED = 'OCCUPIED', // Bàn đang có khách
  CLEANING = 'CLEANING', // Bàn đang được dọn dẹp
}
