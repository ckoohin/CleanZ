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
  bookingId: string;
}

export function TaskerRealtimeDispatch() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingInvitation, setPendingInvitation] =
    useState<PendingInvitation | null>(null);

  const handleNewNotification = useCallback(
    (notification?: NotificationPayload | null) => {
      if (!notification?.id || !notification.title) return;

      void queryClient.invalidateQueries({
        queryKey: ["tasker-booking", "posted-list"],
      });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });

      if (
        notification.referenceType !== "BOOKING" ||
        !notification.referenceId
      ) {
        return;
      }

      if (notification.type === "BOOKING_NEW_AVAILABLE") {
        // Cùng mẫu modal với luồng Tasker tạo đơn cho khách đã có tài khoản.
        // Đóng modal chỉ đóng lời nhắc; booking vẫn nằm trong danh sách nhờ
        // quyền mời đã được backend persist độc lập.
        setPendingInvitation({
          title: notification.title || "Có đơn mới dành cho bạn",
          content:
            notification.content ??
            "Đơn đã được thêm vào danh sách công việc có thể nhận.",
          bookingId: notification.referenceId,
        });
        return;
      }

      // Cập nhật đơn thuần thông tin → giữ toast.
      toast.info(notification.title, {
        id: `dispatch-${notification.referenceId}`,
        description:
          notification.content ?? "Nhấn chuông thông báo để xem chi tiết.",
      });
    },
    [queryClient],
  );

  useSocketEvent<NotificationPayload>(
    NOTIFICATION_EVENT_NEW,
    handleNewNotification,
  );

  const closeInvitation = useCallback(() => setPendingInvitation(null), []);

  return (
    <RealtimeActionDialog
      open={pendingInvitation !== null}
      icon={<BellRing className="size-5" />}
      title={pendingInvitation?.title ?? ""}
      description={pendingInvitation?.content}
      confirmLabel="Xem & nhận đơn"
      cancelLabel="Bỏ qua"
      onConfirm={() => {
        closeInvitation();
        if (pendingInvitation) {
          router.push(
            `/tasker/jobs/${pendingInvitation.bookingId}?mode=posted`,
          );
        }
      }}
      onCancel={closeInvitation}
    />
  );
}
