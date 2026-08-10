"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  CheckCheck,
  Gift,
  LifeBuoy,
  ShieldAlert,
  Wallet,
  UserRoundX,
} from "lucide-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationList,
  useNotificationRealtime,
  useUnreadCount,
} from "../useNotifications";
import type { AppNotification, NotificationType } from "../types";

function fmtTime(d: string) {
  const dt = new Date(d);
  const diff = Date.now() - dt.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return dt.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ICON: Record<NotificationType, React.ElementType> = {
  BOOKING_NEW_AVAILABLE: CalendarCheck,
  BOOKING_PENDING_CONFIRMATION: CalendarCheck,
  BOOKING_CONFIRMED: CalendarCheck,
  TASKER_ON_THE_WAY: CalendarCheck,
  BOOKING_COMPLETED: CalendarCheck,
  BOOKING_CANCELLED: CalendarCheck,
  BOOKING_ABSENCE_REPORTED: UserRoundX,
  BOOKING_ABSENCE_APPROVED: UserRoundX,
  BOOKING_ABSENCE_REJECTED: UserRoundX,
  BOOKING_ABSENCE_EXPIRED: UserRoundX,
  PAYMENT_SUCCESS: Wallet,
  PAYMENT_FAILED: Wallet,
  INCIDENT_UPDATE: ShieldAlert,
  SUPPORT_REPLY: LifeBuoy,
  PROMOTION: Gift,
  SYSTEM: Bell,
};

interface NotificationInboxProps {
  /** Tiền tố route theo role, vd "/customer" hoặc "/tasker". */
  basePath: string;
  /** Segment xem đơn của role: customer="booking", tasker="jobs". */
  bookingSegment?: string;
  incidentSegment?: string;
  enableRealtime?: boolean;
  showBackButton?: boolean;
}

export const NotificationInbox: React.FC<NotificationInboxProps> = ({
  basePath,
  bookingSegment = "booking",
  incidentSegment = "incident",
  enableRealtime = true,
  showBackButton = true,
}) => {
  // referenceType → route theo role (chỉ điều hướng các đích đã có trang).
  const hrefFor = (n: AppNotification): string | null => {
    if (!n.referenceId) return null;
    switch (n.referenceType) {
      case "SUPPORT_TICKET":
        return `${basePath}/support-tickets/${n.referenceId}`;
      case "BOOKING":
        return `${basePath}/${bookingSegment}/${n.referenceId}`;
      case "INCIDENT":
        return `${basePath}/${incidentSegment}/${n.referenceId}`;
      default:
        return null;
    }
  };

  const router = useRouter();
  const { data, isLoading } = useNotificationList({ limit: 30 });
  const { data: unread } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  useNotificationRealtime(enableRealtime);

  const items = data?.data ?? [];
  const unreadCount = unread?.count ?? 0;

  const onOpen = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const href = hrefFor(n);
    if (href) router.push(href);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5 pb-32 md:px-6 md:py-8">
      {/* Header */}
      <div>
        {showBackButton && (
          <button
            onClick={() => router.back()}
            className="mb-4 -ml-2 flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Quay lại"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Quay lại
          </button>
        )}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Thông báo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : "Cập nhật đơn hàng, thanh toán và hỗ trợ."}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" aria-hidden="true" /> Đọc tất cả
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-border/50 bg-card"
            />
          ))
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <Bell className="mx-auto size-10 text-muted-foreground/40" />
            <p className="mt-3 font-bold text-foreground">
              Chưa có thông báo nào
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cập nhật về đơn hàng và tài khoản sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          items.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => onOpen(n)}
                className={`flex min-h-16 w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition-colors ${
                  n.isRead
                    ? "border-border/70 bg-card hover:bg-muted/40"
                    : "border-primary/30 bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    n.isRead
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm font-bold text-foreground">
                      {n.title}
                    </span>
                    {!n.isRead && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </span>
                  {n.content && (
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                      {n.content}
                    </span>
                  )}
                  <span className="mt-1 block text-[10px] text-muted-foreground/70">
                    {fmtTime(n.createdAt)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
