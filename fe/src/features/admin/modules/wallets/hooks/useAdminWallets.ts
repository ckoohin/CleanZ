import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import { walletAdminApi } from "../services/wallet-admin.service";
import type {
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
};

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
