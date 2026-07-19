import { API_ENDPOINTS } from "@/constants/api-endpoints";
import http from "@/lib/api/http";
import type {
  AdminActivityQuery,
  AdminActivityResponse,
} from "../types/activity.types";

export const adminActivityApi = {
  list: (params: AdminActivityQuery): Promise<AdminActivityResponse> =>
    http
      .get<AdminActivityResponse>(API_ENDPOINTS.ADMIN_ACTIVITIES.BASE, {
        params,
      })
      .then((response) => response.data),
};
