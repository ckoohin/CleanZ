import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminTaskerApi } from "../services/admin-tasker.service";
import type {
  AdminTaskerFilter,
  AdminUpdateTaskerPayload,
  BanTaskerPayload,
  UpdateTaskerWorkStatusPayload,
} from "../types/admin-tasker.types";

export const adminTaskerKeys = {
  all: ["admin-tasker"] as const,
  list: (filter: AdminTaskerFilter) => [...adminTaskerKeys.all, "list", filter] as const,
  detail: (id: string) => [...adminTaskerKeys.all, "detail", id] as const,
  documents: (id: string) => [...adminTaskerKeys.all, "documents", id] as const,
  penalties: (id: string) => [...adminTaskerKeys.all, "penalties", id] as const,
};

const errorMessage = (error: unknown, fallback: string): string => {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || fallback;
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
