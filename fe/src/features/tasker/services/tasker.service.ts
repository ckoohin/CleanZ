import http from '@/lib/api/http';
import { CreateTaskerServiceDto, ServiceListResponse, TaskerProfile, UpdateTaskerProfileDto } from '../types/tasker.type';

export interface TaskerServiceItem {
  id: string;
  serviceId: string;
  serviceName: string;
  locationTypes: string[];
  customPrice?: number;
  isAvailable: boolean;
}

export const taskerApi = {
  getProfile: (): Promise<TaskerProfile> => {
    return http.get<TaskerProfile>('/taskers/profile').then((res) => res.data);
  },

  apply: (userId: string): Promise<TaskerProfile> => {
    return http.post<TaskerProfile>(`/taskers/${userId}/apply`).then((res) => res.data);
  },

  updateProfile: (id: string, data: UpdateTaskerProfileDto): Promise<TaskerProfile> => {
    return http.patch<TaskerProfile>(`/taskers/${id}`, data).then((res) => res.data);
  },

  updateDocuments: (id: string, formData: FormData): Promise<TaskerProfile> => {
    return http.patch<TaskerProfile>(`/taskers/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((res) => res.data);
  },

  addService: (id: string, data: CreateTaskerServiceDto): Promise<TaskerProfile> => {
    return http.post<TaskerProfile>(`/taskers/${id}/services`, data).then((res) => res.data);
  },

  getAvailableServices: (): Promise<ServiceListResponse> => {
    return http.get<ServiceListResponse>('/services').then((res) => res.data);
  },

  // Lấy danh sách dịch vụ mà tasker đã đăng ký
  getMyTaskerServices: (taskerId: string): Promise<TaskerServiceItem[]> => {
    return http.get<TaskerServiceItem[]>(`/taskers/${taskerId}/services`).then((res) => res.data);
  },

  // Lấy danh sách giấy tờ đã nộp của chính mình
  getMyDocuments: (taskerId: string): Promise<{ documents: Array<{ id: string; type: string; fileUrl: string }> }> => {
    return http.get(`/taskers/${taskerId}/documents`).then((res) => res.data);
  },
};

