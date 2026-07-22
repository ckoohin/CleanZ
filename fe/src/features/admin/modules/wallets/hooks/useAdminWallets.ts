import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import { walletAdminApi } from "../services/wallet-admin.service";
import type {
  CustomerSpendingQuery,
  TransactionFlowSummaryQuery,
  WalletAdjustmentPayload,
  WalletListQuery,
  WalletTransactionQuery,
} from "../types/wallet.types";

export const walletKeys = {
  all: ["admin-wallets"] as const,
  list: (params?: WalletListQuery) =>
    [...walletKeys.all, "list", params] as const,
  detail: (id: string) => [...walletKeys.all, "detail", id] as const,
  transactions: (params?: WalletTransactionQuery) =>
    [...walletKeys.all, "transactions", params] as const,
  overview: () => [...walletKeys.all, "overview"] as const,
  transactionsSummary: (params?: TransactionFlowSummaryQuery) =>
    [...walletKeys.all, "transactions-summary", params] as const,
  customerSpending: (params?: CustomerSpendingQuery) =>
    [...walletKeys.all, "customer-spending", params] as const,
  customerOverview: (customerId: string) =>
    [...walletKeys.all, "customer-overview", customerId] as const,
  customerTransactions: (customerId: string, params?: WalletTransactionQuery) =>
    [...walletKeys.all, "customer-transactions", customerId, params] as const,
  customerTopups: (customerId: string, params?: { page?: number; limit?: number }) =>
    [...walletKeys.all, "customer-topups", customerId, params] as const,
  customerWithdrawals: (customerId: string, params?: { page?: number; limit?: number }) =>
    [...walletKeys.all, "customer-withdrawals", customerId, params] as const,
};

export function useCustomerWalletOverview(customerId: string) {
  return useQuery({
    queryKey: walletKeys.customerOverview(customerId),
    queryFn: () => walletAdminApi.customerWalletOverview(customerId),
    enabled: Boolean(customerId),
  });
}

export function useCustomerWalletTransactions(
  customerId: string,
  params?: WalletTransactionQuery,
) {
  return useQuery({
    queryKey: walletKeys.customerTransactions(customerId, params),
    queryFn: () => walletAdminApi.customerTransactions(customerId, params),
    enabled: Boolean(customerId),
    placeholderData: (previous) => previous,
  });
}

export function useCustomerTopups(
  customerId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: walletKeys.customerTopups(customerId, params),
    queryFn: () => walletAdminApi.customerTopups(customerId, params),
    enabled: Boolean(customerId),
    placeholderData: (previous) => previous,
  });
}

export function useCustomerWithdrawals(
  customerId: string,
  params?: { page?: number; limit?: number },
) {
  return useQuery({
    queryKey: walletKeys.customerWithdrawals(customerId, params),
    queryFn: () => walletAdminApi.customerWithdrawals(customerId, params),
    enabled: Boolean(customerId),
    placeholderData: (previous) => previous,
  });
}

export function useFinanceOverview() {
  return useQuery({
    queryKey: walletKeys.overview(),
    queryFn: () => walletAdminApi.overview(),
  });
}

export function useTransactionFlowSummary(
  params?: TransactionFlowSummaryQuery,
) {
  return useQuery({
    queryKey: walletKeys.transactionsSummary(params),
    queryFn: () => walletAdminApi.transactionsSummary(params),
    placeholderData: (previous) => previous,
  });
}

export function useCustomerSpending(params?: CustomerSpendingQuery) {
  return useQuery({
    queryKey: walletKeys.customerSpending(params),
    queryFn: () => walletAdminApi.customerSpending(params),
    placeholderData: (previous) => previous,
  });
}

export function useAdminWallets(params?: WalletListQuery) {
  return useQuery({
    queryKey: walletKeys.list(params),
    queryFn: () => walletAdminApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useAdminWalletDetail(id: string) {
  return useQuery({
    queryKey: walletKeys.detail(id),
    queryFn: () => walletAdminApi.findOne(id),
    enabled: Boolean(id),
  });
}

export function useWalletTransactions(params?: WalletTransactionQuery) {
  return useQuery({
    queryKey: walletKeys.transactions(params),
    queryFn: () => walletAdminApi.transactions(params),
    placeholderData: (previous) => previous,
  });
}

export function useAdjustWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WalletAdjustmentPayload) =>
      walletAdminApi.adjust(payload),
    onSuccess: () => {
      toast.success("Đã ghi nhận điều chỉnh số dư");
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

