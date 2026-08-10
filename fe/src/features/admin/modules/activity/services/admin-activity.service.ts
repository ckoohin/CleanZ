import { API_ENDPOINTS } from "@/constants/api-endpoints";
import http from "@/lib/api/http";
import type {
  AdminActivityQuery,
  AdminActivityResponse,
  AuditStorageMetrics,
} from "../types/activity.types";

export const adminActivityApi = {
  list: (params: AdminActivityQuery): Promise<AdminActivityResponse> =>
    http
      .get<AdminActivityResponse>(API_ENDPOINTS.ADMIN_ACTIVITIES.BASE, {
        params,
      })
      .then((response) => response.data),

  storageMetrics: (): Promise<AuditStorageMetrics> =>
    http
      .get<AuditStorageMetrics>(API_ENDPOINTS.ADMIN_ACTIVITIES.STORAGE_METRICS)
      .then((response) => response.data),

  // `responseType: 'blob'` là bắt buộc: bỏ đi thì axios cố parse CSV thành JSON
  // và file tải về hỏng.
  exportCsv: (params: AdminActivityQuery): Promise<Blob> =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_ACTIVITIES.EXPORT, {
        params,
        responseType: "blob",
      })
      .then((response) => response.data),
};
