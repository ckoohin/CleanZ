export interface TaskerWallet {
  id: string;
  ownerType: "TASKER";
  balance: number;
  holdBalance: number;
  taskerId: string | null;
  /** Sàn phải giữ lại trong ví để còn được nhận đơn (0 nếu đã nghỉ việc). */
  minAcceptBalance?: number;
  /** Phần thật sự rút được = balance − minAcceptBalance. */
  withdrawableBalance?: number;
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
  /** Tóm tắt booking để đối soát thu nhập/chiết khấu ngay tại giao dịch. */
  booking?: {
    id: string;
    bookingCode: string;
    totalPrice: number;
    discountAmount: number;
  } | null;
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

export interface TaskerEarningsSummary {
  today: number;
  week: number;
  month: number;
  year: number;
  completedBookings: number;
}

export type TaskerEarningsPeriod = "today" | "week" | "month" | "year";

export interface TaskerEarningsPoint {
  key: string;
  label: string;
  dateLabel: string;
  amount: number;
  rangeStart: string;
  rangeEnd: string;
}

export interface TaskerEarningsPeriodOption {
  value: string;
  label: string;
  isCurrent: boolean;
}

export interface TaskerEarningsBreakdown {
  period: TaskerEarningsPeriod;
  total: number;
  availableFrom: string;
  availableTo: string;
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
  selectedValue: string;
  options: TaskerEarningsPeriodOption[];
  points: TaskerEarningsPoint[];
}

export interface TaskerTopupConfig {
  minVnd: number;
  maxVnd: number;
  fxRate: number;
}

export interface CreateTaskerTopupPayload {
  amountVnd: number;
  /** Cổng thanh toán — mặc định PAYPAL. */
  provider?: "PAYPAL" | "ADYEN";
}

export interface TaskerTopupResult {
  topupId: string;
  provider: "PAYPAL" | "ADYEN";
  paypalOrderId: string | null;
  amountVnd: number;
  amountUsd: number | null;
  approveUrl: string | null;
  /** Link chuyển hướng thanh toán PayPal. NULL với Adyen. */
  payUrl: string | null;
  /** Chỉ có khi provider = ADYEN — dùng để mount Web Drop-in. */
  adyenSessionId: string | null;
  adyenSessionData: string | null;
  adyenClientKey: string | null;
}

/** Thẻ đã lưu qua Adyen (stored payment method). */
export interface TaskerSavedCard {
  id: string;
  brand: string | null;
  lastFour: string | null;
  expiryMonth: string | null;
  expiryYear: string | null;
}

export interface TaskerTopupCaptureResult {
  topupId: string;
  status:
    | "CREATED"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "EXPIRED"
    | "REFUND_PENDING"
    | "REFUNDED";
  amountVnd: number;
  balance: number;
}

export interface TaskerDepositTransaction {
  id: string;
  type:
    | "CASH_COMMISSION_DEDUCT"
    | "INCIDENT_COMPENSATION_DEDUCT"
    | "TOP_UP"
    | "TERMINATION_REFUND";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
  booking?: {
    id: string;
    bookingCode?: string;
  } | null;
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
