import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_DURING_PASSWORD_CHANGE_KEY } from '../decorators/allow-password-change.decorator';

/**
 * Chặn server-side: khi access token mang cờ mustChangePassword=true, từ chối mọi
 * route được bảo vệ TRỪ các route được đánh dấu @AllowDuringPasswordChange()
 * (me/profile/change-password/logout). Đảm bảo cơ chế buộc đổi mật khẩu không thể
 * bị bypass bằng cách gọi API trực tiếp (không phụ thuộc gating phía FE).
 *
 * Đặt SAU JwtAuthGuard trong chuỗi @Auth() để request.user đã được populate.
 * Cờ đọc từ token: token được cấp lúc verify-OTP (sau khi admin set cờ), và
 * changePassword đã revoke refresh + buộc đăng nhập lại nên cờ tự hết khi đổi xong.
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_DURING_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { mustChangePassword?: boolean } }>();

    if (request.user?.mustChangePassword) {
      throw new ForbiddenException(
        'Bạn cần đổi mật khẩu trước khi tiếp tục sử dụng hệ thống.',
      );
    }
    return true;
  }
}
