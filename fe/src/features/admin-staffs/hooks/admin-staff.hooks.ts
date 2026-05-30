import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminStaffApi, AdminStaffFilter } from "../services/admin-staff.service";
import { toast } from "sonner";

export const adminStaffKeys = {
  all: ["admin-staff"] as const,
  list: (filter: AdminStaffFilter) => [...adminStaffKeys.all, "list", filter] as const,
  detail: (id: string) => [...adminStaffKeys.all, "detail", id] as const,
  documents: (id: string) => [...adminStaffKeys.all, "documents", id] as const,
};

export function useAdminStaff(filter: AdminStaffFilter) {
  return useQuery({
    queryKey: adminStaffKeys.list(filter),
    queryFn: () => adminStaffApi.getStaffs(filter),
  });
}

export function useAdminStaffDetail(id: string) {
  return useQuery({
    queryKey: adminStaffKeys.detail(id),
    queryFn: () => adminStaffApi.getStaffDetail(id),
    enabled: !!id,
  });
}

export function useAdminStaffDocuments(id: string) {
  return useQuery({
    queryKey: adminStaffKeys.documents(id),
    queryFn: () => adminStaffApi.getStaffDocuments(id),
    enabled: !!id,
  });
}

export function useApproveStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminStaffApi.approveStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminStaffKeys.all });
      toast.success("Hồ sơ đã được phê duyệt!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi phê duyệt hồ sơ");
    },
  });
}

export function useRejectStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => adminStaffApi.rejectStaff(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminStaffKeys.all });
      toast.success("Đã từ chối hồ sơ!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi từ chối hồ sơ");
    },
  });
}

export function useRequestMoreInfoStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => adminStaffApi.requestMoreInfo(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminStaffKeys.all });
      toast.success("Đã gửi yêu cầu bổ sung thông tin!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi gửi yêu cầu");
    },
  });
}

export function useAdminStaffPenalties(id: string) {
  return useQuery({
    queryKey: ["admin-staff", "penalties", id],
    queryFn: () => adminStaffApi.getStaffPenalties(id),
    enabled: !!id,
  });
}

export function useBanStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, type }: { id: string; reason: string; type: string }) => adminStaffApi.banStaff(id, reason, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminStaffKeys.all });
      toast.success("Đã khóa tài khoản staff!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi khóa tài khoản");
    },
  });
}

export function useUnbanStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminStaffApi.unbanStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminStaffKeys.all });
      toast.success("Đã gỡ khóa tài khoản staff!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Lỗi khi gỡ khóa");
    },
  });
}
