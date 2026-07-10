"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { useSocketEvent } from "@/hooks/use-socket";
import { NOTIFICATION_EVENT_NEW } from "@/features/notifications/types";
import { notificationKeys } from "@/features/notifications/useNotifications";
import { RealtimeActionDialog } from "@/components/realtime/RealtimeActionDialog";

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  content?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
}

interface PendingInvitation {
  title: string;
  content: string;
  href: string;
}

// Khớp DISPATCH_RING_TIMEOUT_MS phía backend: lời mời chỉ có hiệu lực 15 giây.
const INVITATION_AUTO_CLOSE_MS = 15_000;

export function TaskerRealtimeDispatch() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [invitation, setInvitation] = useState<PendingInvitation | null>(null);

  const handleNewNotification = useCallback(
    (notification?: NotificationPayload | null) => {
      if (!notification?.id || !notification.title) return;

      void queryClient.invalidateQueries({
        queryKey: ["tasker-booking", "posted-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });

      if (notification.referenceType !== "BOOKING" || !notification.referenceId) {
        return;
      }

      if (notification.type === "BOOKING_NEW_AVAILABLE") {
        setInvitation({
          title: notification.title || "Có đơn mới gần bạn",
          content:
            notification.content ?? "Mở chi tiết đơn để nhận trong 15 giây.",
          href: `/tasker/jobs/${notification.referenceId}?mode=posted`,
        });
        return;
      }

      // Cập nhật đơn thuần thông tin → giữ toast.
      toast.info(notification.title, {
        id: `dispatch-${notification.referenceId}`,
        description: notification.content ?? "Nhấn chuông thông báo để xem chi tiết.",
      });
    },
    [queryClient],
  );

  useSocketEvent<NotificationPayload>(
    NOTIFICATION_EVENT_NEW,
    handleNewNotification,
  );

  const closeInvitation = useCallback(() => setInvitation(null), []);

  return (
    <RealtimeActionDialog
      open={invitation !== null}
      icon={<BellRing className="size-5" />}
      title={invitation?.title ?? ""}
      description={invitation?.content}
      confirmLabel="Xem & nhận đơn"
      cancelLabel="Bỏ qua"
      autoCloseMs={INVITATION_AUTO_CLOSE_MS}
      onConfirm={() => {
        closeInvitation();
        if (invitation) router.push(invitation.href);
      }}
      onCancel={closeInvitation}
    />
  );
}
