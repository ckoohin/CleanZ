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

export type WithdrawalStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";

export interface CustomerWithdrawal {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  bankAccount: string | null;
  bankName: string | null;
  bankBin: string | null;
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
  bankBin?: string;
  note?: string;
}

/* ─── Nạp tiền qua PayOS ──────────────────────────────────────────────────── */

export type TopupStatus =
  "CREATED" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED";

/** Hạn mức do admin cấu hình (system_configs). */
export interface TopupConfig {
  minVnd: number;
  maxVnd: number;
}

export interface CreateTopupInput {
  amountVnd: number;
  /** Nạp để trả cho một booking cụ thể (luồng thiếu số dư). */
  bookingId?: string;
}

export interface CreateTopupResult {
  topupId: string;
  payosOrderCode: number;
  amountVnd: number;
  /** Link PayOS để khách thanh toán. */
  checkoutUrl: string | null;
}

export interface CaptureTopupResult {
  topupId: string;
  status: TopupStatus;
  amountVnd: number;
  /** Số dư ví sau khi cộng tiền. */
  balance: number;
  /** Số tiền trong lần nạp vừa được tự động dùng để trả công nợ khách vắng. */
  debtRecovered: number;
}

export interface TopupOrder {
  id: string;
  provider: string;
  status: TopupStatus;
  amountVnd: number;
  payosOrderCode: number | null;
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
