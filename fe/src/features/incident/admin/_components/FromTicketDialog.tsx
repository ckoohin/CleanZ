"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import {
  useCreateFromTicket,
  useIncidentConfig,
  usePropertyDamageTicketLookup,
} from "../hooks/useAdminIncident";
import { LookupCombobox } from "./LookupCombobox";
import { CLAIM_MAX } from "@/features/incident/shared/incident.enums";
import { isIntegerAmount } from "@/features/incident/shared/incident.machine";
import { formatVnd } from "@/features/incident/shared/incident.labels";

interface ItemDraft {
  description: string;
  claimedAmount: string;
}
const emptyItem = (): ItemDraft => ({ description: "", claimedAmount: "" });

/** Chuyển Ticket PROPERTY_DAMAGE thành Incident (kế thừa booking + bằng chứng từ ticket). */
export function FromTicketDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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

  // Mức tối đa thật do admin cấu hình; `CLAIM_MAX` chỉ là giá trị dự phòng khi chưa
  // tải xong cấu hình — backend vẫn là chốt chặn cuối.
  const { data: config } = useIncidentConfig();
  const claimMax = Number(config?.INCIDENT_CLAIM_MAX_AMOUNT) || CLAIM_MAX;

  const amountValid = (it: ItemDraft) => {
    const amount = Number(it.claimedAmount);
    return isIntegerAmount(amount) && amount > 0 && amount <= claimMax;
  };
  const itemsValid = items.every(
    (it) => it.description.trim() && amountValid(it),
  );
  // Mức tối đa áp cho TỔNG, không phải từng khoản — giống hệt ràng buộc backend
  // kiểm khi chuyển ticket thành sự cố.
  const totalClaimed = items.reduce(
    (s, it) => s + (Number(it.claimedAmount) || 0),
    0,
  );
  const overClaimMax = totalClaimed > claimMax;
  const canSubmit =
    ticketId.trim() &&
    title.trim() &&
    description.trim() &&
    itemsValid &&
    !overClaimMax;

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
      {
        onSuccess: () => {
          onClose();
          reset();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (onClose(), reset())}>
      <DialogContent className="cz-admin sm:max-w-md rounded-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[var(--c-ink)]">
            Tạo sự cố từ Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--c-ink)]">
              Ticket hư hỏng tài sản *
            </Label>
            <LookupCombobox
              placeholder="Tìm ticket theo mã / tên khách / SĐT..."
              items={ticketLookup.data ?? []}
              isLoading={ticketLookup.isFetching}
              onQueryChange={setTicketQuery}
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
            <Label className="text-xs font-semibold text-[var(--c-ink)]">
              Tiêu đề *
            </Label>
            <Input
              value={title}
              maxLength={255}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--c-ink)]">
              Mô tả *
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none rounded-lg text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-[var(--c-muted)]">
              Các khoản thiệt hại *
            </Label>
            {items.map((it, i) => (
              <div
                key={i}
                className="space-y-2 rounded-lg border border-[var(--c-line)] p-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--c-muted)]">
                    Khoản {i + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      onClick={() =>
                        setItems((p) => p.filter((_, idx) => idx !== i))
                      }
                      aria-label="Xoá"
                    >
                      <Trash2 className="size-4 text-[var(--c-muted)] hover:text-[#E11D48]" />
                    </button>
                  )}
                </div>
                <Input
                  value={it.description}
                  maxLength={255}
                  onChange={(e) => setItem(i, { description: e.target.value })}
                  placeholder="Mô tả thiệt hại"
                  className="h-8 rounded-lg text-sm"
                />
                <Input
                  type="number"
                  min={1}
                  step={1}
                  max={claimMax}
                  value={it.claimedAmount}
                  onChange={(e) =>
                    setItem(i, { claimedAmount: e.target.value })
                  }
                  placeholder={`Số tiền (≤ ${formatVnd(claimMax)})`}
                  className="h-8 rounded-lg text-sm"
                />
              </div>
            ))}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--c-muted)]">Tổng khách yêu cầu</span>
              <span
                className={
                  overClaimMax
                    ? "font-semibold text-[#E11D48]"
                    : "text-[var(--c-ink)]"
                }
              >
                {formatVnd(totalClaimed)}
              </span>
            </div>
            {overClaimMax && (
              <p className="text-xs text-[#E11D48]">
                Tổng vượt mức tối đa {formatVnd(claimMax)} — hệ thống sẽ từ
                chối.
              </p>
            )}
            <AdminButton
              variant="secondary"
              size="sm"
              className="w-full rounded-lg gap-1.5"
              onClick={() => setItems((p) => [...p, emptyItem()])}
            >
              <Plus className="size-3.5" /> Thêm khoản thiệt hại
            </AdminButton>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <AdminButton
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => {
              onClose();
              reset();
            }}
          >
            Huỷ
          </AdminButton>
          <AdminButton
            variant="primary"
            size="sm"
            className="rounded-full"
            onClick={handleSubmit}
            disabled={!canSubmit || create.isPending}
          >
            {create.isPending ? "Đang tạo..." : "Tạo sự cố"}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
