"use client";

import React from "react";
import { AdminButton } from "@/components/admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Unlock } from "lucide-react";
import { useUnlockReporter } from "../hooks/useAdminIncident";

interface Props {
  id: string;
  customerName?: string | null;
  /** Mốc khoá quyền báo cáo của khách; null = khách không bị khoá. */
  lockedUntil: string | null;
}

/**
 * Gỡ khoá quyền báo cáo cho khách hàng của sự cố (khoá do bị đánh dấu báo cáo
 * sai nhiều lần). Khoá nằm ở CẤP KHÁCH HÀNG chứ không phải cấp sự cố, nên gỡ ở đây
 * mở lại quyền báo cáo cho mọi đơn của họ — đủ nặng để phải xác nhận, và không
 * hiện ra khi khách vốn không bị khoá.
 */
export function UnlockReporterButton({ id, customerName, lockedUntil }: Props) {
  const unlock = useUnlockReporter(id);
  const [open, setOpen] = React.useState(false);

  if (!lockedUntil) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <AdminButton
          size="sm"
          variant="secondary"
          className="w-full rounded-lg gap-1.5"
          disabled={unlock.isPending}
        >
          <Unlock className="size-3.5" />
          {unlock.isPending
            ? "Đang gỡ khoá..."
            : "Gỡ khoá quyền báo cáo (khách)"}
        </AdminButton>
      </AlertDialogTrigger>
      <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--c-ink)]">
            Gỡ khoá quyền báo cáo?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-[var(--c-muted)]">
              <p>
                Khách hàng{customerName ? ` ${customerName}` : ""} đang bị khoá
                quyền báo cáo sự cố do bị đánh dấu báo cáo sai nhiều lần.
              </p>
              <p className="text-xs">
                Gỡ khoá áp dụng cho <b>toàn bộ tài khoản của khách</b>, không
                riêng sự cố này. Các lần báo cáo sai đã ghi nhận vẫn giữ nguyên,
                nên khách có thể bị khoá lại nếu tiếp tục báo cáo sai.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              unlock.mutate(undefined, { onSuccess: () => setOpen(false) })
            }
            disabled={unlock.isPending}
          >
            {unlock.isPending ? "Đang xử lý..." : "Xác nhận gỡ khoá"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
