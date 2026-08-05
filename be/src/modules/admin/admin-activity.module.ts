import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { AdminActivityLogEntity } from './entities/admin-activity-log.entity';
import { AdminActivityService } from './services/admin-activity.service';

/**
 * Nhật ký thao tác admin, tách riêng khỏi `AdminModule`.
 *
 * `AdminActivityInterceptor` chỉ tự ghi log cho các method GHI (POST/PUT/PATCH/
 * DELETE). Những hành động ĐỌC nhưng vẫn nhạy cảm — điển hình là xuất file dữ
 * liệu khách hàng ra khỏi hệ thống — phải tự gọi `record()`, nên service này
 * cần dùng được từ module khác. Import cả `AdminModule` (kéo theo booking,
 * payment, voucher…) chỉ để lấy một repository ghi log là quá nặng và dễ tạo
 * vòng phụ thuộc.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AdminActivityLogEntity, User])],
  providers: [AdminActivityService],
  exports: [AdminActivityService],
})
export class AdminActivityModule {}
