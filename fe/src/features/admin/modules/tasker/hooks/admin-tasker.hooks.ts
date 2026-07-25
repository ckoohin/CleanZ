import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { adminTaskerApi } from "../services/admin-tasker.service";
import type {
  AdminTaskerFilter,
  AdminUpdateTaskerPayload,
  BanTaskerPayload,
  TaskerEarningsQuery,
  UpdateTaskerWorkStatusPayload,
} from "../types/admin-tasker.types";

export const adminTaskerKeys = {
  all: ["admin-tasker"] as const,
  list: (filter: AdminTaskerFilter) =>
    [...adminTaskerKeys.all, "list", filter] as const,
  detail: (id: string) => [...adminTaskerKeys.all, "detail", id] as const,
  documents: (id: string) => [...adminTaskerKeys.all, "documents", id] as const,
  penalties: (id: string) => [...adminTaskerKeys.all, "penalties", id] as const,
  earnings: (id: string, range: TaskerEarningsQuery) =>
    [...adminTaskerKeys.all, "earnings", id, range] as const,
  earningsDetails: (id: string, range: TaskerEarningsQuery) =>
    [...adminTaskerKeys.all, "earnings-details", id, range] as const,
};

const errorMessage = (error: unknown, fallback: string): string => {
  return getApiErrorMessage(error, fallback);
};

export function useAdminTasker(filter: AdminTaskerFilter) {
  return useQuery({
    queryKey: adminTaskerKeys.list(filter),
    queryFn: () => adminTaskerApi.getTaskers(filter),
  });
}

export function useAdminTaskerDetail(id: string) {
  return useQuery({
    queryKey: adminTaskerKeys.detail(id),
    queryFn: () => adminTaskerApi.getTaskerDetail(id),
    enabled: !!id,
  });
}

export function useAdminTaskerDocuments(id: string) {
  return useQuery({
    queryKey: adminTaskerKeys.documents(id),
    queryFn: () => adminTaskerApi.getTaskerDocuments(id),
    enabled: !!id,
  });
}

export function useAdminTaskerPenalties(id: string) {
  return useQuery({
    queryKey: adminTaskerKeys.penalties(id),
    queryFn: () => adminTaskerApi.getTaskerPenalties(id),
    enabled: !!id,
  });
}

export function useAdminTaskerEarnings(id: string, range: TaskerEarningsQuery) {
  return useQuery({
    queryKey: adminTaskerKeys.earnings(id, range),
    queryFn: () => adminTaskerApi.getTaskerEarnings(id, range),
    enabled: !!id && !!range.fromDate && !!range.toDate,
  });
}

export function useAdminTaskerEarningsDetails(
  id: string,
  range: TaskerEarningsQuery,
) {
  return useQuery({
    queryKey: adminTaskerKeys.earningsDetails(id, range),
    queryFn: () => adminTaskerApi.getTaskerEarningsDetails(id, range),
    enabled: !!id && !!range.fromDate && !!range.toDate,
  });
}

export function useUpdateTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: AdminUpdateTaskerPayload;
    }) => adminTaskerApi.updateTasker(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã cập nhật thông tin tasker!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi cập nhật thông tin tasker"));
    },
  });
}

export function useUpdateTaskerWorkStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTaskerWorkStatusPayload) =>
      adminTaskerApi.updateTaskerWorkStatus(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã mở khóa nhận đơn cho tasker!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi mở khóa nhận đơn"));
    },
  });
}

export function useApproveTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTaskerApi.approveTasker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã phê duyệt hồ sơ tasker!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi phê duyệt hồ sơ"));
    },
  });
}

/**
 * Duyệt / từ chối bộ dụng cụ chuyên dụng của tasker.
 * APPROVED là điều kiện bắt buộc để tasker nhận được đơn premium
 */
export function useReviewTaskerEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      note,
    }: {
      id: string;
      action: "APPROVE" | "REJECT";
      note?: string;
    }) => adminTaskerApi.reviewTaskerEquipment(id, action, note),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success(
        variables.action === "APPROVE"
          ? "Đã duyệt bộ dụng cụ. Tasker có thể nhận đơn premium."
          : "Đã từ chối bộ dụng cụ",
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi duyệt bộ dụng cụ"));
    },
  });
}

export function useRejectTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      adminTaskerApi.rejectTasker(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã từ chối hồ sơ!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi từ chối hồ sơ"));
    },
  });
}

export function useRequestMoreInfoTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      adminTaskerApi.requestMoreInfo(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã gửi yêu cầu bổ sung thông tin!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi gửi yêu cầu"));
    },
  });
}

export function useDeleteTaskerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTaskerApi.deleteTaskerProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã xóa hồ sơ. Ứng viên sẽ cần nộp lại từ đầu.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi xóa hồ sơ"));
    },
  });
}

export function useBanTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, type, durationDays }: BanTaskerPayload) =>
      adminTaskerApi.banTasker(id, reason, type, durationDays),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã khóa tài khoản tasker!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi khóa tài khoản"));
    },
  });
}

export function useUnbanTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTaskerApi.unbanTasker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã gỡ khóa tài khoản tasker!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi gỡ khóa"));
    },
  });
}

export function useReinstateTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminTaskerApi.reinstateTasker(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã khôi phục tài khoản tasker!");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Lỗi khi khôi phục tài khoản"));
    },
  });
}
