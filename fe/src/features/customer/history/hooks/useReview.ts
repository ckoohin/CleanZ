"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  reviewApi,
  CreateReviewPayload,
  ReportReason,
} from "../services/review.service";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

export const reviewKeys = {
  myReview: (bookingId: string) => ["reviews", "booking", bookingId] as const,
  package: (packageId: string) => ["reviews", "package", packageId] as const,
};

export function useMyReview(bookingId: string) {
  return useQuery({
    queryKey: reviewKeys.myReview(bookingId),
    queryFn: () => reviewApi.getMyReview(bookingId),
    enabled: !!bookingId,
    retry: false,
  });
}

export function usePackageReviews(packageId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: [...reviewKeys.package(packageId), page, limit],
    queryFn: () => reviewApi.getPackageReviews(packageId, page, limit),
    enabled: !!packageId,
  });
}

export function useCreateReview(bookingId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: CreateReviewPayload) =>
      reviewApi.create(bookingId, payload),
    onSuccess: (res) => {
      toast.success(res.message || "Đánh giá thành công!");
      void queryClient.invalidateQueries({
        queryKey: reviewKeys.myReview(bookingId),
      });
      router.push("/customer/history");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useReportReview() {
  return useMutation({
    mutationFn: ({
      reviewId,
      reason,
      description,
    }: {
      reviewId: string;
      reason: ReportReason;
      description?: string;
    }) => reviewApi.report(reviewId, reason, description),
    onSuccess: (res) => {
      toast.success(res.message || "Đã gửi báo cáo thành công!");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error));
    },
  });
}
