import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type { PublicServiceListResponse } from "../types/public-service.type";

export const publicServiceApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PublicServiceListResponse> =>
    http
      .get<PublicServiceListResponse>(API_ENDPOINTS.SERVICES.BASE, { params })
      .then((response) => response.data),
};
