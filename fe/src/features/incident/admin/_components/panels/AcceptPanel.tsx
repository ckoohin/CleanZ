"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import { useAcceptIncident } from "../../hooks/useAdminIncident";
import { SEVERITY_OPTIONS } from "@/features/incident/shared/incident.labels";
import type { Severity } from "@/features/incident/shared/incident.enums";

/** Tiếp nhận thẩm định: REPORTED → INVESTIGATING, gán severity, HOLD cọc, mời đối chất. */
export function AcceptPanel({ id, defaultSeverity }: { id: string; defaultSeverity: Severity }) {
  const accept = useAcceptIncident(id);
  const [severity, setSeverity] = useState<Severity>(defaultSeverity);

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">Tiếp nhận thẩm định</p>
      <div className="flex gap-2">
        <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
          <SelectTrigger className="h-9 flex-1 rounded-lg border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-sm text-[var(--c-ink)]" aria-label="Mức độ nghiêm trọng">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="cz-admin bg-[var(--c-card)] text-[var(--c-ink)]">
            {SEVERITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AdminButton
          variant="primary"
          size="sm"
          className="rounded-lg gap-1.5"
          onClick={() => accept.mutate({ severity })}
          disabled={accept.isPending}
        >
          <ShieldCheck className="size-3.5" /> {accept.isPending ? "..." : "Tiếp nhận"}
        </AdminButton>
      </div>
      <p className="text-[11px] text-[var(--c-muted)]">Hệ thống sẽ tạm giữ cọc Tasker và mời đối chất.</p>
    </section>
  );
}
