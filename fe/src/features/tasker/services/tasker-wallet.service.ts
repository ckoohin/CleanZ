import http from "@/lib/api/http";
import type {
  CreateTaskerWithdrawalPayload,
  TaskerDepositTransaction,
  TaskerWallet,
  TaskerWalletTransactionList,
  TaskerWalletTransactionQuery,
  TaskerWithdrawalRequest,
} from "../types/tasker-wallet.types";

const BASE = "/wallet/tasker/me";

export const taskerWalletApi = {
  getWallet: (): Promise<TaskerWallet> =>
    http.get<TaskerWallet>(BASE).then((response) => response.data),

  getTransactions: (
    params?: TaskerWalletTransactionQuery,
  ): Promise<TaskerWalletTransactionList> =>
    http
      .get<TaskerWalletTransactionList>(`${BASE}/transactions`, { params })
      .then((response) => response.data),

  getDepositTransactions: (): Promise<TaskerDepositTransaction[]> =>
    http
      .get<TaskerDepositTransaction[]>(`${BASE}/deposit/transactions`)
      .then((response) => response.data),

  createWithdrawal: (
    payload: CreateTaskerWithdrawalPayload,
  ): Promise<TaskerWithdrawalRequest> =>
    http
      .post<TaskerWithdrawalRequest>(`${BASE}/withdrawals`, payload)
      .then((response) => response.data),
};
