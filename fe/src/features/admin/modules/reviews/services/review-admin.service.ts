import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  AdminReviewListResponse,
  AdminReviewQuery,
  AdminReviewDashboard,
  AdminReportsResponse,
} from "../types/review-admin.types";

export const adminReviewApi = {
  getDashboard: (params?: { fromDate?: string; toDate?: string }) =>
    http
      .get<AdminReviewDashboard>(API_ENDPOINTS.ADMIN_REVIEWS.DASHBOARD, {
        params,
      })
      .then((r) => r.data),

  list: (query: AdminReviewQuery) =>
    http
      .get<AdminReviewListResponse>(API_ENDPOINTS.ADMIN_REVIEWS.BASE, {
        params: query,
      })
      .then((r) => r.data),

  toggleHide: (id: string) =>
    http
      .patch<{ message: string; isHidden: boolean }>(
        API_ENDPOINTS.ADMIN_REVIEWS.HIDE(id),
      )
      .then((r) => r.data),

  setReply: (id: string, reply: string | null) =>
    http
      .patch<{ message: string; adminReply: string | null }>(
        API_ENDPOINTS.ADMIN_REVIEWS.REPLY(id),
        { reply },
      )
      .then((r) => r.data),

  getReports: (params?: {
    page?: number;
    limit?: number;
    status?: "PENDING" | "APPROVED" | "REJECTED";
  }) =>
    http
      .get<AdminReportsResponse>(API_ENDPOINTS.ADMIN_REVIEWS.REPORTS, {
        params,
      })
      .then((r) => r.data),

  decideReport: (
    reportId: string,
    decision: "APPROVE" | "REJECT",
    note?: string,
  ) =>
    http
      .post<{ message: string }>(
        API_ENDPOINTS.ADMIN_REVIEWS.DECIDE_REPORT(reportId),
        { decision, note },
      )
      .then((r) => r.data),

  exportCsv: (query: AdminReviewQuery) =>
    http
      .get<Blob>(API_ENDPOINTS.ADMIN_REVIEWS.EXPORT, {
        params: query,
        responseType: "blob",
      })
      .then((r) => r.data),
};
