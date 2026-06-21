"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
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
      <p id="reclassify-panel-title" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
        Phân loại lại
      </p>

      <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
        <SelectTrigger className="h-9 rounded-lg text-sm w-full" aria-label="Loại ticket">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
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
          placeholder="Subtype (tuỳ chọn)..."
          className="h-9 rounded-lg text-sm flex-1"
          aria-label="Subtype"
        />
        <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
          <SelectTrigger className="h-9 rounded-lg text-sm w-32" aria-label="Độ ưu tiên">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-lg gap-1.5"
        onClick={handleSubmit}
        disabled={reclassify.isPending}
      >
        <Tag className="w-3.5 h-3.5" />
        {reclassify.isPending ? "Đang lưu..." : "Phân loại lại"}
      </Button>
    </section>
  );
}
