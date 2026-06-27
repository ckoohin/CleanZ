"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { CheckSquare } from "lucide-react";
import { useVerifyItems } from "../../hooks/useAdminIncident";
import { formatVnd } from "@/features/incident/shared/incident.labels";
import type { DamageItem } from "@/features/incident/shared/incident.types";

/** Xác minh thiệt hại: nhập verifiedAmount từng item (0 ≤ verified ≤ claimed). */
export function VerifyItemsPanel({ id, items }: { id: string; items: DamageItem[] }) {
  const verify = useVerifyItems(id);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.map((it) => [it.id, String(it.verifiedAmount ?? it.claimedAmount)]),
    ),
  );

  const invalid = items.some((it) => {
    const v = Number(values[it.id]);
    return !(Number.isInteger(v) && v >= 0 && v <= it.claimedAmount);
  });

  const handleSubmit = () =>
    verify.mutate({
      items: items.map((it) => ({ itemId: it.id, verifiedAmount: Number(values[it.id]) })),
    });

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Xác minh thiệt hại</p>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="rounded-lg border border-[var(--c-line)] p-2.5">
            <p className="text-sm">{it.description}</p>
            <p className="mb-1 text-xs text-[var(--c-muted)]">Yêu cầu: {formatVnd(it.claimedAmount)}</p>
            <Input
              type="number"
              min={0}
              max={it.claimedAmount}
              value={values[it.id]}
              onChange={(e) => setValues((p) => ({ ...p, [it.id]: e.target.value }))}
              placeholder="Số tiền xác minh (VND)"
              className="h-8 rounded-lg text-sm"
              aria-label={`Xác minh - ${it.description}`}
            />
          </div>
        ))}
      </div>
      <AdminButton size="sm" variant="secondary" className="w-full rounded-lg gap-1.5" onClick={handleSubmit} disabled={invalid || verify.isPending}>
        <CheckSquare className="size-3.5" /> {verify.isPending ? "Đang lưu..." : "Lưu xác minh"}
      </AdminButton>
    </section>
  );
}
