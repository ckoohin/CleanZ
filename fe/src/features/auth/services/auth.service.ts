import type {
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  VerifyOtpCredentials,
  VerifyEmailCredentials,
  VerifyEmailResponse,
  ResendVerificationEmailCredentials,
  ResendVerificationEmailResponse,
  ForgotPasswordCredentials,
  ForgotPasswordResponse,
  ResetPasswordCredentials,
  ResetPasswordResponse,
  VerifyOtpResponse,
} from '@/features/auth/types/auth.type';
import http from '@/lib/api/http';
import { Profile, User } from '../types/user.type';

export const authApi = {
  me: async (): Promise<User> => {
    const res = await http.get('/auth/me');
    console.log('=== /auth/me response ===', res.data);

    // Hỗ trợ nhiều kiểu response backend khác nhau
    return res.data?.data ?? res.data?.user ?? res.data;
  },

  profile: async (): Promise<Profile> => {
    const res = await http.get('/auth/profile');
    return res.data?.data ?? res.data;
  },

  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const res = await http.post('/auth/login', credentials);
    return res.data;
  },

  register: async (
    credentials: RegisterCredentials,
  ): Promise<RegisterResponse> => {
    const res = await http.post('/auth/register', credentials);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await http.post('/auth/logout');
  },

  refresh: async (): Promise<void> => {
    await http.post('/auth/refresh');
  },

  verifyEmail: async (
    credentials: VerifyEmailCredentials,
  ): Promise<VerifyEmailResponse> => {
    const res = await http.post('/auth/verify-email', credentials);
    return res.data;
  },

  resendVerificationEmail: async (
    credentials: ResendVerificationEmailCredentials,
  ): Promise<ResendVerificationEmailResponse> => {
    const res = await http.post('/auth/resend-verification-email', credentials);
    return res.data;
  },

  verifyOtp: async (
    credentials: VerifyOtpCredentials,
  ): Promise<VerifyOtpResponse> => {
    const res = await http.post('/auth/verify-login-otp', credentials);
    return res.data;
  },

  forgotPassword: async (
    credentials: ForgotPasswordCredentials,
  ): Promise<ForgotPasswordResponse> => {
    const res = await http.post('/auth/forgot-password', credentials);
    return res.data;
  },

  resetPassword: async (
    credentials: ResetPasswordCredentials,
  ): Promise<ResetPasswordResponse> => {
    const res = await http.post('/auth/reset-password', credentials);
    return res.data;
  },
};