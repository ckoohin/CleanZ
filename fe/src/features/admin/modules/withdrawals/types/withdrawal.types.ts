export type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSED";

export interface WithdrawalWallet {
  id: string;
  ownerType: "CUSTOMER" | "TASKER" | "SYSTEM";
  balance: number | string;
  holdBalance: number | string;
}

export interface WithdrawalRequest {
  id: string;
  taskerId: string;
  walletId: string;
  amount: number | string;
  status: WithdrawalStatus;
  bankAccount: string | null;
  bankName: string | null;
  note: string | null;
  adminNote: string | null;
  proofImageUrl: string | null;
  reviewedAt: string | null;
  processedAt: string | null;
  createdAt: string;
  wallet?: WithdrawalWallet;
  tasker?: {
    id: string;
    user?: {
      id: string;
      fullName: string;
      email: string;
      phone?: string | null;
    };
  };
}

export interface WithdrawalListQuery {
  page?: number;
  limit?: number;
  status?: WithdrawalStatus;
  taskerId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedWithdrawals {
  items: WithdrawalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewWithdrawalPayload {
  status: "APPROVED" | "REJECTED";
  note?: string;
  adminNote?: string;
  proofImageUrl?: string;
}

export interface FinancialOverview {
  totalWalletBalance: number;
  totalHoldBalance: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
}
