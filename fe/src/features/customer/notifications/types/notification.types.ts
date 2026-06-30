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
  | "PROMOTION"
  | "SYSTEM";

export type NotificationRefType =
  | "BOOKING"
  | "INCIDENT"
  | "SUPPORT_TICKET"
  | "PAYMENT";

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

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

export interface UnreadCountResponse {
  count: number;
}
