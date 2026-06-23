export interface PublicServicePricing {
  basePrice: number;
  petFee: number;
  waitingFee: number;
}

export interface PublicSubService {
  id: string;
  subServiceCode: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  durationHours: number;
  thumbnailUrl: string | null;
  galleryUrls: string[];
  includedTasks: string[];
  excludedTasks: string[];
  pricingType: string;
  pricing: PublicServicePricing;
}

export interface PublicCoverageArea {
  id: string;
  name: string;
}

export interface PublicPackage {
  id: string;
  packageCode: string;
  name: string;
  iconUrl: string | null;
  maxHours: number;
  termsAndConditions: string | null;
  policyDescription: string | null;
  nightSurcharge: number;
  petSurcharge: number;
  waitingSurcharge: number;
  toolFee: number;
  peakRatePercent: number;
  coverageAreas: PublicCoverageArea[];
  subServices: PublicSubService[];
}

export interface PublicServiceListResponse {
  data: PublicPackage[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Giữ lại alias để tương thích ngược nếu cần
export type PublicService = PublicPackage;
