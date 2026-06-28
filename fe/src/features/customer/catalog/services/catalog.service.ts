// features/customer/catalog/services/catalog.service.ts

import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type { PublicServiceListResponse } from "@/features/services/types/public-service.type";
import type { SubService } from "../types/service.type";

export const catalogApi = {
  findAll: (): Promise<PublicServiceListResponse> =>
    http
      .get(API_ENDPOINTS.SERVICES.BASE)
      .then((r) => r.data),

  findOne: (id: string): Promise<SubService> =>
    http
      .get(API_ENDPOINTS.SUB_SERVICES.DETAIL(id))
      .then((r) => r.data.data ?? r.data),
};
