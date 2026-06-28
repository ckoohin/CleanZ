"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
  getNotificationSocket,
} from "@/lib/socket/notification-socket.client";
import { customerNotificationKeys } from "@/features/customer/notifications/hooks/useCustomerNotifications";

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
  const [, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getNotificationSocket();

    const handleNewNotification = (notification: NotificationPayload) => {
      toast.info(notification.title, {
        id: `notification-${notification.id}`,
        description: notification.content ?? undefined,
      });
      void queryClient.invalidateQueries({
        queryKey: customerNotificationKeys.all,
      });
    };

    const handleUnreadCount = (payload: UnreadCountPayload) => {
      setUnreadCount(payload.count);
      queryClient.setQueryData(customerNotificationKeys.unreadCount, payload);
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:unread_count", handleUnreadCount);

    connectNotificationSocket();

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:unread_count", handleUnreadCount);
      disconnectNotificationSocket();
    };
  }, [queryClient]);

  return null;
}
