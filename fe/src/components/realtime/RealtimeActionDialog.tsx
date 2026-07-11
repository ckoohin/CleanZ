"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Clock3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RealtimeActionDialogProps {
  open: boolean;
  icon?: ReactNode;
  title: string;
  description?: string | null;
  confirmLabel: string;
  cancelLabel?: string;
  /** Tự đóng (coi như hủy) sau N ms — dùng cho lời mời có thời hạn như dispatch. */
  autoCloseMs?: number;
  /** Reset thời hạn khi một realtime event mới thay thế event đang hiển thị. */
  autoCloseKey?: string | number;
  showCountdown?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function AutoCloseTimer({
  durationMs,
  showCountdown,
  onExpire,
}: {
  durationMs: number;
  showCountdown: boolean;
  onExpire: () => void;
}) {
  const deadlineRef = useRef<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.ceil(durationMs / 1000)),
  );

  useEffect(() => {
    deadlineRef.current = Date.now() + durationMs;
    const timer = window.setInterval(() => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        window.clearInterval(timer);
        setRemainingSeconds(0);
        onExpire();
        return;
      }
      setRemainingSeconds(Math.ceil(remainingMs / 1000));
    }, 250);

    return () => window.clearInterval(timer);
  }, [durationMs, onExpire]);

  if (!showCountdown) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700"
      role="timer"
      aria-live="polite"
    >
      <Clock3 className="size-4 shrink-0" />
      <span>
        Còn <strong>{remainingSeconds} giây</strong> để phản hồi
      </span>
    </div>
  );
}

/**
 * Modal giữa màn hình cho các thông báo realtime cần người dùng
 * xác nhận hoặc hủy (mời nhận đơn, đơn chờ xác nhận...).
 * Dùng chung để UI đồng nhất giữa các luồng booking — thay cho toast có nút.
 */
export function RealtimeActionDialog({
  open,
  icon,
  title,
  description,
  confirmLabel,
  cancelLabel = "Để sau",
  autoCloseMs,
  autoCloseKey,
  showCountdown = false,
  onConfirm,
  onCancel,
}: RealtimeActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            {icon ? (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {icon}
              </div>
            ) : null}
            <AlertDialogTitle className="text-lg font-bold">
              {title}
            </AlertDialogTitle>
          </div>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
          {open && autoCloseMs ? (
            <AutoCloseTimer
              key={autoCloseKey}
              durationMs={autoCloseMs}
              showCountdown={showCountdown}
              onExpire={onCancel}
            />
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
