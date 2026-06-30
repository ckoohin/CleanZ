"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info } from "lucide-react";
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
      toast.custom((toastId) => (
        <button
          type="button"
          onClick={() => {
            toast.dismiss(toastId);
            router.push(href);
          }}
          className="flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-2xl border border-primary/20 bg-card px-4 py-3 text-left text-card-foreground shadow-lg shadow-primary/10 transition hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Info className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-5 text-foreground">
              {notification.title || "Có đơn mới gần bạn"}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {notification.content ?? "Mở chi tiết đơn để nhận trong 15 giây."}
            </p>
          </div>
        </button>
      ), {
        id: `dispatch-${notification.referenceId}`,
        duration: 15_000,
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
