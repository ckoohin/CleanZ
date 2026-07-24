import axios from 'axios';
import http from '@/lib/api/http';
import {
  CreateTaskerServiceDto,
  ServiceListResponse,
  SubmitTaskerEquipmentDto,
  TaskerProfile,
  UpdateTaskerProfileDto,
} from '../types/tasker.type';
import { API_ENDPOINTS } from '@/constants/api-endpoints';

export type { ServiceListResponse };

export interface TaskerLocationPayload {
  lat: number;
  lng: number;
}

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

  // PATCH /tasker/me/presence — cập nhật trạng thái hoạt động (online/offline)
  updatePresence: (
    presenceStatus: 'ONLINE' | 'OFFLINE',
    location?: TaskerLocationPayload,
  ): Promise<TaskerProfile> =>
    http
      .patch<TaskerProfile>('/tasker/me/presence', {
        presenceStatus,
        ...(location ?? {}),
      })
      .then((res) => res.data),

  // PATCH /tasker/me/location — heartbeat vị trí khi đang ONLINE
  updateLocation: (location: TaskerLocationPayload): Promise<{ updated: boolean }> =>
    http
      .patch<{ updated: boolean }>('/tasker/me/location', location, {
        skipErrorToast: true,
      } as Parameters<typeof http.patch>[2])
      .then((res) => res.data),

  // POST /tasker/me/equipment — nộp ảnh bộ dụng cụ chuyên dụng.
  // Điều kiện bắt buộc để vào nhóm nhận đơn Cao cấp; nộp lại đưa về chờ duyệt.
  submitEquipment: (dto: SubmitTaskerEquipmentDto): Promise<TaskerProfile> =>
    http
      .post<TaskerProfile>(API_ENDPOINTS.TASKERS.SUBMIT_EQUIPMENT, dto)
      .then((res) => res.data),

  // POST /tasker/profile — nộp hồ sơ (multipart/form-data)
  submitProfile: (formData: FormData): Promise<TaskerProfile> =>
    http
      .post<TaskerProfile>('/tasker/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),

  // PATCH /tasker/profile/documents — bổ sung giấy tờ còn thiếu (multipart/form-data).
  // BE khóa giấy tờ đã nộp: chỉ nhận mục còn trống hoặc mục admin gắn cờ cần nộp lại.
  updateMyDocuments: (formData: FormData): Promise<TaskerProfile> =>
    http
      .patch<TaskerProfile>('/tasker/profile/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data),

  // PATCH /tasker/profile/me — tasker/applicant tự cập nhật thông tin hồ sơ
  // (phone, bio, experience, skills, addressCurrent, ngân hàng — không gồm giấy tờ).
  updateProfile: (data: UpdateTaskerProfileDto): Promise<TaskerProfile> =>
    http
      .patch<TaskerProfile>('/tasker/profile/me', data)
      .then((res) => res.data),

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
