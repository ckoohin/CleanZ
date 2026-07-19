import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskerApi } from '../services/tasker.service';
import { toast } from 'sonner';
import {
  CreateTaskerServiceDto,
  TaskerProfile,
  UpdateTaskerProfileDto,
} from '../types/tasker.type';
import type { TaskerLocationPayload } from '../services/tasker.service';

type ApiError = Error & { response?: { data?: { message?: string } } };
type PresenceStatus = 'ONLINE' | 'OFFLINE';

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
    mutationFn: (data: UpdateTaskerProfileDto) => taskerApi.updateProfile(data),
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

/** Tasker tự bổ sung giấy tờ còn thiếu / admin yêu cầu nộp lại (PATCH /tasker/profile/documents). */
export function useUpdateMyDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => taskerApi.updateMyDocuments(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      toast.success('Đã gửi giấy tờ! Hồ sơ sẽ được duyệt lại.');
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message ?? 'Không thể cập nhật giấy tờ');
    },
  });
}

export function useUpdatePresence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (presenceStatus: PresenceStatus) => {
      if (presenceStatus === 'OFFLINE') {
        return taskerApi.updatePresence(presenceStatus);
      }

      const location = await getCurrentTaskerLocation();
      return taskerApi.updatePresence(presenceStatus, location);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      toast.success(
        data.presenceStatus === 'ONLINE'
          ? 'Đã bật chế độ hoạt động!'
          : 'Đã tắt chế độ hoạt động!'
      );
    },
    onError: (error: ApiError) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Lỗi khi cập nhật trạng thái hoạt động',
      );
    },
  });
}

export function useTaskerLocationHeartbeat(tasker?: TaskerProfile | null) {
  const isOnline = tasker?.presenceStatus === 'ONLINE';

  useEffect(() => {
    if (!isOnline) return;

    let stopped = false;

    const publishLocation = async () => {
      try {
        const location = await getCurrentTaskerLocation();
        if (!stopped) {
          await taskerApi.updateLocation(location);
        }
      } catch {
        // Heartbeat không toast liên tục để tránh làm phiền khi browser mất GPS tạm thời.
      }
    };

    void publishLocation();
    const timer = window.setInterval(publishLocation, 60_000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [isOnline]);
}

function getCurrentTaskerLocation(): Promise<TaskerLocationPayload> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return Promise.reject(
      new Error('Trình duyệt không hỗ trợ định vị vị trí thật.'),
    );
  }

  if (!window.isSecureContext) {
    return Promise.reject(
      new Error('Vui lòng mở ứng dụng bằng HTTPS để dùng vị trí thật.'),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        reject(
          new Error(
            'Không lấy được vị trí thật. Hãy bật GPS/vị trí chính xác rồi thử lại.',
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 30_000,
      },
    );
  });
}
