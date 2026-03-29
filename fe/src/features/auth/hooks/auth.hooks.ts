'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/features/auth/services/auth.service';
import { queryKeys } from '@/features/auth/queries/auth.query';
import type { LoginCredentials, RegisterCredentials } from '@/features/auth/types/auth.type';
import { toast } from 'sonner';

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

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me(), data.user);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
    },
    onError: (error: unknown) => {
      console.error("Login error:", error);
      toast.error(
        "Đăng nhập không thành công. Vui lòng kiểm tra kết nối hoặc thông tin tài khoản."
      );
    }
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (credentials: RegisterCredentials) => authApi.register(credentials),
    onSuccess: () => {
      toast.success("Đăng ký thành công !")
    },
    onError: (error: unknown) => {
      console.error("Register error:", error);
      toast.error(
        "Đăng ký không thành công. Vui lòng kiểm tra kết nối hoặc thông tin tài khoản."
      );
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
      router.push('/login?error=unauthorized');
    },
  });
}