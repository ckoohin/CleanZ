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

export interface StaffDocument {
  id: string;
  type: string;
  fileUrl: string | null;
  createdAt: string;
}

export interface StaffDocumentsResponse {
  documents: StaffDocument[];
}

export interface StaffActionResponse {
  message: string;
  staff: StaffProfile;
}

export interface StaffPenalty {
  id: string;
  reason: string;
  type: string;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
}

export interface GeneralMessageResponse {
  message: string;
}

export const adminStaffApi = {
  getStaffs: (params: AdminStaffFilter): Promise<PaginatedStaffResponse> => {
    return http.get<PaginatedStaffResponse>('/staffs', { params }).then((res) => res.data);
  },

  getStaffDetail: (id: string): Promise<StaffProfile> => {
    return http.get<StaffProfile>(`/staffs/${id}`).then((res) => res.data);
  },

  getStaffDocuments: (id: string): Promise<StaffDocumentsResponse> => {
    return http.get<StaffDocumentsResponse>(`/staffs/${id}/documents`).then((res) => res.data);
  },

  approveStaff: (id: string): Promise<StaffActionResponse> => {
    return http.patch<StaffActionResponse>(`/staffs/${id}/approve`).then((res) => res.data);
  },

  rejectStaff: (id: string, notes: string): Promise<StaffActionResponse> => {
    return http.patch<StaffActionResponse>(`/staffs/${id}/reject`, { notes }).then((res) => res.data);
  },

  requestMoreInfo: (id: string, notes: string): Promise<StaffActionResponse> => {
    return http.patch<StaffActionResponse>(`/staffs/${id}/request-info`, { notes }).then((res) => res.data);
  },

  getStaffPenalties: (id: string): Promise<StaffPenalty[]> => {
    return http.get<StaffPenalty[]>(`/staffs/${id}/penalties`).then((res) => res.data);
  },

  banStaff: (id: string, reason: string, type: string): Promise<GeneralMessageResponse> => {
    return http.post<GeneralMessageResponse>(`/staffs/${id}/ban`, { reason, type }).then((res) => res.data);
  },

  unbanStaff: (id: string): Promise<GeneralMessageResponse> => {
    return http.post<GeneralMessageResponse>(`/staffs/${id}/unban`).then((res) => res.data);
  },
};

