import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";

export const REPORT_REASONS = {
  SPAM: "Spam",
  FAKE: "Đánh giá giả",
  INAPPROPRIATE: "Nội dung không phù hợp",
  HARASSMENT: "Quấy rối / xúc phạm",
  OTHER: "Khác",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export interface CreateReviewPayload {
  overallRating: number;
  punctuality?: number;
  cleanliness?: number;
  friendliness?: number;
  satisfaction?: number;
  comment?: string;
  isAnonymous?: boolean;
  images?: string[];
}

export interface ReviewResponse {
  id: string;
  bookingId: string;
  overallRating: number;
  punctuality: number;
  cleanliness: number;
  friendliness: number;
  satisfaction: number;
  comment: string | null;
  images: string[];
  isAnonymous: boolean;
  adminReply: string | null;
  taskerReply: string | null;
  taskerRepliedAt: string | null;
  createdAt: string;
  customerName: string | null;
  avatar: string | null;
}

export interface PackageReviewsResponse {
  items: ReviewResponse[];
  total: number;
  avgRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number; pct: number }[];
}

export const reviewApi = {
  create: (bookingId: string, payload: CreateReviewPayload) =>
    http
      .post<{ message: string; review: ReviewResponse }>(
        API_ENDPOINTS.REVIEWS.CREATE(bookingId),
        payload,
      )
      .then((r) => r.data),

  getMyReview: (bookingId: string) =>
    http
      .get<{ review: ReviewResponse | null }>(
        API_ENDPOINTS.REVIEWS.MY_REVIEW(bookingId),
      )
      .then((r) => r.data),

  getPackageReviews: (packageId: string, page = 1, limit = 10) =>
    http
      .get<PackageReviewsResponse>(API_ENDPOINTS.REVIEWS.PACKAGE(packageId), {
        params: { page, limit },
      })
      .then((r) => r.data),

  report: (reviewId: string, reason: ReportReason, description?: string) =>
    http
      .post<{ message: string }>(API_ENDPOINTS.REVIEWS.REPORT(reviewId), {
        reason,
        description,
      })
      .then((r) => r.data),
};
