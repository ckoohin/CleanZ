export interface DateRange {
  fromDate: string;
  toDate: string;
}

export type GroupBy = 'day' | 'week' | 'month';

/** Danh mục dashboard. 'services' là tab đặc biệt: render ServicePackageReportsPage. */
export type CategoryKey =
  | 'overview'
  | 'cs'
  | 'finance'
  | 'operations'
  | 'tasker'
  | 'marketing'
  | 'services';

/** Danh mục xuất được báo cáo Excel — khớp enum DashboardCategory phía backend. */
export type ExportableCategory = Exclude<CategoryKey, 'services'>;

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
  | 'peakHours';

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
  commission: KpiValue;
  nps: { value: number; promoterPct: number; detractorPct: number };
  gmv: KpiValue;
  aov: KpiValue;
  totalOrders: KpiValue;
  cancelRate: KpiValue;
  newCustomers: KpiValue;
  returningRate: { value: number };
  totalRefund: KpiValue;
  activeTaskers: { total: number; online: number };
}

// --- Reviews ---
export interface ReviewsResponse {
  avg: number;
  total: number;
  criteria: {
    punctuality: number;
    cleanliness: number;
    friendliness: number;
    satisfaction: number;
  };
  nps: number;
  recent: { name: string; rating: number; comment: string }[];
}

// --- Tasker levels / Area / Voucher ---
export interface TaskerLevelItem {
  label: string;
  color: string | null;
  count: number;
}

export interface AreaPerfItem {
  name: string;
  count: number;
}

export interface VoucherPerfItem {
  code: string;
  used: number;
  limit: number | null;
}

// --- GMV Chart ---
export interface GmvChartItem {
  label: string;
  /** Tiền thật chảy qua sàn — CHỈ đơn hoàn tất. */
  gmv: number;
  /** Giá trị đơn huỷ / hết hạn — tiền đã mất, không phải GMV. */
  lost: number;
  /** Giá trị đơn chưa chốt (chờ nhận / đang làm) — chưa thành GMV, cũng chưa mất. */
  pending: number;
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
