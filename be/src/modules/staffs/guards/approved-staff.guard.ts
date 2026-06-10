import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { StaffsService } from '../staffs.service';
import { APPROVAL_STATUS } from 'src/common/enums/approval-status.enum';

@Injectable()
export class ApprovedStaffGuard implements CanActivate {
  constructor(private readonly staffService: StaffsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Bạn cần đăng nhập');
    }

    try {
      const staff = await this.staffService.getProfileStaff(user.id, user.role);

      if (staff.approvalStatus !== APPROVAL_STATUS.APPROVED) {
        throw new ForbiddenException(
          'Tài khoản của bạn chưa được phê duyệt để thực hiện hành động này',
        );
      }

      const isBanned = await this.staffService.isBanned(staff.id);
      if (isBanned) {
        throw new ForbiddenException('Tài khoản của bạn đang bị khóa');
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new ForbiddenException('Không thể xác thực quyền của staff');
    }

    return true;
  }
}
