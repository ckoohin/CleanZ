import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type { TaskerReviewsResponse } from "../types/tasker-review.types";

export const REPORT_REASONS = {
  SPAM: "Spam",
  FAKE: "Đánh giá giả",
  INAPPROPRIATE: "Nội dung không phù hợp",
  HARASSMENT: "Quấy rối / xúc phạm",
  OTHER: "Khác",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export const taskerReviewApi = {
  getMyReviews: (params?: {
    page?: number;
    limit?: number;
    minRating?: number;
    maxRating?: number;
  }) =>
    http
      .get<TaskerReviewsResponse>(API_ENDPOINTS.TASKER_REVIEWS.BASE, {
        params,
      })
      .then((r) => r.data),

  reply: (reviewId: string, reply: string) =>
    http
      .post<{ message: string; taskerReply: string }>(
        API_ENDPOINTS.TASKER_REVIEWS.REPLY(reviewId),
        { reply },
      )
      .then((r) => r.data),

  report: (reviewId: string, reason: ReportReason, description?: string) =>
    http
      .post<{ message: string }>(
        API_ENDPOINTS.TASKER_REVIEWS.REPORT(reviewId),
        { reason, description },
      )
      .then((r) => r.data),
};
