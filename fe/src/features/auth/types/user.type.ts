import { AuthProvider } from "./auth.type";

export type UserRole = 'ADMIN' | 'TASKER' | 'CUSTOMER' | 'TECHNICIAN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  avatar?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  isVerified: boolean;
  /** Bật khi tài khoản do admin tạo bằng mật khẩu tạm — buộc đổi ở lần đăng nhập đầu. */
  mustChangePassword?: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Profile extends User {
  provider: AuthProvider;
  providerId?: string | null;
}

export type ProfileResponse = Profile;
