import http from '@/lib/api/http';
import { StaffProfile, StaffStatus } from '@/features/staff/types/staff.type';

export interface AdminStaffFilter {
  status?: StaffStatus;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedStaffResponse {
  data: StaffProfile[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const adminStaffApi = {
  getStaffs: (params: AdminStaffFilter): Promise<PaginatedStaffResponse> => {
    return http.get<PaginatedStaffResponse>('/staff', { params }).then((res) => res.data);
  },

  getStaffDetail: (id: string): Promise<StaffProfile> => {
    return http.get<StaffProfile>(`/staff/${id}`).then((res) => res.data);
  },

  getStaffDocuments: (id: string): Promise<any> => {
    return http.get(`/staff/${id}/documents`).then((res) => res.data);
  },

  approveStaff: (id: string): Promise<any> => {
    return http.patch(`/staff/${id}/approve`).then((res) => res.data);
  },

  rejectStaff: (id: string, notes: string): Promise<any> => {
    return http.patch(`/staff/${id}/reject`, { notes }).then((res) => res.data);
  },

  requestMoreInfo: (id: string, notes: string): Promise<any> => {
    return http.patch(`/staff/${id}/request-info`, { notes }).then((res) => res.data);
  },

  getStaffPenalties: (id: string): Promise<any> => {
    return http.get(`/staff/${id}/penalties`).then((res) => res.data);
  },

  banStaff: (id: string, reason: string, type: string): Promise<any> => {
    return http.post(`/staff/${id}/ban`, { reason, type }).then((res) => res.data);
  },

  unbanStaff: (id: string): Promise<any> => {
    return http.post(`/staff/${id}/unban`).then((res) => res.data);
  },
};
