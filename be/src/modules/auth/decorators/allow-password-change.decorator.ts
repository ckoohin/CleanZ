import { SetMetadata } from '@nestjs/common';

export const ALLOW_DURING_PASSWORD_CHANGE_KEY = 'allowDuringPasswordChange';

/**
 * Cho phép route hoạt động kể cả khi user đang bị buộc đổi mật khẩu
 * (mustChangePassword=true). Gắn vào các route tối thiểu mà FE cần ở màn
 * đổi-mật-khẩu-bắt-buộc: /auth/me, /auth/profile, /auth/change-password, /auth/logout.
 */
export const AllowDuringPasswordChange = () =>
  SetMetadata(ALLOW_DURING_PASSWORD_CHANGE_KEY, true);
