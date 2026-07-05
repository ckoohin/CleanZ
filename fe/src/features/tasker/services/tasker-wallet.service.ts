import http from "@/lib/api/http";
import type {
  CreateTaskerTopupPayload,
  CreateTaskerTopupResult,
  CreateTaskerWithdrawalPayload,
  TaskerTopup,
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

  createWithdrawal: (
    payload: CreateTaskerWithdrawalPayload,
  ): Promise<TaskerWithdrawalRequest> =>
    http
      .post<TaskerWithdrawalRequest>(`${BASE}/withdrawals`, payload)
      .then((response) => response.data),

  // ── Nạp tiền (PayPal) — các endpoint này bọc trong successResponse → res.data.data
  createTopup: (
    payload: CreateTaskerTopupPayload,
  ): Promise<CreateTaskerTopupResult> =>
    http
      .post(`${BASE}/topups`, payload)
      .then((response) => response.data.data),

  getTopup: (topupId: string): Promise<TaskerTopup> =>
    http
      .get(`${BASE}/topups/${topupId}`)
      .then((response) => response.data.data),
};
