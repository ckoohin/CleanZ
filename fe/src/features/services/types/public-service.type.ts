// Pricing của một sub-service
export interface PublicServicePricing {
  basePrice: number;
  petFee: number;
  waitingFee: number;
}

// Sub-service lồng bên trong một Service
export interface PublicSubService {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  galleryUrls: string[];
  includedTasks: string[];
  excludedTasks: string[];
  durationHours: number;
  pricing: PublicServicePricing | null;
}

// Service công khai (dành cho trang catalog / danh mục)
export interface PublicService {
  id: string;
  serviceCode: string;
  packageCode: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  policyDescription: string | null;
  iconUrl: string | null;
  maxHours: number | null;
  baseDurationHours: number;
  thumbnailUrl: string | null;
  galleryUrls: string[];
  includedTasks: string[];
  excludedTasks: string[];
  pricing: PublicServicePricing | null;
  subServices: PublicSubService[];
  pricingMode?: string | null;
  nightSurcharge?: number;
  petSurcharge?: number;
  waitingSurcharge?: number;
  toolFee?: number;
  peakRatePercent?: number;
  coverageAreas?: { id: string; name: string }[];
}

export interface PublicServiceListResponse {
  data: PublicService[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
