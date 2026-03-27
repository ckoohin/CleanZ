'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/features/auth/services/auth.service';
import { queryKeys } from '@/features/auth/queries/auth.query';
import type { LoginCredentials } from '@/features/auth/types/auth.type';

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
      router.push('/login?error=unauthorized');
    },
  });
}