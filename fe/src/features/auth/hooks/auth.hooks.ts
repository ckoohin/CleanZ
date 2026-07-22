"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/services/auth.service";
import { queryKeys } from "@/features/auth/queries/auth.query";
import { ROUTES } from "@/constants/routes";
import type {
  ForgotPasswordCredentials,
  ForgotPasswordResponse,
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  RegisterResponse,
  ResendVerificationEmailCredentials,
  ResendVerificationEmailResponse,
  ResetPasswordCredentials,
  ResetPasswordResponse,
  VerifyEmailCredentials,
  VerifyEmailResponse,
  VerifyOtpCredentials,
  VerifyOtpResponse,
} from "@/features/auth/types/auth.type";
import type { User } from "@/features/auth/types/user.type";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api/error-message";

export function getErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}

export function useAuth() {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.auth.profile(),
    queryFn: authApi.profile,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin(redirectUrl?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (res: LoginResponse) => {
      // queryClient.setQueryData(queryKeys.auth.me(), res.data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });

      toast.success(res.message);

      const url = new URL(ROUTES.AUTH.OTP_VERIFY, window.location.origin);
      url.searchParams.set("userId", res.userId);
      if (redirectUrl) {
        url.searchParams.set("redirect", redirectUrl);
      }

      router.push(url.pathname + url.search);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (credentials: RegisterCredentials) =>
      authApi.register(credentials),
    onSuccess: (_res: RegisterResponse) => {
      toast.success("Đăng ký thành công!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Lấy user hiện tại trước khi xóa để biết nên redirect về login nào
      const currentUser = queryClient.getQueryData<{ role?: string }>(
        queryKeys.auth.me(),
      );
      const role = currentUser?.role;

      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
      queryClient.clear();
      toast.success("Đăng xuất thành công");

      // Redirect về đúng trang login theo role
      if (role === "ADMIN") {
        router.push(ROUTES.AUTH.LOGIN_ADMIN);
      } else if (role === "TASKER") {
        router.push(ROUTES.AUTH.LOGIN_TASKER);
      } else {
        router.push(ROUTES.AUTH.LOGIN);
      }
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (credentials: VerifyEmailCredentials) =>
      authApi.verifyEmail(credentials),
    onSuccess: (res: VerifyEmailResponse) => {
      toast.success(res.message);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
      return error;
    },
  });
}
export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: (credentials: ResendVerificationEmailCredentials) =>
      authApi.resendVerificationEmail(credentials),
    onSuccess: (res: ResendVerificationEmailResponse) => {
      toast.success(res.message);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
      return error;
    },
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: VerifyOtpCredentials) =>
      authApi.verifyOtp(credentials),
    onSuccess: async (res: VerifyOtpResponse) => {
      toast.success(res.message);

      // Đọc redirect param từ URL hiện tại
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get("redirect") || ROUTES.HOME;

      // Lấy hồ sơ mới để biết có buộc đổi mật khẩu (tài khoản admin tạo) hay không.
      let user: User | null = null;
      try {
        user = await queryClient.fetchQuery({
          queryKey: queryKeys.auth.me(),
          queryFn: authApi.me,
        });
      } catch {
        await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      }

      if (user?.mustChangePassword) {
        router.replace(ROUTES.AUTH.CHANGE_PASSWORD);
      } else {
        router.replace(redirectUrl);
      }
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (credentials: ForgotPasswordCredentials) =>
      authApi.forgotPassword(credentials),
    onSuccess: (res: ForgotPasswordResponse) => {
      toast.success(res.message);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
      return error;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (credentials: ResetPasswordCredentials) =>
      authApi.resetPassword(credentials),
    onSuccess: (res: ResetPasswordResponse) => {
      toast.success(res.message);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
      return error;
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (data: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => authApi.changePassword(data),
    onSuccess: (res) => {
      toast.success(
        res.message || "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
      );
      // Backend đã thu hồi refresh token → buộc đăng nhập lại với mật khẩu mới.
      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
      queryClient.clear();
      router.replace(ROUTES.AUTH.LOGIN);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { fullName?: string; phone?: string; avatar?: File }) =>
      authApi.updateProfile(dto),
    onSuccess: (res) => {
      toast.success(res.message || "Cập nhật hồ sơ thành công!");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.auth.profile(),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}
