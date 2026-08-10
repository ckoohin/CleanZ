import { Module } from '@nestjs/common';
import { IncidentAlertService } from '../incident/services/incident-alert.service';

/**
 * Kênh cảnh báo vận hành dùng chung.
 *
 * `IncidentAlertService` chỉ phụ thuộc `ConfigService`, nhưng lại nằm trong
 * `IncidentModule` — mà `IncidentModule` đã import `AdminActivityModule`. Nếu
 * `AdminActivityModule` import ngược `IncidentModule` để lấy nó thì thành vòng.
 *
 * Module mỏng này giữ đúng MỘT instance của service (throttle theo key nằm trong
 * bộ nhớ của instance — hai instance sẽ chống spam độc lập và gửi gấp đôi), và
 * cắt vòng phụ thuộc mà không phải đổi tên hay di chuyển file nào.
 */
@Module({
  providers: [IncidentAlertService],
  exports: [IncidentAlertService],
})
export class AlertModule {}
