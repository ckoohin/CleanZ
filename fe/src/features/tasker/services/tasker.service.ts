import axios from 'axios';
import { CreateTaskerServiceDto, ServiceListResponse, TaskerProfile, UpdateTaskerProfileDto } from '../types/tasker.type';

// Axios instance riêng cho tasker → gọi qua Next.js API proxy
const taskerHttp = axios.create({
  baseURL: '/api',   // Next.js API routes (proxy tới BE /staffs/...)
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export interface TaskerServiceItem {
  id: string;
  serviceId: string;
  serviceName: string;
  locationTypes: string[];
  customPrice?: number;
  isAvailable: boolean;
}

export const taskerApi = {
  // GET /api/taskers/profile → BE /staffs/profile
  getProfile: (): Promise<TaskerProfile> => {
    return taskerHttp.get<TaskerProfile>('/taskers/profile').then((res) => res.data);
  },

  // POST /api/taskers/{userId}/apply → BE /staffs/{userId}/apply
  apply: (userId: string): Promise<TaskerProfile> => {
    return taskerHttp.post<TaskerProfile>(`/taskers/${userId}/apply`).then((res) => res.data);
  },

  // PATCH /api/taskers/{id} → BE /staffs/{id}
  updateProfile: (id: string, data: UpdateTaskerProfileDto): Promise<TaskerProfile> => {
    return taskerHttp.patch<TaskerProfile>(`/taskers/${id}`, data).then((res) => res.data);
  },

  // PATCH /api/taskers/{id}/documents → BE /staffs/{id}/documents (multipart)
  updateDocuments: (id: string, formData: FormData): Promise<TaskerProfile> => {
    return taskerHttp.patch<TaskerProfile>(`/taskers/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },

  // POST /api/taskers/{id}/services → BE /staffs/{id}/services
  addService: (id: string, data: CreateTaskerServiceDto): Promise<TaskerProfile> => {
    return taskerHttp.post<TaskerProfile>(`/taskers/${id}/services`, data).then((res) => res.data);
  },

  // GET /services (vẫn gọi thẳng BE vì là public endpoint)
  getAvailableServices: (): Promise<ServiceListResponse> => {
    const beURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
    return axios.get<ServiceListResponse>(`${beURL}/services`, { withCredentials: true }).then((res) => res.data);
  },

  // GET /api/taskers/{taskerId}/services → BE /staffs/{taskerId}/services
  getMyTaskerServices: (taskerId: string): Promise<TaskerServiceItem[]> => {
    return taskerHttp.get<TaskerServiceItem[]>(`/taskers/${taskerId}/services`).then((res) => res.data);
  },

  // GET /api/taskers/{taskerId}/documents → BE /staffs/{taskerId}/documents
  getMyDocuments: (taskerId: string): Promise<{ documents: Array<{ id: string; type: string; fileUrl: string }> }> => {
    return taskerHttp.get(`/taskers/${taskerId}/documents`).then((res) => res.data);
  },
};
