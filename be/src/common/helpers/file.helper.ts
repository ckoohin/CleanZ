import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserRole } from '../enums/user-role.enum';
import { ForbiddenException } from '@nestjs/common';

export const assertCanAccess = (
  //check quyeen truy cập
  requestUserId: string,
  targetUserId: string,
  requestUserRole: UserRole,
  message: string,
) => {
  const isOwner = requestUserId === targetUserId;
  const isAdmin = requestUserRole === UserRole.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new ForbiddenException(message);
  }
};

export const assertCanUpdate = (
  //Check quyền update
  taskerProfile: TaskerEntity,
  requestUserId: string,
  requestUserRole: UserRole,
) => {
  assertCanAccess(
    requestUserId,
    taskerProfile.user.id,
    requestUserRole,
    'Bạn không có quyền cập nhật thông tin này',
  );
};
