"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import {
  useCreateFromTicket,
  usePropertyDamageTicketLookup,
} from "../hooks/useAdminIncident";
import { LookupCombobox } from "./LookupCombobox";
import { CLAIM_MAX } from "@/features/incident/shared/incident.enums";
import { formatVnd } from "@/features/incident/shared/incident.labels";

interface ItemDraft {
  description: string;
  claimedAmount: string;
}
const emptyItem = (): ItemDraft => ({ description: "", claimedAmount: "" });

/** Nâng cấp Ticket PROPERTY_DAMAGE → Incident (kế thừa booking + bằng chứng từ ticket). */
export function FromTicketDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateFromTicket();
  const [ticketId, setTicketId] = useState("");
  const [ticketLabel, setTicketLabel] = useState<string | null>(null);
  const [ticketQuery, setTicketQuery] = useState("");
  const ticketLookup = usePropertyDamageTicketLookup(ticketQuery);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  const setItem = (i: number, patch: Partial<ItemDraft>) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const itemsValid = items.every(
    (it) => it.description.trim() && Number(it.claimedAmount) > 0 && Number(it.claimedAmount) <= CLAIM_MAX,
  );
  const canSubmit = ticketId.trim() && title.trim() && description.trim() && itemsValid;

  const reset = () => {
    setTicketId("");
    setTicketLabel(null);
    setTicketQuery("");
    setTitle("");
    setDescription("");
    setItems([emptyItem()]);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    create.mutate(
      {
        ticketId: ticketId.trim(),
        dto: {
          title: title.trim(),
          description: description.trim(),
          damageItems: items.map((it) => ({
            description: it.description.trim(),
            claimedAmount: Number(it.claimedAmount),
          })),
        },
      },
      { onSuccess: () => { onClose(); reset(); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (onClose(), reset())}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Tạo sự cố từ Ticket</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ticket hư hỏng tài sản *</Label>
            <LookupCombobox
              placeholder="Tìm ticket theo mã / tên khách / SĐT..."
              items={ticketLookup.data ?? []}
              isLoading={ticketLookup.isFetching}
              onQueryChange={setTicketQuery}
              selectedKey={ticketId || null}
              selectedLabel={ticketLabel}
              onSelect={(it) => {
                setTicketId(it.id);
                setTicketLabel(it.label);
              }}
              onClear={() => {
                setTicketId("");
                setTicketLabel(null);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tiêu đề *</Label>
            <Input value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} className="rounded-lg text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mô tả *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none rounded-lg text-sm" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Hạng mục thiệt hại *</Label>
            {items.map((it, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border/40 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">Hạng mục {i + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} aria-label="Xoá">
                      <Trash2 className="size-4 text-muted-foreground hover:text-red-500" />
                    </button>
                  )}
                </div>
                <Input value={it.description} maxLength={255} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="Mô tả thiệt hại" className="h-8 rounded-lg text-sm" />
                <Input type="number" min={1} max={CLAIM_MAX} value={it.claimedAmount} onChange={(e) => setItem(i, { claimedAmount: e.target.value })} placeholder={`Số tiền (≤ ${formatVnd(CLAIM_MAX)})`} className="h-8 rounded-lg text-sm" />
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full rounded-lg gap-1.5" onClick={() => setItems((p) => [...p, emptyItem()])}>
              <Plus className="size-3.5" /> Thêm hạng mục
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => { onClose(); reset(); }}>Huỷ</Button>
          <Button size="sm" className="rounded-full" onClick={handleSubmit} disabled={!canSubmit || create.isPending}>
            {create.isPending ? "Đang tạo..." : "Tạo sự cố"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
