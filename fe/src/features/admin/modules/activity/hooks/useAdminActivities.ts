import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminActivityApi } from "../services/admin-activity.service";
import type { AdminActivityQuery } from "../types/activity.types";

export const adminActivityKeys = {
  list: (params: AdminActivityQuery) =>
    ["admin-activities", "list", params] as const,
};

export function useAdminActivities(params: AdminActivityQuery) {
  return useQuery({
    queryKey: adminActivityKeys.list(params),
    queryFn: () => adminActivityApi.list(params),
    placeholderData: keepPreviousData,
  });
}
