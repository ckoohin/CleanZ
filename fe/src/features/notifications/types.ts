export type NotificationType =
  | "BOOKING_NEW_AVAILABLE"
  | "BOOKING_PENDING_CONFIRMATION"
  | "BOOKING_CONFIRMED"
  | "TASKER_ON_THE_WAY"
  | "BOOKING_COMPLETED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "INCIDENT_UPDATE"
  | "SUPPORT_REPLY"
  | "PROMOTION"
  | "SYSTEM";

export type NotificationRefType =
  | "BOOKING"
  | "INCIDENT"
  | "SUPPORT_TICKET"
  | "PAYMENT";

export interface AppNotification {
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
  data: AppNotification[];
  meta: PaginationMeta;
}

export interface NotificationQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

// Sự kiện socket realtime (khớp BE NotificationGateway).
export const NOTIFICATION_EVENT_NEW = "notification:new";
export const NOTIFICATION_EVENT_UNREAD = "notification:unread_count";
