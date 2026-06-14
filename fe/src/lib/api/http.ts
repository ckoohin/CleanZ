import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { authApi } from '@/features/auth/services/auth.service';
import { toast } from "sonner";
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
// xử lý lỗi api
const handleApiErrorGlobal = (error: AxiosError) => {
  //  mất mạng
  if (error.code === "ERR_NETWORK") {
    toast.error("Không có kết nối internet");
    return;
  }

  // server không phản hồi
  if (!error.response) {
    toast.error("Server không phản hồi");
    return;
  }

  // lỗi từ backend
  let displayMessage: any =
    (error.response.data as any)?.errors?.message ||
    (error.response.data as any)?.message ||
    (error.response.data as any)?.errors;

  if (displayMessage && typeof displayMessage === "object") {
    if (Array.isArray(displayMessage)) {
      displayMessage = displayMessage.join(", ");
    } else {
      displayMessage = Object.values(displayMessage)
        .map((val: any) => (typeof val === "object" ? JSON.stringify(val) : String(val)))
        .join(", ");
    }
  }

  toast.error(displayMessage || "Có lỗi xảy ra, vui lòng thử lại sau");
};

http.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.code === "ERR_NETWORK" || !error.response) {
      handleApiErrorGlobal(error);
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status !== 401 || !originalRequest) {
      handleApiErrorGlobal(error);
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh");

    if (isAuthEndpoint) {
      handleApiErrorGlobal(error);
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      // onUnauthenticated?.();
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

    // onUnauthenticated?.();

    return Promise.reject(error);
  }
);

export default http;
