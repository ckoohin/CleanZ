"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck } from "lucide-react";
import { useSocketEvent } from "@/hooks/use-socket";
import { RealtimeActionDialog } from "@/components/realtime/RealtimeActionDialog";
import { customerNotificationKeys } from "@/features/customer/notifications/hooks/useCustomerNotifications";
import { notificationKeys } from "@/features/notifications/useNotifications";
import {
  NOTIFICATION_EVENT_NEW,
  NOTIFICATION_EVENT_UNREAD,
} from "@/features/notifications/types";
import type {
  CustomerActiveBookingResponse,
  CustomerBookingDetail,
} from "@/features/booking/types/booking.types";

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

interface PremiumDispatchPayload {
  bookingId: string;
  taskerId?: string;
  expiresAt?: string;
  radiusKm?: string | number;
}

interface PendingConfirmation {
  title: string;
  content: string;
  bookingId: string;
}

export function CustomerRealtimeNotifications() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  const handleNewNotification = useCallback(
    (notification?: NotificationPayload | null) => {
      if (!notification?.id || !notification.title) return;

      void queryClient.invalidateQueries({
        queryKey: customerNotificationKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });

      if (
        notification.type === "BOOKING_COMPLETED" &&
        notification.referenceId
      ) {
        const bookingId = notification.referenceId;
        queryClient.setQueryData<CustomerActiveBookingResponse | undefined>(
          ["booking", "my-active"],
          (current) =>
            current?.booking?.id === bookingId
              ? { ...current, booking: null }
              : current,
        );
        queryClient.setQueryData<CustomerBookingDetail | undefined>(
          ["booking", bookingId],
          (current) =>
            current ? { ...current, status: "COMPLETED" } : current,
        );
        void queryClient.invalidateQueries({
          queryKey: ["booking", "my-active"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["booking", "my-list"],
        });
        void queryClient.invalidateQueries({
          queryKey: ["booking", bookingId],
        });
      }

      if (
        notification.type === "BOOKING_PENDING_CONFIRMATION" &&
        notification.referenceId
      ) {
        // Đơn tasker tạo hộ cần khách xác nhận trong thời hạn → modal giữa
        // màn hình có xác nhận/hủy thay vì toast (đồng nhất UI luồng booking).
        setPendingConfirmation({
          title: notification.title,
          content:
            notification.content ??
            "Bạn có một đơn đang chờ xác nhận. Vui lòng xác nhận trong thời hạn để giữ lịch.",
          bookingId: notification.referenceId,
        });
        return;
      }

      const descriptionParts = [notification.content];
      if (notification.referenceType === "BOOKING" && notification.referenceId) {
        descriptionParts.push("Nhấn để xem chi tiết.");
      }

      toast.info(notification.title, {
        id: `notification-${notification.id}`,
        description: descriptionParts.filter(Boolean).join(" "),
      });
    },
    [queryClient],
  );

  const handleUnreadCount = useCallback(
    (payload?: UnreadCountPayload | null) => {
      if (typeof payload?.count !== "number") return;
      queryClient.setQueryData(customerNotificationKeys.unreadCount, payload);
      queryClient.setQueryData(notificationKeys.unread, payload);
    },
    [queryClient],
  );

  const handleBookingSearching = useCallback(
    (payload?: BookingSearchingPayload | null) => {
      if (!payload) return;
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
    (payload?: BookingSearchingPayload | null) => {
      if (!payload) return;
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

  // ── Đơn Cao cấp: 3 mốc riêng của luồng ưu tiên thợ yêu thích ──────────────
  const invalidateBooking = useCallback(
    (bookingId?: string) => {
      void queryClient.invalidateQueries({ queryKey: ["booking", "my-active"] });
      if (bookingId) {
        void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
      }
    },
    [queryClient],
  );

  const handleFavoriteInvited = useCallback(
    (payload?: PremiumDispatchPayload | null) => {
      if (!payload) return;
      invalidateBooking(payload.bookingId);
      toast.info("Đã mời thợ yêu thích của bạn", {
        id: `booking-favorite-${payload.bookingId}`,
        description:
          "Thợ bạn chọn đang được mời riêng. Nếu thợ bận, CleanZ sẽ tìm thợ Cao cấp khác.",
      });
    },
    [invalidateBooking],
  );

  const handleFavoriteUnavailable = useCallback(
    (payload?: PremiumDispatchPayload | null) => {
      if (!payload) return;
      invalidateBooking(payload.bookingId);
      toast.info("Thợ yêu thích đang bận", {
        id: `booking-favorite-${payload.bookingId}`,
        description: "CleanZ đang tìm thợ Cao cấp khác gần bạn.",
      });
    },
    [invalidateBooking],
  );

  const handlePremiumExhausted = useCallback(
    (payload?: PremiumDispatchPayload | null) => {
      if (!payload) return;
      invalidateBooking(payload.bookingId);
      // Không tự hạ hạng đơn — đổi cam kết chất lượng là quyết định của khách.
      toast.warning("Chưa tìm được thợ Cao cấp phù hợp", {
        id: `booking-premium-exhausted-${payload.bookingId}`,
        duration: 10_000,
        description:
          "Đơn vẫn đang mở. Bạn có thể chờ thêm, chuyển sang gói Tiêu chuẩn hoặc hủy miễn phí trong trang chi tiết đơn.",
      });
    },
    [invalidateBooking],
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
  useSocketEvent<PremiumDispatchPayload>(
    "booking:favorite_invited",
    handleFavoriteInvited,
  );
  useSocketEvent<PremiumDispatchPayload>(
    "booking:favorite_unavailable",
    handleFavoriteUnavailable,
  );
  useSocketEvent<PremiumDispatchPayload>(
    "booking:premium_exhausted",
    handlePremiumExhausted,
  );

  const closeConfirmation = useCallback(
    () => setPendingConfirmation(null),
    [],
  );

  return (
    <RealtimeActionDialog
      open={pendingConfirmation !== null}
      icon={<CalendarCheck className="size-5" />}
      title={pendingConfirmation?.title ?? ""}
      description={pendingConfirmation?.content}
      confirmLabel="Xem & xác nhận"
      cancelLabel="Để sau"
      onConfirm={() => {
        closeConfirmation();
        if (pendingConfirmation) {
          router.push(`/customer/booking/${pendingConfirmation.bookingId}`);
        }
      }}
      onCancel={closeConfirmation}
    />
  );
}
