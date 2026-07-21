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
  ratingAvg: number;
  totalCompletedJobs: number;
  totalWorkingHours: number;
  totalPoints: number;
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

export interface TaskerEarningsQuery {
  fromDate: string;
  toDate: string;
}

export interface TaskerEarningsSummary {
  taskerEarnings: number;
  platformCommission: number;
  completedBookings: number;
}

export interface TaskerEarningsDetailItem {
  bookingId: string;
  bookingCode: string;
  completedAt: string | null;
  taskerEarning: number;
  platformCommission: number;
  createdAt: string;
}
