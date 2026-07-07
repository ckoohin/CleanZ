"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { CheckSquare } from "lucide-react";
import { useVerifyItems } from "../../hooks/useAdminIncident";
import { formatVnd } from "@/features/incident/shared/incident.labels";
import type {
  DamageItem,
  DamageItemVerificationStatus,
} from "@/features/incident/shared/incident.types";
import { FieldHint } from "@/features/incident/shared/_components/FieldHint";

type Outcome = "VERIFIED" | "REJECTED" | "NEED_MORE_EVIDENCE";
const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "VERIFIED", label: "Xác minh" },
  { value: "REJECTED", label: "Từ chối" },
  { value: "NEED_MORE_EVIDENCE", label: "Cần thêm b.chứng" },
];

function initOutcome(s: DamageItemVerificationStatus): Outcome {
  return s === "REJECTED" || s === "NEED_MORE_EVIDENCE" ? s : "VERIFIED";
}

/** Thẩm định thiệt hại từng hạng mục: kết luận (Xác minh/Từ chối/Cần thêm b.chứng) + số tiền xác minh. */
export function VerifyItemsPanel({ id, items }: { id: string; items: DamageItem[] }) {
  const verify = useVerifyItems(id);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.map((it) => [it.id, String(it.verifiedAmount ?? it.claimedAmount)]),
    ),
  );
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>(() =>
    Object.fromEntries(items.map((it) => [it.id, initOutcome(it.verificationStatus)])),
  );

  const itemInvalid = (it: DamageItem) => {
    if (outcomes[it.id] !== "VERIFIED") return false;
    const v = Number(values[it.id]);
    return !(Number.isInteger(v) && v >= 0 && v <= it.claimedAmount);
  };
  const invalid = items.some(itemInvalid);

  const handleSubmit = () =>
    verify.mutate({
      items: items.map((it) => {
        const status = outcomes[it.id];
        return {
          itemId: it.id,
          verifiedAmount: status === "VERIFIED" ? Number(values[it.id]) : 0,
          status,
        };
      }),
    });

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Thẩm định thiệt hại</p>
      <p className="rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2.5 text-[11px] leading-snug text-[var(--c-muted)]">
        Với mỗi hạng mục, chọn kết luận: <b>Xác minh</b> (nhập số tiền xác minh, số nguyên 0 – số yêu cầu),
        <b> Từ chối</b> (không bồi thường hạng mục này) hoặc <b>Cần thêm bằng chứng</b>. Chỉ được chốt quyết định
        khi <b>mọi hạng mục</b> đã Xác minh hoặc Từ chối (không còn Chờ/Cần thêm bằng chứng).
      </p>
      <div className="space-y-2">
        {items.map((it) => {
          const outcome = outcomes[it.id];
          return (
            <div key={it.id} className="rounded-lg border border-[var(--c-line)] p-2.5">
              <p className="text-sm">{it.description}</p>
              <p className="mb-1.5 text-xs text-[var(--c-muted)]">Yêu cầu: {formatVnd(it.claimedAmount)}</p>
              <div className="mb-1.5 grid grid-cols-3 gap-1">
                {OUTCOMES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOutcomes((p) => ({ ...p, [it.id]: o.value }))}
                    className={`rounded-md border px-1.5 py-1 text-[11px] font-medium transition ${
                      outcome === o.value
                        ? "border-[var(--c-primary-strong)] bg-[var(--c-primary)]/10 text-[var(--c-primary-strong)]"
                        : "border-[var(--c-line)] text-[var(--c-muted)] hover:text-[var(--c-ink)]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {outcome === "VERIFIED" && (
                <>
                  <Input
                    type="number"
                    min={0}
                    max={it.claimedAmount}
                    step={1}
                    value={values[it.id]}
                    onChange={(e) => setValues((p) => ({ ...p, [it.id]: e.target.value }))}
                    placeholder="Số tiền xác minh (VND)"
                    className="h-8 rounded-lg text-sm"
                    aria-label={`Xác minh - ${it.description}`}
                  />
                  <div className="mt-1">
                    <FieldHint
                      hint={`Số nguyên, 0 – ${formatVnd(it.claimedAmount)}`}
                      error={
                        itemInvalid(it)
                          ? `Phải là số nguyên từ 0 đến ${formatVnd(it.claimedAmount)} (không vượt số yêu cầu)`
                          : undefined
                      }
                    />
                  </div>
                </>
              )}
              {outcome === "REJECTED" && (
                <FieldHint hint="Hạng mục bị từ chối — số tiền xác minh = 0, không được duyệt tiền." />
              )}
              {outcome === "NEED_MORE_EVIDENCE" && (
                <FieldHint hint="Cần thêm bằng chứng — hạng mục chưa quyết được, sẽ chặn chốt quyết định." />
              )}
            </div>
          );
        })}
      </div>
      <AdminButton size="sm" variant="secondary" className="w-full rounded-lg gap-1.5" onClick={handleSubmit} disabled={invalid || verify.isPending}>
        <CheckSquare className="size-3.5" /> {verify.isPending ? "Đang lưu..." : "Lưu thẩm định"}
      </AdminButton>
    </section>
  );
}
