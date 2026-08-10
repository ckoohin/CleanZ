import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { systemConfigApi } from "../services/system-config.service";
import type {
  SystemConfigResponse,
  UpdateSystemConfigPayload,
} from "../types/system-config.types";

export const systemConfigKeys = {
  all: ["admin-system-config"] as const,
  operations: ["admin-system-config", "operations"] as const,
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

export function useOperationalPolicies() {
  return useQuery({
    queryKey: systemConfigKeys.operations,
    queryFn: () => systemConfigApi.getOperationalPolicies(),
  });
}

function useOperationalPolicyMutation<Payload>(
  mutationFn: (payload: Payload) => Promise<unknown>,
  successMessage: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      toast.success(successMessage);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: systemConfigKeys.operations,
        }),
        queryClient.invalidateQueries({ queryKey: ["admin-activities"] }),
      ]);
    },
  });
}

export function useUpdateTaskerCancellationPolicy() {
  return useOperationalPolicyMutation(
    systemConfigApi.updateTaskerCancellation,
    "Đã cập nhật phí hủy Tasker",
  );
}

export function useUpdateCheckinOperationPolicy() {
  return useOperationalPolicyMutation(
    systemConfigApi.updateCheckin,
    "Đã cập nhật chính sách check-in",
  );
}

export function useUpdateCustomerSchedulingPolicy() {
  return useOperationalPolicyMutation(
    systemConfigApi.updateCustomerScheduling,
    "Đã cập nhật quy tắc đặt lịch",
  );
}

export function useUpdateCustomerAbsencePolicy() {
  return useOperationalPolicyMutation(
    systemConfigApi.updateCustomerAbsence,
    "Đã cập nhật chính sách khách hàng vắng mặt",
  );
}
