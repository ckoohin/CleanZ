// ─── Enums ────────────────────────────────────────────────────────────────────
export type NotificationType =
  | "BOOKING_NEW_AVAILABLE"
  | "BOOKING_CONFIRMED"
  | "TASKER_ON_THE_WAY"
  | "BOOKING_COMPLETED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "INCIDENT_UPDATE"
  | "SUPPORT_REPLY"
  | "SYSTEM"
  | "PROMOTION";

export type NotificationRefType =
  | "BOOKING"
  | "INCIDENT"
  | "PAYMENT"
  | "SUPPORT_TICKET";

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
  segment?: BroadcastSegment;
  userIds?: string[];
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
