import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customerWalletApi } from "../services/customer-wallet.service";
import type {
  CreateCustomerWithdrawalInput,
  CustomerWalletTransactionQuery,
} from "../types/customer-wallet.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

export const customerWalletKeys = {
  all: ["customer-wallet"] as const,
  detail: () => [...customerWalletKeys.all, "detail"] as const,
  transactions: (query?: CustomerWalletTransactionQuery) =>
    [...customerWalletKeys.all, "transactions", query] as const,
  withdrawals: () => [...customerWalletKeys.all, "withdrawals"] as const,
};

export function useCustomerWallet() {
  return useQuery({
    queryKey: customerWalletKeys.detail(),
    queryFn: customerWalletApi.getWallet,
  });
}

export function useCustomerWalletTransactions(
  query?: CustomerWalletTransactionQuery,
) {
  return useQuery({
    queryKey: customerWalletKeys.transactions(query),
    queryFn: () => customerWalletApi.getTransactions(query),
  });
}

export function useCustomerWithdrawals() {
  return useQuery({
    queryKey: customerWalletKeys.withdrawals(),
    queryFn: customerWalletApi.listWithdrawals,
  });
}

export function useCreateCustomerWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCustomerWithdrawalInput) =>
      customerWalletApi.createWithdrawal(dto),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu rút tiền, chờ CleanZ duyệt");
      qc.invalidateQueries({ queryKey: customerWalletKeys.withdrawals() });
      qc.invalidateQueries({ queryKey: customerWalletKeys.detail() });
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
