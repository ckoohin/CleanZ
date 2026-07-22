import http from "@/lib/api/http";
import type {
  AdminWallet,
  CustomerSpendingQuery,
  CustomerTopupOrder,
  CustomerWalletOverview,
  CustomerWithdrawalRequest,
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

  customerWalletOverview: (
    customerId: string,
  ): Promise<CustomerWalletOverview> =>
    http
      .get(`${BASE}/customers/${customerId}/wallet-overview`)
      .then((response) => response.data.data),

  customerTransactions: (
    customerId: string,
    params?: WalletTransactionQuery,
  ): Promise<PaginatedWalletTransactions> =>
    http
      .get(`${BASE}/customers/${customerId}/transactions`, { params })
      .then((response) => response.data.data),

  customerTopups: (
    customerId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{
    items: CustomerTopupOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> =>
    http
      .get(`${BASE}/customers/${customerId}/topups`, { params })
      .then((response) => response.data.data),

  customerWithdrawals: (
    customerId: string,
    params?: { page?: number; limit?: number },
  ): Promise<{
    items: CustomerWithdrawalRequest[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> =>
    http
      .get(`${BASE}/customers/${customerId}/withdrawals`, { params })
      .then((response) => response.data.data),
};

