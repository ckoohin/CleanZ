"use client";

import React, { useMemo, useState } from "react";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, X } from "lucide-react";
import { useDecideIncident } from "../../hooks/useAdminIncident";
import { formatVnd } from "@/features/incident/shared/incident.labels";
import { checkAllocation } from "@/features/incident/shared/incident.machine";
import { POLICY_CAP } from "@/features/incident/shared/incident.enums";
import type { DamageItem } from "@/features/incident/shared/incident.types";

/** Quyết định: APPROVE (phân bổ bất biến = Σapproved, ≤ cap) hoặc REJECT (kèm lý do/fraud). */
export function DecisionPanel({ id, items }: { id: string; items: DamageItem[] }) {
  const decide = useDecideIncident(id);
  const [mode, setMode] = useState<"APPROVE" | "REJECT">("APPROVE");

  // APPROVE state
  const [approved, setApproved] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.map((it) => [it.id, String(it.verifiedAmount ?? it.claimedAmount)]),
    ),
  );
  const [taskerBorne, setTaskerBorne] = useState("");
  const [platformBorne, setPlatformBorne] = useState("");
  const [allocationReason, setAllocationReason] = useState("");

  // REJECT state
  const [reason, setReason] = useState("");
  const [rejectAsFraud, setRejectAsFraud] = useState(false);

  const sumApproved = useMemo(
    () => items.reduce((s, it) => s + (Number(approved[it.id]) || 0), 0),
    [items, approved],
  );

  const approvedValid = items.every((it) => {
    const a = Number(approved[it.id]);
    const ceil = it.verifiedAmount ?? it.claimedAmount;
    return Number.isInteger(a) && a >= 0 && a <= ceil;
  });
  const overCap = sumApproved > POLICY_CAP;
  const alloc = checkAllocation(sumApproved, Number(taskerBorne) || 0, Number(platformBorne) || 0);
  const isMixedOrPlatform = (Number(platformBorne) || 0) > 0;

  const approveDisabled =
    !approvedValid ||
    sumApproved <= 0 ||
    overCap ||
    !alloc.ok ||
    (isMixedOrPlatform && !allocationReason.trim()) ||
    decide.isPending;

  const submitApprove = () =>
    decide.mutate({
      decision: "APPROVE",
      items: items.map((it) => ({ itemId: it.id, approvedAmount: Number(approved[it.id]) })),
      taskerBorneAmount: Number(taskerBorne) || 0,
      platformBorneAmount: Number(platformBorne) || 0,
      ...(allocationReason.trim() ? { allocationReason: allocationReason.trim() } : {}),
    });

  const submitReject = () =>
    decide.mutate({
      decision: "REJECT",
      reason: reason.trim(),
      ...(rejectAsFraud ? { rejectAsFraud: true } : {}),
    });

  return (
    <section className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Quyết định</p>

      <div className="grid grid-cols-2 gap-2">
        <AdminButton size="sm" variant={mode === "APPROVE" ? "primary" : "secondary"} className="rounded-lg gap-1.5" onClick={() => setMode("APPROVE")}>
          <Check className="size-3.5" /> Duyệt
        </AdminButton>
        <AdminButton size="sm" variant={mode === "REJECT" ? "danger" : "secondary"} className="rounded-lg gap-1.5" onClick={() => setMode("REJECT")}>
          <X className="size-3.5" /> Từ chối
        </AdminButton>
      </div>

      {mode === "APPROVE" ? (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border border-[var(--c-line)] p-2.5">
              <p className="text-sm">{it.description}</p>
              <p className="mb-1 text-xs text-[var(--c-muted)]">
                Yêu cầu {formatVnd(it.claimedAmount)} · Xác minh {formatVnd(it.verifiedAmount)}
              </p>
              <Input
                type="number"
                min={0}
                max={it.verifiedAmount ?? it.claimedAmount}
                value={approved[it.id]}
                onChange={(e) => setApproved((p) => ({ ...p, [it.id]: e.target.value }))}
                placeholder="Số tiền duyệt (VND)"
                className="h-8 rounded-lg text-sm"
                aria-label={`Duyệt - ${it.description}`}
              />
            </div>
          ))}

          <div className="rounded-lg bg-[var(--c-card-2)] p-2.5 text-sm">
            Tổng duyệt: <b>{formatVnd(sumApproved)}</b>
            {overCap && (
              <span className="ml-2 text-[#E11D48]">Vượt trần {formatVnd(POLICY_CAP)}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--c-ink)]">Tasker chịu</Label>
              <Input type="number" min={0} value={taskerBorne} onChange={(e) => setTaskerBorne(e.target.value)} className="h-8 rounded-lg text-sm" placeholder="VND" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--c-ink)]">Quỹ chịu</Label>
              <Input type="number" min={0} value={platformBorne} onChange={(e) => setPlatformBorne(e.target.value)} className="h-8 rounded-lg text-sm" placeholder="VND" />
            </div>
          </div>
          {!alloc.ok && (taskerBorne || platformBorne) && (
            <p className="flex items-start gap-1 text-xs text-[#D97706]">
              <AlertTriangle className="mt-px size-3.5 shrink-0" /> {alloc.reason}
            </p>
          )}
          {isMixedOrPlatform && (
            <Textarea
              value={allocationReason}
              onChange={(e) => setAllocationReason(e.target.value)}
              rows={2}
              placeholder="Lý do phân bổ (bắt buộc khi quỹ chịu một phần)..."
              className="resize-none rounded-lg text-sm"
            />
          )}

          <AdminButton variant="primary" size="sm" className="w-full rounded-lg" onClick={submitApprove} disabled={approveDisabled}>
            {decide.isPending ? "Đang gửi..." : "Duyệt bồi thường"}
          </AdminButton>
        </div>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Lý do từ chối (khách hàng sẽ thấy)..."
            className="resize-none rounded-lg text-sm"
          />
          <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--c-line)] p-2.5 text-sm">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#E11D48]" /> Đánh dấu khai gian (+1 strike)
            </span>
            <Switch checked={rejectAsFraud} onCheckedChange={setRejectAsFraud} aria-label="Khai gian" />
          </label>
          <AdminButton size="sm" variant="danger" className="w-full rounded-lg border border-[#E11D48]/30" onClick={submitReject} disabled={!reason.trim() || decide.isPending}>
            {decide.isPending ? "Đang gửi..." : "Từ chối"}
          </AdminButton>
        </div>
      )}
    </section>
  );
}
