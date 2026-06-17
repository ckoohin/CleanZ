// Giá trị hợp lệ cho cột reference_type (CHECK trong CleanZ/data.sql) — DR-4
export enum NotificationRefType {
  BOOKING = 'BOOKING',
  INCIDENT = 'INCIDENT',
  SUPPORT_TICKET = 'SUPPORT_TICKET',
  PAYMENT = 'PAYMENT',
}
