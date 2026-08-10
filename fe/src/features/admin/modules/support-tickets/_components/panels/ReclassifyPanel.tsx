"use client";

import React, { useState } from "react";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tag } from "lucide-react";
import { useReclassifyTicket } from "../../hooks/useSupportTicket";
import type {
  TicketAdminDetail,
  TicketCategory,
  TicketPriority,
} from "../../types/support-ticket.types";
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/features/support-tickets/shared/ticket.labels";

/**
 * Phân loại lại ticket (PATCH /category). Bắt buộc dùng trước khi RESOLVED nếu
 * ticket đang OTHER (BR-4 / API spec §2.8).
 */
export function ReclassifyPanel({ ticket }: { ticket: TicketAdminDetail }) {
  const reclassify = useReclassifyTicket(ticket.id);
  const [category, setCategory] = useState<TicketCategory>(ticket.category);
  const [subtype, setSubtype] = useState(ticket.subtype ?? "");
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);

  const handleSubmit = () =>
    reclassify.mutate({
      category,
      ...(subtype.trim() ? { subtype: subtype.trim() } : {}),
      priority,
    });

  return (
    <section className="space-y-2" aria-labelledby="reclassify-panel-title">
      <p id="reclassify-panel-title" className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wide">
        Phân loại lại
      </p>

      <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
        <SelectTrigger className="h-9 rounded-lg text-sm w-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]" aria-label="Loại ticket">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="cz-admin">
          {CATEGORY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Input
          value={subtype}
          onChange={(e) => setSubtype(e.target.value)}
          placeholder="Nhãn phụ (tuỳ chọn)..."
          className="h-9 rounded-lg text-sm flex-1 bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50"
          aria-label="Subtype"
        />
        <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
          <SelectTrigger className="h-9 rounded-lg text-sm w-32 border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]" aria-label="Độ ưu tiên">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="cz-admin">
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AdminButton
        size="md"
        variant="secondary"
        className="w-full rounded-lg"
        icon={<Tag className="w-3.5 h-3.5" />}
        onClick={handleSubmit}
        disabled={reclassify.isPending}
      >
        {reclassify.isPending ? "Đang lưu..." : "Phân loại lại"}
      </AdminButton>
    </section>
  );
}
