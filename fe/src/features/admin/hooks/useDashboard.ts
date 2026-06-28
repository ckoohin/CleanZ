import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../services/dashboard.service';
import { calcGroupBy } from '../stores/dashboard.store';
import type { DateRange } from '../types/dashboard.types';
import { useAuth } from '@/features/auth/hooks/auth.hooks';

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

function useAdminQueryEnabled() {
  const { data: user, isLoading: isAuthLoading } = useAuth();
  return !isAuthLoading && user?.role === 'ADMIN';
}

export function useAlerts() {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.alerts,
    queryFn: dashboardApi.getAlerts,
    enabled: isAdminReady,
    refetchInterval: isAdminReady ? 60_000 : false,
  });
}

export function useKpis(dateRange: DateRange) {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.kpis(dateRange),
    queryFn: () => dashboardApi.getKpis(dateRange.fromDate, dateRange.toDate),
    enabled: isAdminReady,
  });
}

export function useGmvChart(dateRange: DateRange) {
  const isAdminReady = useAdminQueryEnabled();
  const groupBy = calcGroupBy(dateRange.fromDate, dateRange.toDate);

  return useQuery({
    queryKey: dashboardKeys.gmvChart(dateRange),
    queryFn: () => dashboardApi.getGmvChart(dateRange.fromDate, dateRange.toDate, groupBy),
    enabled: isAdminReady,
  });
}

export function useBookingStatusSnapshot() {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.bookingStatus,
    queryFn: dashboardApi.getBookingStatusSnapshot,
    enabled: isAdminReady,
    refetchInterval: isAdminReady ? 60_000 : false,
  });
}

export function useBookingDetails(dateRange: DateRange, limit = 10) {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.bookingDetails(dateRange),
    queryFn: () => dashboardApi.getBookingDetails(dateRange.fromDate, dateRange.toDate, limit),
    enabled: isAdminReady,
  });
}

export function useFinanceBreakdown(dateRange: DateRange) {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.financeBreakdown(dateRange),
    queryFn: () => dashboardApi.getFinanceBreakdown(dateRange.fromDate, dateRange.toDate),
    enabled: isAdminReady,
  });
}

export function useTaskerStats(limit = 5) {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.taskerStats,
    queryFn: () => dashboardApi.getTaskerStats(limit),
    enabled: isAdminReady,
  });
}

export function useReviews(dateRange: DateRange) {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.reviews(dateRange),
    queryFn: () => dashboardApi.getReviews(dateRange.fromDate, dateRange.toDate),
    enabled: isAdminReady,
  });
}

export function useTaskerLevels() {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.taskerLevels,
    queryFn: dashboardApi.getTaskerLevels,
    enabled: isAdminReady,
  });
}

export function useAreaPerformance(dateRange: DateRange) {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.areaPerformance(dateRange),
    queryFn: () => dashboardApi.getAreaPerformance(dateRange.fromDate, dateRange.toDate),
    enabled: isAdminReady,
  });
}

export function useVoucherPerformance(limit = 6) {
  const isAdminReady = useAdminQueryEnabled();

  return useQuery({
    queryKey: dashboardKeys.voucherPerformance,
    queryFn: () => dashboardApi.getVoucherPerformance(limit),
    enabled: isAdminReady,
  });
}
