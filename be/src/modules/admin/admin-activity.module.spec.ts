import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entities/user.entity';
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

@Module({
  imports: [AdminActivityModule],
  providers: [
    AdminActivityInterceptor,
    { provide: AdminActivitySnapshotService, useValue: {} },
  ],
})
class InterceptorHostModule {}

async function compile(rootModule: unknown) {
  return Test.createTestingModule({ imports: [rootModule as never] })
    .overrideProvider(getRepositoryToken(AdminActivityLogEntity))
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
