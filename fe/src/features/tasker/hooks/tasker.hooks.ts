import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskerApi } from '../services/tasker.service';
import { toast } from 'sonner';
import { CreateTaskerServiceDto, UpdateTaskerProfileDto } from '../types/tasker.type';

type ApiError = Error & { response?: { data?: { message?: string } } };

export const taskerKeys = {
  all: ['tasker'] as const,
  profile: () => [...taskerKeys.all, 'profile'] as const,
  services: () => [...taskerKeys.all, 'services'] as const,
};

export function useTaskerProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: taskerKeys.profile(),
    queryFn: () => taskerApi.getProfile(),
    staleTime: 5 * 60 * 1000,
    retry: false, // Không retry nếu 404 (chưa có hồ sơ)
    enabled: options?.enabled ?? true,
  });
}

export function useAvailableServices() {
  return useQuery({
    queryKey: taskerKeys.services(),
    queryFn: () => taskerApi.getAvailableServices(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSubmitTaskerProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData: FormData) => taskerApi.submitProfile(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      toast.success('Gửi hồ sơ thành công! Vui lòng chờ admin phê duyệt.');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message ?? 'Lỗi khi nộp hồ sơ. Vui lòng thử lại!');
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

// ── Hooks cho luồng đăng ký granular (PartnerSignupWizard / onboarding Tabs) ──
// Các component này tự xử lý toast success nên hook chỉ giữ onError fallback.
export function useApplyTasker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => taskerApi.applyTasker(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? "Không thể khởi tạo hồ sơ tasker");
    },
  });
}

export function useAddTaskerService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateTaskerServiceDto }) =>
      taskerApi.addTaskerService(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? "Không thể thêm dịch vụ");
    },
  });
}

export function useUpdateTaskerDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      taskerApi.updateTaskerDocuments(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? "Lỗi khi cập nhật tài liệu");
    },
  });
}
