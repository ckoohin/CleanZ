import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { PaginatedData, ApiResponse } from '@/features/admin/modules/service/services/admin-services.service';

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
  isActive?: boolean;
}

export type UpdatePricingConfigDto = Partial<CreatePricingConfigDto>;

const sanitizePricingConfigPayload = (
  payload: CreatePricingConfigDto | UpdatePricingConfigDto,
): Omit<CreatePricingConfigDto, 'priceUnit'> | Partial<Omit<CreatePricingConfigDto, 'priceUnit'>> => {
  const sanitizedPayload = { ...payload };
  delete sanitizedPayload.priceUnit;
  return sanitizedPayload;
};

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

// ─── Pricing Tier ─────────────────────────────────────────────────────────────

export type PricingMode = 'HOURLY' | 'AREA_HOURLY' | 'FIXED';

export interface PricingTierEntity {
  id: string;
  packageId: string;
  name: string;
  description?: string | null;
  pricingMode: PricingMode;
  // AREA_HOURLY
  areaMinM2?: number | null;
  areaMaxM2?: number | null;
  pricePerM2?: number | null;
  // HOURLY
  pricePerHour?: number | null;
  // FIXED
  fixedPrice?: number | null;
  // Common
  minHours: number;
  maxHours: number;
  defaultHours?: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePricingTierDto {
  packageId: string;
  name: string;
  description?: string;
  pricingMode: PricingMode;
  areaMinM2?: number;
  areaMaxM2?: number;
  pricePerM2?: number;
  pricePerHour?: number;
  fixedPrice?: number;
  minHours?: number;
  maxHours?: number;
  defaultHours?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdatePricingTierDto = Partial<Omit<CreatePricingTierDto, 'packageId'>>;

export interface CalculatePriceDto {
  packageId: string;
  pricingTierId: string;
  areaM2?: number;
  durationHours: number;
  isPeakHour?: boolean;
  hasPet?: boolean;
  needTools?: boolean;
  isNightShift?: boolean;
  selectedSubServiceIds?: string[];
}

export interface CalculatePriceResult {
  basePrice: number;
  peakFee: number;
  petFee: number;
  nightSurcharge: number;
  toolFee: number;
  discountAmount: number;
  totalPrice: number;
  breakdown: {
    pricingMode: PricingMode;
    areaM2?: number;
    durationHours: number;
    tierName: string;
    basePrice: number;
    surcharges: { peakFee: number; petFee: number; nightSurcharge: number; toolFee: number };
    discountAmount: number;
    total: number;
  };
}

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
      sanitizePricingConfigPayload(payload)
    );
    return data.data;
  },

  updatePricingConfig: async ({ id, payload }: { id: string; payload: UpdatePricingConfigDto }) => {
    const { data } = await http.patch<ApiResponse<PricingConfigEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.CONFIG_DETAIL(id),
      sanitizePricingConfigPayload(payload)
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

  // --- Pricing Tiers ---
  getTiersByPackage: async (packageId: string) => {
    const { data } = await http.get<ApiResponse<PricingTierEntity[]>>(
      API_ENDPOINTS.ADMIN_PRICING.TIERS_BY_PACKAGE(packageId)
    );
    return data.data;
  },

  createTier: async (payload: CreatePricingTierDto) => {
    const { data } = await http.post<ApiResponse<PricingTierEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.TIERS,
      payload
    );
    return data.data;
  },

  updateTier: async ({ id, payload }: { id: string; payload: UpdatePricingTierDto }) => {
    const { data } = await http.patch<ApiResponse<PricingTierEntity>>(
      API_ENDPOINTS.ADMIN_PRICING.TIER_DETAIL(id),
      payload
    );
    return data.data;
  },

  deleteTier: async (id: string) => {
    await http.delete(API_ENDPOINTS.ADMIN_PRICING.TIER_DETAIL(id));
  },

  calculatePrice: async (payload: CalculatePriceDto) => {
    const { data } = await http.post<ApiResponse<CalculatePriceResult>>(
      API_ENDPOINTS.ADMIN_PRICING.CALCULATE,
      payload
    );
    return data.data;
  },
};
