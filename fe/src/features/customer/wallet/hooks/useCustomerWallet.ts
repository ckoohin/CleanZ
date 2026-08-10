import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { customerWalletApi } from "../services/customer-wallet.service";
import type {
  CreateCustomerWithdrawalInput,
  CreateTopupInput,
  CustomerWalletTransactionQuery,
} from "../types/customer-wallet.types";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

export const customerWalletKeys = {
  all: ["customer-wallet"] as const,
  detail: () => [...customerWalletKeys.all, "detail"] as const,
  transactions: (query?: CustomerWalletTransactionQuery) =>
    [...customerWalletKeys.all, "transactions", query] as const,
  withdrawals: () => [...customerWalletKeys.all, "withdrawals"] as const,
  topupConfig: () => [...customerWalletKeys.all, "topup-config"] as const,
  topups: (page: number) =>
    [...customerWalletKeys.all, "topups", page] as const,
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

/* ─── Nạp tiền PayOS ─────────────────────────────────────────────────────────
 * Luồng: createTopup → điều hướng sang checkoutUrl (PayOS) → PayOS đá về
 * /customer/wallet/topup/return?topupId=... → trang đó gọi captureTopup để cộng ví.
 * Capture là idempotent nên F5 hay bấm lại không nhân đôi tiền.
 * -------------------------------------------------------------------------- */

export function useTopupConfig() {
  return useQuery({
    queryKey: customerWalletKeys.topupConfig(),
    queryFn: customerWalletApi.getTopupConfig,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyTopups(page = 1) {
  return useQuery({
    queryKey: customerWalletKeys.topups(page),
    queryFn: () => customerWalletApi.listTopups(page),
  });
}

export function useCreateTopup() {
  return useMutation({
    mutationFn: (dto: CreateTopupInput) => customerWalletApi.createTopup(dto),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useCaptureTopup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topupId: string) => customerWalletApi.captureTopup(topupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: customerWalletKeys.all });
      qc.invalidateQueries({
        queryKey: ["booking", "customer-absence-restrictions"],
      });
    },
  });
}
