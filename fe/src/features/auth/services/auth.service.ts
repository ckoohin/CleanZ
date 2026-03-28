import type { User, LoginCredentials, LoginResponse } from '@/features/auth/types/auth.type';
import http from '@/lib/api/http';

export const authApi = {

  me: (): Promise<User> => {
    return http.get<User>('/auth/me').then((res) => res.data);
  },

  profile: (): Promise<User> => {
    return http.get<User>('/auth/profile').then((res) => res.data);
  },

  login: (credentials: LoginCredentials): Promise<LoginResponse> => {
    return http.post<LoginResponse>('/auth/login', credentials).then((res) => res.data);
  },

  logout: (): Promise<void> => {
    return http.post('/auth/logout').then(() => undefined);
  },

  refresh: (): Promise<void> => {
    return http.post('/auth/refresh').then(() => undefined);
  },
};
