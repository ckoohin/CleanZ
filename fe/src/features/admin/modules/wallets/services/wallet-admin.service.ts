import http from "@/lib/api/http";
import type {
  AdminWallet,
  CustomerServiceBreakdownItem,
  CustomerSpendingQuery,
  CustomerTopupOrder,
  CustomerWalletOverview,
  CustomerWithdrawalRequest,
  FinanceOverview,
  PaginatedCustomerSpending,
  PaginatedRevenuePayroll,
  PaginatedWallets,
  PaginatedWalletTransactions,
  RevenuePayrollQuery,
  RevenueSummaryQuery,
  RevenueSummaryResponse,
  TransactionFlowSummary,
  TransactionFlowSummaryQuery,
  WalletAdjustmentPayload,
  WalletListQuery,
  WalletTransaction,
  WalletTransactionDetail,
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

  revenueSummary: (params?: RevenueSummaryQuery): Promise<RevenueSummaryResponse[]> =>
    http.get(`${BASE}/revenue`, { params }).then((response) => response.data.data),

  revenuePayroll: (params?: RevenuePayrollQuery): Promise<PaginatedRevenuePayroll> =>
    http.get(`${BASE}/revenue-payroll`, { params }).then((response) => response.data.data),

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
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
    },
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

  customerServiceBreakdown: (
    customerId: string,
    params?: { from?: string; to?: string },
  ): Promise<CustomerServiceBreakdownItem[]> =>
    http
      .get(`${BASE}/customers/${customerId}/service-breakdown`, { params })
      .then((response) => response.data.data),

  transactionDetail: (id: string): Promise<WalletTransactionDetail> =>
    http
      .get(`${BASE}/transactions/${id}/detail`)
      .then((response) => response.data.data),
};
