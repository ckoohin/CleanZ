import { useQuery } from "@tanstack/react-query";
import { customerWalletApi } from "../services/customer-wallet.service";

export const customerWalletKeys = {
  all: ["customer-wallet"] as const,
  detail: () => [...customerWalletKeys.all, "detail"] as const,
  transactions: () => [...customerWalletKeys.all, "transactions"] as const,
};

export function useCustomerWallet() {
  return useQuery({
    queryKey: customerWalletKeys.detail(),
    queryFn: customerWalletApi.getWallet,
  });
}

export function useCustomerWalletTransactions() {
  return useQuery({
    queryKey: customerWalletKeys.transactions(),
    queryFn: customerWalletApi.getTransactions,
  });
}
