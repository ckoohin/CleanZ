"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, MapPin, XCircle } from "lucide-react";
import { MobileViewportPortal } from "@/components/layouts/mobile/MobileViewportPortal";
import http from "@/lib/api/http";
import { toast } from "sonner";

interface TaskerCheckinProofSheetProps {
  reason: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (proofPhotoUrl: string) => void;
}

/**
 * Ảnh minh chứng check-in bất thường. Portal ra document.body để phần tử fixed
 * luôn bám viewport thật, kể cả khi layout cha có transform/animation.
 */
export function TaskerCheckinProofSheet({
  reason,
  isSubmitting,
  onClose,
  onSubmit,
}: TaskerCheckinProofSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await http.post("/upload/image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = (res.data?.data ?? res.data)?.url as string | undefined;
      if (!url) throw new Error("missing url");
      setPhotoUrl(url);
    } catch {
      toast.error("Không thể tải ảnh lên, vui lòng thử lại");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isBusy = isUploading || isSubmitting;

  return (
    <MobileViewportPortal>
      <div
        className="fixed inset-0 z-[100] flex h-[100dvh] items-end justify-center md:items-center md:p-4"
        data-testid="checkin-proof-viewport"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={isBusy ? undefined : onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkin-proof-title"
          className="relative z-10 max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-3xl border border-border/50 bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl md:max-h-[calc(100dvh-2rem)] md:max-w-md md:rounded-3xl md:p-6"
        >
          <div className="space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <Camera className="size-6" />
            </div>
            <div className="space-y-1 text-center">
              <h3
                id="checkin-proof-title"
                className="text-base font-bold text-foreground"
              >
                Cần ảnh minh chứng
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Vui lòng chụp đúng địa chỉ khách hàng, hệ thống sẽ kiểm tra và đối soát lại.
              </p>
            </div>

            {photoUrl ? (
              <div className="relative overflow-hidden rounded-2xl border border-border/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl}
                  alt="Ảnh minh chứng check-in"
                  className="max-h-56 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  disabled={isBusy}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white active:scale-90 disabled:opacity-60"
                  aria-label="Xóa ảnh"
                >
                  <XCircle className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 py-8 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
              >
                {isUploading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Camera className="size-5" />
                )}
                <span className="text-xs font-semibold">
                  {isUploading
                    ? "Đang tải ảnh…"
                    : "Chụp / chọn ảnh hiện trường"}
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              capture="environment"
              className="hidden"
              onChange={(event) => void handleUpload(event.target.files)}
            />

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="flex-1 rounded-xl border border-border bg-muted/20 py-3 text-xs font-bold text-foreground transition-colors hover:bg-muted/50 disabled:opacity-60"
              >
                Để tôi tới gần hơn
              </button>
              <button
                type="button"
                onClick={() => photoUrl && onSubmit(photoUrl)}
                disabled={isBusy || !photoUrl}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-3 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MapPin className="size-3.5" />
                )}
                Check-in kèm ảnh
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </MobileViewportPortal>
  );
}
