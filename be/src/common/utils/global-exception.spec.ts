import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { getPublicErrorMessage } from './global-exception';

describe('getPublicErrorMessage — phân loại lỗi 401', () => {
  it('giữ message đăng nhập sai tài khoản hoặc mật khẩu', () => {
    expect(
      getPublicErrorMessage(
        new UnauthorizedException('Email hoặc mật khẩu không đúng'),
        HttpStatus.UNAUTHORIZED,
      ),
    ).toBe('Email hoặc mật khẩu không đúng');
  });

  it('giữ message sai cổng đăng nhập sau khi đã xác thực mật khẩu', () => {
    expect(
      getPublicErrorMessage(
        new UnauthorizedException(
          'Bạn không có quyền truy cập vào hệ thống này',
        ),
        HttpStatus.UNAUTHORIZED,
      ),
    ).toBe('Bạn không có quyền truy cập vào hệ thống này');
  });

  it.each([
    'Refresh token không tồn tại',
    'Refresh token không hợp lệ',
    'Phiên đăng nhập đã bị thu hồi',
    'Token tracking không hợp lệ',
    'User not authenticated',
  ])('chuẩn hóa lỗi phiên/token "%s"', (message) => {
    expect(
      getPublicErrorMessage(
        new UnauthorizedException(message),
        HttpStatus.UNAUTHORIZED,
      ),
    ).toBe('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  });
});
