"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { taskerReviewApi, ReportReason } from "../services/tasker-review.service";

export const taskerReviewKeys = {
  all: ["tasker-reviews"] as const,
  list: (filters?: object) =>
    [...taskerReviewKeys.all, "list", filters] as const,
};

export function useTaskerReviews(params?: {
  page?: number;
  limit?: number;
  minRating?: number;
  maxRating?: number;
}) {
  return useQuery({
    queryKey: taskerReviewKeys.list(params),
    queryFn: () => taskerReviewApi.getMyReviews(params),
  });
}

export function useTaskerReplyReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) =>
      taskerReviewApi.reply(reviewId, reply),
    onSuccess: (res) => {
      toast.success(res.message || "Đã gửi phản hồi!");
      void queryClient.invalidateQueries({ queryKey: taskerReviewKeys.all });
    },
  });
}

export function useTaskerReportReview() {
  return useMutation({
    mutationFn: ({
      reviewId,
      reason,
      description,
    }: {
      reviewId: string;
      reason: ReportReason;
      description?: string;
    }) => taskerReviewApi.report(reviewId, reason, description),
    onSuccess: (res) => {
      toast.success(res.message || "Đã gửi báo cáo!");
    },
  });
}
