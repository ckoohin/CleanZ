"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useIncidentConfig, useUpdateIncidentConfig } from "../hooks/useAdminIncident";
import { INCIDENT_CONFIG_META } from "@/features/incident/shared/incident.labels";
import { SevereCriteriaEditor } from "./config/SevereCriteriaEditor";
import { SlaMatrixEditor } from "./config/SlaMatrixEditor";

const STRUCTURED_KEYS = new Set(["INCIDENT_SEVERE_CRITERIA", "INCIDENT_SLA_MATRIX"]);

/**
 * Cấu hình incident — editor key→value (BE trả Record<string,string|null>).
 * Chỉ gửi các key đã chỉnh sửa (FR-H2 — đổi runtime).
 */
export function IncidentConfigForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, isLoading } = useIncidentConfig();
  const update = useUpdateIncidentConfig();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (data && open) {
      setDraft(
        Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])),
      );
    }
  }, [data, open]);

  const keys = data ? Object.keys(data) : [];

  const handleSubmit = () => {
    if (!data) return;
    // Chỉ gửi key có thay đổi so với giá trị gốc
    const changed: Record<string, string> = {};
    for (const k of keys) {
      const orig = data[k] ?? "";
      if (draft[k] !== orig) changed[k] = draft[k];
    }
    if (Object.keys(changed).length === 0) {
      onClose();
      return;
    }
    update.mutate(changed, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg overflow-hidden rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-base font-bold">Cấu hình Incident</DialogTitle>
          <DialogDescription className="text-xs">
            Cửa sổ báo cáo, ngưỡng tiền, cooling, SLA, auto-close... (đổi runtime).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] w-full overflow-y-auto">
          <div className="space-y-3 px-6 py-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
            ) : keys.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Chưa có cấu hình</p>
            ) : (
              keys.map((k) => {
                const meta = INCIDENT_CONFIG_META[k];
                const structured = STRUCTURED_KEYS.has(k);
                const setVal = (v: string) => setDraft((p) => ({ ...p, [k]: v }));
                return (
                  <div key={k} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label className="text-xs font-semibold">{meta?.label ?? k}</Label>
                      {structured ? (
                        <button
                          type="button"
                          onClick={() => setAdvanced((p) => ({ ...p, [k]: !p[k] }))}
                          className="text-[10px] font-medium text-primary hover:underline"
                        >
                          {advanced[k] ? "Dạng biểu mẫu" : "JSON nâng cao"}
                        </button>
                      ) : (
                        meta?.unit && (
                          <span className="text-[10px] font-medium text-muted-foreground">{meta.unit}</span>
                        )
                      )}
                    </div>

                    {structured && !advanced[k] ? (
                      k === "INCIDENT_SEVERE_CRITERIA" ? (
                        <SevereCriteriaEditor value={draft[k] ?? ""} onChange={setVal} />
                      ) : (
                        <SlaMatrixEditor value={draft[k] ?? ""} onChange={setVal} />
                      )
                    ) : meta?.type === "json" ? (
                      <Textarea
                        value={draft[k] ?? ""}
                        onChange={(e) => setVal(e.target.value)}
                        rows={3}
                        className="resize-none rounded-lg font-mono text-xs"
                      />
                    ) : (
                      <Input
                        type={meta?.type === "number" ? "number" : "text"}
                        value={draft[k] ?? ""}
                        onChange={(e) => setVal(e.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    )}

                    {meta?.hint && !structured && (
                      <p className="text-[11px] text-muted-foreground">{meta.hint}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 pb-6">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onClose}>Huỷ</Button>
          <Button size="sm" className="rounded-full" onClick={handleSubmit} disabled={isLoading || update.isPending}>
            {update.isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
