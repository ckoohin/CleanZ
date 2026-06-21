"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { useAddResolution } from "../../hooks/useSupportTicket";
import type { TicketAdminDetail } from "../../types/support-ticket.types";
import { RESOLUTION_LABEL } from "@/features/support-tickets/shared/ticket.labels";
import {
  RESOLUTION_TYPE,
  MONEY_RESOLUTION_TYPES,
  type ResolutionType,
} from "@/features/support-tickets/shared/ticket.enums";

/**
 * Ghi nhận kết luận xử lý (POST /resolutions). Loại tiền (REFUND/COMPENSATION/
 * TASKER_PENALTY) bắt buộc nhập `amount` (API spec §2.7). Phase 1: record-only —
 * chưa chuyển tiền (`walletTransactionId=null`).
 */
export function ResolutionPanel({ ticket }: { ticket: TicketAdminDetail }) {
  const addResolution = useAddResolution(ticket.id);
  const [type, setType] = useState<ResolutionType | "">("");
  const [amount, setAmount] = useState("");
  const [voucherId, setVoucherId] = useState("");
  const [recleanBookingId, setRecleanBookingId] = useState("");
  const [note, setNote] = useState("");

  const isMoney = type ? MONEY_RESOLUTION_TYPES.includes(type) : false;
  const amountInvalid = isMoney && !(Number(amount) >= 0 && amount.trim() !== "");
  const disabled = !type || amountInvalid || addResolution.isPending;

  const reset = () => {
    setType("");
    setAmount("");
    setVoucherId("");
    setRecleanBookingId("");
    setNote("");
  };

  const handleSubmit = () => {
    if (!type) return;
    addResolution.mutate(
      {
        type,
        ...(isMoney ? { amount: Number(amount) } : {}),
        ...(type === "VOUCHER" && voucherId.trim() ? { voucherId: voucherId.trim() } : {}),
        ...(type === "RECLEAN" && recleanBookingId.trim()
          ? { recleanBookingId: recleanBookingId.trim() }
          : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      { onSuccess: reset },
    );
  };

  return (
    <section className="space-y-2" aria-labelledby="resolution-panel-title">
      <p id="resolution-panel-title" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
        Ghi nhận kết luận
      </p>

      <Select value={type} onValueChange={(v) => setType(v as ResolutionType)}>
        <SelectTrigger className="h-9 rounded-lg text-sm w-full" aria-label="Loại kết luận">
          <SelectValue placeholder="Loại kết luận..." />
        </SelectTrigger>
        <SelectContent>
          {RESOLUTION_TYPE.map((t) => (
            <SelectItem key={t} value={t}>
              {RESOLUTION_LABEL[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isMoney && (
        <Input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Số tiền (VND) — bắt buộc..."
          className="h-9 rounded-lg text-sm"
          aria-label="Số tiền"
        />
      )}
      {type === "VOUCHER" && (
        <Input
          value={voucherId}
          onChange={(e) => setVoucherId(e.target.value)}
          placeholder="Voucher ID (tuỳ chọn)..."
          className="h-9 rounded-lg text-sm"
          aria-label="Voucher ID"
        />
      )}
      {type === "RECLEAN" && (
        <Input
          value={recleanBookingId}
          onChange={(e) => setRecleanBookingId(e.target.value)}
          placeholder="Mã đơn làm lại (tuỳ chọn)..."
          className="h-9 rounded-lg text-sm"
          aria-label="Mã đơn làm lại"
        />
      )}

      <Textarea
        placeholder="Ghi chú kết luận..."
        className="text-sm resize-none rounded-lg"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-lg gap-1.5"
        onClick={handleSubmit}
        disabled={disabled}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {addResolution.isPending ? "Đang lưu..." : "Lưu kết luận"}
      </Button>

      {ticket.resolutions.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
            Kết luận đã ghi
          </p>
          {ticket.resolutions.map((r) => (
            <div key={r.id} className="rounded-lg bg-muted/40 border border-border/30 p-2.5 text-xs">
              <p className="font-semibold text-foreground/80">{RESOLUTION_LABEL[r.type] ?? r.type}</p>
              {r.note && <p className="text-muted-foreground mt-0.5">{r.note}</p>}
              {r.amount && (
                <p className="text-primary font-bold">
                  +{Number(r.amount).toLocaleString("vi-VN")}đ{" "}
                  {!r.walletTransactionId && (
                    <span className="font-normal text-muted-foreground">(chưa chuyển tiền)</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
