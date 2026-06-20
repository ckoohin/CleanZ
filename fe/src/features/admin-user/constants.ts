import type { AdminAuthProvider, UserRole } from "./types/user.types";

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Quản trị viên",
  CUSTOMER: "Khách hàng",
  TASKER: "Người dọn dẹp",
  TECHNICIAN: "Kỹ thuật viên",
};

export const ROLE_BADGE_STYLES: Record<string, string> = {
  ADMIN: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  CUSTOMER: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  TASKER: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  TECHNICIAN: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
};

export const PROVIDER_LABELS: Record<string, string> = {
  LOCAL: "Email / Mật khẩu",
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
};

/** Roles offered in the create form. Admins are intentionally excluded (sensitive). */
export const CREATABLE_ROLES: UserRole[] = ["CUSTOMER", "TASKER"];

/** Roles offered in the edit form / role filter (full set). */
export const ALL_ROLES: UserRole[] = ["ADMIN", "CUSTOMER", "TASKER"];

export const ALL_PROVIDERS: AdminAuthProvider[] = ["LOCAL", "GOOGLE", "FACEBOOK"];
