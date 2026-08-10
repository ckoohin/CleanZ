"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Camera,
  Clock3,
  Loader2,
  MapPin,
  PhoneCall,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { MobileViewportPortal } from "@/components/layouts/mobile/MobileViewportPortal";
import type { ReportBookingAbsencePayload } from "@/features/booking/types/absence-report.types";
import { uploadApi } from "@/lib/api/upload.service";
import { toast } from "@/lib/toast";

interface TaskerCustomerAbsenceSheetProps {
  estimatedCompensation: number;
  reviewSlaHours: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ReportBookingAbsencePayload) => void;
}

type EvidenceKind = "address" | "callHistory";

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

function EvidenceUploadField({
  kind,
  photoUrl,
  isUploading,
  busy,
  inputRef,
  onPick,
  onRemove,
  onFiles,
}: {
  kind: EvidenceKind;
  photoUrl: string | null;
  isUploading: boolean;
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: () => void;
  onRemove: () => void;
  onFiles: (files: FileList | null) => void;
}) {
  const isAddress = kind === "address";
  const Icon = isAddress ? MapPin : PhoneCall;
  const label = isAddress ? "Ảnh địa chỉ khách hàng" : "Ảnh lịch sử cuộc gọi";
  const description = isAddress
    ? "Chụp rõ số nhà, biển tên hoặc khu vực trước cửa/sảnh."
    : "Chọn ảnh chụp màn hình thể hiện các cuộc gọi đã thực hiện cho khách.";
  const prompt = isAddress
    ? "Chụp hoặc chọn ảnh địa chỉ"
    : "Chọn ảnh lịch sử cuộc gọi";

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl ${
              isAddress
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            <Icon className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">
              {label} <span className="text-rose-600">*</span>
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>

      {photoUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt={label}
            className="max-h-64 w-full object-contain"
          />
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-white shadow-lg disabled:opacity-50"
            aria-label={`Xóa ${label.toLowerCase()}`}
          >
            <XCircle className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className={`flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 text-center transition-colors disabled:opacity-60 ${
            isAddress
              ? "border-amber-300 bg-amber-50/60 text-amber-800 hover:bg-amber-50"
              : "border-blue-300 bg-blue-50/60 text-blue-800 hover:bg-blue-50"
          }`}
        >
          {isUploading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <Camera className="size-6" />
          )}
          <span className="text-sm font-bold">
            {isUploading ? "Đang tải ảnh…" : prompt}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        aria-label={label}
        accept="image/jpeg,image/png"
        capture={isAddress ? "environment" : undefined}
        className="hidden"
        onChange={(event) => onFiles(event.target.files)}
      />
    </section>
  );
}

export function TaskerCustomerAbsenceSheet({
  estimatedCompensation,
  reviewSlaHours,
  isSubmitting,
  onClose,
  onSubmit,
}: TaskerCustomerAbsenceSheetProps) {
  const addressInputRef = useRef<HTMLInputElement>(null);
  const callHistoryInputRef = useRef<HTMLInputElement>(null);
  const [addressPhotoUrl, setAddressPhotoUrl] = useState<string | null>(null);
  const [callHistoryPhotoUrl, setCallHistoryPhotoUrl] = useState<string | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [uploadingKind, setUploadingKind] = useState<EvidenceKind | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const upload = async (kind: EvidenceKind, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      toast.error("Chỉ nhận ảnh JPG hoặc PNG.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB.");
      return;
    }

    setUploadingKind(kind);
    try {
      const uploadedUrl = await uploadApi.uploadImage(file, {
        folder: "booking-absence",
      });
      if (kind === "address") {
        setAddressPhotoUrl(uploadedUrl);
      } else {
        setCallHistoryPhotoUrl(uploadedUrl);
      }
    } catch {
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploadingKind(null);
      const inputRef =
        kind === "address" ? addressInputRef : callHistoryInputRef;
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const busy = uploadingKind !== null || isSubmitting;
  return (
    <MobileViewportPortal>
      <div className="fixed inset-0 z-[110] flex h-[100dvh] items-end justify-center md:items-center md:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
          onClick={busy ? undefined : onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 28, scale: 0.98 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="absence-sheet-title"
          className="relative z-10 max-h-[calc(100dvh-0.75rem)] w-full overflow-y-auto rounded-t-[28px] border border-border/60 bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl md:max-h-[calc(100dvh-2rem)] md:max-w-xl md:rounded-[28px] md:p-7"
        >
          <div className="space-y-6">
            <header className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <p className="text-xs font-black uppercase  text-amber-600">
                </p>
                <h2
                  id="absence-sheet-title"
                  className="text-xl font-black text-foreground"
                >
                  Không liên hệ được khách
                </h2>
                <p className="max-w-md text-sm leading-6 text-muted-foreground">
                  Vui lòng cung cấp minh chứng hình ảnh để đối soát
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/30 text-muted-foreground disabled:opacity-50"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="space-y-4">
              <EvidenceUploadField
                kind="address"
                photoUrl={addressPhotoUrl}
                isUploading={uploadingKind === "address"}
                busy={busy}
                inputRef={addressInputRef}
                onPick={() => addressInputRef.current?.click()}
                onRemove={() => setAddressPhotoUrl(null)}
                onFiles={(files) => void upload("address", files)}
              />
              <EvidenceUploadField
                kind="callHistory"
                photoUrl={callHistoryPhotoUrl}
                isUploading={uploadingKind === "callHistory"}
                busy={busy}
                inputRef={callHistoryInputRef}
                onPick={() => callHistoryInputRef.current?.click()}
                onRemove={() => setCallHistoryPhotoUrl(null)}
                onFiles={(files) => void upload("callHistory", files)}
              />
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-bold">
                Ghi chú cho Admin{" "}
                <span className="font-normal text-muted-foreground">
                  (không bắt buộc)
                </span>
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Ví dụ: đã gọi 3 lần, bấm chuông và chờ tại sảnh…"
                className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <p className="text-right text-xs text-muted-foreground">
                {note.length}/1000
              </p>
            </label>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="flex items-start gap-2 font-semibold">
                <ShieldCheck className="mt-1 size-4 shrink-0" /> 
                Booking sẽ hủy sau khi xác nhận, khoản bồi hoàn sẽ được chuyển vào ví sau khi hệ thống duyệt
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-2xl border border-border px-5 py-3.5 text-sm font-bold disabled:opacity-50 sm:min-w-32"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() =>
                  addressPhotoUrl &&
                  callHistoryPhotoUrl &&
                  onSubmit({
                    proofPhotoUrl: addressPhotoUrl,
                    callHistoryPhotoUrl,
                    note: note.trim() || undefined,
                  })
                }
                disabled={busy || !addressPhotoUrl || !callHistoryPhotoUrl}
                className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition active:scale-[0.98] disabled:opacity-50 sm:min-w-52"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                Gửi báo cáo & hủy đơn
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </MobileViewportPortal>
  );
}
