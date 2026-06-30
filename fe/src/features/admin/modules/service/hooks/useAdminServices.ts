import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  adminServicesApi,
  GetAdminServicesQuery,
  CreateAdminServiceDto,
  UpdateAdminServiceDto,
  CreateAdminPackageDto,
  UpdateAdminPackageDto,
  SubServiceLinkItem,
  AnalyticsFilter,
} from '../services/admin-services.service';
import { toast } from 'sonner';

// ─── COVERAGE AREAS KEYS ─────────────────────────────────────────────────────
export const ADMIN_COVERAGE_AREAS_KEYS = {
  all: ['admin-coverage-areas'] as const,
  list: (city?: string) => [...ADMIN_COVERAGE_AREAS_KEYS.all, city ?? 'all'] as const,
};

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
  analytics: (id: string, filter?: AnalyticsFilter) => [...ADMIN_PACKAGES_KEYS.detail(id), 'analytics', filter] as const,
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

export const useAdminPackageAnalytics = (id: string, filter?: AnalyticsFilter, enabled = true) => {
  return useQuery({
    queryKey: ADMIN_PACKAGES_KEYS.analytics(id, filter),
    queryFn: () => adminServicesApi.getPackageAnalytics(id, filter),
    enabled: !!id && enabled,
  });
};

export const useAddSubServicesToPackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ packageId, subServices }: { packageId: string; subServices: SubServiceLinkItem[] }) =>
      adminServicesApi.addSubServicesToPackage(packageId, subServices),
    onSuccess: (_, variables) => {
      toast.success('Liên kết dịch vụ con thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PACKAGES_KEYS.detail(variables.packageId) });
    },
    onError: () => toast.error('Liên kết thất bại!'),
  });
};

export const useRemoveSubServiceFromPackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ packageId, subServiceId }: { packageId: string; subServiceId: string }) =>
      adminServicesApi.removeSubServiceFromPackage(packageId, subServiceId),
    onSuccess: (_, variables) => {
      toast.success('Đã gỡ dịch vụ con!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PACKAGES_KEYS.detail(variables.packageId) });
    },
  });
};

// ─── COVERAGE AREAS HOOKS ─────────────────────────────────────────────────────
export const useCoverageAreas = (city?: string) => {
  return useQuery({
    queryKey: ADMIN_COVERAGE_AREAS_KEYS.list(city),
    queryFn: () => adminServicesApi.getCoverageAreas(city),
    staleTime: 10 * 60 * 1000, // 10 phút — data ít thay đổi
  });
};

export const useUpdateCoverageArea = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, transportFee }: { id: string; transportFee: number }) =>
      adminServicesApi.updateCoverageArea(id, transportFee),
    onSuccess: () => {
      toast.success('Cập nhật phí vận chuyển thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_COVERAGE_AREAS_KEYS.all });
    },
    onError: (error: unknown) => {
      const err = error as AxiosError<{ message?: string }>;
      toast.error(err.response?.data?.message || 'Không thể cập nhật phí vận chuyển!');
    },
  });
};
