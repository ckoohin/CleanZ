import http from '@/lib/api/http';
import { TaskerProfile, UpdateTaskerProfileDto } from '../types/tasker.type';

export interface ServiceListResponse {
  data: Array<{ id: string; name: string; category?: string }>;
}

export const taskerApi = {
  // GET /tasker/profile/me — xem profile của chính mình
  getProfile: (): Promise<TaskerProfile> =>
    http.get<TaskerProfile>('/tasker/profile/me').then((res) => res.data),

  // POST /tasker/profile — nộp hồ sơ (multipart/form-data)
  submitProfile: (formData: FormData): Promise<TaskerProfile> =>
    http
      .post<TaskerProfile>('/tasker/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),

  // Cập nhật thông tin profile (không có file)
  updateProfile: (id: string, data: UpdateTaskerProfileDto): Promise<TaskerProfile> => {
    // Vì backend có thể không có endpoint PATCH /tasker/:id cho Tasker
    // Tạm thời gọi qua proxy hoặc mock tuỳ theo BE hiện tại
    return http.patch<TaskerProfile>(`/api/taskers/${id}`, data).then((res) => res.data);
  },

  // GET /services — danh sách dịch vụ (public)
  getAvailableServices: (): Promise<ServiceListResponse> =>
    http.get<ServiceListResponse>('/services').then((res) => res.data),
};
