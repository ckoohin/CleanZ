"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellDot,
  CheckCheck,
  ChevronRight,
  Clock,
  CreditCard,
  Gift,
  Headphones,
  Loader2,
  Megaphone,
  RefreshCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useCustomerNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "../hooks/useCustomerNotifications";
import type {
  NotificationItem,
  NotificationQueryParams,
  NotificationType,
} from "../types/notification.types";

type NotificationTab = "all" | "unread" | "read";

const PAGE_SIZE = 12;

const TAB_CONFIG: Array<{
  key: NotificationTab;
  label: string;
  isRead?: boolean;
}> = [
  { key: "all", label: "Tất cả" },
  { key: "unread", label: "Chưa đọc", isRead: false },
  { key: "read", label: "Đã đọc", isRead: true },
];

const TYPE_LABELS: Record<NotificationType, string> = {
  BOOKING_NEW_AVAILABLE: "Đơn mới",
  BOOKING_CONFIRMED: "Booking",
  TASKER_ON_THE_WAY: "Tasker",
  BOOKING_COMPLETED: "Hoàn thành",
  BOOKING_CANCELLED: "Đã hủy",
  PAYMENT_SUCCESS: "Thanh toán",
  PAYMENT_FAILED: "Thanh toán",
  INCIDENT_UPDATE: "Sự cố",
  SUPPORT_REPLY: "Hỗ trợ",
  PROMOTION: "Ưu đãi",
  SYSTEM: "Hệ thống",
};

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  BOOKING_NEW_AVAILABLE: BellDot,
  BOOKING_CONFIRMED: BellDot,
  TASKER_ON_THE_WAY: BellDot,
  BOOKING_COMPLETED: BellDot,
  BOOKING_CANCELLED: BellDot,
  PAYMENT_SUCCESS: CreditCard,
  PAYMENT_FAILED: CreditCard,
  INCIDENT_UPDATE: Sparkles,
  SUPPORT_REPLY: Headphones,
  PROMOTION: Gift,
  SYSTEM: Megaphone,
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getNotificationHref(notification: NotificationItem): string | null {
  if (!notification.referenceId || !notification.referenceType) {
    return null;
  }

  if (notification.referenceType === "BOOKING") {
    return `/customer/booking/${notification.referenceId}`;
  }

  if (notification.referenceType === "SUPPORT_TICKET") {
    return `/customer/support-tickets/${notification.referenceId}`;
  }

  if (notification.referenceType === "INCIDENT") {
    return `/customer/incident/${notification.referenceId}`;
  }

  return null;
}

function NotificationCard({
  notification,
  onOpen,
  isOpening,
}: {
  notification: NotificationItem;
  onOpen: (notification: NotificationItem) => void;
  isOpening: boolean;
}) {
  const Icon = TYPE_ICONS[notification.type];
  const href = getNotificationHref(notification);

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        "group w-full rounded-3xl border bg-card p-4 text-left shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
        notification.isRead
          ? "border-border/60 opacity-80"
          : "border-primary/30 bg-primary/[0.035]",
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            notification.isRead
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                    notification.isRead
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {TYPE_LABELS[notification.type]}
                </span>
                {!notification.isRead && (
                  <span className="h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
              <h2 className="line-clamp-2 text-sm font-black text-foreground sm:text-base">
                {notification.title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
              {isOpening ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    href && "group-hover:translate-x-0.5",
                  )}
                />
              )}
            </div>
          </div>

          {notification.content && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {notification.content}
            </p>
          )}

          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDateTime(notification.createdAt)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function CustomerNotificationsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<NotificationTab>("all");
  const [page, setPage] = useState(1);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const params = useMemo<NotificationQueryParams>(() => {
    const activeTab = TAB_CONFIG.find((item) => item.key === tab);
    return {
      page,
      limit: PAGE_SIZE,
      ...(activeTab?.isRead !== undefined ? { isRead: activeTab.isRead } : {}),
    };
  }, [page, tab]);

  const { data, isLoading, isFetching, refetch } =
    useCustomerNotifications(params);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.data ?? [];
  const meta = data?.meta;
  const hasNotifications = notifications.length > 0;

  const handleChangeTab = (nextTab: NotificationTab) => {
    setTab(nextTab);
    setPage(1);
  };

  const handleOpen = (notification: NotificationItem) => {
    const href = getNotificationHref(notification);
    setOpeningId(notification.id);

    const openTarget = () => {
      setOpeningId(null);
      if (href) {
        router.push(href);
      }
    };

    if (!notification.isRead) {
      markRead.mutate(notification.id, {
        onSettled: openTarget,
      });
      return;
    }

    openTarget();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background px-4 pb-28 pt-6 md:px-8 md:pb-16 md:pt-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <section className="rounded-[2rem] border border-primary/15 bg-card/90 p-5 shadow-xl shadow-primary/5 backdrop-blur md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary">
                  Trung tâm thông báo
                </p>
                <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
                  Thông báo của bạn
                </h1>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-2xl"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCcw
                  className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
                />
                Làm mới
              </Button>
              <Button
                className="h-11 rounded-2xl"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="mr-2 h-4 w-4" />
                )}
                <span className="hidden sm:inline">Đánh dấu tất cả</span>
                <span className="sm:hidden">Đã đọc</span>
              </Button>
            </div>
          </div>
        </section>

        <div className="sticky top-[72px] z-10 -mx-4 border-y border-border/60 bg-background/85 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-3xl md:border md:bg-card/80">
          <div className="grid grid-cols-3 gap-2">
            {TAB_CONFIG.map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleChangeTab(item.key)}
                  className={cn(
                    "h-11 rounded-2xl text-xs font-black transition-all sm:text-sm",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <section className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-3xl border border-border/50 bg-card"
              />
            ))
          ) : hasNotifications ? (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onOpen={handleOpen}
                isOpening={
                  openingId === notification.id && markRead.isPending
                }
              />
            ))
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-border bg-card/70 p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
                <Bell className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-black text-foreground">
                Chưa có thông báo
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Các cập nhật về booking, thanh toán và hỗ trợ sẽ xuất hiện ở
                đây.
              </p>
            </div>
          )}
        </section>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between rounded-3xl border border-border/60 bg-card p-3">
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
            >
              Trước
            </Button>
            <p className="text-xs font-bold text-muted-foreground">
              Trang {meta.page}/{meta.totalPages}
            </p>
            <Button
              variant="outline"
              className="rounded-2xl"
              disabled={page >= meta.totalPages || isFetching}
              onClick={() =>
                setPage((current) => Math.min(current + 1, meta.totalPages))
              }
            >
              Sau
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
