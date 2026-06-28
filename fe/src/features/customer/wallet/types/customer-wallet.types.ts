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
