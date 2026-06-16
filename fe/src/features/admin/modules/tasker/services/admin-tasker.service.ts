import http from '@/lib/api/http';
import { TaskerProfile, TaskerStatus } from '@/features/tasker/types/tasker.type';

export interface AdminTaskerFilter {
  status?: TaskerStatus;
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTaskerResponse {
  data: TaskerProfile[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TaskerDocument {
  id: string;
  type: string;
  fileUrl: string | null;
  createdAt: string;
}

export interface TaskerDocumentsResponse {
  documents: TaskerDocument[];
}

export interface TaskerActionResponse {
  message: string;
  tasker: TaskerProfile;
}

export interface TaskerPenalty {
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

export const adminTaskerApi = {
  getTaskers: (params: AdminTaskerFilter): Promise<PaginatedTaskerResponse> => {
    return http.get<PaginatedTaskerResponse>('/taskers', { params }).then((res) => res.data);
  },

  getTaskerDetail: (id: string): Promise<TaskerProfile> => {
    return http.get<TaskerProfile>(`/taskers/${id}`).then((res) => res.data);
  },

  getTaskerDocuments: (id: string): Promise<TaskerDocumentsResponse> => {
    return http.get<TaskerDocumentsResponse>(`/taskers/${id}/documents`).then((res) => res.data);
  },

  approveTasker: (id: string): Promise<TaskerActionResponse> => {
    return http.patch<TaskerActionResponse>(`/taskers/${id}/approve`).then((res) => res.data);
  },

  rejectTasker: (id: string, notes: string): Promise<TaskerActionResponse> => {
    return http.patch<TaskerActionResponse>(`/taskers/${id}/reject`, { notes }).then((res) => res.data);
  },

  requestMoreInfo: (id: string, notes: string): Promise<TaskerActionResponse> => {
    return http.patch<TaskerActionResponse>(`/taskers/${id}/request-info`, { notes }).then((res) => res.data);
  },

  getTaskerPenalties: (id: string): Promise<TaskerPenalty[]> => {
    return http.get<TaskerPenalty[]>(`/taskers/${id}/penalties`).then((res) => res.data);
  },

  banTasker: (id: string, reason: string, type: string): Promise<GeneralMessageResponse> => {
    return http.post<GeneralMessageResponse>(`/taskers/${id}/ban`, { reason, type }).then((res) => res.data);
  },

  unbanTasker: (id: string): Promise<GeneralMessageResponse> => {
    return http.post<GeneralMessageResponse>(`/taskers/${id}/unban`).then((res) => res.data);
  },
};

