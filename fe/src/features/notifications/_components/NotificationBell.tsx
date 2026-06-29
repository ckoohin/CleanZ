"use client";

import React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationRealtime, useUnreadCount } from "../useNotifications";

interface NotificationBellProps {
  href: string;
  className?: string;
  enableRealtime?: boolean;
}
export const NotificationBell: React.FC<NotificationBellProps> = ({
  href,
  className,
  enableRealtime = true,
}) => {
  const { data } = useUnreadCount();
  useNotificationRealtime(enableRealtime);
  const count = data?.count ?? 0;

  return (
    <Link
      href={href}
      aria-label={`Thông báo${count > 0 ? ` (${count} chưa đọc)` : ""}`}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[9px] font-bold leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
};
