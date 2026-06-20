import http from "@/lib/api/http";
import type {
  AdminWallet,
  PaginatedWallets,
  PaginatedWalletTransactions,
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
};
