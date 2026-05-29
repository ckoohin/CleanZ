"use client";

import React, { useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { StaffProfile } from "@/features/staff/types/staff.type";
import { serializeAdminNotes } from "./AdminRequestInfoModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemReviewStatus = "pending" | "ok" | "supplement" | "incorrect";

export interface ReviewItemDef {
  id: string;
  label: string;
  category: string;
  icon: string;
  optional?: boolean;
  getHasData: (staff: StaffProfile) => boolean;
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
  },
  {
    id: "address",
    label: "Địa chỉ hiện tại",
    category: "Thông tin cá nhân",
    icon: "📍",
    getHasData: (s) => !!s.addressCurrent,
  },
  {
    id: "bankInfo",
    label: "Thông tin ngân hàng",
    category: "Thanh toán",
    icon: "🏦",
    getHasData: (s) => !!(s.bankName && s.bankAccountNumber),
  },
  {
    id: "experience",
    label: "Kinh nghiệm & Kỹ năng",
    category: "Nghề nghiệp",
    icon: "💼",
    getHasData: (s) => !!(s.experience && s.skills),
  },
];

// ─── Status button config ────────────────────────────────────────────────────

const STATUS_BTNS: Array<{ status: ItemReviewStatus; label: string; short: string; cls: string; activeCls: string; icon: React.ElementType }> = [
  {
    status: "ok",
    label: "Đầy đủ",
    short: "Đủ",
    icon: CheckCircle2,
    cls: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    activeCls: "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30",
  },
  {
    status: "supplement",
    label: "Cần bổ sung",
    short: "Bổ sung",
    icon: AlertTriangle,
    cls: "border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950/30",
    activeCls: "bg-yellow-500 border-yellow-500 text-white shadow-sm shadow-yellow-500/30",
  },
  {
    status: "incorrect",
    label: "Chưa đúng",
    short: "Sai",
    icon: XCircle,
    cls: "border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30",
    activeCls: "bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/30",
  },
];

// ─── Single review row ────────────────────────────────────────────────────────

