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
    tasker?: WalletOwnerProfile | null;
    customer?: WalletOwnerProfile | null;
  };
  type: WalletTransactionType;
  amount: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  referenceId?: string | null;
  referenceType?: string | null;
  description?: string | null;
  createdAt: string;
  booking?: {
    id: string;
    bookingCode?: string;
    address?: string | null;
    scheduledStart?: string | null;
    scheduledStartDate?: string | null;
    scheduledStartTime?: string | null;
    durationHours?: number | string | null;
    totalPrice?: number | string | null;
    discountAmount?: number | string | null;
    customer?: WalletOwnerProfile | null;
    tasker?: WalletOwnerProfile | null;
    package?: { id: string; name?: string | null } | null;
  } | null;
}

export interface WalletTransactionQuery {
  page?: number;
  limit?: number;
  walletId?: string;
  ownerType?: WalletOwnerType;
  type?: WalletTransactionType;
  fromDate?: string;
  toDate?: string;
  search?: string;
  direction?: 'IN' | 'OUT';
}

export interface FinanceOverview {
  totalWalletBalance: number;
  totalHoldBalance: number;
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
}

export interface TransactionFlowSummary {
  totalDeposit: number;
  totalPayment: number;
  totalRefund: number;
  totalWithdraw: number;
  totalTransactions: number;
}

export interface TransactionFlowSummaryQuery {
  fromDate?: string;
  toDate?: string;
}

export interface CustomerSpendingItem {
  customerId: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  walletId: string | null;
  totalSpent: number;
  completedBookings: number;
}

export interface CustomerSpendingQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedCustomerSpending {
  items: CustomerSpendingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

export interface CustomerWalletOverview {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  avatarUrl?: string | null;
  walletId: string;
  balance: number;
  holdBalance: number;
  totalSpent: number;
  totalTopupVnd: number;
  totalRefunded: number;
  topupCount: number;
  withdrawalCount: number;
  lastTransactionAt?: string | null;
}

export interface CustomerTopupOrder {
  id: string;
  customerId: string;
  walletId: string;
  walletTxId?: string | null;
  provider: string;
  paypalOrderId?: string | null;
  status: "CREATED" | "COMPLETED" | "FAILED" | "CANCELLED" | "EXPIRED";
  amountVnd: number | string;
  amountUsd: number | string;
  fxRate: number | string;
  createdAt: string;
}

export interface CustomerWithdrawalRequest {
  id: string;
  customerId: string;
  walletId: string;
  amount: number | string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  bankAccount?: string | null;
  bankName?: string | null;
  note?: string | null;
  adminNote?: string | null;
  proofImageUrl?: string | null;
  createdAt: string;
}

export interface CustomerServiceBreakdownItem {
  serviceId: string;
  serviceName: string;
  iconUrl?: string | null;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  spendingPercent: number;
  lastBookedAt?: string | null;
}

export interface WalletTransactionDetail {
  id: string;
  walletId: string;
  bookingId?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  type: WalletTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
  customer?: {
    id?: string | null;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  paypalTopup?: {
    provider: string;
    paypalOrderId?: string | null;
    captureId?: string | null;
    amountUsd?: number | null;
    fxRate?: number | null;
    status?: string | null;
  } | null;
  booking?: {
    id: string;
    bookingCode?: string | null;
    status?: string | null;
    serviceAddress?: string | null;
    district?: string | null;
    basePrice?: number;
    addonPrice?: number;
    peakFee?: number;
    petFee?: number;
    discountAmount?: number;
    totalAmount: number;
    paymentMethod?: string | null;
    durationHours?: number | null;
    note?: string | null;
    source?: string | null;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    createdAt?: string | null;
    package?: {
      name?: string | null;
      iconUrl?: string | null;
    } | null;
    tasker?: {
      id?: string | null;
      fullName?: string | null;
      phone?: string | null;
    } | null;
  } | null;
}
