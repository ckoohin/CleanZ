import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  AbsenceReportStatus,
  AdminAbsenceReport,
  AdminAbsenceReportList,
} from "../types/absence-report.types";

function unwrap<T>(response: { data: unknown }): T {
  const body = response.data as { data?: T } | T;
  return ((body as { data?: T }).data ?? body) as T;
}

export const adminAbsenceReportService = {
  list: async (params: {
    status?: AbsenceReportStatus;
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminAbsenceReportList> =>
    unwrap(
      await http.get(API_ENDPOINTS.ADMIN_ABSENCE_REPORTS.BASE, { params }),
    ),

  detail: async (id: string): Promise<AdminAbsenceReport> =>
    unwrap(await http.get(API_ENDPOINTS.ADMIN_ABSENCE_REPORTS.DETAIL(id))),

  review: async (
    id: string,
    payload: { decision: "APPROVE" | "REJECT"; reason?: string },
  ) =>
    unwrap(
      await http.patch(API_ENDPOINTS.ADMIN_ABSENCE_REPORTS.REVIEW(id), payload),
    ),

  bulkApprove: async (reportIds: string[]) =>
    unwrap(
      await http.patch(API_ENDPOINTS.ADMIN_ABSENCE_REPORTS.BULK_REVIEW, {
        reportIds,
      }),
    ),

  writeOffDebt: async (debtId: string, reason: string) =>
    unwrap(
      await http.post(
        API_ENDPOINTS.ADMIN_ABSENCE_REPORTS.DEBT_WRITE_OFF(debtId),
        { reason },
      ),
    ),
};
