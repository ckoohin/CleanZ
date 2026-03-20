import { UserRole } from 'src/common/enums/user-role.enum';

export class ResponseUserDto {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
