import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import {
  adminOptionsApi,
  CreateServiceOptionDto,
  UpdateServiceOptionDto,
  CreateServiceOptionChoiceDto,
  UpdateServiceOptionChoiceDto,
} from '../services/admin-options.service';
import { ADMIN_SERVICES_KEYS } from '@/features/admin/modules/service/hooks/useAdminServices';

export function useCreateServiceOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, payload }: { serviceId: string; payload: CreateServiceOptionDto }) =>
      adminOptionsApi.createOption(serviceId, payload),
    onSuccess: (_, variables) => {
      toast.success('Thêm Option thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.detail(variables.serviceId) });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi thêm Option');
    },
  });
}

export function useUpdateServiceOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServiceOptionDto }) =>
      adminOptionsApi.updateOption({ id, payload }),
    onSuccess: () => {
      toast.success('Cập nhật Option thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật Option');
    },
  });
}

export function useDeleteServiceOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminOptionsApi.deleteOption(id),
    onSuccess: () => {
      toast.success('Xóa Option thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi xóa Option');
    },
  });
}

// --- Choices ---

export function useCreateServiceOptionChoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ optionId, payload }: { optionId: string; payload: CreateServiceOptionChoiceDto }) =>
      adminOptionsApi.createChoice(optionId, payload),
    onSuccess: () => {
      toast.success('Thêm lựa chọn thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi thêm lựa chọn');
    },
  });
}

export function useUpdateServiceOptionChoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServiceOptionChoiceDto }) =>
      adminOptionsApi.updateChoice({ id, payload }),
    onSuccess: () => {
      toast.success('Cập nhật lựa chọn thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật lựa chọn');
    },
  });
}

export function useDeleteServiceOptionChoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminOptionsApi.deleteChoice(id),
    onSuccess: () => {
      toast.success('Xóa lựa chọn thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message: string }>;
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi xóa lựa chọn');
    },
  });
}
