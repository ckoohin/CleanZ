import http from '@/lib/api/http';
import type {
  AlertsResponse,
  KpisResponse,
  GmvChartItem,
  BookingStatusSnapshot,
  BookingDetailsResponse,
  FinanceBreakdownResponse,
  TaskerStatsResponse,
  GroupBy,
} from '../types/dashboard.types';

const BASE = '/admin/dashboard';

export const dashboardApi = {
  getAlerts: (): Promise<AlertsResponse> =>
    http.get(`${BASE}/alerts`).then((r) => r.data),

  getKpis: (fromDate: string, toDate: string): Promise<KpisResponse> =>
    http.get(`${BASE}/kpis`, { params: { fromDate, toDate } }).then((r) => r.data),

  getGmvChart: (fromDate: string, toDate: string, groupBy: GroupBy): Promise<GmvChartItem[]> =>
    http.get(`${BASE}/gmv-chart`, { params: { fromDate, toDate, groupBy } }).then((r) => r.data),

  getBookingStatusSnapshot: (): Promise<BookingStatusSnapshot> =>
    http.get(`${BASE}/booking-status-snapshot`).then((r) => r.data),

  getBookingDetails: (fromDate: string, toDate: string, limit = 10): Promise<BookingDetailsResponse> =>
    http.get(`${BASE}/booking-details`, { params: { fromDate, toDate, limit } }).then((r) => r.data),

  getFinanceBreakdown: (fromDate: string, toDate: string): Promise<FinanceBreakdownResponse> =>
    http.get(`${BASE}/finance-breakdown`, { params: { fromDate, toDate } }).then((r) => r.data),

  getTaskerStats: (limit = 5): Promise<TaskerStatsResponse> =>
    http.get(`${BASE}/tasker-stats`, { params: { limit } }).then((r) => r.data),
};
