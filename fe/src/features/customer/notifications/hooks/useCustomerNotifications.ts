import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customerNotificationApi } from "../services/notification.service";
import type { NotificationQueryParams } from "../types/notification.types";

export const customerNotificationKeys = {
  all: ["customer-notifications"] as const,

  list: (params?: NotificationQueryParams) =>
    ["customer-notifications", "list", params] as const,

  unreadCount: ["customer-notifications", "unread-count"] as const,
};

export function useCustomerNotifications(params?: NotificationQueryParams) {
  return useQuery({
    queryKey: customerNotificationKeys.list(params),
    queryFn: () => customerNotificationApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useCustomerUnreadCount() {
  return useQuery({
    queryKey: customerNotificationKeys.unreadCount,
    queryFn: customerNotificationApi.unreadCount,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerNotificationApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: customerNotificationKeys.all,
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerNotificationApi.markAllRead,
    onSuccess: ({ updated }) => {
      if (updated > 0) {
        toast.success(`Đã đánh dấu ${updated} thông báo là đã đọc`);
      }
      void queryClient.invalidateQueries({
        queryKey: customerNotificationKeys.all,
      });
    },
  });
}
