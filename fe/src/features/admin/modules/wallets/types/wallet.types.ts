export type WalletOwnerType = "CUSTOMER" | "TASKER" | "SYSTEM";

export type WalletTransactionType =
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

export interface WalletOwnerUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface WalletOwnerProfile {
  id: string;
  user: WalletOwnerUser;
}

export interface AdminWallet {
  id: string;
  ownerType: WalletOwnerType;
  balance: number | string;
  holdBalance: number | string;
  tasker?: WalletOwnerProfile | null;
  customer?: WalletOwnerProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletListQuery {
  page?: number;
  limit?: number;
  ownerType?: WalletOwnerType;
  search?: string;
}

export interface PaginatedWallets {
  items: AdminWallet[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalletTransaction {
  id: string;
  wallet?: {
    id: string;
    ownerType: WalletOwnerType;
    balance: number | string;
    holdBalance: number | string;
  };
  type: WalletTransactionType;
  amount: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
  createdAt: string;
  booking?: { id: string; bookingCode?: string } | null;
}

export interface WalletTransactionQuery {
  page?: number;
  limit?: number;
  walletId?: string;
  type?: WalletTransactionType;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedWalletTransactions {
  items: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WalletAdjustmentPayload {
  walletId: string;
  amount: number;
  type: "ADJUSTMENT";
  description: string;
}
