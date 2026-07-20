import http from "@/lib/api/http";
import type {
  CaptureTopupResult,
  CreateTopupInput,
  CreateTopupResult,
  CustomerWallet,
  CustomerWalletTransactionList,
  CustomerWalletTransactionQuery,
  CustomerWithdrawal,
  CreateCustomerWithdrawalInput,
  SavedCard,
  TopupConfig,
  TopupOrderList,
} from "../types/customer-wallet.types";

const BASE = "/wallet/customer/me";

/**
 * Lưu ý shape: các route ví (`/wallet/customer/me`, `/transactions`, `/withdrawals`)
 * trả THẲNG payload, còn các route nạp tiền bọc trong successResponse/paginatedResponse
 * nên phải bóc thêm một lớp `.data`.
 */
interface Wrapped<T> {
  success: boolean;
  message: string;
  data: T;
}

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

  /* ─── Nạp tiền PayPal ───────────────────────────────────────────────────── */

  getTopupConfig: (): Promise<TopupConfig> =>
    http
      .get<Wrapped<TopupConfig>>(`${BASE}/topup-config`)
      .then((response) => response.data.data),

  createTopup: (dto: CreateTopupInput): Promise<CreateTopupResult> =>
    http
      .post<Wrapped<CreateTopupResult>>(`${BASE}/topups`, dto)
      .then((response) => response.data.data),

  captureTopup: (topupId: string): Promise<CaptureTopupResult> =>
    http
      .post<Wrapped<CaptureTopupResult>>(`${BASE}/topups/${topupId}/capture`)
      .then((response) => response.data.data),

  listTopups: (page = 1, limit = 20): Promise<TopupOrderList> =>
    http
      .get<Wrapped<TopupOrderList>>(`${BASE}/topups`, { params: { page, limit } })
      .then((response) => response.data.data),

  /* ─── Nạp tiền Adyen (Web Drop-in) ──────────────────────────────────────── */

  // Gọi ngay sau khi Drop-in onPaymentCompleted resolve; BE tự hỏi lại Adyen.
  confirmAdyenTopup: (payload: {
    sessionId: string;
    sessionResult: string;
  }): Promise<CaptureTopupResult> =>
    http
      .post<Wrapped<CaptureTopupResult>>(
        `${BASE}/topups/adyen/confirm`,
        payload,
      )
      .then((response) => response.data.data),

  listCards: (): Promise<SavedCard[]> =>
    http
      .get<Wrapped<SavedCard[]>>("/wallet/me/cards")
      .then((response) => response.data.data),

  removeCard: (cardId: string): Promise<void> =>
    http.delete(`/wallet/me/cards/${cardId}`).then(() => undefined),
};
