import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminCustomerApi } from '../services/admin-customer.service';
import type {
  CustomerQueryFilter,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '../types/customer.types';
import { toast } from 'sonner';

export const adminCustomerKeys = {
  all: ['admin-customer'] as const,
  lists: () => [...adminCustomerKeys.all, 'list'] as const,
  list: (filter: CustomerQueryFilter) => [...adminCustomerKeys.lists(), filter] as const,
  details: () => [...adminCustomerKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminCustomerKeys.details(), id] as const,
  bookings: (id: string, page: number, limit: number) =>
    [...adminCustomerKeys.all, 'bookings', id, { page, limit }] as const,
};

export function useAdminCustomers(filter: CustomerQueryFilter) {
  return useQuery({
    queryKey: adminCustomerKeys.list(filter),
    queryFn: () => adminCustomerApi.getCustomers(filter),
  });
}

export function useAdminCustomerDetail(id: string) {
  return useQuery({
    queryKey: adminCustomerKeys.detail(id),
    queryFn: () => adminCustomerApi.getCustomerDetail(id),
    enabled: !!id,
  });
}

export function useAdminCustomerBookings(id: string, page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: adminCustomerKeys.bookings(id, page, limit),
    queryFn: () => adminCustomerApi.getCustomerBookings(id, page, limit),
    enabled: !!id,
  });
}

export function useToggleCustomerStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminCustomerApi.toggleCustomerStatus(id, isActive),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all });
      toast.success(data.message || 'Cập nhật trạng thái khách hàng thành công!');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái khách hàng!',
      );
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => adminCustomerApi.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all });
      toast.success('Tạo khách hàng thành công!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo khách hàng!');
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCustomerPayload }) =>
      adminCustomerApi.updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all });
      toast.success('Cập nhật khách hàng thành công!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật khách hàng!');
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCustomerApi.deleteCustomer(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all });
      toast.success(data.message || 'Đã xóa khách hàng!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa khách hàng!');
    },
  });
}
