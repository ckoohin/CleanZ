import { SetMetadata } from '@nestjs/common';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole } from 'src/common/enums/user-role.enum';

export const ROLES_KEY = 'roles';

export const Auth = (...roles: UserRole[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
