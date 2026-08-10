import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminActivityLogEntity } from './entities/admin-activity-log.entity';
import { AuditOutboxEntity } from './entities/audit-outbox.entity';
import { AuditOutboxWorkerService } from './audit/audit-outbox-worker.service';
import { AuditRetentionService } from './audit/audit-retention.service';
import { AlertModule } from '../alert/alert.module';

/**
 * Hai tiến trình nền của hệ thống nhật ký: đẩy outbox vào bảng nhật ký, và dọn
 * bản ghi quá hạn.
 *
 * Tách khỏi `AdminActivityModule` vì hai module này phục vụ hai đối tượng khác
 * hẳn nhau. `AdminActivityModule` được năm module nghiệp vụ import chỉ để lấy
 * `AuditRecorder` — nó phải nhẹ, và không có lý do gì để một module Ví hay Sự cố
 * kéo theo hai bộ đếm giờ, `ConfigService` và quyền truy cập `DataSource` thô.
 *
 * Worker là singleton dù có bao nhiêu module import (Nest cache instance theo
 * class), nên gộp chung không tạo ra worker thừa — cái nó tạo ra là một module
 * "nhẹ" trên danh nghĩa nhưng thực chất kéo theo cả hạ tầng nền, và điều đó chỉ
 * lộ ra khi ai đó viết test cho một module nghiệp vụ rồi phải giả lập `DataSource`
 * mà không hiểu vì sao.
 *
 * Đăng ký một lần ở `AppModule`. `AdminModule` cũng import để `AdminController`
 * dùng `AuditRetentionService` cho endpoint đo lường.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AdminActivityLogEntity, AuditOutboxEntity]),
    AlertModule,
  ],
  providers: [AuditOutboxWorkerService, AuditRetentionService],
  exports: [AuditRetentionService],
})
export class AuditWorkerModule {}
