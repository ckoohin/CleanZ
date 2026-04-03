// enums & literals
export type UserRole = 'ADMIN' | 'WORKER' | 'CUSTOMER';

export type AuthProvider = 'local' | 'google' | 'facebook';

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

export interface VerifyEmailCredentials {
    token: string
}

export interface ResendVerificationEmailCredentials {
    token: string
}

export interface VerifyOtpCredentials {
    userId: string,
    otp: string
}

export interface ForgotPasswordCredentials {
  email: string;
}

export interface ResetPasswordCredentials {
  token: string;
  newPassword: string;
  confirmPassword: string;
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

export type RegisterFormValues = RegisterCredentials;

export interface VerifyEmailResponse {
    message: string
}

export interface ResendVerificationEmailResponse {
    message: string
}

export interface VerifyOtpResponse {
    message: string
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message : string
}

// form values
export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

// error

export interface ErrorResponse {
    errors: {
        message: string,
        error: string,
        statusCode: number
    },
    path: string,
    statusCode: number,
    timestamp: string
}