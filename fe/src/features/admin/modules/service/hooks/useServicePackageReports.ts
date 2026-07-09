import { useQuery } from '@tanstack/react-query';
import {
  servicePackageReportsApi,
  ServicePackageReportFilter,
  RevenueTrendFilter,
  TopTaskersFilter,
} from '../services/service-package-reports.service';

export const SERVICE_PACKAGE_REPORTS_KEYS = {
  all: ['service-package-reports'] as const,
  overview: (filter?: ServicePackageReportFilter) => [...SERVICE_PACKAGE_REPORTS_KEYS.all, 'overview', filter] as const,
  revenueTrend: (filter?: RevenueTrendFilter) => [...SERVICE_PACKAGE_REPORTS_KEYS.all, 'revenue-trend', filter] as const,
  byPackage: (filter?: ServicePackageReportFilter) => [...SERVICE_PACKAGE_REPORTS_KEYS.all, 'by-package', filter] as const,
  bookingStatus: (filter?: ServicePackageReportFilter) => [...SERVICE_PACKAGE_REPORTS_KEYS.all, 'booking-status', filter] as const,
  hourlyDistribution: (filter?: ServicePackageReportFilter) => [...SERVICE_PACKAGE_REPORTS_KEYS.all, 'hourly-distribution', filter] as const,
  addonPopularity: (filter?: ServicePackageReportFilter) => [...SERVICE_PACKAGE_REPORTS_KEYS.all, 'addon-popularity', filter] as const,
  durationPopularity: (filter?: ServicePackageReportFilter) => [...SERVICE_PACKAGE_REPORTS_KEYS.all, 'duration-popularity', filter] as const,
  topTaskers: (filter?: TopTaskersFilter) => [...SERVICE_PACKAGE_REPORTS_KEYS.all, 'top-taskers', filter] as const,
};

export const useReportOverview = (filter?: ServicePackageReportFilter) => {
  return useQuery({
    queryKey: SERVICE_PACKAGE_REPORTS_KEYS.overview(filter),
    queryFn: () => servicePackageReportsApi.getOverview(filter),
  });
};

export const useReportRevenueTrend = (filter?: RevenueTrendFilter) => {
  return useQuery({
    queryKey: SERVICE_PACKAGE_REPORTS_KEYS.revenueTrend(filter),
    queryFn: () => servicePackageReportsApi.getRevenueTrend(filter),
  });
};

export const useReportRevenueByPackage = (filter?: ServicePackageReportFilter) => {
  return useQuery({
    queryKey: SERVICE_PACKAGE_REPORTS_KEYS.byPackage(filter),
    queryFn: () => servicePackageReportsApi.getRevenueByPackage(filter),
  });
};

export const useReportBookingStatus = (filter?: ServicePackageReportFilter) => {
  return useQuery({
    queryKey: SERVICE_PACKAGE_REPORTS_KEYS.bookingStatus(filter),
    queryFn: () => servicePackageReportsApi.getBookingStatusBreakdown(filter),
  });
};

export const useReportHourlyDistribution = (filter?: ServicePackageReportFilter) => {
  return useQuery({
    queryKey: SERVICE_PACKAGE_REPORTS_KEYS.hourlyDistribution(filter),
    queryFn: () => servicePackageReportsApi.getHourlyDistribution(filter),
  });
};

export const useReportAddonPopularity = (filter?: ServicePackageReportFilter) => {
  return useQuery({
    queryKey: SERVICE_PACKAGE_REPORTS_KEYS.addonPopularity(filter),
    queryFn: () => servicePackageReportsApi.getAddonPopularity(filter),
  });
};

export const useReportDurationPopularity = (filter?: ServicePackageReportFilter) => {
  return useQuery({
    queryKey: SERVICE_PACKAGE_REPORTS_KEYS.durationPopularity(filter),
    queryFn: () => servicePackageReportsApi.getDurationPopularity(filter),
  });
};

export const useReportTopTaskers = (filter?: TopTaskersFilter) => {
  return useQuery({
    queryKey: SERVICE_PACKAGE_REPORTS_KEYS.topTaskers(filter),
    queryFn: () => servicePackageReportsApi.getTopTaskers(filter),
  });
};
