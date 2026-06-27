"use client";

import React, { useMemo, useState } from "react";
import { AdminButton } from "@/components/admin";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useChangeTicketStatus } from "../../hooks/useSupportTicket";
import type { TicketAdminDetail, TicketStatus } from "../../types/support-ticket.types";
import {
  nextStatuses,
  requiresPendingReason,
  canResolve,
} from "@/features/support-tickets/shared/ticket.machine";
import { STATUS_LABEL, PENDING_REASON_LABEL } from "@/features/support-tickets/shared/ticket.labels";
import { PENDING_REASON, type PendingReason } from "@/features/support-tickets/shared/ticket.enums";

/**
 * Đổi trạng thái theo state machine (mirror BE).
 * - Chỉ liệt kê trạng thái đích hợp lệ `nextStatuses(current)`.
 * - `PENDING` ⇒ bắt buộc `pendingReason`.
 * - `RESOLVED` ⇒ gate `canResolve` (category≠OTHER + ≥1 resolution).
 */
export function StatusChangePanel({ ticket }: { ticket: TicketAdminDetail }) {
  const changeStatus = useChangeTicketStatus(ticket.id);
  const [target, setTarget] = useState<TicketStatus | "">("");
  const [pendingReason, setPendingReason] = useState<PendingReason | "">("");
  const [note, setNote] = useState("");

  const options = useMemo(() => nextStatuses(ticket.status), [ticket.status]);
  const resolveGate = useMemo(() => canResolve(ticket), [ticket]);

  const needReason = target ? requiresPendingReason(target) : false;
  const resolveBlocked = target === "RESOLVED" && !resolveGate.ok;
  const disabled =
    !target ||
    (needReason && !pendingReason) ||
    resolveBlocked ||
    changeStatus.isPending;

  const handleSubmit = () => {
    if (!target) return;
    changeStatus.mutate(
      {
        status: target,
        ...(needReason && pendingReason ? { pendingReason } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: () => {
          setTarget("");
          setPendingReason("");
          setNote("");
        },
      },
    );
  };

  return (
    <section className="space-y-2" aria-labelledby="status-panel-title">
      <p id="status-panel-title" className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide">
        Đổi trạng thái
      </p>

      {options.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)] rounded-lg bg-[var(--c-card-2)] border border-[var(--c-line)] p-2.5">
          Ticket đã đóng — không thể đổi trạng thái.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs text-[var(--c-muted)]">
            <span className="font-semibold text-[var(--c-ink-soft)]">{STATUS_LABEL[ticket.status]}</span>
            <ArrowRight className="w-3 h-3" />
            <Select value={target} onValueChange={(v) => setTarget(v as TicketStatus)}>
              <SelectTrigger className="flex-1 h-9 rounded-lg text-sm border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]" aria-label="Trạng thái đích">
                <SelectValue placeholder="Chọn trạng thái mới..." />
              </SelectTrigger>
              <SelectContent className="cz-admin">
                {options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needReason && (
            <Select value={pendingReason} onValueChange={(v) => setPendingReason(v as PendingReason)}>
              <SelectTrigger className="h-9 rounded-lg text-sm w-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]" aria-label="Lý do tạm chờ">
                <SelectValue placeholder="Lý do tạm chờ (bắt buộc)..." />
              </SelectTrigger>
              <SelectContent className="cz-admin">
                {PENDING_REASON.map((r) => (
                  <SelectItem key={r} value={r}>
                    {PENDING_REASON_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {resolveBlocked && (
            <p className="flex items-start gap-1.5 text-xs text-[#D97706]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {resolveGate.reason}
            </p>
          )}

          <Textarea
            placeholder="Ghi chú (tuỳ chọn)..."
            className="text-sm resize-none rounded-lg bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <AdminButton variant="primary" size="md" className="w-full rounded-lg" onClick={handleSubmit} disabled={disabled}>
            {changeStatus.isPending ? "Đang cập nhật..." : "Cập nhật trạng thái"}
          </AdminButton>
        </>
      )}
    </section>
  );
}
