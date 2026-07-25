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
} from "@/features/auth/types/auth.type";
import http from "@/lib/api/http";
import { Profile, User } from "../types/user.type";

const skipErrorToast = {
  // Các mutation auth bên dưới đã có hook/form chịu trách nhiệm đặt message
  // đúng ngữ cảnh. Tắt toast toàn cục để một lỗi không bị báo hai lần.
  skipErrorToast: true,
} as Parameters<typeof http.post>[2];

export const authApi = {
  me: async (): Promise<User> => {
    const res = await http.get("/auth/me");

    // Hỗ trợ nhiều kiểu response backend khác nhau
    return res.data?.data ?? res.data?.user ?? res.data;
  },

  profile: async (): Promise<Profile> => {
    const res = await http.get("/auth/profile");
    return res.data?.data ?? res.data;
  },

  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const res = await http.post("/auth/login", credentials, skipErrorToast);
    return res.data;
  },

  register: async (
    credentials: RegisterCredentials,
  ): Promise<RegisterResponse> => {
    const res = await http.post("/auth/register", credentials, skipErrorToast);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await http.post("/auth/logout", undefined, skipErrorToast);
  },

  refresh: async (): Promise<void> => {
    // Refresh thất bại là tín hiệu hết phiên để interceptor điều hướng, không
    // phải lỗi cần hiện toast hoặc ghi console ở trình duyệt.
    await http.post("/auth/refresh", undefined, skipErrorToast);
  },

  verifyEmail: async (
    credentials: VerifyEmailCredentials,
  ): Promise<VerifyEmailResponse> => {
    const res = await http.post(
      "/auth/verify-email",
      credentials,
      skipErrorToast,
    );
    return res.data;
  },

  resendVerificationEmail: async (
    credentials: ResendVerificationEmailCredentials,
  ): Promise<ResendVerificationEmailResponse> => {
    const res = await http.post(
      "/auth/resend-verification-email",
      credentials,
      skipErrorToast,
    );
    return res.data;
  },

  verifyOtp: async (
    credentials: VerifyOtpCredentials,
  ): Promise<VerifyOtpResponse> => {
    const res = await http.post(
      "/auth/verify-login-otp",
      credentials,
      skipErrorToast,
    );
    return res.data;
  },

  forgotPassword: async (
    credentials: ForgotPasswordCredentials,
  ): Promise<ForgotPasswordResponse> => {
    const res = await http.post(
      "/auth/forgot-password",
      credentials,
      skipErrorToast,
    );
    return res.data;
  },

  resetPassword: async (
    credentials: ResetPasswordCredentials,
  ): Promise<ResetPasswordResponse> => {
    const res = await http.post(
      "/auth/reset-password",
      credentials,
      skipErrorToast,
    );
    return res.data;
  },

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message: string }> => {
    return http
      .patch<{ message: string }>(
        "/auth/change-password",
        data,
        skipErrorToast,
      )
      .then((res) => res.data);
  },

  updateProfile: async (data: {
    fullName?: string;
    phone?: string;
    avatar?: File;
  }): Promise<{ message: string; data: Profile }> => {
    const formData = new FormData();

    if (data.fullName) formData.append("fullName", data.fullName);
    if (data.phone) formData.append("phone", data.phone);
    if (data.avatar) formData.append("avatar", data.avatar);

    const res = await http.patch<{ message: string; data: Profile }>(
      "/customer/profile/me",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        skipErrorToast: true,
      } as Parameters<typeof http.patch>[2],
    );

    return res.data;
  },
};
