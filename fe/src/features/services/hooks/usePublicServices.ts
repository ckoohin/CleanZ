import { useQuery } from "@tanstack/react-query";
import { publicServiceApi } from "../services/public-service.service";

export const publicServiceKeys = {
  all: ["public-services"] as const,
  list: (params: { page: number; limit: number; search?: string }) =>
    [...publicServiceKeys.all, "list", params] as const,
};

export function usePublicServices(
  params: { page: number; limit: number; search?: string } = {
    page: 1,
    limit: 100,
  },
) {
  return useQuery({
    queryKey: publicServiceKeys.list(params),
    queryFn: () => publicServiceApi.list(params),
    staleTime: 5 * 60 * 1000,
  });
}
