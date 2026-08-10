import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { AuditOutboxEntity } from './entities/audit-outbox.entity';
import { AdminActivityModule } from './admin-activity.module';
import { AdminActivityLogEntity } from './entities/admin-activity-log.entity';
import { AdminActivityService } from './services/admin-activity.service';
import { AdminActivityInterceptor } from './interceptors/admin-activity.interceptor';
import { AdminActivitySnapshotService } from './services/admin-activity-snapshot.service';

/**
 * `AdminActivityService` được TÁCH khỏi `AdminModule` sang module riêng để
 * module Support Ticket ghi được nhật ký cho thao tác xuất Excel (một `GET`,
 * nên `AdminActivityInterceptor` không tự bắt).
 *
 * Rủi ro của việc tách: interceptor đó đăng ký bằng `APP_INTERCEPTOR` — nó chạy
 * cho MỌI thao tác ghi của admin trên toàn hệ thống. Nếu provider không còn
 * resolve được thì cả ứng dụng không boot nổi, và lỗi chỉ lộ ra lúc chạy thật
 * chứ `tsc` không bắt. Hai test dưới đây khoá đúng điểm đó lại.
 */
const repoMock = { create: jest.fn(), save: jest.fn(), find: jest.fn() };

/**
 * `AuditRecorder` cần `DataSource` để ghi outbox ngoài transaction. Trong ứng
 * dụng thật nó đến từ `TypeOrmModule.forRoot` ở phạm vi global; `overrideProvider`
 * không thay thế được một provider chưa từng khai báo, nên phải dựng module giả.
 *
 * KHÔNG có `ConfigService` ở đây — và đó chính là điều test này khẳng định. Hai
 * worker nền (đọc cấu hình chu kỳ, giữ bộ đếm giờ) đã chuyển sang
 * `AuditWorkerModule`; nếu ai đó đưa chúng trở lại module này thì test sẽ đỏ
 * ngay, thay vì để năm module nghiệp vụ lặng lẽ gánh thêm hạ tầng nền.
 */
@Global()
@Module({
  providers: [
    { provide: DataSource, useValue: { getRepository: () => repoMock } },
  ],
  exports: [DataSource],
})
class GlobalStubModule {}

@Module({
  imports: [AdminActivityModule],
  providers: [
    AdminActivityInterceptor,
    { provide: AdminActivitySnapshotService, useValue: {} },
  ],
})
class InterceptorHostModule {}

async function compile(rootModule: unknown) {
  return Test.createTestingModule({
    imports: [GlobalStubModule, rootModule as never],
  })
    .overrideProvider(getRepositoryToken(AdminActivityLogEntity))
    .useValue(repoMock)
    .overrideProvider(getRepositoryToken(AuditOutboxEntity))
    .useValue(repoMock)
    .overrideProvider(getRepositoryToken(User))
    .useValue(repoMock)
    .compile();
}

describe('AdminActivityModule', () => {
  it('export được AdminActivityService ra ngoài module', async () => {
    const moduleRef = await compile(AdminActivityModule);
    expect(moduleRef.get(AdminActivityService)).toBeInstanceOf(
      AdminActivityService,
    );
  });

  it('module khác import vào là dựng được AdminActivityInterceptor', async () => {
    // Đây chính là cách AdminModule đang dùng: interceptor nằm ở module ngoài,
    // service đến từ AdminActivityModule được import.
    const moduleRef = await compile(InterceptorHostModule);
    expect(moduleRef.get(AdminActivityInterceptor)).toBeInstanceOf(
      AdminActivityInterceptor,
    );
  });
});
