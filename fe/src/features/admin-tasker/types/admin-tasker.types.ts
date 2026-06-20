import { TaskerProfile } from "@/features/tasker/types/tasker.type";

export type TaskerAccountStatus =
  | "PENDING"
  | "TRAINING"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED"
  | "TERMINATED";

export type BanType = "TEMPORARY" | "PERMANENT";

export interface AdminTasker extends TaskerProfile {
  status: TaskerAccountStatus;
  presenceStatus?: string | null;
  workingAddress?: string | null;
  banReason?: string | null;
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
  depositAmount: number;
  currentDepositBalance: number;
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
