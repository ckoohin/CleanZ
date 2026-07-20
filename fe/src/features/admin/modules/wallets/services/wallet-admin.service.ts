import http from "@/lib/api/http";
import type {
  AdminTopupQuery,
  AdminWallet,
  CustomerSpendingQuery,
  PaginatedTopupOrders,
  FinanceOverview,
  PaginatedCustomerSpending,
  PaginatedWallets,
  PaginatedWalletTransactions,
  TransactionFlowSummary,
  TransactionFlowSummaryQuery,
  WalletAdjustmentPayload,
  WalletListQuery,
  WalletTransaction,
  WalletTransactionQuery,
} from "../types/wallet.types";

const BASE = "/admin/finance";
const WALLET_BASE = "/wallet";

export const walletAdminApi = {
  list: (params?: WalletListQuery): Promise<PaginatedWallets> =>
    http
      .get(`${WALLET_BASE}/admin`, { params })
      .then((response) => response.data.data),

  findOne: (id: string): Promise<AdminWallet> =>
    http
      .get(`${BASE}/wallets/${id}`)
      .then((response) => response.data.data),

  transactions: (
    params?: WalletTransactionQuery,
  ): Promise<PaginatedWalletTransactions> =>
    http
      .get(`${BASE}/transactions`, { params })
      .then((response) => response.data.data),

  adjust: (payload: WalletAdjustmentPayload): Promise<WalletTransaction> =>
    http
      .post(`${BASE}/transactions/adjustment`, payload)
      .then((response) => response.data.data),

  overview: (): Promise<FinanceOverview> =>
    http.get(`${BASE}/overview`).then((response) => response.data.data),

  transactionsSummary: (
    params?: TransactionFlowSummaryQuery,
  ): Promise<TransactionFlowSummary> =>
    http
      .get(`${BASE}/transactions/summary`, { params })
      .then((response) => response.data.data),

  customerSpending: (
    params?: CustomerSpendingQuery,
  ): Promise<PaginatedCustomerSpending> =>
    http
      .get(`${BASE}/customers/spending`, { params })
      .then((response) => response.data.data),

  /* ─── Đơn nạp ví (PayPal/VNPay) ─────────────────────────────────────────── */

  listTopups: (params?: AdminTopupQuery): Promise<PaginatedTopupOrders> =>
    http
      .get(`${BASE}/topups`, { params })
      .then((response) => response.data.data),

  // Hoàn tiền đơn nạp VNPay về thẻ gốc (gọi VNPay Refund API + trừ ví).
  refundTopup: (topupId: string): Promise<unknown> =>
    http
      .post(`${BASE}/topups/${topupId}/refund`)
      .then((response) => response.data.data),
};
