export interface PricingConfig {
  id: string;
  name: string;
  basePrice: number;
  peakPrice: number | null;
  petFee: number;
  waitingFee: number;
  platformCommissionRate: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePricingConfigPayload {
  name: string;
  basePrice: number;
  peakPrice?: number | null;
  petFee?: number;
  waitingFee?: number;
  platformCommissionRate?: number;
  isActive?: boolean;
}

export interface UpdatePricingConfigPayload {
  name?: string;
  basePrice?: number;
  peakPrice?: number | null;
  petFee?: number;
  waitingFee?: number;
  platformCommissionRate?: number;
  isActive?: boolean;
}

export interface PricingListQuery {
  page?: number;
  limit?: number;
  name?: string;
}

export interface PricingListResponse {
  data: PricingConfig[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface PeakDayConfig {
  id: string;
  name: string;
  startTime?: string | null;
  endTime?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  peakRate: number; 
  isActive: boolean;
  createdAt: string;
}

export interface CreatePeakDayPayload {
  name: string;
  startAt?: string | null;
  endAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  peakRate: number;
  isActive?: boolean;
}

export interface UpdatePeakDayPayload {
  name?: string;
  startAt?: string | null;
  endAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  peakRate?: number;
  isActive?: boolean;
}
