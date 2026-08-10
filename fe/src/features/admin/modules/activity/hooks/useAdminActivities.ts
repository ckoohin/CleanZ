import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminActivityApi } from "../services/admin-activity.service";
import type { AdminActivityQuery } from "../types/activity.types";

export const adminActivityKeys = {
  list: (params: AdminActivityQuery) =>
    ["admin-activities", "list", params] as const,
  storageMetrics: () => ["admin-activities", "storage-metrics"] as const,
};

export function useAdminActivities(params: AdminActivityQuery) {
  return useQuery({
    queryKey: adminActivityKeys.list(params),
    queryFn: () => adminActivityApi.list(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Số liệu lưu trữ đổi rất chậm (job dọn chạy mỗi 6 giờ) và truy vấn có
 * `pg_total_relation_size` nên không rẻ — giữ cache 5 phút thay vì fetch lại mỗi
 * lần vào trang.
 */
export function useAuditStorageMetrics() {
  return useQuery({
    queryKey: adminActivityKeys.storageMetrics(),
    queryFn: () => adminActivityApi.storageMetrics(),
    staleTime: 5 * 60 * 1000,
  });
}
