"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSocketEvent } from "@/hooks/use-socket";
import { NOTIFICATION_EVENT_NEW } from "@/features/notifications/types";
import { notificationKeys } from "@/features/notifications/useNotifications";

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  content?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
}

export function TaskerRealtimeDispatch() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleNewNotification = useCallback(
    (notification: NotificationPayload) => {
      void queryClient.invalidateQueries({
        queryKey: ["tasker-booking", "posted-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });

      if (
        notification.type !== "BOOKING_NEW_AVAILABLE" ||
        notification.referenceType !== "BOOKING" ||
        !notification.referenceId
      ) {
        return;
      }

      const href = `/tasker/jobs/${notification.referenceId}?mode=posted`;
      toast.info(notification.title || "Có đơn mới gần bạn", {
        id: `dispatch-${notification.referenceId}`,
        description: notification.content ?? "Mở chi tiết đơn để nhận trong 15 giây.",
        duration: 15_000,
        action: {
          label: "Xem đơn",
          onClick: () => router.push(href),
        },
      });
    },
    [queryClient, router],
  );

  useSocketEvent<NotificationPayload>(
    NOTIFICATION_EVENT_NEW,
    handleNewNotification,
  );

  return null;
}
