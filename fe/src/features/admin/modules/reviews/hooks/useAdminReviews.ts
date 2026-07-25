"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { adminReviewApi } from "../services/review-admin.service";
import type { AdminReviewQuery } from "../types/review-admin.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

const KEYS = {
  dashboard: (p?: { fromDate?: string; toDate?: string }) =>
    ["admin", "reviews", "dashboard", p] as const,
  list: (q: AdminReviewQuery) => ["admin", "reviews", "list", q] as const,
  reports: (p?: object) => ["admin", "reviews", "reports", p] as const,
};

export function useAdminReviewDashboard(params?: {
  fromDate?: string;
  toDate?: string;
}) {
  return useQuery({
    queryKey: KEYS.dashboard(params),
    queryFn: () => adminReviewApi.getDashboard(params),
  });
}

export function useAdminReviews(query: AdminReviewQuery) {
  return useQuery({
    queryKey: KEYS.list(query),
    queryFn: () => adminReviewApi.list(query),
  });
}

export function useToggleHideReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminReviewApi.toggleHide(id),
    onSuccess: (res) => {
      toast.success(res.message);
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useSetAdminReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string | null }) =>
      adminReviewApi.setReply(id, reply),
    onSuccess: (res) => {
      toast.success(res.message || "Đã lưu phản hồi");
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useAdminReports(params?: {
  page?: number;
  limit?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED";
}) {
  return useQuery({
    queryKey: KEYS.reports(params),
    queryFn: () => adminReviewApi.getReports(params),
  });
}

export function useDecideReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      decision,
      note,
    }: {
      reportId: string;
      decision: "APPROVE" | "REJECT";
      note?: string;
    }) => adminReviewApi.decideReport(reportId, decision, note),
    onSuccess: (res) => {
      toast.success(res.message || "Đã xử lý báo cáo");
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
