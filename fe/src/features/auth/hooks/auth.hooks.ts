"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/services/auth.service";
import { queryKeys } from "@/features/auth/queries/auth.query";
import type {
  ForgotPasswordCredentials,
  LoginCredentials,
  LoginResponse,
  RegisterCredentials,
  ResendVerificationEmailCredentials,
  ResetPasswordCredentials,
  VerifyEmailCredentials,
  VerifyOtpCredentials,
} from "@/features/auth/types/auth.type";
import { toast } from "sonner";

interface ApiErrorResponse {
  message?: string;
  errors?: string | Record<string, string>;
}

interface AxiosErrorLike {
  response?: {
    data?: ApiErrorResponse;
  };
}
  
export function getErrorMessage(error: unknown): string {
  const err = error as AxiosErrorLike;
  const responseData = err.response?.data;

  if (!responseData) return "Lỗi kết nối, vui lòng thử lại";

  if (typeof responseData.message === "string") return responseData.message;

  const errors = responseData.errors;
  if (errors) {
    if (typeof errors === "string") return errors;
    if (typeof errors === "object") {
      const firstError = Object.values(errors)[0];
      if (typeof firstError === "string") return firstError;
    }
  }

  return "Đã xảy ra lỗi, vui lòng thử lại";
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

      const url = new URL("/otp-verify", window.location.origin);
      url.searchParams.set("userId", res.userId);
      if (redirectUrl) {
        url.searchParams.set("redirect", redirectUrl);
      }

      router.push(url.pathname + url.search);
    },
    onError: (error: unknown) => {
      console.error("Login error:", error);
      toast.error(getErrorMessage(error));
    },
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (credentials: RegisterCredentials) =>
      authApi.register(credentials),
    onSuccess: (res: any) => {
      console.log(res);
      toast.success(res.message);
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
      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
      queryClient.clear();
      toast.success("Đăng xuất thành công");
      router.push("/login");
    },
    onError: (error: any) => {
      console.error("Logout error:", error);
      toast.error(error.response?.data?.errors?.message);
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (credentials: VerifyEmailCredentials) =>
      authApi.verifyEmail(credentials),
    onSuccess: (res: any) => {
      // console.log(res);
      toast.success(res.message);
    },
    onError: (error: any) => {
      // console.log(error.response);
      toast.error(error.response?.data?.errors?.message);
      return error;
    },
  });
}
export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: (credentials: ResendVerificationEmailCredentials) =>
      authApi.resendVerificationEmail(credentials),
    onSuccess: (res: any) => {
      // console.log(res);
      toast.success(res.message);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.errors?.message);
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
    onSuccess: (res: { message: string }, _variables, _context) => {
      toast.success(res.message);

      // Đọc redirect param từ URL hiện tại
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get("redirect") || "/";

      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      router.replace(redirectUrl);
    },
    onError: (error: unknown) => {
      console.error("Verify OTP error:", error);
      toast.error(getErrorMessage(error));
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (credentials: ForgotPasswordCredentials) =>
      authApi.forgotPassword(credentials),
    onSuccess: (res: any) => {
      // console.log(res);
      toast.success(res.message);
    },
    onError: (error: any) => {
      // console.log(error.response);
      toast.error(error.response?.data?.errors?.message);
      return error;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (credentials: ResetPasswordCredentials) =>
      authApi.resetPassword(credentials),
    onSuccess: (res: any) => {
      // console.log(res);
      toast.success(res.message);
    },
    onError: (error: any) => {
      // console.log(error.response);
      toast.error(error.response?.data?.errors?.message);
      return error;
    },
  });
}
