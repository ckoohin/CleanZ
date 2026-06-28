import { API_ENDPOINTS } from "@/constants/api-endpoints";
import http from "@/lib/api/http";
import type {
  NotificationItem,
  NotificationQueryParams,
  PaginatedNotifications,
  UnreadCountResponse,
} from "../types/notification.types";

const EP = API_ENDPOINTS.NOTIFICATIONS;

export const customerNotificationApi = {
  list: (params?: NotificationQueryParams): Promise<PaginatedNotifications> =>
    http
      .get<PaginatedNotifications>(EP.BASE, { params })
      .then((res) => res.data),

  unreadCount: (): Promise<UnreadCountResponse> =>
    http.get<UnreadCountResponse>(EP.UNREAD_COUNT).then((res) => res.data),

  markRead: (id: string): Promise<NotificationItem> =>
    http.patch<NotificationItem>(EP.MARK_READ(id)).then((res) => res.data),

  markAllRead: (): Promise<{ updated: number }> =>
    http.patch<{ updated: number }>(EP.READ_ALL).then((res) => res.data),
};
