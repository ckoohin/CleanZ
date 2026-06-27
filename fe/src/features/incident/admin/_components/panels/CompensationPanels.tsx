"use client";

import React, { useState } from "react";
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
import { BadgeCheck, Banknote, AlertTriangle } from "lucide-react";
import { useApproveCompensation, useCompensate } from "../../hooks/useAdminIncident";
import { formatVnd } from "@/features/incident/shared/incident.labels";

/** Duyệt cấp 2 (maker-checker) — checker phải khác người điều tra (BE chốt 409). */
export function ApproveCompensationPanel({ id }: { id: string }) {
  const approve = useApproveCompensation(id);
  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Duyệt cấp 2 (maker-checker)</p>
      <p className="text-[11px] text-[var(--c-muted)]">
        Khoản ≥ ngưỡng cần admin thứ hai duyệt (khác người điều tra). Sau duyệt sẽ vào thời gian cooling.
      </p>
      <AdminButton
        variant="primary"
        size="sm"
        className="w-full rounded-lg gap-1.5"
        onClick={() => approve.mutate({ confirm: true })}
        disabled={approve.isPending}
      >
        <BadgeCheck className="size-3.5" /> {approve.isPending ? "..." : "Xác nhận duyệt cấp 2"}
      </AdminButton>
    </section>
  );
}

/** Thực thi bồi thường — TIỀN THẬT, có confirm, disable khi pending; idempotent ở BE. */
export function CompensatePanel({
  id,
  amount,
  blockedReason,
}: {
  id: string;
  amount: number | null;
  blockedReason?: string;
}) {
  const compensate = useCompensate(id);
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Thực thi bồi thường</p>
      {blockedReason ? (
        <p className="flex items-start gap-1 rounded-lg bg-[rgba(217,119,6,0.14)] border border-[var(--c-line)] p-2.5 text-xs text-[#D97706]">
          <AlertTriangle className="mt-px size-3.5 shrink-0" /> {blockedReason}
        </p>
      ) : (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <AdminButton variant="primary" size="sm" className="w-full rounded-lg gap-1.5" disabled={compensate.isPending}>
              <Banknote className="size-3.5" /> Bồi thường {formatVnd(amount)}
            </AdminButton>
          </AlertDialogTrigger>
          <AlertDialogContent className="cz-admin rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-[var(--c-ink)]">Xác nhận bồi thường?</AlertDialogTitle>
              <AlertDialogDescription className="text-[var(--c-muted)]">
                Thao tác thực thi giao dịch tiền (trừ cọc Tasker, hoàn ví khách) và <b>không thể hoàn tác</b>.
                Số tiền: <b>{formatVnd(amount)}</b>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => compensate.mutate(undefined, { onSuccess: () => setOpen(false) })}
                disabled={compensate.isPending}
              >
                {compensate.isPending ? "Đang xử lý..." : "Xác nhận"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  );
}
