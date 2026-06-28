import { useQuery } from "@tanstack/react-query";
import { customerWalletApi } from "../services/customer-wallet.service";
import type { CustomerWalletTransactionQuery } from "../types/customer-wallet.types";

export const customerWalletKeys = {
  all: ["customer-wallet"] as const,
  detail: () => [...customerWalletKeys.all, "detail"] as const,
  transactions: (query?: CustomerWalletTransactionQuery) =>
    [...customerWalletKeys.all, "transactions", query] as const,
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
