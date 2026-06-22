import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { PaginatedData, ApiResponse } from './admin-services.service';

export interface PricingConfigEntity {
  id: string;
  name: string;
  basePrice: number;
  peakPrice: number | null;
  petFee: number;
  waitingFee: number;
  priceUnit: string;
  platformCommissionRate: number;
  isActive: boolean;
  createdAt: string;
}

export interface PeakDayConfigEntity {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  startAt: string | null;
  endAt: string | null;
  peakRate: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePricingConfigDto {
  name: string;
  basePrice: number;
  peakPrice?: number | null;
  petFee?: number;
  waitingFee?: number;
  priceUnit?: string;
  platformCommissionRate?: number;
  isActive?: boolean;
}

export type UpdatePricingConfigDto = Partial<CreatePricingConfigDto>;

export interface CreatePeakDayConfigDto {
  name: string;
  startTime?: string;
  endTime?: string;
  startAt?: string;
  endAt?: string;
  peakRate?: number;
  isActive?: boolean;
}

export type UpdatePeakDayConfigDto = Partial<CreatePeakDayConfigDto>;

export const adminPricingApi = {
  // --- Pricing Config ---
  getPricingConfigs: async (params?: { page?: number; limit?: number; name?: string }) => {
    const { data } = await http.get<ApiResponse<PaginatedData<PricingConfigEntity>>>(
      API_ENDPOINTS.ADMIN_PRICING.CONFIGS,
      { params }
    );
    return data.data;
  },

  getPricingConfigById: async (id: string) => {
    const { data } = await http.get<ApiResponse<PricingConfigEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.CONFIG_DETAIL(id)
    );
    return data.data;
  },

  createPricingConfig: async (payload: CreatePricingConfigDto) => {
    const { data } = await http.post<ApiResponse<PricingConfigEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.CONFIGS,
      payload
    );
    return data.data;
  },

  updatePricingConfig: async ({ id, payload }: { id: string; payload: UpdatePricingConfigDto }) => {
    const { data } = await http.patch<ApiResponse<PricingConfigEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.CONFIG_DETAIL(id),
      payload
    );
    return data.data;
  },

  deletePricingConfig: async (id: string) => {
    await http.delete(API_ENDPOINTS.ADMIN_PRICING.CONFIG_DETAIL(id));
  },

  // --- Peak Days ---
  getPeakDays: async (onlyActive?: boolean) => {
    const { data } = await http.get<ApiResponse<PeakDayConfigEntity[]>>(
      API_ENDPOINTS.ADMIN_PRICING.PEAK_DAYS,
      { params: { onlyActive } }
    );
    return data.data;
  },

  getPeakDayById: async (id: string) => {
    const { data } = await http.get<ApiResponse<PeakDayConfigEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.PEAK_DAY_DETAIL(id)
    );
    return data.data;
  },

  createPeakDay: async (payload: CreatePeakDayConfigDto) => {
    const { data } = await http.post<ApiResponse<PeakDayConfigEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.PEAK_DAYS,
      payload
    );
    return data.data;
  },

  updatePeakDay: async ({ id, payload }: { id: string; payload: UpdatePeakDayConfigDto }) => {
    const { data } = await http.patch<ApiResponse<PeakDayConfigEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.PEAK_DAY_DETAIL(id),
      payload
    );
    return data.data;
  },

  deletePeakDay: async (id: string) => {
    await http.delete(API_ENDPOINTS.ADMIN_PRICING.PEAK_DAY_DETAIL(id));
  },
};
