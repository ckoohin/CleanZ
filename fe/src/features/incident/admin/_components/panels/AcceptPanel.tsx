"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tiếp nhận thẩm định</p>
      <div className="flex gap-2">
        <Select value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
          <SelectTrigger className="h-9 flex-1 rounded-lg text-sm" aria-label="Mức độ nghiêm trọng">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="rounded-lg gap-1.5"
          onClick={() => accept.mutate({ severity })}
          disabled={accept.isPending}
        >
          <ShieldCheck className="size-3.5" /> {accept.isPending ? "..." : "Tiếp nhận"}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Hệ thống sẽ tạm giữ cọc Tasker và mời đối chất.</p>
    </section>
  );
}
