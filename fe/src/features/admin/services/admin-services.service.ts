import http from '@/lib/api/http';

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AdminServiceEntity {
  id: string;
  serviceCode: string;
  name: string;
  description?: string;
  thumbnailUrl?: string | null;
  galleryUrls?: string[] | null;
  shortDescription?: string | null;
  includedTasks?: string[] | null;
  excludedTasks?: string[] | null;
  baseDurationHours?: number | null;
  coverageArea?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetAdminServicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface CreateAdminServiceDto {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  galleryUrls?: string[];
  shortDescription?: string;
  includedTasks?: string[];
  excludedTasks?: string[];
  baseDurationHours?: number;
  coverageArea?: string;
  isActive?: boolean;
}

export type UpdateAdminServiceDto = Partial<CreateAdminServiceDto>;

export interface AdminServiceBooking {
  id: string;
  bookingCode: string;
  status: string;
  totalPrice: number;
  scheduledStart: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  taskerId: string;
  taskerName: string;
  taskerPhone: string;
}

export interface AdminServiceTasker {
  id: string;
  fullName: string;
  phoneNumber: string;
  avatarUrl: string;
  ratingAvg: number;
  totalCompletedJobs: number;
  status: string;
  presenceStatus: string;
  jobsForThisService: number;
}

export const adminServicesApi = {
  // Get paginated services
  getServices: async (params?: GetAdminServicesQuery) => {
    const { data } = await http.get<ApiResponse<PaginatedData<AdminServiceEntity>>>('/admin/services', { params });
    return data.data; // Return PaginatedData directly
  },

  // Get single service
  getServiceById: async (id: string) => {
    const { data } = await http.get<ApiResponse<AdminServiceEntity>>(`/admin/services/${id}`);
    return data.data;
  },

  // Create service
  createService: async (payload: CreateAdminServiceDto) => {
    const { data } = await http.post<ApiResponse<AdminServiceEntity>>('/admin/services', payload);
    return data.data;
  },

  // Update service
  updateService: async ({ id, payload }: { id: string; payload: UpdateAdminServiceDto }) => {
    const { data } = await http.patch<ApiResponse<AdminServiceEntity>>(`/admin/services/${id}`, payload);
    return data.data;
  },

  // Delete service
  deleteService: async (id: string) => {
    await http.delete(`/admin/services/${id}`);
  },

  // Get service bookings
  getServiceBookings: async (id: string, params?: { page?: number; limit?: number }) => {
    const { data } = await http.get<ApiResponse<PaginatedData<AdminServiceBooking>>>(`/admin/services/${id}/bookings`, { params });
    return data.data;
  },

  // Get service taskers
  getServiceTaskers: async (id: string, params?: { page?: number; limit?: number }) => {
    const { data } = await http.get<ApiResponse<PaginatedData<AdminServiceTasker>>>(`/admin/services/${id}/taskers`, { params });
    return data.data;
  },
};
