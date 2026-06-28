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
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTicketConfig, useUpdateTicketConfig } from "../../hooks/useSupportTicket";
import type { TicketPriority, SlaEntry } from "../../types/support-ticket.types";
import {
  TICKET_PRIORITY,
  TICKET_CATEGORY,
} from "@/features/support-tickets/shared/ticket.enums";
import {
  PRIORITY_LABEL,
  CATEGORY_LABEL,
} from "@/features/support-tickets/shared/ticket.labels";

interface Props {
  open: boolean;
  onClose: () => void;
}

type SlaState = Record<TicketPriority, SlaEntry>;
type CatPriState = Record<TicketCategoryKey, TicketPriority>;
type TicketCategoryKey = (typeof TICKET_CATEGORY)[number];

const emptySla = (): SlaState =>
  TICKET_PRIORITY.reduce((acc, p) => {
    acc[p] = { responseMins: 0, resolutionMins: 0 };
    return acc;
  }, {} as SlaState);

const emptyCatPri = (): CatPriState =>
  TICKET_CATEGORY.reduce((acc, c) => {
    acc[c] = "MEDIUM";
    return acc;
  }, {} as CatPriState);

/**
 * Cấu hình ticket (FR-G3, API spec §2.9): SLA matrix theo độ ưu tiên,
 * category→priority mặc định, autoCloseHours, complaintWindowDays. Đổi runtime.
 */
export function TicketConfigForm({ open, onClose }: Props) {
  const { data, isLoading } = useTicketConfig();
  const update = useUpdateTicketConfig();

  const [sla, setSla] = useState<SlaState>(emptySla);
  const [catPri, setCatPri] = useState<CatPriState>(emptyCatPri);
  const [autoCloseHours, setAutoCloseHours] = useState(48);
  const [complaintWindowDays, setComplaintWindowDays] = useState(7);

  // Nạp dữ liệu hiện tại vào form khi mở / khi data đổi.
  useEffect(() => {
    if (!data) return;
    setSla(
      TICKET_PRIORITY.reduce((acc, p) => {
        acc[p] = data.slaMatrix?.[p] ?? { responseMins: 0, resolutionMins: 0 };
        return acc;
      }, {} as SlaState),
    );
    setCatPri(
      TICKET_CATEGORY.reduce((acc, c) => {
        acc[c] = (data.categoryPriority?.[c] as TicketPriority) ?? "MEDIUM";
        return acc;
      }, {} as CatPriState),
    );
    setAutoCloseHours(data.autoCloseHours ?? 48);
    setComplaintWindowDays(data.complaintWindowDays ?? 7);
  }, [data, open]);

  const setSlaField = (p: TicketPriority, key: keyof SlaEntry, value: number) =>
    setSla((prev) => ({ ...prev, [p]: { ...prev[p], [key]: value } }));

  const handleSubmit = () =>
    update.mutate(
      {
        slaMatrix: sla,
        categoryPriority: catPri,
        autoCloseHours,
        complaintWindowDays,
      },
      { onSuccess: onClose },
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="cz-admin sm:max-w-lg rounded-2xl p-0 bg-[var(--c-card)] border-[var(--c-line)]">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-base font-bold text-[var(--c-ink)]">Cấu hình Support Ticket</DialogTitle>
          <DialogDescription className="text-xs text-[var(--c-muted)]">
            SLA theo độ ưu tiên, độ ưu tiên mặc định theo loại, và quy tắc tự đóng / cửa sổ khiếu nại.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="px-6 py-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <div className="px-6 py-4 space-y-6">
              {/* SLA matrix */}
              <section className="space-y-2">
                <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide">
                  SLA theo độ ưu tiên (phút)
                </p>
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center text-xs">
                  <span />
                  <span className="text-center text-[var(--c-muted)] font-semibold w-24">Phản hồi</span>
                  <span className="text-center text-[var(--c-muted)] font-semibold w-24">Giải quyết</span>
                  {TICKET_PRIORITY.map((p) => (
                    <React.Fragment key={p}>
                      <span className="font-medium text-[var(--c-ink-soft)]">{PRIORITY_LABEL[p]}</span>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-24 rounded-lg text-sm bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50"
                        value={sla[p].responseMins}
                        onChange={(e) => setSlaField(p, "responseMins", Number(e.target.value) || 0)}
                        aria-label={`Phút phản hồi - ${PRIORITY_LABEL[p]}`}
                      />
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-24 rounded-lg text-sm bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50"
                        value={sla[p].resolutionMins}
                        onChange={(e) => setSlaField(p, "resolutionMins", Number(e.target.value) || 0)}
                        aria-label={`Phút giải quyết - ${PRIORITY_LABEL[p]}`}
                      />
                    </React.Fragment>
                  ))}
                </div>
              </section>

              {/* Category → priority */}
              <section className="space-y-2">
                <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide">
                  Độ ưu tiên mặc định theo loại
                </p>
                <div className="space-y-2">
                  {TICKET_CATEGORY.map((c) => (
                    <div key={c} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[var(--c-ink-soft)]">{CATEGORY_LABEL[c]}</span>
                      <Select
                        value={catPri[c]}
                        onValueChange={(v) => setCatPri((prev) => ({ ...prev, [c]: v as TicketPriority }))}
                      >
                        <SelectTrigger className="h-8 w-36 rounded-lg text-sm border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]" aria-label={`Ưu tiên - ${CATEGORY_LABEL[c]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="cz-admin">
                          {TICKET_PRIORITY.map((p) => (
                            <SelectItem key={p} value={p}>
                              {PRIORITY_LABEL[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </section>

              {/* Auto-close & complaint window */}
              <section className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[var(--c-ink-soft)]">Tự đóng sau (giờ)</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-9 rounded-lg text-sm bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50"
                    value={autoCloseHours}
                    onChange={(e) => setAutoCloseHours(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[var(--c-ink-soft)]">Cửa sổ khiếu nại (ngày)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    className="h-9 rounded-lg text-sm bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50"
                    value={complaintWindowDays}
                    onChange={(e) => setComplaintWindowDays(Number(e.target.value) || 1)}
                  />
                </div>
              </section>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 gap-2">
          <AdminButton variant="secondary" size="sm" className="rounded-full" onClick={onClose}>
            Huỷ
          </AdminButton>
          <AdminButton variant="primary" size="sm" className="rounded-full" onClick={handleSubmit} disabled={isLoading || update.isPending}>
            {update.isPending ? "Đang lưu..." : "Lưu cấu hình"}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
