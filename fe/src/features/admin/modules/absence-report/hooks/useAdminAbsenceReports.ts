import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminAbsenceReportService } from "../services/admin-absence-report.service";
import type { AbsenceReportStatus } from "../types/absence-report.types";

export const absenceReportKeys = {
  all: ["admin-absence-reports"] as const,
  list: (params: object) => ["admin-absence-reports", "list", params] as const,
  detail: (id: string) => ["admin-absence-reports", "detail", id] as const,
};

export function useAdminAbsenceReports(params: {
  status?: AbsenceReportStatus;
  keyword?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: absenceReportKeys.list(params),
    queryFn: () => adminAbsenceReportService.list(params),
  });
}

export function useAdminAbsenceReport(id: string | null) {
  return useQuery({
    queryKey: absenceReportKeys.detail(id ?? ""),
    queryFn: () => adminAbsenceReportService.detail(id!),
    enabled: Boolean(id),
  });
}

export function useReviewAbsenceReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      reason?: string;
    }) => adminAbsenceReportService.review(id, { decision, reason }),
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.decision === "APPROVE"
          ? "Đã duyệt báo cáo khách vắng"
          : "Đã từ chối báo cáo",
      );
      await queryClient.invalidateQueries({ queryKey: absenceReportKeys.all });
    },
  });
}

export function useBulkApproveAbsenceReports() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportIds: string[]) =>
      adminAbsenceReportService.bulkApprove(reportIds) as Promise<{
        approved: string[];
        skipped: unknown[];
        failed: unknown[];
      }>,
    onSuccess: async (result) => {
      toast.success(`Đã duyệt ${result.approved.length} báo cáo sạch`);
      if (result.skipped.length || result.failed.length) {
        toast.warning(
          `${result.skipped.length} ca cần xem riêng, ${result.failed.length} ca lỗi`,
        );
      }
      await queryClient.invalidateQueries({ queryKey: absenceReportKeys.all });
    },
  });
}

export function useWriteOffAbsenceDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ debtId, reason }: { debtId: string; reason: string }) =>
      adminAbsenceReportService.writeOffDebt(debtId, reason),
    onSuccess: async () => {
      toast.success("Đã xóa phần công nợ còn lại");
      await queryClient.invalidateQueries({ queryKey: absenceReportKeys.all });
    },
  });
}
