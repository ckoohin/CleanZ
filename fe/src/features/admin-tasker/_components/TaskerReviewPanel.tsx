"use client";

import React, { useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Send,
  AlertTriangle,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TaskerProfile } from "@/features/tasker/types/tasker.type";
import { serializeAdminNotes } from "./AdminRequestInfoModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReviewItemDef {
  id: string;
  label: string;
  category: string;
  icon: string;
  optional?: boolean;
  getHasData: (tasker: TaskerProfile) => boolean;
  getValue?: (tasker: TaskerProfile) => string | undefined;
  getPreview?: (docs: DocItem[]) => string | undefined;
}

interface DocItem {
  id: string;
  type: string;
  fileUrl: string;
}

// ─── Review item definitions ──────────────────────────────────────────────────

export const REVIEW_ITEMS: ReviewItemDef[] = [
  {
    id: "citizenCard",
    label: "CCCD / CMND (2 mặt)",
    category: "Giấy tờ định danh",
    icon: "🪪",
    getHasData: (s) => !!s.hasCitizenCardImage,
    getPreview: (docs) => docs.find((d) => d.type === "citizenCard")?.fileUrl,
  },
  {
    id: "idWithSelfie",
    label: "Ảnh selfie cầm CCCD",
    category: "Giấy tờ định danh",
    icon: "🤳",
    getHasData: (s) => !!s.hasIdWithSelfieImage,
    getPreview: (docs) => docs.find((d) => d.type === "idWithSelfie")?.fileUrl,
  },
  {
    id: "criminalRecord",
    label: "Lý lịch tư pháp",
    category: "Giấy tờ pháp lý",
    icon: "📋",
    getHasData: (s) => !!s.hasCriminalRecordImage,
    getPreview: (docs) => docs.find((d) => d.type === "criminalRecord")?.fileUrl,
  },
  {
    id: "healthCertificate",
    label: "Giấy khám sức khoẻ",
    category: "Giấy tờ pháp lý",
    icon: "🏥",
    optional: true,
    getHasData: (s) => !!s.hasHealthCertificateImage,
    getPreview: (docs) => docs.find((d) => d.type === "healthCertificate")?.fileUrl,
  },
  {
    id: "certificate",
    label: "Chứng chỉ nghề nghiệp",
    category: "Giấy tờ pháp lý",
    icon: "📜",
    optional: true,
    getHasData: (s) => !!s.hasCertificateImage,
    getPreview: (docs) => docs.find((d) => d.type === "certificate")?.fileUrl,
  },
  {
    id: "phone",
    label: "Số điện thoại",
    category: "Thông tin cá nhân",
    icon: "📞",
    getHasData: (s) => !!s.phone,
    getValue: (s) => s.phone,
  },
  {
    id: "address",
    label: "Địa chỉ hiện tại",
    category: "Thông tin cá nhân",
    icon: "📍",
    getHasData: (s) => !!s.addressCurrent,
    getValue: (s) => s.addressCurrent,
  },
  {
    id: "bankInfo",
    label: "Thông tin ngân hàng",
    category: "Thanh toán",
    icon: "🏦",
    getHasData: (s) => !!(s.bankName && s.bankAccountNumber),
    getValue: (s) =>
      s.bankName
        ? `${s.bankName} • ${s.bankAccountNumber ?? "—"} • ${s.bankAccountName ?? "—"}`
        : undefined,
  },
  {
    id: "experience",
    label: "Kinh nghiệm & Kỹ năng",
    category: "Nghề nghiệp",
    icon: "💼",
    getHasData: (s) => !!(s.experience && s.skills),
    getValue: (s) =>
      [s.experience, s.skills].filter(Boolean).join(" • ") || undefined,
  },
];

// ─── Single review item card ───────────────────────────────────────────────────

function ReviewItemCard({
  item,
  tasker,
  docs,
  flagged,
  comment,
  onToggleFlag,
  onComment,
}: {
  item: ReviewItemDef;
  tasker: TaskerProfile;
  docs: DocItem[];
  flagged: boolean;
  comment: string;
  onToggleFlag: () => void;
  onComment: (value: string) => void;
}) {
  const hasData = item.getHasData(tasker);
  const value = item.getValue?.(tasker);
  const previewUrl = item.getPreview?.(docs);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        flagged ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
          {item.icon}
        </div>

        {/* Label + value/data status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {item.label}
            {item.optional && (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                (tuỳ chọn)
              </span>
            )}
          </p>
          {/* Giá trị text (nếu có) */}
          {value && (
            <p className="text-xs text-foreground/70 mt-0.5 break-words line-clamp-2">
              {value}
            </p>
          )}
          <p
            className={cn(
              "text-xs mt-0.5",
              hasData
                ? "text-emerald-600"
                : item.optional
                ? "text-muted-foreground"
                : "text-red-500"
            )}
          >
            {hasData
              ? "✓ Đã nộp"
              : item.optional
              ? "— Chưa nộp (không bắt buộc)"
              : "⚠ Chưa nộp"}
          </p>
        </div>

        {/* Preview toggle (ảnh giấy tờ) */}
        {previewUrl && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Xem ảnh"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Nút Yêu cầu gửi lại */}
        <Button
          type="button"
          size="sm"
          variant={flagged ? "default" : "outline"}
          onClick={onToggleFlag}
          className={cn(
            "h-8 rounded-lg text-[11px] font-semibold shrink-0 gap-1.5",
            flagged
              ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
              : "border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
          )}
          aria-label={flagged ? "Bỏ yêu cầu gửi lại" : "Yêu cầu gửi lại"}
        >
          {flagged ? (
            <>
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Bỏ</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Yêu cầu gửi lại</span>
            </>
          )}
        </Button>
      </div>

      {/* Expandable image preview */}
      {expanded && previewUrl && (
        <div className="px-3 pb-3">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src={previewUrl}
              alt={item.label}
              className="w-full max-h-48 object-contain rounded-lg border border-border bg-muted"
            />
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              Nhấn để xem ảnh gốc ↗
            </p>
          </a>
        </div>
      )}

      {/* Ô comment khi yêu cầu gửi lại */}
      {flagged && (
        <div className="px-3 pb-3 space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-yellow-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            Ghi chú cho ứng viên — cần cập nhật gì?
          </label>
          <Textarea
            autoFocus
            value={comment}
            onChange={(e) => onComment(e.target.value)}
            rows={2}
            placeholder={`VD: ${item.label} bị mờ / chưa đúng, vui lòng cập nhật lại...`}
            className="rounded-lg resize-none text-sm bg-background"
          />
        </div>
      )}
    </div>
  );
}

