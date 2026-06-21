"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/constants/routes";
import { EvidenceUploader } from "@/features/incident/shared/_components/EvidenceUploader";
import { formatVnd } from "@/features/incident/shared/incident.labels";
import { CLAIM_MAX } from "@/features/incident/shared/incident.enums";
import type { Evidence } from "@/features/incident/shared/incident.types";
import {
  useCreateIncident,
  useUploadEvidence,
} from "../hooks/useCustomerIncident";

interface ItemDraft {
  description: string;
  claimedAmount: string; // giữ string để nhập, parse khi submit
  evidences: Evidence[];
}

const emptyItem = (): ItemDraft => ({ description: "", claimedAmount: "", evidences: [] });

export function ReportWizard({ bookingId: initialBookingId }: { bookingId?: string }) {
  const router = useRouter();
  const uploadEvidence = useUploadEvidence();
  const createIncident = useCreateIncident();

  const [bookingId, setBookingId] = useState(initialBookingId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [attempted, setAttempted] = useState(false);

  const upload = (file: File) => uploadEvidence.mutateAsync(file);

  const setItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const totalClaimed = items.reduce((s, it) => s + (Number(it.claimedAmount) || 0), 0);

  const itemValid = (it: ItemDraft) =>
    it.description.trim() &&
    Number(it.claimedAmount) > 0 &&
    Number(it.claimedAmount) <= CLAIM_MAX &&
    it.evidences.length >= 1;

  const isValid =
    bookingId.trim() &&
    title.trim() &&
    description.trim() &&
    items.length >= 1 &&
    items.every(itemValid);

  const handleSubmit = () => {
    setAttempted(true);
    if (!isValid) return;
    createIncident.mutate(
      {
        bookingId: bookingId.trim(),
        title: title.trim(),
        description: description.trim(),
        damageItems: items.map((it) => ({
          description: it.description.trim(),
          claimedAmount: Number(it.claimedAmount),
          evidenceIds: it.evidences.map((e) => e.id),
        })),
      },
      {
        onSuccess: (incident) =>
          router.replace(ROUTES.CUSTOMER.INCIDENT_DETAIL(incident.id)),
        onError: (err: unknown) => {
          // 409: đã có incident active → điều hướng tới hồ sơ hiện có
          const e = err as { response?: { status?: number; data?: { incidentId?: string } } };
          const existingId = e?.response?.data?.incidentId;
          if (e?.response?.status === 409 && existingId) {
            router.replace(ROUTES.CUSTOMER.INCIDENT_DETAIL(existingId));
          }
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/50 bg-card px-4 py-3 shadow-sm">
        <button onClick={() => router.back()} className="rounded-full p-1.5 hover:bg-muted" aria-label="Quay lại">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-base font-bold">Báo cáo sự cố</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-5 p-4">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Chỉ báo cáo cho đơn <b>đã hoàn thành</b> và trong thời hạn quy định. Hãy đính kèm ảnh hiện trạng cho mỗi hạng mục để được xử lý nhanh.
          </p>
        </div>

        {/* Đơn liên quan */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Mã đơn liên quan *</Label>
          <Input
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            readOnly={!!initialBookingId}
            placeholder="ID đơn đã hoàn thành..."
            className={`rounded-lg text-sm ${initialBookingId ? "bg-muted text-muted-foreground" : ""}`}
            aria-invalid={attempted && !bookingId.trim()}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Tiêu đề *</Label>
          <Input
            value={title}
            maxLength={255}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Hư hỏng tài sản sau ca dọn"
            className="rounded-lg text-sm"
            aria-invalid={attempted && !title.trim()}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Mô tả chung *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Mô tả tình huống sự cố..."
            className="resize-none rounded-lg text-sm"
            aria-invalid={attempted && !description.trim()}
          />
        </div>

        {/* Damage items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hạng mục thiệt hại *
            </Label>
            <span className="text-xs text-muted-foreground">Tổng: {formatVnd(totalClaimed)}</span>
          </div>

          {items.map((it, idx) => (
            <div key={idx} className="space-y-2 rounded-xl border border-border/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Hạng mục {idx + 1}</span>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500" aria-label="Xoá hạng mục">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <Input
                value={it.description}
                maxLength={255}
                onChange={(e) => setItem(idx, { description: e.target.value })}
                placeholder="Mô tả thiệt hại (VD: vỡ bình hoa)"
                className="rounded-lg text-sm"
                aria-invalid={attempted && !it.description.trim()}
              />
              <Input
                type="number"
                min={1}
                max={CLAIM_MAX}
                value={it.claimedAmount}
                onChange={(e) => setItem(idx, { claimedAmount: e.target.value })}
                placeholder="Số tiền yêu cầu (VND)"
                className="rounded-lg text-sm"
                aria-invalid={attempted && !(Number(it.claimedAmount) > 0 && Number(it.claimedAmount) <= CLAIM_MAX)}
              />
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">Ảnh bằng chứng (≥1) *</p>
                <EvidenceUploader
                  upload={upload}
                  value={it.evidences}
                  onChange={(next) => setItem(idx, { evidences: next })}
                />
              </div>
              {attempted && !itemValid(it) && (
                <p className="text-xs text-red-500">Cần mô tả, số tiền hợp lệ (≤ {formatVnd(CLAIM_MAX)}) và ≥1 ảnh.</p>
              )}
            </div>
          ))}

          <Button variant="outline" size="sm" className="w-full rounded-lg gap-1.5" onClick={addItem}>
            <Plus className="size-3.5" /> Thêm hạng mục
          </Button>
        </div>
      </div>

      {/* Submit bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-card p-4">
        <div className="mx-auto max-w-lg">
          <Button
            className="w-full rounded-xl gap-2"
            onClick={handleSubmit}
            disabled={(attempted && !isValid) || createIncident.isPending || uploadEvidence.isPending}
          >
            <Send className="size-4" />
            {createIncident.isPending ? "Đang gửi..." : "Gửi báo cáo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
