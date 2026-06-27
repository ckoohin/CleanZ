import type { UserRole } from "@/features/auth/types/user.type";

/**
 * Provider values as returned by the backend `/users` API (uppercase enum),
 * intentionally distinct from `@/features/auth` AuthProvider which is lowercase.
 */
export type AdminAuthProvider = "LOCAL" | "GOOGLE" | "FACEBOOK";

export type { UserRole };

/** A user row as returned by `GET /users` (list) and the base of the detail payload. */
export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  provider: AdminAuthProvider;
  isActive: boolean;
  isVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present (non-null) only for rows returned by the soft-deleted view (`deleted=true`). */
  deletedAt?: string | null;
}

/** Linked customer profile included in `GET /users/:id` when the user is a customer. */
export interface AdminUserCustomerProfile {
  id: string;
  defaultPaymentMethod: string | null;
  totalBookings: number;
  totalCancelled: number;
}

/** Linked tasker profile included in `GET /users/:id` when the user is a tasker. */
export interface AdminUserTaskerProfile {
  id: string;
  status: string;
  docStatus: string;
  ratingAvg: number;
  totalCompletedJobs: number;
}

/** `GET /users/:id` payload: the user plus any linked role profile. */
export interface UserDetail extends AdminUser {
  customerProfile: AdminUserCustomerProfile | null;
  taskerProfile: AdminUserTaskerProfile | null;
}

/** Query params accepted by `GET /users`. `"ALL"` UI options map to `undefined`. */
export interface UserQueryFilter {
  keyword?: string;
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  provider?: AdminAuthProvider;
  /** When true, return only soft-deleted users (rows carry a non-null `deletedAt`). */
  deleted?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Normalized page object. The service unwraps the backend's nested
 * `{ success, message, data: { data, total, page, limit } }` envelope down to this.
 */
export interface PaginatedUsers {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
  role?: UserRole;
  avatarUrl?: string;
}
