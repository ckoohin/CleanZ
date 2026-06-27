import { SetMetadata } from '@nestjs/common';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { MustChangePasswordGuard } from '../guards/must-change-password.guard';
import { UserRole } from 'src/common/enums/user-role.enum';

export const ROLES_KEY = 'roles';

export const Auth = (...roles: UserRole[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    // Thứ tự: xác thực → chặn buộc-đổi-mật-khẩu → kiểm tra vai trò.
    UseGuards(JwtAuthGuard, MustChangePasswordGuard, RolesGuard),
  );
