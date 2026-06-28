import http from "@/lib/api/http";
import type {
  CustomerWallet,
  CustomerWalletTransactionList,
  CustomerWalletTransactionQuery,
} from "../types/customer-wallet.types";

const BASE = "/wallet/customer/me";

export const customerWalletApi = {
  getWallet: (): Promise<CustomerWallet> =>
    http.get<CustomerWallet>(BASE).then((response) => response.data),

  getTransactions: (
    params?: CustomerWalletTransactionQuery,
  ): Promise<CustomerWalletTransactionList> =>
    http
      .get<CustomerWalletTransactionList>(`${BASE}/transactions`, { params })
      .then((response) => response.data),
};
