import http from "@/lib/api/http";
import { API_ENDPOINTS } from "@/constants/api-endpoints";
import type {
  BroadcastNotificationDto,
  BroadcastResult,
  PaginatedNotifications,
  AdminNotificationQueryParams,
} from "../types/notification.types";

const EP = API_ENDPOINTS.ADMIN_NOTIFICATIONS;

export const notificationAdminApi = {
  /** Broadcast thông báo theo segment/userIds (PROMOTION/SYSTEM) */
  broadcast: (dto: BroadcastNotificationDto): Promise<BroadcastResult> =>
    http.post<BroadcastResult>(EP.BROADCAST, dto).then((r) => r.data),

  /** Lịch sử thông báo đã gửi (tra cứu) */
  history: (params?: AdminNotificationQueryParams): Promise<PaginatedNotifications> =>
    http.get<PaginatedNotifications>(EP.HISTORY, { params }).then((r) => r.data),
};
