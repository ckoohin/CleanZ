import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adminPricingApi,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
  CreatePeakDayConfigDto,
  UpdatePeakDayConfigDto,
  CreatePricingTierDto,
  UpdatePricingTierDto,
} from '../services/admin-pricing.service';
import { getApiErrorMessage } from '@/lib/api/error-message';

export const ADMIN_PRICING_KEYS = {
  allConfigs: ['admin-pricing-configs'] as const,
  configs: (params?: { page?: number; limit?: number; name?: string }) =>
    ['admin-pricing-configs', params] as const,
  configDetail: (id: string) => ['admin-pricing-config', id] as const,
  allPeakDays: ['admin-peak-days'] as const,
  peakDays: (onlyActive?: boolean) => ['admin-peak-days', { onlyActive }] as const,
  peakDayDetail: (id: string) => ['admin-peak-day', id] as const,
  tiersByPackage: (packageId: string) => ['admin-pricing-tiers', packageId] as const,
};

// ─── Pricing Config ───────────────────────────────────────────────────────────

export function usePricingConfigs(params?: { page?: number; limit?: number; name?: string }) {
  return useQuery({
    queryKey: ADMIN_PRICING_KEYS.configs(params),
    queryFn: () => adminPricingApi.getPricingConfigs(params),
  });
}

export function usePricingConfigDetail(id: string) {
  return useQuery({
    queryKey: ADMIN_PRICING_KEYS.configDetail(id),
    queryFn: () => adminPricingApi.getPricingConfigById(id),
    enabled: !!id,
  });
}

export function useCreatePricingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePricingConfigDto) => adminPricingApi.createPricingConfig(payload),
    onSuccess: () => {
      toast.success('Đã tạo bảng giá thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PRICING_KEYS.allConfigs });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể tạo bảng giá'));
    },
  });
}

export function useUpdatePricingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: UpdatePricingConfigDto }) =>
      adminPricingApi.updatePricingConfig(args),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật bảng giá thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PRICING_KEYS.allConfigs });
      queryClient.invalidateQueries({ queryKey: ADMIN_PRICING_KEYS.configDetail(variables.id) });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật bảng giá'));
    },
  });
}

export function useDeletePricingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPricingApi.deletePricingConfig(id),
    onSuccess: () => {
      toast.success('Xóa bảng giá thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PRICING_KEYS.allConfigs });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể xóa bảng giá'));
    },
  });
}

// ─── Peak Days ────────────────────────────────────────────────────────────────

export function usePeakDays(onlyActive?: boolean) {
  return useQuery({
    queryKey: ADMIN_PRICING_KEYS.peakDays(onlyActive),
    queryFn: () => adminPricingApi.getPeakDays(onlyActive),
  });
}

export function usePeakDayDetail(id: string) {
  return useQuery({
    queryKey: ADMIN_PRICING_KEYS.peakDayDetail(id),
    queryFn: () => adminPricingApi.getPeakDayById(id),
    enabled: !!id,
  });
}

export function useCreatePeakDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePeakDayConfigDto) => adminPricingApi.createPeakDay(payload),
    onSuccess: () => {
      toast.success('Thêm ngày cao điểm thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PRICING_KEYS.allPeakDays });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể thêm ngày cao điểm'));
    },
  });
}

export function useUpdatePeakDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: UpdatePeakDayConfigDto }) =>
      adminPricingApi.updatePeakDay(args),
    onSuccess: (_, variables) => {
      toast.success('Cập nhật ngày cao điểm thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PRICING_KEYS.allPeakDays });
      queryClient.invalidateQueries({
        queryKey: ADMIN_PRICING_KEYS.peakDayDetail(variables.id),
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật ngày cao điểm'));
    },
  });
}

export function useDeletePeakDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPricingApi.deletePeakDay(id),
    onSuccess: () => {
      toast.success('Xóa ngày cao điểm thành công!');
      queryClient.invalidateQueries({ queryKey: ADMIN_PRICING_KEYS.allPeakDays });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể xóa ngày cao điểm'));
    },
  });
}

// ─── Pricing Tiers ────────────────────────────────────────────────────────────

export function usePricingTiers(packageId: string) {
  return useQuery({
    queryKey: ADMIN_PRICING_KEYS.tiersByPackage(packageId),
    queryFn: () => adminPricingApi.getTiersByPackage(packageId),
    enabled: !!packageId,
  });
}

export function useCreatePricingTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePricingTierDto) => adminPricingApi.createTier(payload),
    onSuccess: (_, variables) => {
      toast.success('Đã thêm mức giá thành công!');
      queryClient.invalidateQueries({
        queryKey: ADMIN_PRICING_KEYS.tiersByPackage(variables.packageId),
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể thêm mức giá'));
    },
  });
}

export function useUpdatePricingTier(packageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: UpdatePricingTierDto }) =>
      adminPricingApi.updateTier(args),
    onSuccess: () => {
      toast.success('Cập nhật mức giá thành công!');
      queryClient.invalidateQueries({
        queryKey: ADMIN_PRICING_KEYS.tiersByPackage(packageId),
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể cập nhật mức giá'));
    },
  });
}

export function useDeletePricingTier(packageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminPricingApi.deleteTier(id),
    onSuccess: () => {
      toast.success('Đã xóa mức giá!');
      queryClient.invalidateQueries({
        queryKey: ADMIN_PRICING_KEYS.tiersByPackage(packageId),
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Không thể xóa mức giá'));
    },
  });
}
