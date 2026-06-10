// enums & literals
export type UserRole = 'ADMIN' | 'WORKER' | 'CUSTOMER' | 'TASKER';

export type AuthProvider = 'local' | 'google' | 'facebook';

export interface User {
    id: string,
    email: string,
    phone: string,
    fullName: string,
    provider: string,
    providerId: string,
    avatar: string,
    role: UserRole,
    isActive: boolean,
    isVerified: boolean,
    lastLogin: string,
    createdAt: string,
    updatedAt: string
}



export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  role?: UserRole;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: string;
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

export type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
};

export type RegisterValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

export interface PasswordRequiredProps {
    password: string;
}

export type LoginValues = {
    email: string;
    password: string; 
    rememberMe: boolean;
}
