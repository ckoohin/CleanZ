import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { systemConfigApi } from "../services/system-config.service";
import type {
  SystemConfigResponse,
  UpdateSystemConfigPayload,
} from "../types/system-config.types";

export const systemConfigKeys = {
  all: ["admin-system-config"] as const,
};

export function useSystemConfig() {
  return useQuery({
    queryKey: systemConfigKeys.all,
    queryFn: () => systemConfigApi.get(),
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateSystemConfigPayload) =>
      systemConfigApi.update(values),
    onSuccess: (data: SystemConfigResponse) => {
      queryClient.setQueryData(systemConfigKeys.all, data);
      toast.success("Đã lưu cấu hình hệ thống");
    },
  });
}
