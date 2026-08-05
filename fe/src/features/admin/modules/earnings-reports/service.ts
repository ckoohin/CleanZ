import http from "@/lib/api/http";

export type EarningsReportPeriod = "week" | "month" | "year";
export type EarningsReportPeriodType = "WEEK" | "MONTH" | "YEAR";
export type EarningsReportTriggerSource = "SCHEDULER" | "ADMIN";
export type EarningsReportRunStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";
export type EarningsReportDeliveryStatus = "PENDING" | "SENT" | "FAILED";

export interface EarningsReportRun {
  id: string;
  periodType: EarningsReportPeriodType;
  periodStartKey: string;
  periodStart: string;
  periodEnd: string;
  triggerSource: EarningsReportTriggerSource;
  triggeredByUserId: string | null;
  status: EarningsReportRunStatus;
  totalTaskers: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EarningsReportDelivery {
  id: string;
  runId: string;
  taskerId: string;
  email: string;
  status: EarningsReportDeliveryStatus;
  sentAt: string | null;
  lastError: string | null;
  grossRevenue: number;
  platformFee: number;
  netIncome: number;
  completedBookings: number;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SendEarningsReportPayload {
  period: EarningsReportPeriod;
  anchor?: string;
  taskerIds?: string[];
}

export interface SendEarningsReportResult {
  runId: string;
  period: EarningsReportPeriod;
  periodStartKey: string;
  rangeLabel: string;
  queuedTaskers: number;
}

export interface EarningsReportRunDetail {
  run: EarningsReportRun;
  deliveries: Paginated<EarningsReportDelivery>;
}

export interface PreviewEarningsReportParams {
  taskerId: string;
  period: EarningsReportPeriod;
  anchor?: string;
}

const BASE = "/admin/earnings-reports";

/**
 * Dựng PDF cho Tasker nhiều đơn lâu hơn timeout mặc định 15s của `http`,
 * nên endpoint xem trước phải nới riêng.
 */
const PREVIEW_TIMEOUT_MS = 60_000;

export const earningsReportAdminApi = {
  send: (payload: SendEarningsReportPayload): Promise<SendEarningsReportResult> =>
    http
      .post<{ data: SendEarningsReportResult }>(`${BASE}/send`, payload)
      .then((r) => r.data.data),

  listRuns: (params: {
    page?: number;
    limit?: number;
    periodType?: EarningsReportPeriodType;
  }): Promise<Paginated<EarningsReportRun>> =>
    http
      .get<{ data: Paginated<EarningsReportRun> }>(`${BASE}/runs`, { params })
      .then((r) => r.data.data),

  getRun: (
    id: string,
    params: { page?: number; limit?: number; status?: EarningsReportDeliveryStatus },
  ): Promise<EarningsReportRunDetail> =>
    http
      .get<{ data: EarningsReportRunDetail }>(`${BASE}/runs/${id}`, { params })
      .then((r) => r.data.data),

  /**
   * Tải PDF dạng blob thay vì mở thẳng URL: auth đi bằng cookie `withCredentials`
   * và API khác origin, mở tab mới không chắc kèm được cookie.
   */
  previewBlob: (params: PreviewEarningsReportParams): Promise<Blob> =>
    http
      .get<Blob>(`${BASE}/preview`, {
        params,
        responseType: "blob",
        timeout: PREVIEW_TIMEOUT_MS,
      })
      .then((r) => r.data),
};
