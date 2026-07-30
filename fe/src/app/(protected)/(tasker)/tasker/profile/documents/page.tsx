"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileBadge2,
  Loader2,
  Send,
  Upload,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useTaskerProfile,
  useUpdateMyDocuments,
} from "@/features/tasker/hooks/tasker.hooks";
import { getReviewPartMap, type ReviewPart } from "@/lib/kyc/review-notes";
import { TaskerStatusBanner } from "@/features/tasker/_components/TaskerStatusBanner";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";

/** Các field multipart khớp với PATCH /tasker/profile/documents phía BE. */
type DocField =
  | "avatar"
  | "docFront"
  | "docBack"
  | "criminalRecord"
  | "healthCertificate"
  | "certificate";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface DocConfig {
  field: DocField;
  label: string;
  /** id tương ứng trong ghi chú review của admin (review-notes.ts). */
  reviewId: string;
  hint: string;
}

const DOC_CONFIGS: DocConfig[] = [
  {
    field: "avatar",
    label: "Ảnh selfie xác minh",
    reviewId: "idWithSelfie",
    hint: "Nhìn thẳng, rõ mặt",
  },
  {
    field: "docFront",
    label: "Mặt trước CCCD",
    reviewId: "citizenCard",
    hint: "Rõ nét, không lóa sáng",
  },
  {
    field: "docBack",
    label: "Mặt sau CCCD",
    reviewId: "citizenCard",
    hint: "Rõ nét, không lóa sáng",
  },
  {
    field: "criminalRecord",
    label: "Lý lịch tư pháp",
    reviewId: "criminalRecord",
    hint: "Còn hiệu lực trong 6 tháng",
  },
  {
    field: "healthCertificate",
    label: "Giấy khám sức khỏe",
    reviewId: "healthCertificate",
    hint: "Còn hiệu lực trong 12 tháng",
  },
  {
    field: "certificate",
    label: "Chứng chỉ nghề nghiệp",
    reviewId: "certificate",
    hint: "Liên quan đến dịch vụ đăng ký",
  },
];

type DocCardState = "locked" | "resubmit" | "missing";

