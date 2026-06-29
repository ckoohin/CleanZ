"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocketEvent } from "@/hooks/use-socket";
import { customerNotificationKeys } from "@/features/customer/notifications/hooks/useCustomerNotifications";
import { notificationKeys } from "@/features/notifications/useNotifications";
import {
  NOTIFICATION_EVENT_NEW,
  NOTIFICATION_EVENT_UNREAD,
} from "@/features/notifications/types";

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  content?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt?: string;
}

interface UnreadCountPayload {
  count: number;
}

export function CustomerRealtimeNotifications() {
  const queryClient = useQueryClient();

  const handleNewNotification = useCallback(
    (notification: NotificationPayload) => {
      toast.info(notification.title, {
        id: `notification-${notification.id}`,
        description: notification.content ?? undefined,
      });
      void queryClient.invalidateQueries({
        queryKey: customerNotificationKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });
    },
    [queryClient],
  );

  const handleUnreadCount = useCallback(
    (payload: UnreadCountPayload) => {
      queryClient.setQueryData(customerNotificationKeys.unreadCount, payload);
      queryClient.setQueryData(notificationKeys.unread, payload);
    },
    [queryClient],
  );

  useSocketEvent<NotificationPayload>(
    NOTIFICATION_EVENT_NEW,
    handleNewNotification,
  );
  useSocketEvent<UnreadCountPayload>(
    NOTIFICATION_EVENT_UNREAD,
    handleUnreadCount,
  );

  return null;
}
