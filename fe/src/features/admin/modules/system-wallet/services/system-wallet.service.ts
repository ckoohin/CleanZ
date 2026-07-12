import http from "@/lib/api/http";
import type {
  SystemWallet,
  SystemWalletTransactionList,
  SystemWalletTransactionQuery,
} from "../types/system-wallet.types";

const BASE = "/wallet/system";

/** Hai route này trả thẳng payload (không bọc successResponse). */
export const systemWalletApi = {
  getWallet: (): Promise<SystemWallet> =>
    http.get<SystemWallet>(BASE).then((response) => response.data),

  getTransactions: (
    params?: SystemWalletTransactionQuery,
  ): Promise<SystemWalletTransactionList> =>
    http
      .get<SystemWalletTransactionList>(`${BASE}/transactions`, { params })
      .then((response) => response.data),
};
