import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  NotificationQuery,
  PaginatedNotifications,
} from "./types";

const EP = API_ENDPOINTS.NOTIFICATIONS;

export const notificationApi = {
  list: (params?: NotificationQuery): Promise<PaginatedNotifications> =>
    http.get<PaginatedNotifications>(EP.LIST, { params }).then((r) => r.data),

  unreadCount: (): Promise<{ count: number }> =>
    http.get<{ count: number }>(EP.UNREAD_COUNT).then((r) => r.data),

  markAllRead: (): Promise<unknown> =>
    http.patch(EP.READ_ALL).then((r) => r.data),

  markRead: (id: string): Promise<unknown> =>
    http.patch(EP.READ_ONE(id)).then((r) => r.data),
};
