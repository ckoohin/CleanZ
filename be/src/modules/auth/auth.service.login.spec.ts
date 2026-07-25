import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRole } from 'src/common/enums/user-role.enum';

const PASSWORD = 'Str0ng@Pass123';

function buildService(role: UserRole = UserRole.CUSTOMER) {
  const user = {
    id: 'user-1',
    email: 'known@example.com',
    fullName: 'Known User',
    password: bcrypt.hashSync(PASSWORD, 10),
    role,
    isVerified: true,
    isActive: true,
  };

  return new AuthService(
    { findByEmail: jest.fn().mockResolvedValue(user) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe('AuthService.login — thứ tự xác thực an toàn', () => {
  it('sai mật khẩu và sai role vẫn chỉ báo sai thông tin đăng nhập', async () => {
    const service = buildService(UserRole.CUSTOMER);

    await expect(
      service.login({
        email: 'known@example.com',
        password: 'wrong-password',
        role: UserRole.ADMIN,
      }),
    ).rejects.toMatchObject({
      message: 'Email hoặc mật khẩu không đúng',
    });
  });

  it('chỉ báo sai cổng khi mật khẩu đã đúng', async () => {
    const service = buildService(UserRole.CUSTOMER);

    await expect(
      service.login({
        email: 'known@example.com',
        password: PASSWORD,
        role: UserRole.ADMIN,
      }),
    ).rejects.toMatchObject({
      message: 'Bạn không có quyền truy cập vào hệ thống này',
    });
  });
});
