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
  BOOKING_CONFIRMED: CalendarCheck,
  TASKER_ON_THE_WAY: CalendarCheck,
  BOOKING_COMPLETED: CalendarCheck,
  BOOKING_CANCELLED: CalendarCheck,
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
}

export const NotificationInbox: React.FC<NotificationInboxProps> = ({
  basePath,
  bookingSegment = "booking",
  incidentSegment = "incident",
  enableRealtime = true,
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
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card px-4 pb-3 pt-12 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Thông báo</h1>
            {unreadCount > 0 && (
              <p className="text-[11px] text-primary">
                {unreadCount} thông báo chưa đọc
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Đọc tất cả
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2 px-4 py-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-border/50 bg-card"
            />
          ))
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Chưa có thông báo nào
            </p>
          </div>
        ) : (
          items.map((n) => {
            const Icon = ICON[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                onClick={() => onOpen(n)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                  n.isRead
                    ? "border-border/40 bg-card"
                    : "border-primary/30 bg-primary/5"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    n.isRead ? "bg-muted" : "bg-primary/15"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${n.isRead ? "text-muted-foreground" : "text-primary"}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 truncate text-sm font-semibold text-foreground">
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  {n.content && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.content}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {fmtTime(n.createdAt)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
