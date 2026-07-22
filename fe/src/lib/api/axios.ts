import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { ROUTES } from '@/constants/routes';
import { getApiBaseUrl } from "@/lib/api/base-url";

// Base API configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Tự động gắn Token vào tất cả các request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lấy token từ localStorage hoặc thư viện quản lý token
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Xử lý các lỗi chung (VD: 401 Unauthorized)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Nếu lỗi 401 (Hết hạn Token hoặc chưa đăng nhập)
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Bạn có thể chèn logic gọi API Refresh Token ở đây
      // Nếu Refresh Token thất bại -> Xóa token và đá ra trang Login
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      
      // Tùy theo logic dự án, có thể redirect về màn hình Login tương ứng
      window.location.href = ROUTES.AUTH.LOGIN;
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
