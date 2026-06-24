// features/customer/catalog/services/catalog.service.ts

import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type { SubService, SubServiceListResponse } from "../types/service.type";

export const catalogApi = {
  findAll: (): Promise<SubServiceListResponse> =>
    http
      .get(API_ENDPOINTS.SUB_SERVICES.LIST)
      .then((r) => r.data.data ?? r.data),

  findOne: (id: string): Promise<SubService> =>
    http
      .get(API_ENDPOINTS.SUB_SERVICES.DETAIL(id))
      .then((r) => r.data.data ?? r.data),
};