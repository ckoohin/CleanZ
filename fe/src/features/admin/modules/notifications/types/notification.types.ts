// ─── Enums ────────────────────────────────────────────────────────────────────
export type NotificationType =
  | "BOOKING"
  | "PAYMENT"
  | "SYSTEM"
  | "PROMOTION"
  | "SUPPORT_TICKET"
  | "WALLET"
  | "WITHDRAWAL";

export type NotificationRefType =
  | "BOOKING"
  | "PAYMENT"
  | "SUPPORT_TICKET"
  | "WALLET_TRANSACTION"
  | "WITHDRAWAL";

export type BroadcastSegment = "ALL" | "CUSTOMER" | "TASKER";

// ─── Response Shapes ─────────────────────────────────────────────────────────
export interface NotificationItem {
  id: string;
  type: NotificationType;
  referenceType: NotificationRefType | null;
  referenceId: string | null;
  title: string;
  content: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedNotifications {
  data: NotificationItem[];
  meta: PaginationMeta;
}

export interface BroadcastResult {
  campaignId: string;
  enqueued: number;
  chunks: number;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────
export interface BroadcastNotificationDto {
  /** Dùng segment hoặc userIds, không được bỏ trống cả 2 */
  segment?: BroadcastSegment;
  userIds?: string[];
  /** Chỉ PROMOTION hoặc SYSTEM */
  type: "PROMOTION" | "SYSTEM";
  title: string;
  content?: string;
}

export interface AdminNotificationQueryParams {
  page?: number;
  limit?: number;
  userId?: string;
  type?: NotificationType;
  from?: string;
  to?: string;
}
