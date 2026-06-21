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
export interface ApiErrorResponse {
  message?: string;
  errors?: {
    message?: string;
    [key: string]: unknown;
  };
}

// xử lý lỗi api
const handleApiErrorGlobal = (error: AxiosError<ApiErrorResponse>) => {
  // Kiểm tra trạng thái mạng của thiết bị (chỉ chạy trên Client)
  const isOnline = typeof window !== 'undefined' ? window.navigator.onLine : true;

  if (!isOnline) {
    toast.error("Mất kết nối Internet. Vui lòng kiểm tra lại Wifi/3G.", { id: "network-error" });
    return;
  }

  // Nếu có mạng nhưng vẫn dính ERR_NETWORK hoặc không có response -> Server down, sập nguồn hoặc bị block (CORS)
  if (error.code === "ERR_NETWORK" || !error.response) {
    toast.error("Hệ thống máy chủ đang bảo trì hoặc gặp sự cố. Vui lòng thử lại sau.", { id: "server-down" });
    return;
  }

  // lỗi từ backend
  const responseData = error.response.data as Record<string, unknown> | undefined;
  const errorsObj = responseData?.errors as Record<string, unknown> | undefined;

  let displayMessage: unknown =
    errorsObj?.message ||
    responseData?.message ||
    responseData?.errors;

  if (displayMessage && typeof displayMessage === "object") {
    if (Array.isArray(displayMessage)) {
      displayMessage = displayMessage.join(", ");
    } else {
      displayMessage = Object.values(displayMessage as Record<string, unknown>)
        .map((val: unknown) => (typeof val === "object" && val !== null ? JSON.stringify(val) : String(val)))
        .join(", ");
    }
  }

  const finalMessage = (displayMessage as string) || "Có lỗi xảy ra, vui lòng thử lại sau";
  toast.error(finalMessage, { id: finalMessage });
};

http.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      skipErrorToast?: boolean;
    };

    // Một số request coi lỗi (vd 404 "chưa có hồ sơ") là trạng thái hợp lệ và tự
    // xử lý ở tầng UI — bỏ qua toast lỗi toàn cục cho các request này.
    const skipToast = originalRequest?.skipErrorToast === true;

    if (error.code === "ERR_NETWORK" || !error.response) {
      if (!skipToast) handleApiErrorGlobal(error);
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (status !== 401 || !originalRequest) {
      if (!skipToast) handleApiErrorGlobal(error);
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh");

    if (isAuthEndpoint) {
      if (!skipToast) handleApiErrorGlobal(error);
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