function DocumentCard({
  config,
  currentUrl,
  state,
  flag,
  approved,
  selectedFile,
  onSelect,
  onClear,
}: {
  config: DocConfig;
  currentUrl: string | null;
  state: DocCardState;
  flag?: ReviewPart;
  approved: boolean;
  selectedFile?: File;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Object URL chỉ tạo lại khi đổi file, tránh leak khi re-render.
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  const canUpload = state !== "locked";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 space-y-3",
        state === "resubmit"
          ? "border-red-500/40"
          : state === "missing"
            ? "border-amber-500/30"
            : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold">{config.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{config.hint}</p>
        </div>
        {state === "locked" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide shrink-0",
              approved
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-yellow-500/10 text-yellow-700",
            )}
          >
            {approved ? (
              <CheckCircle2 className="size-3" aria-hidden="true" />
            ) : (
              <Clock className="size-3" aria-hidden="true" />
            )}
            {approved ? "Đã duyệt" : "Đang chờ duyệt"}
          </span>
        )}
        {state === "resubmit" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 shrink-0">
            <AlertCircle className="size-3" aria-hidden="true" />
            Cần nộp lại
          </span>
        )}
        {state === "missing" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 shrink-0">
            Còn thiếu
          </span>
        )}
      </div>

      {flag?.note && (
        <p className="text-xs text-red-600 bg-red-500/5 border border-red-500/20 rounded-xl px-3 py-2">
          Lý do từ quản trị viên: {flag.note}
        </p>
      )}

      {/* Ảnh đã nộp trên hệ thống */}
      {currentUrl && (
        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={config.label}
            className="w-full h-full object-cover"
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 text-[10px] text-white text-center py-1 font-bold",
              state === "locked" ? "bg-emerald-600/90" : "bg-red-500/90",
            )}
          >
            {state !== "locked"
              ? "Ảnh cũ"
              : approved
                ? "Ảnh đã duyệt — không thể thay đổi"
                : "Ảnh đang chờ duyệt — không thể thay đổi"}
          </div>
        </div>
      )}

      {/* Ảnh mới đã chọn, chờ gửi */}
      {previewUrl && (
        <div className="relative w-full h-36 rounded-xl overflow-hidden border border-primary/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`${config.label} mới`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-primary/90 text-[10px] text-white text-center py-1 font-bold">
            Mới chọn — chưa gửi
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Bỏ chọn ${config.label}`}
            className="absolute top-2 right-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {canUpload && !selectedFile && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-full border-2 border-dashed rounded-xl p-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors",
            state === "resubmit"
              ? "border-red-500/40 text-red-600 hover:bg-red-500/5"
              : "border-primary/40 text-primary hover:bg-primary/5",
          )}
        >
          <Upload className="size-4" aria-hidden="true" />
          {state === "resubmit" ? "Chọn ảnh nộp lại" : "Chọn ảnh bổ sung"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            toast.error("Chỉ hỗ trợ ảnh JPG hoặc PNG");
            return;
          }
          if (file.size > MAX_FILE_SIZE) {
            toast.error("Ảnh tối đa 5MB");
            return;
          }
          onSelect(file);
        }}
      />
    </div>
  );
}

export default function TaskerDocumentsPage() {
  const { data: tasker, isLoading } = useTaskerProfile();
  const updateDocuments = useUpdateMyDocuments();
  const [selectedFiles, setSelectedFiles] = useState<
    Partial<Record<DocField, File>>
  >({});

  const approval = tasker?.approvalStatus;
  const isApproved = approval === TaskerStatus.APPROVED;
  const isNeedInfo = approval === TaskerStatus.NEED_INFO;
  const isRejected = approval === TaskerStatus.REJECTED;
  const reviewMap = getReviewPartMap(tasker?.adminNotes);

  const currentUrlByField: Record<DocField, string | null> = {
    avatar: tasker?.avatarUrl ?? null,
    docFront: tasker?.document?.frontUrl ?? null,
    docBack: tasker?.document?.backUrl ?? null,
    criminalRecord: tasker?.document?.criminalRecordUrl ?? null,
    healthCertificate: tasker?.document?.healthCertificateUrl ?? null,
    certificate: tasker?.document?.certificateUrl ?? null,
  };

  // Cùng rule với BE: giấy tờ đã có bị khóa, trừ khi admin gắn cờ đúng mục đó
  // trong trạng thái NEED_INFO. Mục còn trống luôn được phép bổ sung.
  const stateOf = (config: DocConfig): DocCardState => {
    const currentUrl = currentUrlByField[config.field];
    const adminRequested = isNeedInfo && !!reviewMap[config.reviewId];
    if (currentUrl && adminRequested) return "resubmit";
    if (currentUrl) return "locked";
    return "missing";
  };

  const selectedCount = Object.values(selectedFiles).filter(Boolean).length;

  const handleSubmit = () => {
    const entries = DOC_CONFIGS.flatMap((config) => {
      const file = selectedFiles[config.field];
      return file ? [{ field: config.field, file }] : [];
    });
    if (entries.length === 0) return;

    // Cùng rule với BE: admin yêu cầu CCCD thì phải nộp lại đủ cả 2 mặt.
    const citizenFlagged = isNeedInfo && !!reviewMap.citizenCard;
    const hasFront = entries.some((e) => e.field === "docFront");
    const hasBack = entries.some((e) => e.field === "docBack");
    if (citizenFlagged && (hasFront || hasBack) && !(hasFront && hasBack)) {
      toast.error(
        "Quản trị viên yêu cầu cập nhật CCCD — vui lòng chọn đủ cả mặt trước và mặt sau",
      );
      return;
    }

    const formData = new FormData();
    for (const { field, file } of entries) {
      formData.append(field, file);
    }
    updateDocuments.mutate(formData, {
      onSuccess: () => setSelectedFiles({}),
    });
  };

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-4 w-full">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!tasker) {
    return (
      <div className="p-5 md:p-8 max-w-3xl mx-auto w-full text-center space-y-4">
        <FileBadge2
          className="size-10 mx-auto text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          Bạn chưa có hồ sơ đối tác. Hãy nộp hồ sơ trước khi quản lý giấy tờ.
        </p>
        <Button asChild className="rounded-xl">
          <Link href="/tasker/onboarding">Nộp hồ sơ ngay</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto w-full pb-32">
      <div className="mb-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground"
        >
          <Link href="/tasker/profile">
            <ArrowLeft className="size-4" aria-hidden="true" /> Quay lại Tài
            khoản
          </Link>
        </Button>
        <h1 className="text-xl font-black tracking-tight">Hồ sơ và giấy tờ</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Giấy tờ xác minh danh tính của bạn.
        </p>
      </div>

      {!isApproved && (
        <div className="mb-6 space-y-3">
          <TaskerStatusBanner
            status={approval}
            adminNotes={tasker.adminNotes}
          />
          {isRejected && (
            <p className="text-xs text-muted-foreground">
              Giấy tờ hiện đã bị khóa. Vui lòng{" "}
              <Link
                href="/tasker/onboarding"
                className="font-bold underline text-primary"
              >
                nộp lại hồ sơ đầy đủ
              </Link>{" "}
              để được xét duyệt lại.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DOC_CONFIGS.map((config) => {
          const state = stateOf(config);
          return (
            <DocumentCard
              key={config.field}
              config={config}
              currentUrl={currentUrlByField[config.field]}
              state={state}
              flag={
                state === "resubmit" ? reviewMap[config.reviewId] : undefined
              }
              approved={isApproved}
              selectedFile={selectedFiles[config.field]}
              onSelect={(file) =>
                setSelectedFiles((prev) => ({ ...prev, [config.field]: file }))
              }
              onClear={() =>
                setSelectedFiles((prev) => {
                  const next = { ...prev };
                  delete next[config.field];
                  return next;
                })
              }
            />
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div className="mt-6 flex items-center gap-4">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={updateDocuments.isPending}
            className="rounded-xl h-12 px-8 font-bold shadow-md shadow-primary/20"
          >
            {updateDocuments.isPending ? (
              <>
                <Loader2
                  className="size-4 animate-spin mr-2"
                  aria-hidden="true"
                />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="size-4 mr-2" aria-hidden="true" />
                Gửi {selectedCount} giấy tờ
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Sau khi gửi, hồ sơ sẽ được duyệt lại.
          </p>
        </div>
      )}
    </div>
  );
}
