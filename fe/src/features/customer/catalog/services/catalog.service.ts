// features/customer/catalog/services/catalog.service.ts

import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type { PublicServiceListResponse, PublicService } from "@/features/services/types/public-service.type";

export const catalogApi = {
  findAll: (): Promise<PublicServiceListResponse> =>
    http
      .get(API_ENDPOINTS.SERVICES.BASE)
      .then((r) => r.data),

  findOne: (id: string): Promise<PublicService> =>
    http
      .get(API_ENDPOINTS.SERVICES.DETAIL(id))
      .then((r) => r.data),
};
