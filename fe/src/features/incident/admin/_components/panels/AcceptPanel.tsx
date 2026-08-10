"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { ShieldCheck } from "lucide-react";
import { useAcceptIncident } from "../../hooks/useAdminIncident";
import {
  SEVERITY_LABEL,
  STATUS_LABEL,
} from "@/features/incident/shared/incident.labels";
import type { Severity } from "@/features/incident/shared/incident.enums";


export function AcceptPanel({ id, severity }: { id: string; severity: Severity }) {
  const accept = useAcceptIncident(id);
  const [note, setNote] = useState("");

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Tiếp nhận xử lý</p>
      <p className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5 text-[11px] leading-snug text-[var(--c-muted)]">
        Mức độ nghiêm trọng <b>do hệ thống tự xác định</b> (theo loại sự cố + tổng số tiền yêu cầu) và
        không chỉnh tay được. Khi tiếp nhận, sự cố chuyển sang <b>{STATUS_LABEL.REVIEWING}</b>, ví Tasker bị giữ tạm và Tasker bắt đầu được tính hạn giải trình.
      </p>
      <div className="flex items-center gap-2 text-xs text-[var(--c-muted)]">
        <span>Mức độ nghiêm trọng:</span>
        <span className="font-semibold text-[var(--c-ink)]">{SEVERITY_LABEL[severity] ?? severity}</span>
      </div>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú tiếp nhận (tuỳ chọn)"
        maxLength={500}
        className="h-9 rounded-lg text-sm"
        aria-label="Ghi chú tiếp nhận"
      />
      <AdminButton
        variant="primary"
        size="sm"
        className="w-full rounded-lg gap-1.5"
        onClick={() => accept.mutate(note.trim() ? { note: note.trim() } : {})}
        disabled={accept.isPending}
      >
        <ShieldCheck className="size-3.5" /> {accept.isPending ? "Đang tiếp nhận..." : "Tiếp nhận"}
      </AdminButton>
    </section>
  );
}
