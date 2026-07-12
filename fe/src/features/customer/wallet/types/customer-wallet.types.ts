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

/* ─── Nạp tiền qua PayPal ─────────────────────────────────────────────────── */

export type TopupStatus =
  | "CREATED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

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
}

export interface CreateTopupResult {
  topupId: string;
  paypalOrderId: string;
  amountVnd: number;
  amountUsd: number;
  /** Link PayPal để khách duyệt thanh toán. */
  approveUrl: string | null;
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
