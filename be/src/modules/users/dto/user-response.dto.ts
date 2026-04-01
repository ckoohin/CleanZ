export class UserResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  refreshToken: string | null;
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
}
