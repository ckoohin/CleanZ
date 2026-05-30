import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../services/staff.service";
import { toast } from "sonner";
import { CreateStaffServiceDto, UpdateStaffProfileDto } from "../types/staff.type";

export const staffKeys = {
  all: ["staff"] as const,
  profile: () => [...staffKeys.all, "profile"] as const,
  services: () => [...staffKeys.all, "available-services"] as const,
  myServices: (staffId: string) => [...staffKeys.all, "my-services", staffId] as const,
  myDocuments: (staffId: string) => [...staffKeys.all, "my-documents", staffId] as const,
};

export function useStaffProfile() {
  return useQuery({
    queryKey: staffKeys.profile(),
    queryFn: staffApi.getProfile,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,         // Ngăn cascade refetch khi nhiều component mount cùng lúc
    staleTime: 30 * 1000,
  });
}

export function useAvailableServices() {
  return useQuery({
    queryKey: staffKeys.services(),
    queryFn: staffApi.getAvailableServices,
  });
}

export function useApplyStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => staffApi.apply(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.profile() });
      toast.success("Đã khởi tạo hồ sơ đối tác thành công!");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Lỗi khi đăng ký đối tác");
    },
  });
}

export function useUpdateStaffProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffProfileDto }) =>
      staffApi.updateProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.profile() });
      toast.success("Cập nhật thông tin thành công!");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật thông tin");
    },
  });
}

export function useUpdateStaffDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      staffApi.updateDocuments(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.profile() });
      toast.success("Tải lên giấy tờ thành công!");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Lỗi khi tải lên giấy tờ");
    },
  });
}

export function useAddStaffService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateStaffServiceDto }) =>
      staffApi.addService(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.profile() });
      queryClient.invalidateQueries({ queryKey: staffKeys.myServices(variables.id) });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Lỗi khi thêm dịch vụ");
    },
  });
}

// Hook lấy danh sách dịch vụ staff đã đăng ký (dùng để resume wizard)
export function useMyStaffServices(staffId: string | undefined) {
  return useQuery({
    queryKey: staffKeys.myServices(staffId ?? ""),
    queryFn: () => staffApi.getMyStaffServices(staffId!),
    enabled: !!staffId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
}

// Hook lấy danh sách tài liệu đã tải lên của staff
export function useMyDocuments(staffId: string | undefined) {
  return useQuery({
    queryKey: staffKeys.myDocuments(staffId ?? ""),
    queryFn: () => staffApi.getMyDocuments(staffId!),
    enabled: !!staffId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
}

