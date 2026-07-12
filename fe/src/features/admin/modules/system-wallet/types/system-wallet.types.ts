import type { WalletTransactionType } from "../../wallets/types/wallet.types";

export interface SystemWallet {
  id: string;
  ownerType: "SYSTEM";
  balance: number;
  holdBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemWalletTransaction {
  id: string;
  walletId: string;
  bookingId?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  type: WalletTransactionType;
  /** Luôn dương — chiều tiền nằm ở `type`, không nằm ở dấu. */
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
}

export interface SystemWalletTransactionList {
  items: SystemWalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemWalletTransactionQuery {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
}
