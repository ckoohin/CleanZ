"use client";

import { useEffect, type ReactNode } from "react";
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
  onConfirm: () => void;
  onCancel: () => void;
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
  onConfirm,
  onCancel,
}: RealtimeActionDialogProps) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const timer = setTimeout(onCancel, autoCloseMs);
    return () => clearTimeout(timer);
  }, [open, autoCloseMs, onCancel]);

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
