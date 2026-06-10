import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminTaskerApi, AdminTaskerFilter } from "../services/admin-tasker.service";
import { toast } from "sonner";

export const adminTaskerKeys = {
  all: ["admin-tasker"] as const,
  list: (filter: AdminTaskerFilter) => [...adminTaskerKeys.all, "list", filter] as const,
  detail: (id: string) => [...adminTaskerKeys.all, "detail", id] as const,
  documents: (id: string) => [...adminTaskerKeys.all, "documents", id] as const,
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

export function useApproveTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminTaskerApi.approveTasker(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Hồ sơ đã được phê duyệt!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi phê duyệt hồ sơ");
    },
  });
}

export function useRejectTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => adminTaskerApi.rejectTasker(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã từ chối hồ sơ!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi từ chối hồ sơ");
    },
  });
}

export function useRequestMoreInfoTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => adminTaskerApi.requestMoreInfo(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã gửi yêu cầu bổ sung thông tin!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi gửi yêu cầu");
    },
  });
}

export function useAdminTaskerPenalties(id: string) {
  return useQuery({
    queryKey: ["admin-tasker", "penalties", id],
    queryFn: () => adminTaskerApi.getTaskerPenalties(id),
    enabled: !!id,
  });
}

export function useBanTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, type }: { id: string; reason: string; type: string }) => adminTaskerApi.banTasker(id, reason, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success("Đã khóa tài khoản tasker!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi khóa tài khoản");
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
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi gỡ khóa");
    },
  });
}
