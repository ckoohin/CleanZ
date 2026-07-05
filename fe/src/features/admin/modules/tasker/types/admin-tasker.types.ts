import { TaskerProfile } from "@/features/tasker/types/tasker.type";

export type TaskerAccountStatus =
  | "PENDING"
  | "TRAINING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "TERMINATED";

export type BanType = "TEMPORARY" | "PERMANENT";

export interface BanTaskerPayload {
  id: string;
  reason: string;
  type: BanType;
  /** Số ngày khóa cho hình thức TEMPORARY (1–365). Bỏ qua khi PERMANENT. */
  durationDays?: number;
}

export interface UpdateTaskerWorkStatusPayload {
  id: string;
  clearCancelSuspension?: boolean;
}

export interface AdminTasker extends TaskerProfile {
  status: TaskerAccountStatus;
  presenceStatus?: string | null;
  workingAddress?: string | null;
  banReason?: string | null;
  /** Audit: admin cập nhật gần nhất (thông tin cơ bản / trạng thái). */
  updatedBy?: string | null;
  updatedByName?: string | null;
  /** Audit: admin duyệt / review hồ sơ KYC gần nhất. */
  docReviewedBy?: string | null;
  docReviewedByName?: string | null;
  /** Thời điểm hết hạn khóa tạm thời; null nếu không bị khóa tạm. */
  banEndsAt?: string | null;
  /** Thời điểm hết hạn khóa nhận đơn do tự hủy quá số lần cho phép. */
  cancelSuspendedUntil?: string | null;
}

/** Payload admin chỉnh sửa thông tin cơ bản của tasker (không đụng tới giấy tờ KYC). */
export interface AdminUpdateTaskerPayload {
  fullName?: string;
  phone?: string;
  workingAddress?: string;
  bio?: string;
  skills?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface AdminTaskerDocument {
  type: string | null;
  idNumber: string | null;
  frontUrl: string | null;
  backUrl: string | null;
  criminalRecordUrl: string | null;
  healthCertificateUrl: string | null;
  certificateUrl: string | null;
  issuedDate: string | null;
  expiredDate: string | null;
  status: string;
  reviewedAt: string | null;
  note: string | null;
}

export interface AdminTaskerStats {
  /** Số dư ví hiện tại (mô hình 1 ví — thay cho hệ ký quỹ cũ). */
  walletBalance: number;
  ratingAvg: number;
  totalCompletedJobs: number;
  totalWorkingHours: number;
  totalPoints: number;
}

/** Payload admin ghi nhận tasker nộp tiền mặt tại trụ sở (cộng thẳng vào ví). */
export interface AdminCreditWalletPayload {
  /** Số tiền (VND). BE giới hạn 1.000 – 2.000.000/lần. */
  amount: number;
  /** Lý do cộng tiền (bắt buộc). */
  reason: string;
  /** Số phiếu thu / mã chứng từ (tùy chọn). */
  referenceCode?: string;
}

/** Ví trả về sau khi admin cộng tiền. */
export interface AdminWalletResult {
  id: string;
  ownerType: string;
  balance: number;
  holdBalance: number;
  taskerId?: string | null;
}

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

/** Một bút toán trong lịch sử giao dịch ví tasker. */
export interface AdminWalletTransaction {
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
}

export interface AdminWalletTransactionList {
  total: number;
  items: AdminWalletTransaction[];
}

export interface AdminTaskerDetail extends AdminTasker {
  hasCitizenCardImage: boolean;
  hasCriminalRecordImage: boolean;
  hasHealthCertificateImage: boolean;
  hasCertificateImage: boolean;
  hasIdWithSelfieImage: boolean;
  user: {
    id: string | null;
    email: string | null;
    fullName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    isActive: boolean | null;
  };
  document: AdminTaskerDocument;
  stats: AdminTaskerStats;
}

export interface AdminTaskerFilter {
  status?: TaskerAccountStatus;
  docStatus?: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "NEED_INFO";
  keyword?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTaskers {
  data: AdminTasker[];
  total: number;
  page: number;
  limit: number;
}
