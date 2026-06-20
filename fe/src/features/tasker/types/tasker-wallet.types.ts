export interface TaskerWallet {
  id: string;
  ownerType: "TASKER";
  balance: number;
  holdBalance: number;
  taskerId: string | null;
  requiredDeposit?: number;
  currentDepositBalance?: number;
  depositTopupDue?: string | null;
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
  items: TaskerWalletTransaction[];
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
