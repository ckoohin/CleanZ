import { UserRole } from 'src/common/enums/user-role.enum';
import { Auth } from './auth.decorator';

export const AdminOnly = () => Auth(UserRole.ADMIN);
