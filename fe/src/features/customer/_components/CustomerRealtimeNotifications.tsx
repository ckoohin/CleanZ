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

interface BookingSearchingPayload {
  bookingId: string;
  ring?: number;
  radiusKm?: string | number;
  taskersFound?: number;
  exhausted?: boolean;
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

  const handleBookingSearching = useCallback(
    (payload: BookingSearchingPayload) => {
      void queryClient.invalidateQueries({ queryKey: ["booking", "my-active"] });
      void queryClient.invalidateQueries({ queryKey: ["booking", "my-list"] });
      if (payload.bookingId) {
        void queryClient.invalidateQueries({
          queryKey: ["booking", payload.bookingId],
        });
      }

      toast.info("Đang tìm Tasker phù hợp", {
        id: payload.bookingId
          ? `booking-searching-${payload.bookingId}`
          : "booking-searching",
        description: "CleanZ đang gửi đơn đến các Tasker gần bạn.",
      });
    },
    [queryClient],
  );

  const handleBookingStillSearching = useCallback(
    (payload: BookingSearchingPayload) => {
      void queryClient.invalidateQueries({ queryKey: ["booking", "my-active"] });
      void queryClient.invalidateQueries({ queryKey: ["booking", "my-list"] });
      if (payload.bookingId) {
        void queryClient.invalidateQueries({
          queryKey: ["booking", payload.bookingId],
        });
      }

      const radiusText = payload.radiusKm ? ` trong bán kính ${payload.radiusKm}km` : "";
      toast.info(
        payload.exhausted ? "Vẫn đang tiếp tục tìm Tasker" : "Đang mở rộng tìm kiếm",
        {
          id: payload.bookingId
            ? `booking-searching-${payload.bookingId}`
            : "booking-searching",
          description: payload.exhausted
            ? "Đơn vẫn đang mở, hệ thống sẽ tiếp tục hiển thị cho Tasker phù hợp."
            : `CleanZ đang tìm thêm Tasker${radiusText}.`,
        },
      );
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
  useSocketEvent<BookingSearchingPayload>(
    "booking:searching",
    handleBookingSearching,
  );
  useSocketEvent<BookingSearchingPayload>(
    "booking:still_searching",
    handleBookingStillSearching,
  );

  return null;
}
