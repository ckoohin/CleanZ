export interface DateRange {
  fromDate: string;
  toDate: string;
}

export type GroupBy = 'day' | 'week' | 'month';

export type PresetKey = 'overview' | 'finance' | 'operations' | 'tasker' | 'cs' | 'marketing';

export type WidgetId =
  | 'alerts'
  | 'kpiRevenue'
  | 'kpiGMV'
  | 'kpiAOV'
  | 'kpiRefund'
  | 'kpiOrders'
  | 'kpiCancel'
  | 'kpiTaskers'
  | 'kpiNewCust'
  | 'kpiRetention'
  | 'kpiNPS'
  | 'chart'
  | 'statuses'
  | 'recent'
  | 'recurring'
  | 'cancelReasons'
  | 'paymentMix'
  | 'feeBreakdown'
  | 'taskerLevels'
  | 'topTaskers'
  | 'docExpiry'
  | 'reviews'
  | 'feedback'
  | 'voucherPerf'
  | 'areaPerf'
  | 'peakHours'
  | 'extras';

// --- Alerts ---
export interface AlertsResponse {
  unassignedBookings: { count: number; urgentCount: number };
  pendingKyc: { count: number };
  openIncidents: { count: number; overdueCount: number };
  openTickets: { count: number; slaBreachedCount: number };
  pendingWithdrawals: { count: number; totalAmount: number };
}

// --- KPIs ---
export interface KpiValue {
  value: number;
  change: number | null;
}

export interface KpisResponse {
  gmv: KpiValue;
  aov: KpiValue;
  totalOrders: KpiValue;
  cancelRate: KpiValue;
  newCustomers: KpiValue;
  returningRate: { value: number };
  totalRefund: KpiValue;
  activeTaskers: { total: number; online: number };
}

// --- GMV Chart ---
export interface GmvChartItem {
  label: string;
  gmv: number;
  orders: number;
}

// --- Booking Status Snapshot ---
export type BookingStatusSnapshot = Record<string, number>;

// --- Booking Details ---
export interface RecentBooking {
  bookingCode: string;
  customerName: string;
  serviceName: string | null;
  totalPrice: number;
  status: string;
  scheduledStart: string;
}

export interface BookingDetailsResponse {
  recent: RecentBooking[];
  recurring: { rule: string; count: number }[];
  cancelReasons: { cancelledBy: string; count: number }[];
  peakHours: { hour: string; count: number }[];
}

// --- Finance Breakdown ---
export interface FinanceBreakdownResponse {
  paymentMix: { method: string; count: number; percent: number }[];
  feeBreakdown: {
    peakFee: number;
    petFee: number;
    waitingFee: number;
    discountAmount: number;
  };
}

// --- Tasker Stats ---
export interface TaskerStatsResponse {
  topTaskers: { fullName: string; ratingAvg: number; totalCompletedJobs: number }[];
  docExpiring: { fullName: string; docType: string; docExpiredDate: string; daysLeft: number }[];
}
