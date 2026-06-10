import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { taskerApi } from "../services/tasker.service";
import { toast } from "sonner";
import { CreateTaskerServiceDto, UpdateTaskerProfileDto } from "../types/tasker.type";

export const taskerKeys = {
  all: ["tasker"] as const,
  profile: () => [...taskerKeys.all, "profile"] as const,
  services: () => [...taskerKeys.all, "available-services"] as const,
  myServices: (taskerId: string) => [...taskerKeys.all, "my-services", taskerId] as const,
  myDocuments: (taskerId: string) => [...taskerKeys.all, "my-documents", taskerId] as const,
};

export function useTaskerProfile() {
  return useQuery({
    queryKey: taskerKeys.profile(),
    queryFn: taskerApi.getProfile,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,         // Ngăn cascade refetch khi nhiều component mount cùng lúc
    staleTime: 30 * 1000,
  });
}

export function useAvailableServices() {
  return useQuery({
    queryKey: taskerKeys.services(),
    queryFn: taskerApi.getAvailableServices,
  });
}

export function useApplyTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => taskerApi.apply(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      toast.success("Đã khởi tạo hồ sơ đối tác thành công!");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Lỗi khi đăng ký đối tác");
    },
  });
}

export function useUpdateTaskerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskerProfileDto }) =>
      taskerApi.updateProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      toast.success("Cập nhật thông tin thành công!");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật thông tin");
    },
  });
}

export function useUpdateTaskerDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      taskerApi.updateDocuments(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      toast.success("Tải lên giấy tờ thành công!");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Lỗi khi tải lên giấy tờ");
    },
  });
}

export function useAddTaskerService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTaskerServiceDto }) =>
      taskerApi.addService(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      queryClient.invalidateQueries({ queryKey: taskerKeys.myServices(variables.id) });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Lỗi khi thêm dịch vụ");
    },
  });
}

// Hook lấy danh sách dịch vụ tasker đã đăng ký (dùng để resume wizard)
export function useMyTaskerServices(taskerId: string | undefined) {
  return useQuery({
    queryKey: taskerKeys.myServices(taskerId ?? ""),
    queryFn: () => taskerApi.getMyTaskerServices(taskerId!),
    enabled: !!taskerId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
}

// Hook lấy danh sách tài liệu đã tải lên của tasker
export function useMyDocuments(taskerId: string | undefined) {
  return useQuery({
    queryKey: taskerKeys.myDocuments(taskerId ?? ""),
    queryFn: () => taskerApi.getMyDocuments(taskerId!),
    enabled: !!taskerId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });
}

