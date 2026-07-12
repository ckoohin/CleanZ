import { useQuery } from "@tanstack/react-query";
import { systemWalletApi } from "../services/system-wallet.service";
import type { SystemWalletTransactionQuery } from "../types/system-wallet.types";

export const systemWalletKeys = {
  all: ["admin-system-wallet"] as const,
  detail: () => [...systemWalletKeys.all, "detail"] as const,
  transactions: (query?: SystemWalletTransactionQuery) =>
    [...systemWalletKeys.all, "transactions", query] as const,
};

export function useSystemWallet() {
  return useQuery({
    queryKey: systemWalletKeys.detail(),
    queryFn: systemWalletApi.getWallet,
  });
}

export function useSystemWalletTransactions(
  query?: SystemWalletTransactionQuery,
) {
  return useQuery({
    queryKey: systemWalletKeys.transactions(query),
    queryFn: () => systemWalletApi.getTransactions(query),
    placeholderData: (previous) => previous,
  });
}
