import type { User, LoginCredentials, LoginResponse, RegisterCredentials, RegisterResponse, Profile, VerifyOtpCredentials } from '@/features/auth/types/auth.type';
import http from '@/lib/api/http';

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

  verifyEmail: (token: string): Promise<void> => {
    return http.post('/auth/verify-email', { token }).then(() => undefined);
  },

  verifyOtp: (credentials: VerifyOtpCredentials): Promise<{ message: string }> => {
    return http.post('/auth/verify-login-otp', credentials).then((res) => res.data);
  }
};
