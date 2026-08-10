import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { AdminActivityLogEntity } from './entities/admin-activity-log.entity';
import { AuditOutboxEntity } from './entities/audit-outbox.entity';
import { AdminActivityService } from './services/admin-activity.service';
import { AuditRecorder } from './audit/audit-recorder.service';

/**
 * Nhật ký thao tác admin, tách riêng khỏi `AdminModule`.
 *
 * Module này được năm module nghiệp vụ import (Ví, Tài chính, Sự cố, Phiếu hỗ
 * trợ, Admin) chỉ để lấy `AuditRecorder` — các lệnh chuyển tiền thật gọi nó từ
 * trong transaction của mình. Vì thế nó phải NHẸ: chỉ repository và hai service
 * thuần, không tiến trình nền, không phụ thuộc hạ tầng nào khác.
 *
 * Hai worker (đẩy outbox, dọn quá hạn) nằm ở `AuditWorkerModule`. Nhập chúng vào
 * đây sẽ bắt mọi module nghiệp vụ gánh theo bộ đếm giờ và `ConfigService` mà
 * chúng không dùng tới.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AdminActivityLogEntity, AuditOutboxEntity, User]),
  ],
  providers: [AdminActivityService, AuditRecorder],
  exports: [AdminActivityService, AuditRecorder],
})
export class AdminActivityModule {}
