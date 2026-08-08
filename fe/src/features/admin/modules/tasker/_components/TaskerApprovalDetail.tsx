"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Undo2,
  Send,
  AlertTriangle,
  Phone,
  MapPin,
  CreditCard,
  Briefcase,
  ImageIcon,
  ZoomIn,
  Clock,
  Info,
  ShieldCheck,
  IdCard,
  ScanFace,
  Scale,
  HeartPulse,
  Award,
  Minus,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";
import { formatDateVN } from "../constants";
import {
  useAdminTaskerDetail,
  useAdminTaskerDocuments,
  useApproveTasker,
  useRejectTasker,
  useRequestMoreInfoTasker,
  useDeleteTaskerProfile,
} from "../hooks/admin-tasker.hooks";
import {
  serializeAdminNotes,
  parseAdminNotes,
  buildReviewParts,
} from "@/lib/kyc/review-notes";
import { AdminReviewModal } from "./AdminReviewModal";
import ConfirmDialog from "@/components/common/ConfirmDialog";

// ─── Config ─────────────────────────────────────────────────────────────────

interface DocGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  required: boolean;
  hint?: string;
}

const DOC_GROUPS: DocGroup[] = [
  { id: "citizenCard", label: "CCCD / CMND (2 mặt)", icon: IdCard, required: true, hint: "Rõ nét, đủ 2 mặt" },
  { id: "idWithSelfie", label: "Ảnh selfie", icon: ScanFace, required: false, hint: "Nhìn thẳng, rõ mặt" },
  { id: "criminalRecord", label: "Lý lịch tư pháp", icon: Scale, required: false },
  { id: "healthCertificate", label: "Giấy khám sức khoẻ", icon: HeartPulse, required: false },
  { id: "certificate", label: "Chứng chỉ nghề nghiệp", icon: Award, required: false },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskerStatus }) {
  const MAP = {
    [TaskerStatus.PENDING]: { label: "Chờ duyệt", cls: "bg-[rgba(217,119,6,0.14)] text-[#D97706] border-[rgba(217,119,6,0.3)]" },
    [TaskerStatus.APPROVED]: { label: "Đã duyệt", cls: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] border-[rgba(14,159,110,0.3)]" },
    [TaskerStatus.REJECTED]: { label: "Từ chối", cls: "bg-[rgba(225,29,72,0.12)] text-[#E11D48] border-[rgba(225,29,72,0.3)]" },
    [TaskerStatus.NEED_INFO]: { label: "Cần bổ sung", cls: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] border-[rgba(37,99,235,0.3)]" },
  };
  const cfg = MAP[status] ?? MAP[TaskerStatus.PENDING];
  return (
    <Badge variant="outline" className={cn("text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-widest", cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

// ─── Resend control (nút yêu cầu gửi lại + ô comment) ───────────────────────────

function ResendControl({
  flagged,
  comment,
  label,
  onToggle,
  onComment,
}: {
  flagged: boolean;
  comment: string;
  label: string;
  onToggle: () => void;
  onComment: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasComment = comment.trim().length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={flagged ? "default" : "outline"}
          onClick={() => {
            // Lần đầu mở: đánh dấu mục cần gửi lại
            if (!flagged) onToggle();
          }}
          className={cn(
            "h-8 rounded-lg text-xs font-semibold gap-1.5",
            flagged
              ? "bg-[#D97706] hover:bg-[#b45309] text-white border-[#D97706]"
              : "border-[rgba(217,119,6,0.4)] text-[#D97706] hover:bg-[rgba(217,119,6,0.1)]"
          )}
        >
          {flagged ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              {hasComment ? "Đã ghi chú gửi lại" : "Cần ghi chú gửi lại"}
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Yêu cầu gửi lại
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="cz-admin w-80 space-y-2.5 border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[#D97706] flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Ghi chú cho ứng viên — cần cập nhật gì?
        </label>
        <Textarea
          autoFocus
          value={comment}
          onChange={(e) => onComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={`VD: ${label} chưa đạt, vui lòng cập nhật lại...`}
          className="rounded-lg resize-none text-sm bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-[#E11D48] hover:text-[#E11D48] hover:bg-[rgba(225,29,72,0.1)]"
            onClick={() => {
              onToggle();
              setOpen(false);
            }}
          >
            <Undo2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> Bỏ yêu cầu
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs rounded-lg bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]/90"
            onClick={() => setOpen(false)}
          >
            Xong
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Section card wrapper ───────────────────────────────────────────────────────

function SectionCard({
  flagged,
  children,
}: {
  flagged: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-[var(--c-card)] p-5 transition-colors",
        flagged ? "border-[rgba(217,119,6,0.4)] bg-[rgba(217,119,6,0.06)]" : "border-[var(--c-line)]"
      )}
    >
      {children}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

interface Props {
  taskerId: string;
}

export const TaskerApprovalDetail: React.FC<Props> = ({ taskerId }) => {
  const router = useRouter();

  const {
    data: tasker,
    isLoading,
    isError,
    error,
    refetch,
  } = useAdminTaskerDetail(taskerId);
  const { data: docsData, isLoading: isDocsLoading } = useAdminTaskerDocuments(taskerId);

  const approveMutation = useApproveTasker();
  const rejectMutation = useRejectTasker();
  const requestInfoMutation = useRequestMoreInfoTasker();
  const deleteMutation = useDeleteTaskerProfile();

  const [flagged, setFlagged] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

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

  const docs = (docsData?.documents ?? []).filter((d) => d.fileUrl) as Array<{
    id: string;
    type: string;
    fileUrl: string;
  }>;
  const getDocsByType = (type: string) => docs.filter((d) => d.type === type);

  const backToList = () => router.push("/admin/taskers/verification");

  const flaggedIds = Object.keys(flagged);
  const hasFlags = flaggedIds.length > 0;

  const status = tasker?.approvalStatus;
  const canReview =
    status === TaskerStatus.PENDING || status === TaskerStatus.NEED_INFO;

  // `flagged` map id → lý do riêng = chính là itemNotes. Lý do hiển thị inline
  // tại từng giấy tờ / trường phía tasker, nên không cần gộp thành 1 chuỗi note.
  const handleSendRequest = () => {
    requestInfoMutation.mutate(
      { id: taskerId, notes: serializeAdminNotes(flaggedIds, "", flagged) },
      { onSuccess: backToList }
    );
  };

  const handleApprove = () =>
    approveMutation.mutate(taskerId, { onSuccess: backToList });

  const handleDelete = () =>
    deleteMutation.mutate(taskerId, { onSuccess: backToList });

  const parsedNotes = parseAdminNotes(tasker?.adminNotes);
  const priorParts = buildReviewParts(tasker?.adminNotes);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const errorStatus = (error as { response?: { status?: number } })?.response?.status;
  const isNotFound = errorStatus === 404;

  // Lỗi thực sự (500/mạng), không phải 404 — cho phép người dùng thử lại.
  if (isError && !isNotFound) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-20 text-center flex flex-col items-center gap-4">
        <AlertTriangle className="w-12 h-12 text-[var(--c-muted)]/40" aria-hidden="true" />
        <div>
          <p className="font-bold text-[var(--c-ink)]">Không tải được hồ sơ tasker</p>
          <p className="text-sm text-[var(--c-muted)] mt-1">
            Đã có lỗi xảy ra khi tải hồ sơ. Vui lòng thử lại.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={backToList} className="rounded-xl border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại danh sách
          </Button>
          <Button onClick={() => refetch()} className="rounded-xl bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]/90">
            <RotateCcw className="w-4 h-4 mr-1.5" /> Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // 404 thật hoặc query thành công nhưng không có dữ liệu.
  if (!tasker) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-[var(--c-muted)]">Không tìm thấy hồ sơ tasker.</p>
        <Button variant="outline" onClick={backToList} className="mt-4 rounded-xl border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Quay lại danh sách
        </Button>
      </div>
    );
  }

  const initials =
    tasker.fullName?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "T";

  const infoItems = [
    { id: "phone", icon: Phone, label: "Số điện thoại", value: tasker.phone, required: true },
    { id: "address", icon: MapPin, label: "Địa chỉ hiện tại", value: tasker.addressCurrent, required: true },
    {
      id: "bankInfo",
      icon: CreditCard,
      label: "Thông tin ngân hàng",
      value: tasker.bankName
        ? `${tasker.bankName} • ${tasker.bankAccountNumber ?? "—"} • ${tasker.bankAccountName ?? "—"}`
        : undefined,
      required: true,
    },
    {
      id: "skills",
      icon: Briefcase,
      label: "Kỹ năng",
      value: tasker.skills || undefined,
      required: true,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={backToList} className="rounded-xl -ml-2 text-[var(--c-muted)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Danh sách chờ duyệt
      </Button>

      {/* Header */}
      <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar className="w-16 h-16 rounded-2xl shrink-0">
          <AvatarImage src={tasker.avatarUrl ?? undefined} />
          <AvatarFallback className="rounded-2xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] text-2xl font-black">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-[var(--c-ink)]">{tasker.fullName ?? "Đối tác"}</h1>
            <StatusBadge status={tasker.approvalStatus} />
          </div>
          <p className="text-sm text-[var(--c-muted)] mt-1">
            {tasker.phone ?? "Chưa có SĐT"}
            {tasker.createdAt && (
              <> • Đăng ký {formatDateVN(tasker.createdAt)}</>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Giấy tờ */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--c-muted)] flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Giấy tờ định danh & pháp lý
          </h2>

          {isDocsLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-video rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 items-start">
              {DOC_GROUPS.map((group) => {
                const typeDocs = getDocsByType(group.id);
                const isFlagged = group.id in flagged;
                return (
                  <SectionCard key={group.id} flagged={isFlagged}>
                    <div className="mb-3">
                      <p className="text-sm font-bold flex items-center gap-2 text-[var(--c-ink)]">
                        <group.icon className="w-4 h-4 text-[var(--c-primary-strong)]" /> {group.label}
                        {!group.required && (
                          <span className="text-[10px] font-normal text-[var(--c-muted)]">(tuỳ chọn)</span>
                        )}
                      </p>
                      <p className={cn(
                        "text-xs mt-0.5 flex items-center gap-1",
                        typeDocs.length > 0 ? "text-[#0E9F6E]" : group.required ? "text-[#E11D48]" : "text-[var(--c-muted)]"
                      )}>
                        {typeDocs.length > 0 ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Đã nộp {typeDocs.length} ảnh
                          </>
                        ) : group.required ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Chưa nộp
                          </>
                        ) : (
                          <>
                            <Minus className="w-3.5 h-3.5" aria-hidden="true" /> Chưa nộp (không bắt buộc)
                          </>
                        )}
                        {group.hint && typeDocs.length > 0 && <span className="text-[var(--c-muted)]"> • {group.hint}</span>}
                      </p>
                    </div>

                    {typeDocs.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {typeDocs.map((doc, idx) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setLightbox(doc.fileUrl)}
                            className="group relative aspect-video rounded-xl border border-[var(--c-line)] overflow-hidden bg-[var(--c-card-2)]"
                          >
                            <img
                              src={doc.fileUrl}
                              alt={`${group.label} ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white/90 text-gray-900 rounded-full px-3 py-1.5 text-xs font-semibold shadow">
                                <ZoomIn className="w-3.5 h-3.5" /> Xem ảnh
                              </span>
                            </div>
                            {typeDocs.length > 1 && (
                              <Badge className="absolute top-2 left-2 bg-black/60 text-white border-none text-[10px]">
                                Ảnh {idx + 1}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed border-[var(--c-line-strong)] rounded-xl py-8 flex flex-col items-center gap-2 text-center">
                        <ImageIcon className="w-8 h-8 text-[var(--c-muted)]/50" />
                        <p className="text-xs text-[var(--c-muted)]">Ứng viên chưa tải lên</p>
                      </div>
                    )}

                    {canReview && (
                      <div className="mt-4 pt-4 border-t border-[var(--c-line)]">
                        <ResendControl
                          flagged={isFlagged}
                          comment={flagged[group.id] ?? ""}
                          label={group.label}
                          onToggle={() => toggleFlag(group.id)}
                          onComment={(v) => setComment(group.id, v)}
                        />
                      </div>
                    )}
                  </SectionCard>
                );
              })}
            </div>
          )}
        </div>

        {/* Thông tin khác */}
        <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--c-muted)] flex items-center gap-2">
              <Info className="w-4 h-4" /> Thông tin hồ sơ
            </h2>
            {infoItems.map((item) => {
              const isFlagged = item.id in flagged;
              const Icon = item.icon;
              return (
                <SectionCard key={item.id} flagged={isFlagged}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[var(--c-card-2)] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[var(--c-muted)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--c-ink)]">{item.label}</p>
                      {item.value ? (
                        <p className="text-sm text-[var(--c-ink-soft)] mt-0.5 break-words">{item.value}</p>
                      ) : (
                        <p className="text-xs text-[#E11D48] mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Chưa cập nhật
                        </p>
                      )}
                    </div>
                  </div>

                  {canReview && (
                    <div className="mt-4 pt-4 border-t border-[var(--c-line)]">
                      <ResendControl
                        flagged={isFlagged}
                        comment={flagged[item.id] ?? ""}
                        label={item.label}
                        onToggle={() => toggleFlag(item.id)}
                        onComment={(v) => setComment(item.id, v)}
                      />
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </div>

        {/* Quyết định phê duyệt — full width, dưới cùng */}
        <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-5 space-y-4 mt-4">
          <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--c-ink)]">
            <ShieldCheck className="w-4 h-4 text-[var(--c-primary-strong)]" /> Quyết định phê duyệt
          </h2>

            {/* Ghi chú lần trước — hiển thị rõ từng phần đã yêu cầu + lý do riêng */}
            {tasker.adminNotes && (
              <div className="rounded-xl border-l-4 border-[#2563EB] bg-[rgba(37,99,235,0.08)] p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">
                  Đã yêu cầu lần trước
                </p>
                {priorParts.length > 0 && (
                  <ul className="space-y-1">
                    {priorParts.map((p) => (
                      <li key={p.id} className="text-xs leading-relaxed flex gap-1.5 text-[var(--c-ink)]">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          <span className="font-semibold">{p.label}</span>
                          {p.note && <span className="text-[var(--c-muted)]"> — {p.note}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {parsedNotes?.note ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-[var(--c-muted)]">
                    {parsedNotes.note}
                  </p>
                ) : !parsedNotes ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-[var(--c-ink)]">{tasker.adminNotes}</p>
                ) : null}
              </div>
            )}

            {!canReview ? (
              <div className="rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)] p-4 text-center text-sm text-[var(--c-muted)] flex flex-col items-center gap-2">
                {status === TaskerStatus.APPROVED ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-[#0E9F6E]" />
                    <span className="font-semibold text-[#0E9F6E]">Hồ sơ đã được phê duyệt</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-[#E11D48]" />
                    <span className="font-semibold text-[#E11D48]">Hồ sơ đã bị từ chối</span>
                  </>
                )}
              </div>
            ) : (
              <>
                {hasFlags ? (
                  <div className="rounded-xl bg-[rgba(217,119,6,0.14)] border border-[rgba(217,119,6,0.3)] px-3 py-2.5 text-sm text-[#D97706]">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> {flaggedIds.length} mục cần gửi lại
                    </p>
                    <p className="text-xs mt-1">Không thể duyệt khi còn mục yêu cầu gửi lại.</p>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--c-muted)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Kiểm tra ảnh & thông tin rồi ra quyết định.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button
                    variant="outline"
                    className="rounded-xl text-[#E11D48] border-[rgba(225,29,72,0.3)] hover:bg-[rgba(225,29,72,0.1)]"
                    onClick={() => setRejectOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Từ chối hồ sơ
                  </Button>

                  {hasFlags && (
                    <Button
                      className="flex-1 rounded-xl bg-[#D97706] hover:bg-[#b45309] text-white font-semibold"
                      onClick={handleSendRequest}
                      disabled={requestInfoMutation.isPending}
                    >
                      <Send className="w-4 h-4 mr-1.5" />
                      {requestInfoMutation.isPending ? "Đang gửi..." : `Gửi yêu cầu gửi lại (${flaggedIds.length})`}
                    </Button>
                  )}

                  <Button
                    className="flex-1 rounded-xl font-semibold shadow-md shadow-[var(--c-primary)]/20 bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]/90"
                    onClick={handleApprove}
                    disabled={hasFlags || approveMutation.isPending}
                    title={hasFlags ? "Bỏ các mục yêu cầu gửi lại trước khi phê duyệt" : undefined}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {approveMutation.isPending ? "Đang duyệt..." : "Đồng ý phê duyệt"}
                  </Button>
                </div>
              </>
            )}

            {/* Vùng nguy hiểm: xóa hồ sơ để buộc nộp lại từ đầu (chỉ khi chưa duyệt) */}
            {status !== TaskerStatus.APPROVED && (
              <div className="pt-4 border-t border-dashed border-[rgba(225,29,72,0.3)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#E11D48]">
                      Xóa hồ sơ & yêu cầu nộp lại
                    </p>
                    <p className="text-xs text-[var(--c-muted)] mt-0.5">
                      Xóa toàn bộ thông tin và ảnh đã nộp. Ứng viên sẽ phải đăng ký lại từ đầu.
                    </p>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="outline"
                        disabled={deleteMutation.isPending}
                        className="rounded-xl text-[#E11D48] border-[rgba(225,29,72,0.3)] hover:bg-[rgba(225,29,72,0.1)] shrink-0"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        {deleteMutation.isPending ? "Đang xóa..." : "Xóa hồ sơ"}
                      </Button>
                    }
                    title="Xóa hồ sơ tasker này?"
                    description="Toàn bộ thông tin và ảnh giấy tờ đã nộp sẽ bị xóa vĩnh viễn. Ứng viên sẽ phải nộp lại hồ sơ từ đầu. Hành động này không thể hoàn tác."
                    confirmText="Xóa & yêu cầu nộp lại"
                    cancelText="Hủy"
                    onConfirm={handleDelete}
                  />
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="cz-admin max-w-4xl w-[95vw] p-2 bg-black/95 border-none">

          <DialogTitle className="sr-only">Xem ảnh giấy tờ</DialogTitle>
          {lightbox && (
            <img
              src={lightbox}
              alt="Ảnh giấy tờ"
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <AdminReviewModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Xác nhận từ chối hồ sơ"
        description="Nêu rõ lý do cụ thể để ứng viên hiểu và có thể cải thiện."
        isLoading={rejectMutation.isPending}
        onConfirm={(notes) =>
          rejectMutation.mutate(
            // Đính kèm các phần đã gắn cờ (+ lý do riêng) để tasker thấy rõ chỗ cần sửa,
            // `notes` của modal đóng vai trò lý do từ chối chung.
            { id: taskerId, notes: serializeAdminNotes(flaggedIds, notes, flagged) },
            { onSuccess: () => { setRejectOpen(false); backToList(); } }
          )
        }
      />
    </div>
  );
};
