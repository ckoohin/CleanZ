import http from "@/lib/api/http";
import type {
  CreateTaskerWithdrawalPayload,
  CreateTaskerTopupPayload,
  TaskerEarningsBreakdown,
  TaskerEarningsPeriod,
  TaskerEarningsSummary,
  TaskerDepositTransaction,
  TaskerWallet,
  TaskerWalletTransactionList,
  TaskerWalletTransactionQuery,
  TaskerWithdrawalRequest,
  TaskerTopupCaptureResult,
  TaskerTopupConfig,
  TaskerTopupResult,
} from "../types/tasker-wallet.types";

const BASE = "/wallet/tasker/me";

interface Wrapped<T> {
  success: boolean;
  message: string;
  data: T;
}

export const taskerWalletApi = {
  getWallet: (): Promise<TaskerWallet> =>
    http.get<TaskerWallet>(BASE).then((response) => response.data),

  getEarningsSummary: (): Promise<TaskerEarningsSummary> =>
    http
      .get<TaskerEarningsSummary>(`${BASE}/earnings-summary`)
      .then((response) => response.data),

  getEarningsBreakdown: (
    period: TaskerEarningsPeriod,
    anchor?: string,
  ): Promise<TaskerEarningsBreakdown> =>
    http
      .get<TaskerEarningsBreakdown>(`${BASE}/earnings-breakdown`, {
        params: { period, anchor },
      })
      .then((response) => response.data),

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

  getTopupConfig: (): Promise<TaskerTopupConfig> =>
    http
      .get<Wrapped<TaskerTopupConfig>>(`${BASE}/topup-config`)
      .then((response) => response.data.data),

  createTopup: (
    payload: CreateTaskerTopupPayload,
  ): Promise<TaskerTopupResult> =>
    http
      .post<Wrapped<TaskerTopupResult>>(`${BASE}/topups`, payload)
      .then((response) => response.data.data),

  captureTopup: (topupId: string): Promise<TaskerTopupCaptureResult> =>
    http
      .post<Wrapped<TaskerTopupCaptureResult>>(
        `${BASE}/topups/${topupId}/capture`,
      )
      .then((response) => response.data.data),
};
