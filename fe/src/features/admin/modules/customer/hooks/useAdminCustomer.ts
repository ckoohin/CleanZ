import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { adminCustomerApi } from '../services/admin-customer.service';
import type {
  CustomerQueryFilter,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '../types/customer.types';
import { toast } from 'sonner';

/** Pull a human-friendly message off an axios error, falling back to a default. */
const getErrorMessage = (error: unknown, fallback: string): string => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response
    ?.data?.message;
  return Array.isArray(message)
    ? String(message[0])
    : typeof message === 'string'
      ? message
      : fallback;
};

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
    // Giữ dữ liệu trang trước khi đổi page/filter/keyword để không nháy skeleton.
    placeholderData: keepPreviousData,
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
    placeholderData: keepPreviousData,
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
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật trạng thái khách hàng!'));
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) => adminCustomerApi.createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all });
      toast.success('Đã tạo khách hàng. Mật khẩu tạm đã được gửi tới email khách hàng.');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi tạo khách hàng!'));
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
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật khách hàng!'));
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
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi xóa khách hàng!'));
    },
  });
}

export function useRestoreCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCustomerApi.restoreCustomer(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all });
      toast.success(data.message || 'Đã khôi phục khách hàng!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi khôi phục khách hàng!'));
    },
  });
}

export function useResendTempPassword() {
  return useMutation({
    mutationFn: (id: string) => adminCustomerApi.resendTempPassword(id),
    onSuccess: (data) => {
      toast.success(data.message || 'Đã gửi lại mật khẩu tạm cho khách hàng!');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi gửi lại mật khẩu tạm!'));
    },
  });
}
