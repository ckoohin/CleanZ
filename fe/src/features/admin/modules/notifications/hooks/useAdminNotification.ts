import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { notificationAdminApi } from "../services/notification-admin.service";
import type {
  AdminNotificationQueryParams,
  BroadcastNotificationDto,
} from "../types/notification.types";

export const notificationAdminKeys = {
  history: (params?: AdminNotificationQueryParams) =>
    ["admin-notifications", "history", params] as const,
};

export function useNotificationHistory(params?: AdminNotificationQueryParams) {
  return useQuery({
    queryKey: notificationAdminKeys.history(params),
    queryFn: () => notificationAdminApi.history(params),
    placeholderData: (prev) => prev,
  });
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: (dto: BroadcastNotificationDto) =>
      notificationAdminApi.broadcast(dto),
    onSuccess: (res) => {
      toast.success(
        `Broadcast thành công! Đã enqueue ${res.enqueued} người dùng (${res.chunks} chunks)`
      );
    },
  });
}
