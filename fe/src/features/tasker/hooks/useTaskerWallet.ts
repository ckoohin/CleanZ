import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import { taskerWalletApi } from "../services/tasker-wallet.service";
import type {
  CreateTaskerWithdrawalPayload,
  TaskerWalletTransactionQuery,
} from "../types/tasker-wallet.types";

export const taskerWalletKeys = {
  all: ["tasker-wallet"] as const,
  detail: () => [...taskerWalletKeys.all, "detail"] as const,
  transactions: (query?: TaskerWalletTransactionQuery) =>
    [...taskerWalletKeys.all, "transactions", query] as const,
  depositTransactions: () =>
    [...taskerWalletKeys.all, "deposit-transactions"] as const,
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

export function useTaskerDepositTransactions() {
  return useQuery({
    queryKey: taskerWalletKeys.depositTransactions(),
    queryFn: taskerWalletApi.getDepositTransactions,
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
