import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import type { ServiceOptionEntity } from '@/features/admin/services/admin-options.service';

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

// ─── SubService Interface ───────────────────────────────────────────────────
export interface AdminServiceEntity {
  id: string;
  subServiceCode: string;
  name: string;
  description?: string;
  thumbnailUrl?: string | null;
  galleryUrls?: string[] | null;
  shortDescription?: string | null;
  includedTasks?: string[] | null;
  excludedTasks?: string[] | null;
  durationHours?: number | null;
  coverageArea?: string | null;
  pricingConfigId?: string | null;
  isActive: boolean;
  pricingType: string;
  pricingConfig?: {
    id: string;
    name: string;
    basePrice: number | string;
    peakPrice?: number | string | null;
    petFee?: number | string;
    waitingFee?: number | string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetAdminServicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  packageId?: string;
}

export interface CreateAdminServiceDto {
  name: string;
  description?: string;
  thumbnailUrl?: string;
  galleryUrls?: string[];
  shortDescription?: string;
  includedTasks?: string[];
  excludedTasks?: string[];
  durationHours?: number;
  coverageArea?: string;
  isActive?: boolean;
  pricingType?: string;
  pricingConfigId?: string;
}

export type UpdateAdminServiceDto = Partial<CreateAdminServiceDto>;

// ─── ServicePackage Interface ───────────────────────────────────────────────
export interface AdminServicePackageEntity {
  id: string;
  packageCode: string;
  name: string;
  iconUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  maxHours: number;
  termsAndConditions?: string | null;
  policyDescription?: string | null;
  nightSurcharge: number;
  petSurcharge: number;
  waitingSurcharge: number;
  toolFee: number;
  peakRatePercent: number;
  coverageAreaIds?: string[];
  coverageAreas?: { id: string; name: string }[];
  packageSubServices?: {
    id: string;
    subService: AdminServiceEntity;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminPackageDto {
  name: string;
  packageCode?: string;
  iconUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
  maxHours?: number;
  termsAndConditions?: string;
  policyDescription?: string;
  nightSurcharge?: number;
  petSurcharge?: number;
  waitingSurcharge?: number;
  toolFee?: number;
  peakRatePercent?: number;
  coverageAreaIds?: string[];
}

export type UpdateAdminPackageDto = Partial<CreateAdminPackageDto>;

export interface SubServiceLinkItem {
  id: string;
  isRequired?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface AdminPackageAnalytics {
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  cancelledBookings: number;
  topTaskers: {
    taskerId: string;
    fullName: string;
    phoneNumber: string;
    completedJobs: number;
  }[];
}

// ─── Bookings & Taskers Interfaces ──────────────────────────────────────────
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

// ─── API Client Object ──────────────────────────────────────────────────────
export const adminServicesApi = {
  // ─── SUB-SERVICES API ───
  getServices: async (params?: GetAdminServicesQuery) => {
    const { data } = await http.get<ApiResponse<PaginatedData<AdminServiceEntity>>>(API_ENDPOINTS.ADMIN_SERVICES.BASE, { params });
    return data.data;
  },

  getServiceById: async (id: string) => {
    const { data } = await http.get<ApiResponse<AdminServiceEntity>>(API_ENDPOINTS.ADMIN_SERVICES.DETAIL(id));
    return data.data;
  },

  createService: async (payload: CreateAdminServiceDto) => {
    const { data } = await http.post<ApiResponse<AdminServiceEntity>>(API_ENDPOINTS.ADMIN_SERVICES.BASE, payload);
    return data.data;
  },

  updateService: async ({ id, payload }: { id: string; payload: UpdateAdminServiceDto }) => {
    const { data } = await http.patch<ApiResponse<AdminServiceEntity>>(API_ENDPOINTS.ADMIN_SERVICES.DETAIL(id), payload);
    return data.data;
  },

  deleteService: async (id: string) => {
    await http.delete(API_ENDPOINTS.ADMIN_SERVICES.DETAIL(id));
  },

  getServiceBookings: async (id: string, params?: { page?: number; limit?: number }) => {
    const { data } = await http.get<ApiResponse<PaginatedData<AdminServiceBooking>>>(API_ENDPOINTS.ADMIN_SERVICES.BOOKINGS(id), { params });
    return data.data;
  },

  getServiceTaskers: async (id: string, params?: { page?: number; limit?: number }) => {
    const { data } = await http.get<ApiResponse<PaginatedData<AdminServiceTasker>>>(API_ENDPOINTS.ADMIN_SERVICES.TASKERS(id), { params });
    return data.data;
  },

  // ─── SERVICE PACKAGES API ───
  getPackages: async () => {
    const { data } = await http.get<ApiResponse<AdminServicePackageEntity[]>>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.BASE);
    return data.data;
  },

  getPackageById: async (id: string) => {
    const { data } = await http.get<ApiResponse<AdminServicePackageEntity>>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.DETAIL(id));
    return data.data;
  },

  createPackage: async (payload: CreateAdminPackageDto) => {
    const { data } = await http.post<ApiResponse<AdminServicePackageEntity>>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.BASE, payload);
    return data.data;
  },

  updatePackage: async ({ id, payload }: { id: string; payload: UpdateAdminPackageDto }) => {
    const { data } = await http.patch<ApiResponse<AdminServicePackageEntity>>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.DETAIL(id), payload);
    return data.data;
  },

  deletePackage: async (id: string) => {
    await http.delete(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.DETAIL(id));
  },

  // ─── LINK / UNLINK SUB-SERVICES ───
  addSubServicesToPackage: async (packageId: string, subServices: SubServiceLinkItem[]) => {
    await http.post(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.SUB_SERVICES(packageId), { subServices });
  },

  removeSubServiceFromPackage: async (packageId: string, subServiceId: string) => {
    await http.delete(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REMOVE_SUB_SERVICE(packageId, subServiceId));
  },

  getPackageAnalytics: async (id: string) => {
    const { data } = await http.get<ApiResponse<AdminPackageAnalytics>>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.ANALYTICS(id));
    return data.data;
  },
};
