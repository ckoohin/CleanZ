import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import { withdrawalAdminApi } from "../services/withdrawal-admin.service";
import type {
  ReviewWithdrawalPayload,
  WithdrawalListQuery,
} from "../types/withdrawal.types";

export const withdrawalKeys = {
  all: ["admin-withdrawals"] as const,
  overview: () => [...withdrawalKeys.all, "overview"] as const,
  list: (params?: WithdrawalListQuery) =>
    [...withdrawalKeys.all, "list", params] as const,
  detail: (id: string) => [...withdrawalKeys.all, "detail", id] as const,
};

export function useFinancialOverview() {
  return useQuery({
    queryKey: withdrawalKeys.overview(),
    queryFn: withdrawalAdminApi.getOverview,
  });
}

export function useAdminWithdrawals(params?: WithdrawalListQuery) {
  return useQuery({
    queryKey: withdrawalKeys.list(params),
    queryFn: () => withdrawalAdminApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useAdminWithdrawalDetail(id: string) {
  return useQuery({
    queryKey: withdrawalKeys.detail(id),
    queryFn: () => withdrawalAdminApi.findOne(id),
    enabled: Boolean(id),
  });
}

export function useReviewWithdrawal(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReviewWithdrawalPayload) =>
      withdrawalAdminApi.review(id, payload),
    onSuccess: (_, payload) => {
      toast.success(
        payload.status === "APPROVED"
          ? "Đã phê duyệt yêu cầu rút tiền"
          : "Đã từ chối yêu cầu rút tiền",
      );
      queryClient.invalidateQueries({ queryKey: withdrawalKeys.all });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
