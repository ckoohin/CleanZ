import http from "@/lib/api/http";
import type {
  CustomerWallet,
  CustomerWalletTransactionList,
  CustomerWalletTransactionQuery,
  CustomerWithdrawal,
  CreateCustomerWithdrawalInput,
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

  listWithdrawals: (): Promise<CustomerWithdrawal[]> =>
    http
      .get<CustomerWithdrawal[]>(`${BASE}/withdrawals`)
      .then((response) => response.data),

  createWithdrawal: (
    dto: CreateCustomerWithdrawalInput,
  ): Promise<CustomerWithdrawal> =>
    http
      .post<CustomerWithdrawal>(`${BASE}/withdrawals`, dto)
      .then((response) => response.data),
};
