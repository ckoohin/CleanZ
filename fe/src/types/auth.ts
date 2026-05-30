export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER';

export type AuthProvider = 'local' | 'google' | 'facebook';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  avatar?: string | null;
  isActive: boolean;
  isVerified: boolean;
  provider: AuthProvider;
  providerId?: string | null;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse<T = User> {
  user: T;
  message?: string;
}

export interface ErrorResponse {
  errors: {
    message: string;
    error: string;
    statusCode: number;
  };
  path: string;
  statusCode: number;
  timestamp: string;
}
