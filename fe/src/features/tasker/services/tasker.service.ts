import axios from 'axios';
import http from '@/lib/api/http';
import {
  CreateTaskerServiceDto,
  ServiceListResponse,
  TaskerProfile,
  UpdateTaskerProfileDto,
} from '../types/tasker.type';

export type { ServiceListResponse };

export const taskerApi = {
  // GET /tasker/profile/me — xem profile của chính mình.
  // Chưa có hồ sơ (404) là trạng thái hợp lệ của applicant → trả null, không toast lỗi.
  getProfile: async (): Promise<TaskerProfile | null> => {
    try {
      const res = await http.get<TaskerProfile>('/tasker/profile/me', {
        skipErrorToast: true,
      } as Parameters<typeof http.get>[1]);
      return res.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

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

  // ── Luồng đăng ký dạng granular (PartnerSignupWizard / onboarding Tabs) ──
  // NOTE: backend hiện dùng luồng nộp 1 lần `POST /tasker/profile` (multipart).
  // Các method dưới đây giữ contract cho UI granular; endpoint tương ứng có thể
  // chưa tồn tại trên BE — xem `useSubmitTaskerProfile` cho luồng đang hoạt động.
  applyTasker: (userId: string): Promise<TaskerProfile> =>
    http
      .post<TaskerProfile>('/tasker/profile/apply', { userId })
      .then((res) => res.data),

  addTaskerService: (
    id: string,
    data: CreateTaskerServiceDto,
  ): Promise<unknown> =>
    http.post(`/tasker/${id}/services`, data).then((res) => res.data),

  updateTaskerDocuments: (
    id: string,
    formData: FormData,
  ): Promise<TaskerProfile> =>
    http
      .patch<TaskerProfile>(`/tasker/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),

  // GET /services — danh sách dịch vụ (public)
  getAvailableServices: (): Promise<ServiceListResponse> =>
    http.get<ServiceListResponse>('/services').then((res) => res.data),
};
