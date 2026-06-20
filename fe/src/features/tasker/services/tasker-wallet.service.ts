import http from "@/lib/api/http";
import type {
  CreateTaskerWithdrawalPayload,
  TaskerWallet,
  TaskerWalletTransactionList,
  TaskerWithdrawalRequest,
} from "../types/tasker-wallet.types";

const BASE = "/wallet/tasker/me";

export const taskerWalletApi = {
  getWallet: (): Promise<TaskerWallet> =>
    http.get<TaskerWallet>(BASE).then((response) => response.data),

  getTransactions: (): Promise<TaskerWalletTransactionList> =>
    http
      .get<TaskerWalletTransactionList>(`${BASE}/transactions`)
      .then((response) => response.data),

  createWithdrawal: (
    payload: CreateTaskerWithdrawalPayload,
  ): Promise<TaskerWithdrawalRequest> =>
    http
      .post<TaskerWithdrawalRequest>(`${BASE}/withdrawals`, payload)
      .then((response) => response.data),
};
