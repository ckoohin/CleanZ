import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  adminServicesApi,
  GetAdminServicesQuery,
  CreateAdminServiceDto,
  UpdateAdminServiceDto,
  CreateAdminPackageDto,
  UpdateAdminPackageDto,
} from '../services/admin-services.service';
import { toast } from 'sonner';

// ─── KEYS FOR REACT QUERY ────────────────────────────────────────────────────
export const ADMIN_SERVICES_KEYS = {
  all: ['admin-services'] as const,
  lists: () => [...ADMIN_SERVICES_KEYS.all, 'list'] as const,
  list: (params: GetAdminServicesQuery) => [...ADMIN_SERVICES_KEYS.lists(), params] as const,
  details: () => [...ADMIN_SERVICES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ADMIN_SERVICES_KEYS.details(), id] as const,
  bookings: (id: string, params?: { page?: number; limit?: number }) => [...ADMIN_SERVICES_KEYS.detail(id), 'bookings', params] as const,
  taskers: (id: string, params?: { page?: number; limit?: number }) => [...ADMIN_SERVICES_KEYS.detail(id), 'taskers', params] as const,
};

export const ADMIN_PACKAGES_KEYS = {
  all: ['admin-packages'] as const,
  lists: () => [...ADMIN_PACKAGES_KEYS.all, 'list'] as const,
  details: () => [...ADMIN_PACKAGES_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...ADMIN_PACKAGES_KEYS.details(), id] as const,
  analytics: (id: string) => [...ADMIN_PACKAGES_KEYS.detail(id), 'analytics'] as const,
};

// ─── SUB-SERVICES HOOKS ──────────────────────────────────────────────────────
export const useAdminServices = (params: GetAdminServicesQuery) => {
  return useQuery({
    queryKey: ADMIN_SERVICES_KEYS.list(params),
    queryFn: () => adminServicesApi.getServices(params),
    placeholderData: (prev) => prev,
  });
};

export const useAdminServiceDetail = (id: string) => {
  return useQuery({
    queryKey: ADMIN_SERVICES_KEYS.detail(id),
    queryFn: () => adminServicesApi.getServiceById(id),
    enabled: !!id,
  });
};

export const useCreateAdminService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminServiceDto) => adminServicesApi.createService(data),
    onSuccess: () => {
      toast.success('Thêm dịch vụ con thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.lists() });
    },
  });
};

export const useUpdateAdminService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAdminServiceDto }) =>
      adminServicesApi.updateService({ id, payload }),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật dịch vụ con thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.detail(variables.id) });
    },
    onError: (error: AxiosError<{ errors?: { message?: string } }>) => {
      const msg = error?.response?.data?.errors?.message || error?.message || 'Có lỗi xảy ra!';
      if (msg.includes('ACTIVE_BOOKINGS')) {
        toast.error('Không thể tắt dịch vụ đang có đơn hàng chưa hoàn thành!');
      } else {
        toast.error('Cập nhật thất bại: ' + msg);
      }
    },
  });
};

export const useDeleteAdminService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminServicesApi.deleteService(id),
    onSuccess: () => {
      toast.success('Xóa dịch vụ con thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_SERVICES_KEYS.lists() });
    },
    onError: (error: AxiosError<{ errors?: { message?: string } }>) => {
      const msg = error?.response?.data?.errors?.message || error?.message || 'Có lỗi xảy ra!';
      if (msg.includes('ACTIVE_BOOKINGS')) {
        toast.error('Không thể xóa dịch vụ đang có đơn hàng chưa hoàn thành!');
      } else {
        toast.error('Xóa thất bại: ' + msg);
      }
    },
  });
};

export const useServiceBookings = (id: string, params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ADMIN_SERVICES_KEYS.bookings(id, params),
    queryFn: () => adminServicesApi.getServiceBookings(id, params),
    enabled: !!id,
  });
};

export const useServiceTaskers = (id: string, params?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ADMIN_SERVICES_KEYS.taskers(id, params),
    queryFn: () => adminServicesApi.getServiceTaskers(id, params),
    enabled: !!id,
  });
};

// ─── SERVICE PACKAGES HOOKS ──────────────────────────────────────────────────
export const useAdminPackages = () => {
  return useQuery({
    queryKey: ADMIN_PACKAGES_KEYS.lists(),
    queryFn: () => adminServicesApi.getPackages(),
  });
};

export const useAdminPackageDetail = (id: string) => {
  return useQuery({
    queryKey: ADMIN_PACKAGES_KEYS.detail(id),
    queryFn: () => adminServicesApi.getPackageById(id),
    enabled: !!id,
  });
};

export const useCreateAdminPackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminPackageDto) => adminServicesApi.createPackage(data),
    onSuccess: () => {
      toast.success('Tạo gói dịch vụ thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PACKAGES_KEYS.lists() });
    },
  });
};

export const useUpdateAdminPackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAdminPackageDto }) =>
      adminServicesApi.updatePackage({ id, payload }),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật gói dịch vụ thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PACKAGES_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: ADMIN_PACKAGES_KEYS.detail(variables.id) });
    },
  });
};

export const useDeleteAdminPackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminServicesApi.deletePackage(id),
    onSuccess: () => {
      toast.success('Xóa gói dịch vụ thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PACKAGES_KEYS.lists() });
    },
  });
};

export const useAdminPackageAnalytics = (id: string) => {
  return useQuery({
    queryKey: ADMIN_PACKAGES_KEYS.analytics(id),
    queryFn: () => adminServicesApi.getPackageAnalytics(id),
    enabled: !!id,
  });
};
