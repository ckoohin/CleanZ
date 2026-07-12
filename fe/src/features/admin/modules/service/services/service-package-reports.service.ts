import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import type { ApiResponse } from './admin-services.service';

export interface ServicePackageReportFilter {
  from?: string;
  to?: string;
  packageId?: string;
  taskerId?: string;
}

export interface RevenueTrendFilter extends ServicePackageReportFilter {
  groupBy?: 'day' | 'week' | 'month';
}

export interface TopTaskersFilter extends ServicePackageReportFilter {
  limit?: number;
}

export interface ServicePackageReportOverview {
  totalBookings: number;
  totalRevenue: number;
  completedBookings: number;
  cancelledBookings: number;
  activePackagesCount: number;
}

export interface RevenueTrendPoint {
  period: string;
  label: string;
  revenue: number;
  bookings: number;
}

export interface RevenueByPackageItem {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
}

export type BookingStatusBreakdown = Record<string, number>;

export interface HourlyDistributionItem {
  hour: number;
  bookings: number;
  revenue: number;
}

export interface AddonPopularityItem {
  addonId: string | null;
  name: string;
  timesUsed: number;
  revenue: number;
}

export interface DurationPopularityItem {
  packageId: string;
  packageName: string;
  durationHours: number;
  title: string;
  isPopular: boolean;
  bookings: number;
  revenue: number;
}

export interface TopTaskerItem {
  taskerId: string;
  fullName: string;
  phoneNumber: string;
  completedJobs: number;
  revenue: number;
}

export const servicePackageReportsApi = {
  getOverview: async (filter?: ServicePackageReportFilter) => {
    const { data } = await http.get<ApiResponse<ServicePackageReportOverview>>(
      API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.OVERVIEW,
      { params: filter },
    );
    return data.data;
  },

  getRevenueTrend: async (filter?: RevenueTrendFilter) => {
    const { data } = await http.get<ApiResponse<RevenueTrendPoint[]>>(
      API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.REVENUE_TREND,
      { params: filter },
    );
    return data.data;
  },

  getRevenueByPackage: async (filter?: ServicePackageReportFilter) => {
    const { data } = await http.get<ApiResponse<RevenueByPackageItem[]>>(
      API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.BY_PACKAGE,
      { params: filter },
    );
    return data.data;
  },

  getBookingStatusBreakdown: async (filter?: ServicePackageReportFilter) => {
    const { data } = await http.get<ApiResponse<BookingStatusBreakdown>>(
      API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.BOOKING_STATUS,
      { params: filter },
    );
    return data.data;
  },

  getHourlyDistribution: async (filter?: ServicePackageReportFilter) => {
    const { data } = await http.get<ApiResponse<HourlyDistributionItem[]>>(
      API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.HOURLY_DISTRIBUTION,
      { params: filter },
    );
    return data.data;
  },

  getAddonPopularity: async (filter?: ServicePackageReportFilter) => {
    const { data } = await http.get<ApiResponse<AddonPopularityItem[]>>(
      API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.ADDON_POPULARITY,
      { params: filter },
    );
    return data.data;
  },

  getDurationPopularity: async (filter?: ServicePackageReportFilter) => {
    const { data } = await http.get<ApiResponse<DurationPopularityItem[]>>(
      API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.DURATION_POPULARITY,
      { params: filter },
    );
    return data.data;
  },

  getTopTaskers: async (filter?: TopTaskersFilter) => {
    const { data } = await http.get<ApiResponse<TopTaskerItem[]>>(
      API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.TOP_TASKERS,
      { params: filter },
    );
    return data.data;
  },

  exportRevenueTrend: (filter?: RevenueTrendFilter) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.EXPORT.REVENUE_TREND, { params: filter, responseType: 'blob' })
      .then((r) => r.data),

  exportRevenueByPackage: (filter?: ServicePackageReportFilter) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.EXPORT.BY_PACKAGE, { params: filter, responseType: 'blob' })
      .then((r) => r.data),

  exportBookingStatus: (filter?: ServicePackageReportFilter) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.EXPORT.BOOKING_STATUS, { params: filter, responseType: 'blob' })
      .then((r) => r.data),

  exportHourlyDistribution: (filter?: ServicePackageReportFilter) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.EXPORT.HOURLY_DISTRIBUTION, { params: filter, responseType: 'blob' })
      .then((r) => r.data),

  exportAddonPopularity: (filter?: ServicePackageReportFilter) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.EXPORT.ADDON_POPULARITY, { params: filter, responseType: 'blob' })
      .then((r) => r.data),

  exportDurationPopularity: (filter?: ServicePackageReportFilter) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.EXPORT.DURATION_POPULARITY, { params: filter, responseType: 'blob' })
      .then((r) => r.data),

  exportTopTaskers: (filter?: TopTaskersFilter) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.EXPORT.TOP_TASKERS, { params: filter, responseType: 'blob' })
      .then((r) => r.data),

  exportAll: (filter?: ServicePackageReportFilter) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_SERVICE_PACKAGES.REPORTS.EXPORT.ALL, { params: filter, responseType: 'blob' })
      .then((r) => r.data),
};

// downloadBlob đã chuyển sang @/features/admin/lib/download (dùng chung cho cả
// dashboard lẫn báo cáo dịch vụ). Re-export để các import cũ vẫn chạy.
export { downloadBlob } from '@/features/admin/lib/download';
