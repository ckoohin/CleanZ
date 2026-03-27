import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { authApi } from '@/features/auth/services/auth.service';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

const http = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

let isRefreshing = false;

type QueuedRequest = {
  resolve: () => void;
  reject: (reason?: unknown) => void;
};

let failedQueue: QueuedRequest[] = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });

  failedQueue = [];
};

let onUnauthenticated: (() => void) | null = null;

export function setOnUnauthenticated(callback: (() => void) | null) {
  onUnauthenticated = callback;
}

const refreshToken = async (): Promise<boolean> => {
  try {
    await authApi.refresh();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

http.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Chỉ skip refresh cho login và refresh endpoint
    // /auth/logout cần accessToken hợp lệ → cho phép refresh trước khi gọi logout
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh');

    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      onUnauthenticated?.();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(http(originalRequest)),
          reject,
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshed = await refreshToken();

    if (refreshed) {
      processQueue(null);
      isRefreshing = false;
      return http(originalRequest);
    }

    processQueue(error);
    isRefreshing = false;

    onUnauthenticated?.();

    return Promise.reject(error);
  }
);

export default http;