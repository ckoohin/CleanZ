import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import {
  customerWithdrawalAdminApi,
  type ReviewCustomerWithdrawalPayload,
  type WithdrawalStatus,
} from "./service";

const keys = {
  all: ["admin-customer-withdrawals"] as const,
  list: (status?: WithdrawalStatus) => [...keys.all, status ?? "all"] as const,
};

export function useAdminCustomerWithdrawals(status?: WithdrawalStatus) {
  return useQuery({
    queryKey: keys.list(status),
    queryFn: () => customerWithdrawalAdminApi.list(status),
  });
}

export function useReviewCustomerWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ReviewCustomerWithdrawalPayload;
    }) => customerWithdrawalAdminApi.review(id, payload),
    onSuccess: (_d, v) => {
      toast.success(
        v.payload.status === "APPROVED"
          ? "Đã duyệt & trừ ví — chuyển khoản cho khách"
          : "Đã từ chối yêu cầu rút",
      );
      qc.invalidateQueries({ queryKey: keys.all });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
