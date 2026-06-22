export interface PublicServicePricing {
  basePrice: number;
  petFee: number;
  waitingFee: number;
}

export interface PublicService {
  id: string;
  serviceCode: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  baseDurationHours: number;
  thumbnailUrl: string | null;
  galleryUrls: string[];
  includedTasks: string[];
  excludedTasks: string[];
  pricing: PublicServicePricing;
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
