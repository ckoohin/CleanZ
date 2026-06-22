import type { LoginCredentials, LoginResponse, RegisterCredentials, RegisterResponse, VerifyOtpCredentials, VerifyEmailCredentials, VerifyEmailResponse, ResendVerificationEmailCredentials, ResendVerificationEmailResponse, ForgotPasswordCredentials, ForgotPasswordResponse, ResetPasswordCredentials, ResetPasswordResponse, VerifyOtpResponse } from '@/features/auth/types/auth.type';
import http from '@/lib/api/http';
import { Profile, User } from '../types/user.type';

export const authApi = {

  me: (): Promise<User> => {
    return http.get<User>('/auth/me').then((res) => res.data);
  },

  profile: (): Promise<Profile> => {
    return http.get<Profile>('/auth/profile').then((res) => res.data);
  },

  login: (credentials: LoginCredentials): Promise<LoginResponse> => {
    return http.post<LoginResponse>('/auth/login', credentials).then((res) => res.data);
  },

  register: (credentials: RegisterCredentials): Promise<RegisterResponse> => {
    return http.post<RegisterResponse>('/auth/register', credentials).then((res) => res.data);
  },

  logout: (): Promise<void> => {
    return http.post('/auth/logout').then(() => undefined);
  },

  refresh: (): Promise<void> => {
    return http.post('/auth/refresh').then(() => undefined);
  },

  verifyEmail: (credentials: VerifyEmailCredentials): Promise<VerifyEmailResponse> => {
    return http.post('/auth/verify-email', credentials).then((res) => res.data);
  },

  resendVerificationEmail: (credentials: ResendVerificationEmailCredentials): Promise<ResendVerificationEmailResponse> => {
    return http.post('/auth/resend-verification-email', credentials).then((res) => res.data);
  },

  verifyOtp: (credentials: VerifyOtpCredentials): Promise<VerifyOtpResponse> => {
    return http.post<VerifyOtpResponse>('/auth/verify-login-otp', credentials).then((res) => res.data);
  },

  forgotPassword: (credentials: ForgotPasswordCredentials): Promise<ForgotPasswordResponse> => {
    return http.post('/auth/forgot-password', credentials).then((res) => res.data);
  },

  resetPassword: (credentials: ResetPasswordCredentials): Promise<ResetPasswordResponse> => {
    return http.post('/auth/reset-password', credentials).then((res) => res.data);
  },

  updateProfile: (data: { fullName?: string; phone?: string; avatar?: File }): Promise<{ message: string; data: Profile }> => {
    const formData = new FormData();
    if (data.fullName) formData.append('fullName', data.fullName);
    if (data.phone) formData.append('phone', data.phone);
    if (data.avatar) formData.append('avatar', data.avatar);

    return http.patch<{ message: string; data: Profile }>('/customer/profile/me', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((res) => res.data);
  },
};
