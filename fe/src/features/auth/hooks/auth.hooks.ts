'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/features/auth/services/auth.service';
import { queryKeys } from '@/features/auth/queries/auth.query';
import type { LoginCredentials, LoginResponse, RegisterCredentials, VerifyOtpCredentials } from '@/features/auth/types/auth.type';
import { toast } from 'sonner';
import axios, { AxiosError, AxiosResponse } from 'axios';

type ErrorResponse = {
  message?: {
    status: number;
    errors: {};
  };
};

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

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (res: LoginResponse) => {
      // queryClient.setQueryData(queryKeys.auth.me(), res.data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      
      toast.success(res.message)

      router.push(`${process.env.NEXT_PUBLIC_CLIENT_URL}/otp-verify?userId=${res.userId}`)
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      toast.error(
        error.response?.data?.errors?.message
      );
    }
  });
}

export function useRegister() {
  const router = useRouter();
  return useMutation({
    mutationFn: (credentials: RegisterCredentials) => authApi.register(credentials),
    onSuccess: (res : any) => {
      console.log(res);
      toast.success(res.message)
    },
    onError: (error: any) => {
      console.log(error.response);
      toast.error(error.response?.data?.errors?.message);
    }
  })
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.me() });
      queryClient.clear();
      toast.success("Đăng xuất thành công")
      router.push('/login');
    },
    onError: (error: any) => {
      console.error("Logout error:", error);
      toast.error(
        error.response?.data?.errors?.message
      );
    }
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: (res : any) => {
      console.log(res);
      toast.success(res.message)
    },
    onError: (error: any) => {
      console.log(error.response);
      toast.error(error.response?.data?.errors?.message);
    }
  })
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: VerifyOtpCredentials) => authApi.verifyOtp(credentials),
    onSuccess: (res : {message : string}) => {
      // console.log(res.message);
      toast.success(res.message)

      router.push(`/`)
    },
    onError: (error: any) => {
      // console.log(error.response);
      if (error.response?.data?.errors?.message) {
        toast.error(error.response?.data?.errors?.message);
        return
      }

      toast.error("Lỗi kết lối vui lòng xem lại mạng")
    }
  })
}