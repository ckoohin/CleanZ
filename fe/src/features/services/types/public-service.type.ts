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

export interface PublicPricingTier {
  id: string;
  name: string;
  description: string | null;
  pricingMode: "HOURLY" | "AREA_HOURLY" | "FIXED" | string;
  minHours: number | null;
  maxHours: number | null;
  defaultHours: number | null;
  pricePerHour: number | null;
  pricePerM2: number | null;
  fixedPrice: number | null;
  areaMinM2: number | null;
  areaMaxM2: number | null;
  sortOrder: number;
}

export interface PublicDuration {
  id: string;
  durationHours: number;
  title: string | null;
  description: string | null;
  priceMultiplier: number;
  isPopular: boolean;
  suggestedArea: number | null;
  taskerCount: number;
  priceMode?: "fixed" | "multiplier" | string | null;
  fixedPrice?: number | null;
}

export interface PublicAddon {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number | null;
}

export interface PublicPeakHour {
  id: string;
  dayOfWeek: number;
  startHour: string;
  endHour: string;
  multiplier: number;
  startDate: string | null;
  endDate: string | null;
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
  termsAndConditions: string | null;
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
  isPopular?: boolean;
  hasPromo?: boolean;
  createdAt?: string;
  baseHourlyRate?: number;
  premiumHourlyRate?: number;
  nightSurcharge?: number;
  petSurcharge?: number;
  waitingSurcharge?: number;
  toolFee?: number;
  peakRatePercent?: number;
  coverageAreas?: { id: string; name: string }[];
  pricingTiers?: PublicPricingTier[];
  durations?: PublicDuration[];
  addons?: PublicAddon[];
  peakHours?: PublicPeakHour[];
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
