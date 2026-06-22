import http from "@/lib/api/http";
import type {
  CustomerWallet,
  CustomerWalletTransactionList,
} from "../types/customer-wallet.types";

const BASE = "/wallet/customer/me";

export const customerWalletApi = {
  getWallet: (): Promise<CustomerWallet> =>
    http.get<CustomerWallet>(BASE).then((response) => response.data),

  getTransactions: (): Promise<CustomerWalletTransactionList> =>
    http
      .get<CustomerWalletTransactionList>(`${BASE}/transactions`)
      .then((response) => response.data),
};
