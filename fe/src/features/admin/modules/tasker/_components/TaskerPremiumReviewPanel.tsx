"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crown,
  History,
  ImageIcon,
  Loader2,
  ShieldCheck,
  Wrench,
  XCircle,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/base/confirm_dialog";
import { StatusBadge, type BadgeTone } from "@/components/admin";
import type { TaskerEquipmentStatus } from "@/features/tasker/types/tasker.type";
import { useReviewTaskerEquipment } from "../hooks/admin-tasker.hooks";
import type { AdminTaskerDetail } from "../types/admin-tasker.types";

const STATUS_META: Record<
  TaskerEquipmentStatus,
  {
    label: string;
    tone: BadgeTone;
    title: string;
    description: string;
  }
> = {
  NONE: {
    label: "Chưa nộp",
    tone: "neutral",
    title: "Tasker chưa gửi hồ sơ dụng cụ",
    description:
      "Khi Tasker nộp ảnh bộ dụng cụ, hồ sơ sẽ xuất hiện trong hàng đợi duyệt Premium.",
  },
  PENDING: {
    label: "Chờ duyệt",
    tone: "warning",
    title: "Hồ sơ đang chờ quyết định",
    description: "Kiểm tra ảnh và mô tả bộ dụng cụ trước khi duyệt.",
  },
  APPROVED: {
    label: "Đã duyệt",
    tone: "success",
    title: "Bộ dụng cụ đã được xác minh",
    description:
      "Tasker đã đủ điều kiện nhận đơn premium. Nếu nộp lại bộ ảnh mới, hồ sơ sẽ cần được duyệt lại.",
  },
  REJECTED: {
    label: "Đã từ chối",
    tone: "danger",
    title: "Hồ sơ dụng cụ chưa đạt",
    description:
      "Tasker có thể xem lý do, bổ sung ảnh và nộp lại để hồ sơ quay về trạng thái chờ duyệt.",
  },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface TaskerPremiumReviewPanelProps {
  tasker: AdminTaskerDetail;
  onZoom: (url: string) => void;
}

export const TaskerPremiumReviewPanel: React.FC<
  TaskerPremiumReviewPanelProps
> = ({ tasker, onZoom }) => {
  const equipment = tasker.equipment;
  const status = equipment?.status ?? "NONE";
  const meta = STATUS_META[status];
  const photos = equipment?.photoUrls ?? [];
  const reviewMutation = useReviewTaskerEquipment();
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectNote, setRejectNote] = React.useState("");
  const normalizedRejectNote = rejectNote.trim();

  const approve = () => {
    reviewMutation.mutate(
      { id: tasker.id, action: "APPROVE" },
      { onSuccess: () => setApproveOpen(false) },
    );
  };

  const reject = () => {
    if (!normalizedRejectNote) return;
    reviewMutation.mutate(
      {
        id: tasker.id,
        action: "REJECT",
        note: normalizedRejectNote,
      },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectNote("");
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-[rgba(217,119,6,0.28)] bg-[var(--c-card)]">
        <div className="flex flex-col gap-4 bg-[rgba(217,119,6,0.08)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(217,119,6,0.14)] text-[#D97706]">
              <Crown className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-[var(--c-ink)]">
                Xác minh Tasker Premium
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--c-muted)]">
                Bộ dụng cụ chuyên dụng được admin duyệt là điều kiện duy nhất để
                Tasker có thể nhận đơn premium.
              </p>
            </div>
          </div>
          <StatusBadge tone={meta.tone} dot={status === "PENDING"}>
            {meta.label}
          </StatusBadge>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
            <p className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
              <Clock3 className="size-3.5 text-[#7C3AED]" aria-hidden="true" />
              Thời điểm duyệt
            </p>
            <p className="mt-1 text-sm font-bold text-[var(--c-ink)]">
              {formatDateTime(equipment?.reviewedAt)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
            <p className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
              <ShieldCheck
                className="size-3.5 text-[#0E9F6E]"
                aria-hidden="true"
              />
              Người duyệt
            </p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--c-ink)]">
              {equipment?.reviewedByName ||
                (equipment?.reviewedBy ? "Admin" : "Chưa có")}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--c-ink)]">
              <ImageIcon
                className="size-4 text-[var(--c-primary-strong)]"
                aria-hidden="true"
              />
              Ảnh bộ dụng cụ ({photos.length})
            </h3>
            {photos.length > 0 && (
              <span className="text-xs text-[var(--c-muted)]">
                Bấm vào ảnh để xem kích thước gốc
              </span>
            )}
          </div>

          {photos.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => onZoom(url)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Bộ dụng cụ ${index + 1}`}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 opacity-0 shadow transition-opacity group-hover:opacity-100">
                      <ZoomIn className="size-3.5" aria-hidden="true" />
                      Xem ảnh
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex min-h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-center">
              <Wrench
                className="size-9 text-[var(--c-muted)]/50"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-[var(--c-ink-soft)]">
                Chưa có ảnh dụng cụ
              </p>
              <p className="max-w-sm text-xs text-[var(--c-muted)]">
                Tasker cần nộp ít nhất một ảnh trước khi admin có thể duyệt.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--c-ink)]">
              {status === "APPROVED" ? (
                <CheckCircle2
                  className="size-4 text-[#0E9F6E]"
                  aria-hidden="true"
                />
              ) : status === "REJECTED" ? (
                <XCircle className="size-4 text-[#E11D48]" aria-hidden="true" />
              ) : (
                <AlertTriangle
                  className="size-4 text-[#D97706]"
                  aria-hidden="true"
                />
              )}
              {meta.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--c-muted)]">
              {meta.description}
            </p>

            {equipment?.note && (
              <div className="mt-4 rounded-xl bg-[var(--c-card-2)] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--c-muted)]">
                  {status === "REJECTED" ? "Lý do từ chối" : "Mô tả / ghi chú"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--c-ink-soft)]">
                  {equipment.note}
                </p>
              </div>
            )}

            {equipment?.reviewedAt && (
              <p className="mt-4 flex items-center gap-1.5 border-t border-[var(--c-line)] pt-3 text-xs text-[var(--c-muted)]">
                <History className="size-3.5" aria-hidden="true" />
                Xử lý lúc {formatDateTime(equipment.reviewedAt)}
              </p>
            )}
          </section>

          {status === "PENDING" && (
            <section className="rounded-2xl border border-[rgba(217,119,6,0.28)] bg-[rgba(217,119,6,0.06)] p-5">
              <p className="text-sm font-bold text-[var(--c-ink)]">
                Quyết định duyệt
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--c-muted)]">
                Mỗi hồ sơ chờ chỉ được xử lý một lần. Nếu bị từ chối, Tasker
                phải bổ sung và nộp lại.
              </p>
              <div className="mt-4 grid gap-2">
                <Button
                  type="button"
                  onClick={() => setApproveOpen(true)}
                  disabled={reviewMutation.isPending || photos.length === 0}
                  className="rounded-full bg-[#0E9F6E] text-white hover:bg-[#0E9F6E]/90"
                >
                  <CheckCircle2 className="mr-2 size-4" aria-hidden="true" />
                  Duyệt bộ dụng cụ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectOpen(true)}
                  disabled={reviewMutation.isPending}
                  className="rounded-full border-[rgba(225,29,72,0.35)] text-[#E11D48] hover:bg-[rgba(225,29,72,0.08)] hover:text-[#E11D48]"
                >
                  <XCircle className="mr-2 size-4" aria-hidden="true" />
                  Từ chối
                </Button>
              </div>
            </section>
          )}
        </aside>
      </div>

      <ConfirmDialog
        isOpen={approveOpen}
        onClose={() => setApproveOpen(false)}
        onConfirm={approve}
        isPending={reviewMutation.isPending}
        title="Duyệt bộ dụng cụ Premium"
        confirmLabel="Xác nhận duyệt"
        description={
          <span>
            Xác nhận bộ dụng cụ của{" "}
            <strong>{tasker.fullName || "Tasker này"}</strong> đạt yêu cầu.
            Tasker sẽ có thể nhận đơn premium ngay sau khi duyệt.
          </span>
        }
      />

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!reviewMutation.isPending) setRejectOpen(open);
        }}
      >
        <DialogContent className="cz-admin rounded-2xl border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Từ chối hồ sơ dụng cụ</DialogTitle>
            <DialogDescription className="text-[var(--c-muted)]">
              Ghi rõ dụng cụ hoặc ảnh nào chưa đạt để Tasker biết cách bổ sung.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              maxLength={1000}
              rows={5}
              aria-label="Lý do từ chối"
              placeholder="Ví dụ: Ảnh máy hút bụi chưa rõ model, vui lòng bổ sung ảnh toàn bộ thiết bị..."
              className="min-h-28 border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)]"
            />
            <div className="flex justify-between gap-3 text-xs">
              <span
                className={
                  rejectNote.length > 0 && !normalizedRejectNote
                    ? "text-[#E11D48]"
                    : "text-[var(--c-muted)]"
                }
              >
                Lý do từ chối là bắt buộc.
              </span>
              <span className="text-[var(--c-muted)]">
                {rejectNote.length}/1000
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={reviewMutation.isPending}
              className="rounded-full"
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={reject}
              disabled={!normalizedRejectNote || reviewMutation.isPending}
              className="rounded-full"
            >
              {reviewMutation.isPending && (
                <Loader2
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
