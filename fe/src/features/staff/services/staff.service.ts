import http from '@/lib/api/http';
import { CreateStaffServiceDto, ServiceListResponse, StaffProfile, UpdateStaffProfileDto } from '../types/staff.type';

export interface StaffServiceItem {
  id: string;
  serviceId: string;
  serviceName: string;
  locationTypes: string[];
  customPrice?: number;
  isAvailable: boolean;
}

export const staffApi = {
  getProfile: (): Promise<StaffProfile> => {
    return http.get<StaffProfile>('/staff/profile').then((res) => res.data);
  },

  apply: (userId: string): Promise<StaffProfile> => {
    return http.post<StaffProfile>(`/staff/${userId}/apply`).then((res) => res.data);
  },

  updateProfile: (id: string, data: UpdateStaffProfileDto): Promise<StaffProfile> => {
    return http.patch<StaffProfile>(`/staff/${id}`, data).then((res) => res.data);
  },

  updateDocuments: (id: string, formData: FormData): Promise<StaffProfile> => {
    return http.patch<StaffProfile>(`/staff/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((res) => res.data);
  },

  addService: (id: string, data: CreateStaffServiceDto): Promise<StaffProfile> => {
    return http.post<StaffProfile>(`/staff/${id}/services`, data).then((res) => res.data);
  },

  getAvailableServices: (): Promise<ServiceListResponse> => {
    return http.get<ServiceListResponse>('/services').then((res) => res.data);
  },

  // Lấy danh sách dịch vụ mà staff đã đăng ký
  getMyStaffServices: (staffId: string): Promise<StaffServiceItem[]> => {
    return http.get<StaffServiceItem[]>(`/staff/${staffId}/services`).then((res) => res.data);
  },

  // Lấy danh sách giấy tờ đã nộp của chính mình
  getMyDocuments: (staffId: string): Promise<{ documents: Array<{ id: string; type: string; fileUrl: string }> }> => {
    return http.get(`/staff/${staffId}/documents`).then((res) => res.data);
  },
};
