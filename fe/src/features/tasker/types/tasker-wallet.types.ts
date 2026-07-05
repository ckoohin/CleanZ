export interface TaskerWallet {
  id: string;
  ownerType: "TASKER";
  balance: number;
  holdBalance: number;
  taskerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskerWalletTransactionType =
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

export interface TaskerWalletTransaction {
  id: string;
  walletId: string;
  bookingId?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  type: TaskerWalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
}

export interface TaskerWalletTransactionList {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: TaskerWalletTransaction[];
}

export interface TaskerWalletTransactionQuery {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}

export interface TaskerDepositTransaction {
// ── Nạp tiền vào ví (PayPal) ────────────────────────────────────────────────

export type TaskerTopupStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface CreateTaskerTopupPayload {
  /** Số tiền muốn nạp (VND). BE giới hạn theo cấu hình (mặc định 10k–50tr). */
  amountVnd: number;
}

export interface TaskerTopup {
  id: string;
  amountVnd: number;
  amountUsd: number;
  fxRate: number;
  provider: "PAYPAL";
  status: TaskerTopupStatus;
  /** Link chuyển tới PayPal để thanh toán (chỉ có khi vừa tạo đơn). */
  approveUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** Kết quả tạo đơn nạp — kèm topupId để FE poll trạng thái. */
export interface CreateTaskerTopupResult extends TaskerTopup {
  topupId: string;
}

export interface CreateTaskerWithdrawalPayload {
  amount: number;
  note?: string;
}

export interface TaskerWithdrawalRequest {
  id: string;
  taskerId: string;
  walletId: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PROCESSED";
  bankAccount: string | null;
  bankName: string | null;
  note: string | null;
  reviewedAt: string | null;
  processedAt: string | null;
  createdAt: string;
}