// ─── TaskerReviewPanel ─────────────────────────────────────────────────────────

interface TaskerReviewPanelProps {
  tasker: TaskerProfile;
  docs: DocItem[];
  onApprove: () => void;
  onRequestInfo: (serializedNotes: string) => void;
  onReject: () => void;
  isApproving: boolean;
  isRequesting: boolean;
}

export function TaskerReviewPanel({
  tasker,
  docs,
  onApprove,
  onRequestInfo,
  onReject,
  isApproving,
  isRequesting,
}: TaskerReviewPanelProps) {
  // id -> comment cho các mục được đánh dấu "yêu cầu gửi lại"
  const [flagged, setFlagged] = useState<Record<string, string>>({});

  const toggleFlag = useCallback((id: string) => {
    setFlagged((prev) => {
      if (id in prev) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: "" };
    });
  }, []);

  const setComment = useCallback((id: string, value: string) => {
    setFlagged((prev) => ({ ...prev, [id]: value }));
  }, []);

  const flaggedIds = Object.keys(flagged);
  const hasFlags = flaggedIds.length > 0;

  // Group by category
  const categories = Array.from(new Set(REVIEW_ITEMS.map((i) => i.category)));

  const handleSendRequest = () => {
    const note = flaggedIds
      .map((id) => {
        const label = REVIEW_ITEMS.find((i) => i.id === id)?.label ?? id;
        const c = flagged[id]?.trim();
        return c ? `• ${label}: ${c}` : `• ${label}`;
      })
      .join("\n");

    onRequestInfo(serializeAdminNotes(flaggedIds, note));
  };

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold">Toàn bộ thông tin ứng viên gửi lên</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kiểm tra từng mục. Nếu mục nào chưa đạt, nhấn{" "}
          <span className="font-semibold text-yellow-700">Yêu cầu gửi lại</span> và ghi
          rõ cần cập nhật gì. Khi mọi thứ ổn, nhấn{" "}
          <span className="font-semibold text-primary">Đồng ý phê duyệt</span> ở cuối.
        </p>
      </div>

      {/* Items grouped by category */}
      {categories.map((cat) => (
        <div key={cat} className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">
            {cat}
          </p>
          {REVIEW_ITEMS.filter((i) => i.category === cat).map((item) => (
            <ReviewItemCard
              key={item.id}
              item={item}
              tasker={tasker}
              docs={docs}
              flagged={item.id in flagged}
              comment={flagged[item.id] ?? ""}
              onToggleFlag={() => toggleFlag(item.id)}
              onComment={(v) => setComment(item.id, v)}
            />
          ))}
        </div>
      ))}

      {/* CTA footer */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        {hasFlags ? (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-2.5 text-sm text-yellow-700">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              {flaggedIds.length} mục cần ứng viên gửi lại
            </p>
            <p className="text-xs mt-1">
              Không thể phê duyệt khi còn mục yêu cầu gửi lại. Hãy gửi yêu cầu để ứng
              viên cập nhật.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            Không có mục nào bị đánh dấu — có thể phê duyệt hồ sơ.
          </p>
        )}

        {/* Gửi yêu cầu gửi lại */}
        {hasFlags && (
          <Button
            className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-sm shadow-yellow-500/20"
            onClick={handleSendRequest}
            disabled={isRequesting}
          >
            <Send className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {isRequesting
              ? "Đang gửi..."
              : `Gửi yêu cầu gửi lại (${flaggedIds.length} mục)`}
          </Button>
        )}

        {/* Đồng ý phê duyệt */}
        <Button
          className="w-full rounded-xl font-semibold shadow-md shadow-primary/20"
          onClick={onApprove}
          disabled={hasFlags || isApproving}
          title={
            hasFlags
              ? "Bỏ các mục yêu cầu gửi lại trước khi phê duyệt"
              : undefined
          }
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
          {isApproving ? "Đang duyệt..." : "Đồng ý phê duyệt"}
        </Button>

        {/* Từ chối hồ sơ */}
        <Button
          variant="outline"
          className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
          onClick={onReject}
        >
          <XCircle className="w-4 h-4 mr-1.5" aria-hidden="true" /> Từ chối hồ sơ
        </Button>
      </div>
    </div>
  );
}
