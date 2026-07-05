import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import { taskerWalletApi } from "../services/tasker-wallet.service";
import type {
  CreateTaskerTopupPayload,
  CreateTaskerWithdrawalPayload,
} from "../types/tasker-wallet.types";

export const taskerWalletKeys = {
  all: ["tasker-wallet"] as const,
  detail: () => [...taskerWalletKeys.all, "detail"] as const,
  transactions: () => [...taskerWalletKeys.all, "transactions"] as const,
  topup: (id: string) => [...taskerWalletKeys.all, "topup", id] as const,
};

export function useTaskerWallet() {
  return useQuery({
    queryKey: taskerWalletKeys.detail(),
    queryFn: taskerWalletApi.getWallet,
  });
}

export function useTaskerWalletTransactions(
  query?: TaskerWalletTransactionQuery,
) {
  return useQuery({
    queryKey: taskerWalletKeys.transactions(query),
    queryFn: () => taskerWalletApi.getTransactions(query),
  });
}

export function useCreateTaskerWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskerWithdrawalPayload) =>
      taskerWalletApi.createWithdrawal(payload),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu rút tiền");
      queryClient.invalidateQueries({ queryKey: taskerWalletKeys.all });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/** Tạo đơn nạp → trả về approveUrl để redirect sang PayPal. */
export function useCreateTaskerTopup() {
  return useMutation({
    mutationFn: (payload: CreateTaskerTopupPayload) =>
      taskerWalletApi.createTopup(payload),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/**
 * Poll trạng thái 1 đơn nạp (dùng ở trang success sau khi PayPal redirect về).
 * Backend tự verify với PayPal + cộng ví khi gọi endpoint này.
 * Tự dừng poll khi đơn không còn ở trạng thái PENDING.
 */
export function useTaskerTopupStatus(topupId: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: taskerWalletKeys.topup(topupId ?? "none"),
    queryFn: async () => {
      const topup = await taskerWalletApi.getTopup(topupId as string);
      if (topup.status === "PAID") {
        // Ví vừa được cộng → làm mới số dư + lịch sử.
        queryClient.invalidateQueries({ queryKey: taskerWalletKeys.detail() });
        queryClient.invalidateQueries({
          queryKey: taskerWalletKeys.transactions(),
        });
      }
      return topup;
    },
    enabled: !!topupId,
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING" ? 2500 : false,
  });
}
