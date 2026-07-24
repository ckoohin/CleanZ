/**
 * Hạng dịch vụ của một booking.
 *
 * - STANDARD: đơn giá `service_packages.base_hourly_rate`, ghép đơn theo cơ chế
 *   mặc định (ưu tiên tasker có thu nhập tuần thấp để chia đều việc).
 * - PREMIUM: đơn giá `service_packages.premium_hourly_rate`, chỉ tasker có bộ
 *   dụng cụ chuyên dụng đã được admin duyệt mới nhận được; ưu tiên tasker yêu
 *   thích của khách rồi tới rating cao nhất trong pool đã duyệt.
 */
export enum BookingServiceTier {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
}
