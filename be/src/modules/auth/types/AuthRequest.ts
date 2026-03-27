import { Request } from 'express';
import { UserRole } from 'src/common/enums/user-role.enum';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
export interface RequestWithUser extends Request {
  user: AuthUser;
}
