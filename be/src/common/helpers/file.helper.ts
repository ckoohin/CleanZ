import { StaffEntity } from 'src/modules/staffs/entities/staff.entity';
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
  staffProfile: StaffEntity,
  requestUserId: string,
  requestUserRole: UserRole,
) => {
  assertCanAccess(
    requestUserId,
    staffProfile.user.id,
    requestUserRole,
    'Bạn không có quyền cập nhật thông tin này',
  );
};
