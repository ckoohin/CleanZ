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
  { id: "idWithSelfie", label: "Ảnh selfie cầm CCCD", icon: ScanFace, required: false, hint: "Nhìn thẳng, rõ mặt" },
  { id: "criminalRecord", label: "Lý lịch tư pháp", icon: Scale, required: false },
  { id: "healthCertificate", label: "Giấy khám sức khoẻ", icon: HeartPulse, required: false },
  { id: "certificate", label: "Chứng chỉ nghề nghiệp", icon: Award, required: false },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TaskerStatus }) {
  const MAP = {
    [TaskerStatus.PENDING]: { label: "Chờ duyệt", cls: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30" },
    [TaskerStatus.APPROVED]: { label: "Đã duyệt", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
    [TaskerStatus.REJECTED]: { label: "Từ chối", cls: "bg-red-500/10 text-red-700 border-red-500/30" },
    [TaskerStatus.NEED_INFO]: { label: "Cần bổ sung", cls: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
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
              ? "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
              : "border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
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

      <PopoverContent align="end" className="w-80 space-y-2.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-yellow-700 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Ghi chú cho ứng viên — cần cập nhật gì?
        </label>
        <Textarea
          autoFocus
          value={comment}
          onChange={(e) => onComment(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={`VD: ${label} chưa đạt, vui lòng cập nhật lại...`}
          className="rounded-lg resize-none text-sm bg-background"
        />
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
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
            className="h-8 text-xs rounded-lg"
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
        "rounded-2xl border bg-card p-5 transition-colors",
        flagged ? "border-yellow-500/40 bg-yellow-500/5" : "border-border"
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

  const { data: tasker, isLoading } = useAdminTaskerDetail(taskerId);
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

  if (!tasker) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Không tìm thấy hồ sơ tasker.</p>
        <Button variant="outline" onClick={backToList} className="mt-4 rounded-xl">
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
      id: "experience",
      icon: Briefcase,
      label: "Kinh nghiệm & kỹ năng",
      value: [tasker.experience, tasker.skills].filter(Boolean).join(" • ") || undefined,
      required: true,
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Back */}
      <Button variant="ghost" onClick={backToList} className="rounded-xl -ml-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Danh sách chờ duyệt
      </Button>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar className="w-16 h-16 rounded-2xl shrink-0">
          <AvatarImage src={tasker.avatarUrl ?? undefined} />
          <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-2xl font-black">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight">{tasker.fullName ?? "Đối tác"}</h1>
            <StatusBadge status={tasker.approvalStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {tasker.phone ?? "Chưa có SĐT"}
            {tasker.createdAt && (
              <> • Đăng ký {new Date(tasker.createdAt).toLocaleDateString("vi-VN")}</>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Giấy tờ */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
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
                      <p className="text-sm font-bold flex items-center gap-2">
                        <group.icon className="w-4 h-4 text-primary" /> {group.label}
                        {!group.required && (
                          <span className="text-[10px] font-normal text-muted-foreground">(tuỳ chọn)</span>
                        )}
                      </p>
                      <p className={cn(
                        "text-xs mt-0.5 flex items-center gap-1",
                        typeDocs.length > 0 ? "text-emerald-600" : group.required ? "text-red-500" : "text-muted-foreground"
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
                        {group.hint && typeDocs.length > 0 && <span className="text-muted-foreground"> • {group.hint}</span>}
                      </p>
                    </div>

                    {typeDocs.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {typeDocs.map((doc, idx) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setLightbox(doc.fileUrl)}
                            className="group relative aspect-video rounded-xl border border-border overflow-hidden bg-muted"
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
                      <div className="border border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Ứng viên chưa tải lên</p>
                      </div>
                    )}

                    {canReview && (
                      <div className="mt-4 pt-4 border-t border-border/60">
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
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4" /> Thông tin hồ sơ
            </h2>
            {infoItems.map((item) => {
              const isFlagged = item.id in flagged;
              const Icon = item.icon;
              return (
                <SectionCard key={item.id} flagged={isFlagged}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{item.label}</p>
                      {item.value ? (
                        <p className="text-sm text-foreground/80 mt-0.5 break-words">{item.value}</p>
                      ) : (
                        <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Chưa cập nhật
                        </p>
                      )}
                    </div>
                  </div>

                  {canReview && (
                    <div className="mt-4 pt-4 border-t border-border/60">
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
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 mt-4">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Quyết định phê duyệt
          </h2>

            {/* Ghi chú lần trước — hiển thị rõ từng phần đã yêu cầu + lý do riêng */}
            {tasker.adminNotes && (
              <div className="rounded-xl border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
                  Đã yêu cầu lần trước
                </p>
                {priorParts.length > 0 && (
                  <ul className="space-y-1">
                    {priorParts.map((p) => (
                      <li key={p.id} className="text-xs leading-relaxed flex gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          <span className="font-semibold">{p.label}</span>
                          {p.note && <span className="text-muted-foreground"> — {p.note}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {parsedNotes?.note ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {parsedNotes.note}
                  </p>
                ) : !parsedNotes ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{tasker.adminNotes}</p>
                ) : null}
              </div>
            )}

            {!canReview ? (
              <div className="rounded-xl bg-muted/50 border border-border p-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                {status === TaskerStatus.APPROVED ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="font-semibold text-emerald-700">Hồ sơ đã được phê duyệt</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-500" />
                    <span className="font-semibold text-red-700">Hồ sơ đã bị từ chối</span>
                  </>
                )}
              </div>
            ) : (
              <>
                {hasFlags ? (
                  <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 px-3 py-2.5 text-sm text-yellow-700">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> {flaggedIds.length} mục cần gửi lại
                    </p>
                    <p className="text-xs mt-1">Không thể duyệt khi còn mục yêu cầu gửi lại.</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Kiểm tra ảnh & thông tin rồi ra quyết định.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button
                    variant="outline"
                    className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => setRejectOpen(true)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Từ chối hồ sơ
                  </Button>

                  {hasFlags && (
                    <Button
                      className="flex-1 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                      onClick={handleSendRequest}
                      disabled={requestInfoMutation.isPending}
                    >
                      <Send className="w-4 h-4 mr-1.5" />
                      {requestInfoMutation.isPending ? "Đang gửi..." : `Gửi yêu cầu gửi lại (${flaggedIds.length})`}
                    </Button>
                  )}

                  <Button
                    className="flex-1 rounded-xl font-semibold shadow-md shadow-primary/20"
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
              <div className="pt-4 border-t border-dashed border-red-200 dark:border-red-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">
                      Xóa hồ sơ & yêu cầu nộp lại
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Xóa toàn bộ thông tin và ảnh đã nộp. Ứng viên sẽ phải đăng ký lại từ đầu.
                    </p>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="outline"
                        disabled={deleteMutation.isPending}
                        className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
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
        <DialogContent className="max-w-4xl w-[95vw] p-2 bg-black/95 border-none">

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
