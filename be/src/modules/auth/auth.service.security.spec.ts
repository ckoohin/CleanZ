import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from 'src/common/enums/user-role.enum';

/**
 * Khoá lại hai hành vi bảo mật dễ vô tình phá khi refactor:
 *  1. Không được để lộ "email này có tồn tại" qua thứ tự kiểm tra role/mật khẩu.
 *  2. TTL token lấy từ env rỗng phải rơi về mặc định, không được ném lỗi
 *     (từng làm quên-mật-khẩu chết hoàn toàn).
 */

const PASSWORD = 'Str0ng@Pass123';

interface BuildOptions {
  role?: UserRole;
  resetTtl?: string;
}

function buildService(options: BuildOptions = {}) {
  const passwordHash = bcrypt.hashSync(PASSWORD, 10);
  const user = {
    id: 'user-1',
    email: 'someone@example.com',
    fullName: 'Someone',
    password: passwordHash,
    role: options.role ?? UserRole.CUSTOMER,
    isVerified: true,
    isActive: true,
  };

  const sentOtps: string[] = [];
  const signCalls: { expiresIn?: unknown }[] = [];

  const service = new AuthService(
    {
      findByEmail: jest.fn().mockResolvedValue(user),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
    } as never,
    {
      sign: jest.fn((_payload: unknown, opts: { expiresIn?: unknown }) => {
        signCalls.push(opts);
        // jsonwebtoken ném lỗi với expiresIn rỗng — mô phỏng đúng hành vi đó.
        const value = opts?.expiresIn;
        if (typeof value !== 'string' || value.trim() === '') {
          throw new Error(
            '"expiresIn" should be a number of seconds or string',
          );
        }
        return 'signed-token';
      }),
    } as never,
    {
      get: jest.fn((key: string) =>
        key === 'JWT_RESET_PASSWORD_EXPIRES_IN'
          ? (options.resetTtl ?? '')
          : undefined,
      ),
    } as never,
    { createOtpToken: jest.fn().mockResolvedValue(undefined) } as never,
    {
      sendLoginOtpEmail: jest.fn((_email, _name, otp: string) => {
        sentOtps.push(otp);
        return Promise.resolve();
      }),
      sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
    } as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, user, sentOtps, signCalls };
}

describe('AuthService — chống dò tài khoản qua login', () => {
  it('sai mật khẩu + sai role vẫn trả message CHUNG (không lộ email tồn tại)', async () => {
    const { service } = buildService({ role: UserRole.CUSTOMER });

    await expect(
      service.login({
        email: 'someone@example.com',
        password: 'wrong-password',
        role: UserRole.ADMIN,
      }),
    ).rejects.toMatchObject({ message: 'Email hoặc mật khẩu không đúng' });
  });

  it('email không tồn tại và sai mật khẩu cho cùng một message', async () => {
    const { service } = buildService();
    const notFound = new AuthService(
      { findByEmail: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
      { get: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const wrongPassword = await service
      .login({ email: 'someone@example.com', password: 'nope' })
      .catch((e: UnauthorizedException) => e.message);
    const unknownEmail = await notFound
      .login({ email: 'ghost@example.com', password: 'nope' })
      .catch((e: UnauthorizedException) => e.message);

    expect(wrongPassword).toBe(unknownEmail);
  });

  it('đúng mật khẩu nhưng sai cổng đăng nhập mới báo lỗi quyền truy cập', async () => {
    const { service } = buildService({ role: UserRole.CUSTOMER });

    await expect(
      service.login({
        email: 'someone@example.com',
        password: PASSWORD,
        role: UserRole.ADMIN,
      }),
    ).rejects.toMatchObject({
      message: 'Bạn không có quyền truy cập vào hệ thống này',
    });
  });

  it('đăng nhập đúng thì sinh OTP 6 số và KHÔNG trả OTP trong response', async () => {
    const { service, sentOtps } = buildService();

    const result = await service.login({
      email: 'someone@example.com',
      password: PASSWORD,
    });

    expect(sentOtps).toHaveLength(1);
    expect(sentOtps[0]).toMatch(/^\d{6}$/);
    expect(JSON.stringify(result)).not.toContain(sentOtps[0]);
  });
});

describe('AuthService — TTL token rơi về mặc định khi env trống', () => {
  it('forgotPassword vẫn gửi được email khi JWT_RESET_PASSWORD_EXPIRES_IN rỗng', async () => {
    const { service, signCalls } = buildService({ resetTtl: '' });

    const result = await service.forgotPassword('someone@example.com');

    expect(result.message).toContain('Nếu email tồn tại');
    expect(signCalls.at(-1)?.expiresIn).toBe('15m');
  });

  it('tôn trọng giá trị env khi đã cấu hình', async () => {
    const { service, signCalls } = buildService({ resetTtl: '30m' });

    await service.forgotPassword('someone@example.com');

    expect(signCalls.at(-1)?.expiresIn).toBe('30m');
  });
});