function ReviewRow({
  item,
  staff,
  docs,
  status,
  onChange,
}: {
  item: ReviewItemDef;
  staff: StaffProfile;
  docs: DocItem[];
  status: ItemReviewStatus;
  onChange: (id: string, s: ItemReviewStatus) => void;
}) {
  const hasData = item.getHasData(staff);
  const previewUrl = item.getPreview?.(docs);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-xl border transition-colors",
      status === "ok" && "border-emerald-500/30 bg-emerald-500/5",
      status === "supplement" && "border-yellow-500/30 bg-yellow-500/5",
      status === "incorrect" && "border-red-500/30 bg-red-500/5",
      status === "pending" && "border-border bg-card",
    )}>
      <div className="flex items-center gap-3 p-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
          {item.icon}
        </div>

        {/* Label + data status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {item.label}
            {item.optional && (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(tuỳ chọn)</span>
            )}
          </p>
          <p className={cn(
            "text-xs mt-0.5",
            hasData ? "text-emerald-600"
              : item.optional ? "text-muted-foreground"
              : "text-red-500"
          )}>
            {hasData ? "Đã nộp" : item.optional ? "— Chưa nộp (không bắt buộc)" : "⚠ Chưa nộp"}
          </p>
        </div>

        {/* Preview toggle */}
        {previewUrl && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Xem ảnh"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Status buttons */}
        <div className="flex gap-1 shrink-0">
          {STATUS_BTNS.map((btn) => {
            const isActive = status === btn.status;
            return (
              <button
                key={btn.status}
                type="button"
                onClick={() => onChange(item.id, btn.status)}
                title={btn.label}
                aria-label={btn.label}
                className={cn(
                  "flex items-center gap-1 px-2 h-7 rounded-lg border text-[11px] font-semibold transition-all",
                  isActive ? btn.activeCls : btn.cls,
                )}
              >
                <btn.icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{btn.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable image preview */}
      {expanded && previewUrl && (
        <div className="px-3 pb-3">
          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={previewUrl}
              alt={item.label}
              className="w-full max-h-48 object-contain rounded-lg border border-border bg-muted"
            />
            <p className="text-[10px] text-muted-foreground text-center mt-1">Nhấn để xem ảnh gốc ↗</p>
          </a>
        </div>
      )}
    </div>
  );
}

// ─── StaffReviewPanel ─────────────────────────────────────────────────────────

export interface ReviewState {
  [itemId: string]: ItemReviewStatus;
}

interface StaffReviewPanelProps {
  staff: StaffProfile;
  docs: DocItem[];
  onApprove: () => void;
  onRequestInfo: (serializedNotes: string) => void;
  onReject: () => void;
  isApproving: boolean;
  isRequesting: boolean;
}

export function StaffReviewPanel({
  staff,
  docs,
  onApprove,
  onRequestInfo,
  onReject,
  isApproving,
  isRequesting,
}: StaffReviewPanelProps) {
  const [reviewState, setReviewState] = useState<ReviewState>({});

  const handleChange = useCallback((id: string, status: ItemReviewStatus) => {
    setReviewState((prev) => ({ ...prev, [id]: status }));
  }, []);

  // Progress
  const total    = REVIEW_ITEMS.length;
  const reviewed = REVIEW_ITEMS.filter((i) => reviewState[i.id] && reviewState[i.id] !== "pending").length;
  // Optional items chưa nộp vẫn cho phép đánh OK (admin có thể bỏ qua)
  const requiredItems = REVIEW_ITEMS.filter((i) => !i.optional);
  const allOk = reviewed === total && REVIEW_ITEMS.every((i) => {
    const s = reviewState[i.id];
    if (i.optional && !i.getHasData(staff)) return s === "ok" || !s || s === "pending";
    return s === "ok";
  });
  const problemItems = REVIEW_ITEMS.filter(
    (i) => reviewState[i.id] === "supplement" || reviewState[i.id] === "incorrect"
  );
  const canSendRequest = problemItems.length > 0;
  const pct = Math.round((reviewed / total) * 100);

  // Group by category
  const categories = Array.from(new Set(REVIEW_ITEMS.map((i) => i.category)));

  const handleSendRequest = () => {
    const supplementIds   = problemItems.filter((i) => reviewState[i.id] === "supplement").map((i) => i.id);
    const incorrectIds    = problemItems.filter((i) => reviewState[i.id] === "incorrect").map((i) => i.id);
    const allProblemIds   = [...supplementIds, ...incorrectIds];
    const note = [
      incorrectIds.length > 0  && `Chưa đúng yêu cầu: ${incorrectIds.map((id) => REVIEW_ITEMS.find((i) => i.id === id)?.label).join(", ")}`,
      supplementIds.length > 0 && `Cần bổ sung thêm: ${supplementIds.map((id) => REVIEW_ITEMS.find((i) => i.id === id)?.label).join(", ")}`,
    ].filter(Boolean).join(". ");

    onRequestInfo(serializeAdminNotes(allProblemIds, note));
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="rounded-xl border border-border p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Tiến độ xét duyệt</span>
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">{reviewed}</span>/{total} mục
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {REVIEW_ITEMS.filter((i) => reviewState[i.id] === "ok").length} Đủ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
            {REVIEW_ITEMS.filter((i) => reviewState[i.id] === "supplement").length} Cần bổ sung
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {REVIEW_ITEMS.filter((i) => reviewState[i.id] === "incorrect").length} Chưa đúng
          </span>
        </div>
      </div>

      {/* Items grouped by category */}
      {categories.map((cat) => (
        <div key={cat} className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">{cat}</p>
          {REVIEW_ITEMS.filter((i) => i.category === cat).map((item) => (
            <ReviewRow
              key={item.id}
              item={item}
              staff={staff}
              docs={docs}
              status={reviewState[item.id] ?? "pending"}
              onChange={handleChange}
            />
          ))}
        </div>
      ))}

      {/* CTA */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        {reviewed < total && (
          <p className="text-xs text-muted-foreground text-center">
            Xét duyệt đủ {total} mục để mở khoá quyết định cuối
          </p>
        )}

        {allOk && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-sm text-emerald-700 font-semibold text-center">
            ✅ Tất cả {total} mục đạt yêu cầu — Sẵn sàng phê duyệt!
          </div>
        )}

        {canSendRequest && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-2.5 text-sm text-yellow-700 space-y-1">
            <p className="font-semibold">⚠ Phát hiện {problemItems.length} mục cần xử lý:</p>
            <ul className="space-y-0.5">
              {problemItems.map((item) => (
                <li key={item.id} className="text-xs flex items-center gap-1.5">
                  {reviewState[item.id] === "incorrect"
                    ? <XCircle className="w-3 h-3 text-red-500 shrink-0" aria-hidden="true" />
                    : <AlertTriangle className="w-3 h-3 text-yellow-600 shrink-0" aria-hidden="true" />}
                  {item.label} — {reviewState[item.id] === "incorrect" ? "Chưa đúng" : "Cần bổ sung"}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={onReject}
          >
            <XCircle className="w-4 h-4 mr-1.5" aria-hidden="true" /> Từ chối
          </Button>

          {canSendRequest && (
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow-sm shadow-yellow-500/20"
              onClick={handleSendRequest}
              disabled={isRequesting}
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Gửi yêu cầu ({problemItems.length} mục)
            </Button>
          )}

          <Button
            size="sm"
            className="flex-1 rounded-xl font-semibold shadow-md shadow-primary/20"
            onClick={onApprove}
            disabled={!allOk || isApproving}
            title={!allOk ? "Xét duyệt đủ tất cả mục và đánh Đầy đủ để phê duyệt" : undefined}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" aria-hidden="true" />
            {isApproving ? "Đang duyệt..." : "Phê duyệt tổng"}
          </Button>
        </div>
      </div>
    </div>
  );
}
