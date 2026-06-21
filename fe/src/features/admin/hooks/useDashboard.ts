import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/dashboard.service';
import { calcGroupBy } from '../stores/dashboard.store';
import type { DateRange } from '../types/dashboard.types';

export const dashboardKeys = {
  alerts: ['dashboard', 'alerts'] as const,
  kpis: (r: DateRange) => ['dashboard', 'kpis', r] as const,
  gmvChart: (r: DateRange) => ['dashboard', 'gmv-chart', r] as const,
  bookingStatus: ['dashboard', 'booking-status'] as const,
  bookingDetails: (r: DateRange) => ['dashboard', 'booking-details', r] as const,
  financeBreakdown: (r: DateRange) => ['dashboard', 'finance-breakdown', r] as const,
  taskerStats: ['dashboard', 'tasker-stats'] as const,
  reviews: (r: DateRange) => ['dashboard', 'reviews', r] as const,
  taskerLevels: ['dashboard', 'tasker-levels'] as const,
  areaPerformance: (r: DateRange) => ['dashboard', 'area-performance', r] as const,
  voucherPerformance: ['dashboard', 'voucher-performance'] as const,
};

export function useAlerts() {
  return useQuery({
    queryKey: dashboardKeys.alerts,
    queryFn: dashboardApi.getAlerts,
    refetchInterval: 60_000,
  });
}

export function useKpis(dateRange: DateRange) {
  return useQuery({
    queryKey: dashboardKeys.kpis(dateRange),
    queryFn: () => dashboardApi.getKpis(dateRange.fromDate, dateRange.toDate),
  });
}

export function useGmvChart(dateRange: DateRange) {
  const groupBy = calcGroupBy(dateRange.fromDate, dateRange.toDate);
  return useQuery({
    queryKey: dashboardKeys.gmvChart(dateRange),
    queryFn: () => dashboardApi.getGmvChart(dateRange.fromDate, dateRange.toDate, groupBy),
  });
}

export function useBookingStatusSnapshot() {
  return useQuery({
    queryKey: dashboardKeys.bookingStatus,
    queryFn: dashboardApi.getBookingStatusSnapshot,
    refetchInterval: 60_000,
  });
}

export function useBookingDetails(dateRange: DateRange, limit = 10) {
  return useQuery({
    queryKey: dashboardKeys.bookingDetails(dateRange),
    queryFn: () => dashboardApi.getBookingDetails(dateRange.fromDate, dateRange.toDate, limit),
  });
}

export function useFinanceBreakdown(dateRange: DateRange) {
  return useQuery({
    queryKey: dashboardKeys.financeBreakdown(dateRange),
    queryFn: () => dashboardApi.getFinanceBreakdown(dateRange.fromDate, dateRange.toDate),
  });
}

export function useTaskerStats(limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.taskerStats,
    queryFn: () => dashboardApi.getTaskerStats(limit),
  });
}

export function useReviews(dateRange: DateRange) {
  return useQuery({
    queryKey: dashboardKeys.reviews(dateRange),
    queryFn: () => dashboardApi.getReviews(dateRange.fromDate, dateRange.toDate),
  });
}

export function useTaskerLevels() {
  return useQuery({
    queryKey: dashboardKeys.taskerLevels,
    queryFn: dashboardApi.getTaskerLevels,
  });
}

export function useAreaPerformance(dateRange: DateRange) {
  return useQuery({
    queryKey: dashboardKeys.areaPerformance(dateRange),
    queryFn: () => dashboardApi.getAreaPerformance(dateRange.fromDate, dateRange.toDate),
  });
}

export function useVoucherPerformance(limit = 6) {
  return useQuery({
    queryKey: dashboardKeys.voucherPerformance,
    queryFn: () => dashboardApi.getVoucherPerformance(limit),
  });
}
