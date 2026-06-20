import type { TaskerAccountStatus } from "./types/admin-tasker.types";

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ duyệt",
  TRAINING: "Đang đào tạo",
  ACTIVE: "Đang hoạt động",
  SUSPENDED: "Bị đình chỉ",
  REJECTED: "Bị từ chối",
  TERMINATED: "Khóa vĩnh viễn",
};

export const ACCOUNT_STATUS_BADGE_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  TRAINING: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  SUSPENDED: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  TERMINATED: "bg-red-600/10 text-red-700 dark:text-red-400 border-red-600/20",
};

export const DOC_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  need_info: "Cần bổ sung",
  expired: "Hết hạn",
};

export const DOC_STATUS_BADGE_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  need_info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  expired: "bg-muted text-muted-foreground border-border",
};

export const ALL_ACCOUNT_STATUSES: TaskerAccountStatus[] = [
  "ACTIVE",
  "PENDING",
  "TRAINING",
  "SUSPENDED",
  "REJECTED",
  "TERMINATED",
];

export const ALL_DOC_STATUSES: AdminTaskerDocStatus[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "NEED_INFO",
  "EXPIRED",
];

export type AdminTaskerDocStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "NEED_INFO";
