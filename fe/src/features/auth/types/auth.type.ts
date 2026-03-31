// enums & literals
export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'TECHNICIAN';

export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'APPLE';

// user
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
    id: string,
    email: string,
    fullName: string,
    provider: AuthProvider,
    providerId: string,
    role: UserRole,
    is_active: boolean,
    is_verified: boolean,
    last_login: string,
    created_at: string,
    updated_at: string
}

// export interface Profile extends User {
//   provider: AuthProvider;
//   providerId?: string;
// }

// auth credentials

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

// api response
export interface AuthResponse<T = User> {
  user: T;
}

export type LoginResponse = {
  message: string,
  userId: string
};

export type RegisterResponse = AuthResponse;
export type ProfileResponse = Profile;

// form values
export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export type RegisterFormValues = RegisterCredentials;

// verify otp
export interface VerifyOtpCredentials {
    userId: string,
    otp: string
}