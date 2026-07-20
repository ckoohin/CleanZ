export interface CustomerWallet {
  id: string;
  ownerType: "CUSTOMER";
  balance: number;
  holdBalance: number;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CustomerWalletTransactionType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "PAYMENT"
  | "REFUND"
  | "PLATFORM_FEE"
  | "TASKER_EARNING"
  | "DEPOSIT_HOLD"
  | "DEPOSIT_RELEASE"
  | "DEPOSIT_DEDUCT"
  | "CANCELLATION_FEE"
  | "ADJUSTMENT";

export interface CustomerWalletTransaction {
  id: string;
  walletId: string;
  bookingId?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  type: CustomerWalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
}

export interface CustomerWalletTransactionList {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: CustomerWalletTransaction[];
}

export interface CustomerWalletTransactionQuery {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";

export interface CustomerWithdrawal {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  bankAccount: string | null;
  bankName: string | null;
  note: string | null;
  adminNote: string | null;
  reviewedAt: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface CreateCustomerWithdrawalInput {
  amount: number;
  bankAccount: string;
  bankName: string;
  note?: string;
}

/* ─── Nạp tiền qua PayPal / Adyen ─────────────────────────────────────────── */

export type TopupStatus =
  | "CREATED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type TopupProvider = "PAYPAL" | "ADYEN";

/** Hạn mức + tỷ giá do admin cấu hình (system_configs). */
export interface TopupConfig {
  minVnd: number;
  maxVnd: number;
  /** VND cho 1 USD — PayPal thu bằng USD. */
  fxRate: number;
}

export interface CreateTopupInput {
  amountVnd: number;
  /** Nạp để trả cho một booking cụ thể (luồng thiếu số dư). */
  bookingId?: string;
  /** Cổng thanh toán — mặc định PAYPAL. */
  provider?: TopupProvider;
}

export interface CreateTopupResult {
  topupId: string;
  provider: TopupProvider;
  paypalOrderId: string | null;
  amountVnd: number;
  amountUsd: number | null;
  /** Link PayPal để khách duyệt thanh toán. */
  approveUrl: string | null;
  /** Link chuyển hướng thanh toán PayPal. NULL với Adyen (dùng session bên dưới). */
  payUrl: string | null;
  /** Chỉ có khi provider = ADYEN — dùng để mount Web Drop-in. */
  adyenSessionId: string | null;
  adyenSessionData: string | null;
  adyenClientKey: string | null;
}

/** Thẻ đã lưu qua Adyen (stored payment method) — chỉ hiển thị thông tin che, token nằm ở Adyen. */
export interface SavedCard {
  id: string;
  brand: string | null;
  lastFour: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
}

export interface CaptureTopupResult {
  topupId: string;
  status: TopupStatus;
  amountVnd: number;
  /** Số dư ví sau khi cộng tiền. */
  balance: number;
}

export interface TopupOrder {
  id: string;
  provider: string;
  status: TopupStatus;
  amountVnd: number;
  amountUsd: number;
  fxRate: number;
  paypalOrderId: string | null;
  bookingId: string | null;
  failReason: string | null;
  createdAt: string;
}

export interface TopupOrderList {
  items: TopupOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
