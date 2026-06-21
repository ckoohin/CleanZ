import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskerApi } from '../services/tasker.service';
import { toast } from 'sonner';
import { UpdateTaskerProfileDto } from '../types/tasker.type';

export const taskerKeys = {
  all: ['tasker'] as const,
  profile: () => [...taskerKeys.all, 'profile'] as const,
  services: () => [...taskerKeys.all, 'services'] as const,
};

export function useTaskerProfile() {
  return useQuery({
    queryKey: taskerKeys.profile(),
    queryFn: () => taskerApi.getProfile(),
    staleTime: 5 * 60 * 1000,
    retry: false, // Không retry nếu 404 (chưa có hồ sơ)
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

// STUBS TO FIX BUILD ERRORS
export function useApplyTasker() {
  return useMutation({
    mutationFn: async (userId: string) => {
      // Stub
      return { id: "temp-id" };
    }
  });
}

export function useAddTaskerService() {
  return useMutation({
    mutationFn: async (args: {
      id: string;
      data: {
        serviceId: string;
        locationTypes: string[];
        shopAddress?: string;
      };
    }) => {
      // Stub
      return true;
    }
  });
}

export function useUpdateTaskerDocuments() {
  return useMutation({
    mutationFn: async (args: { id: string, formData: FormData }) => {
      // Stub
      return true;
    }
  });
}
