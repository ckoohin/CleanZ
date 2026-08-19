"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, ImageOff, RotateCcw, X } from "lucide-react";
import { uploadApi } from "@/lib/api/upload.service";
import { compressImage } from "@/lib/utils/image-compress";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** Gom ảnh ca làm việc vào thư mục riêng để đối soát và dọn dẹp về sau. */
export const WORK_PHOTO_FOLDER = "CleanZ/booking-work";
export const WORK_PHOTOS_MAX = 10;

/** Upload song song vừa phải: nhanh hơn tuần tự, không làm nghẽn mạng 3G/4G yếu. */
const UPLOAD_CONCURRENCY = 3;

export interface WorkPhotoDraft {
  url: string;
  publicId?: string;
}

type PhotoStatus = "compressing" | "uploading" | "done" | "error";

interface PhotoItem {
  localId: string;
  file: File;
  /** Ảnh hiển thị ngay: objectURL của file gốc, đổi sang URL Cloudinary khi xong. */
  previewUrl: string;
  objectUrl: string | null;
  status: PhotoStatus;
  progress: number;
  url?: string;
  publicId?: string;
}

interface TaskerWorkPhotoPickerProps {
  onChange: (photos: WorkPhotoDraft[]) => void;
  /** Báo cha khi còn ảnh đang xử lý để tạm khóa nút gửi. */
  onUploadingChange?: (isUploading: boolean) => void;
  /** Ảnh đã nộp trước đó (đọc từ backend) — chỉ hiển thị, không cho xóa. */
  savedPhotos?: { id: string; url: string }[];
  required?: boolean;
  disabled?: boolean;
  title: string;
  description: string;
}

let localIdSeq = 0;
const nextLocalId = () => `local-${++localIdSeq}`;

export function TaskerWorkPhotoPicker({
  onChange,
  onUploadingChange,
  savedPhotos = [],
  required = false,
  disabled = false,
  title,
  description,
}: TaskerWorkPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PhotoItem[]>([]);

  // Giải phóng objectURL khi rời màn để không rò bộ nhớ ảnh gốc.
  const itemsRef = useRef<PhotoItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () => {
      for (const item of itemsRef.current) {
        if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      }
    },
    [],
  );

  const uploadedCount = items.filter((item) => item.status === "done").length;
  const pendingCount = items.filter(
    (item) => item.status === "compressing" || item.status === "uploading",
  ).length;
  const total = savedPhotos.length + items.length;
  const remaining = WORK_PHOTOS_MAX - total;

  useEffect(() => {
    onChange(
      items
        .filter((item) => item.status === "done" && item.url)
        .map((item) => ({ url: item.url!, publicId: item.publicId })),
    );
  }, [items, onChange]);

  useEffect(() => {
    onUploadingChange?.(pendingCount > 0);
  }, [pendingCount, onUploadingChange]);

  const patchItem = useCallback(
    (localId: string, patch: Partial<PhotoItem>) => {
      setItems((current) =>
        current.map((item) =>
          item.localId === localId ? { ...item, ...patch } : item,
        ),
      );
    },
    [],
  );

  /** Nén → upload cho MỘT ảnh; mọi cập nhật trạng thái đi qua patchItem. */
  const runUpload = useCallback(
    async (item: PhotoItem) => {
      patchItem(item.localId, { status: "compressing", progress: 0 });
      try {
        const compressed = await compressImage(item.file);
        patchItem(item.localId, { status: "uploading", progress: 1 });

        const result = await uploadApi.uploadImageResult(compressed, {
          folder: WORK_PHOTO_FOLDER,
          onProgress: (percent) =>
            patchItem(item.localId, { progress: percent }),
        });

        await new Promise<void>((resolve) => {
          const image = new window.Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = result.url;
        });

        setItems((current) =>
          current.map((row) => {
            if (row.localId !== item.localId) return row;
            if (row.objectUrl) URL.revokeObjectURL(row.objectUrl);
            return {
              ...row,
              status: "done",
              progress: 100,
              url: result.url,
              publicId: result.public_id,
              previewUrl: result.url,
              objectUrl: null,
            };
          }),
        );
      } catch {
        patchItem(item.localId, { status: "error", progress: 0 });
      }
    },
    [patchItem],
  );

  /**
   * Hàng đợi giới hạn số upload chạy cùng lúc. Không await ở handler chọn file —
   * tasker vẫn thao tác tiếp được trong lúc ảnh đang lên.
   */
  const startUploads = useCallback(
    (queue: PhotoItem[]) => {
      let cursor = 0;
      const runNext = (): Promise<void> => {
        const current = queue[cursor++];
        if (!current) return Promise.resolve();
        return runUpload(current).then(runNext);
      };
      void Promise.all(
        Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, () =>
          runNext(),
        ),
      );
    },
    [runUpload],
  );

  const handleFiles = (files: FileList | null) => {
    const picked = Array.from(files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (picked.length === 0) return;

    if (remaining <= 0) {
      toast.error(`Tối đa ${WORK_PHOTOS_MAX} ảnh`);
      return;
    }

    const accepted = picked.slice(0, remaining);
    if (picked.length > accepted.length) {
      toast.warning(
        `Chỉ nhận thêm ${accepted.length} ảnh (tối đa ${WORK_PHOTOS_MAX} ảnh)`,
      );
    }

    const newItems: PhotoItem[] = accepted.map((file) => {
      const objectUrl = URL.createObjectURL(file);
      return {
        localId: nextLocalId(),
        file,
        previewUrl: objectUrl,
        objectUrl,
        status: "compressing",
        progress: 0,
      };
    });

    setItems((current) => [...current, ...newItems]);
    startUploads(newItems);
  };

  const handleRemove = (localId: string) => {
    const target = items.find((item) => item.localId === localId);
    if (!target) return;

    if (target.objectUrl) URL.revokeObjectURL(target.objectUrl);
    setItems((current) => current.filter((item) => item.localId !== localId));

    // Dọn file trên storage để ảnh bị gỡ trước khi submit không nằm lại vĩnh viễn.
    if (target.publicId) {
      void uploadApi.deleteImage(target.publicId).catch(() => undefined);
    }
  };

  const handleRetry = (localId: string) => {
    const target = items.find((item) => item.localId === localId);
    if (target) void runUpload(target);
  };

  const busy = disabled;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {title}{" "}
            {required ? (
              <span className="text-rose-600">*</span>
            ) : (
              <span className="text-[11px] font-semibold text-muted-foreground">
                (tùy chọn)
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[11px] font-bold",
            required && savedPhotos.length + uploadedCount === 0
              ? "bg-rose-100 text-rose-700"
              : "bg-muted text-muted-foreground",
          )}
        >
          {total}/{WORK_PHOTOS_MAX}
        </span>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {savedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-xl border border-border/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Ảnh đã nộp"
                className="size-full object-cover"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                Đã nộp
              </span>
            </div>
          ))}

          {items.map((item, index) => (
            <div
              key={item.localId}
              className="relative aspect-square overflow-hidden rounded-xl border border-border/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt={`Ảnh ${index + 1}`}
                className={cn(
                  "size-full object-cover transition-opacity",
                  item.status === "done" ? "opacity-100" : "opacity-70",
                )}
              />

              {item.status === "error" ? (
                <button
                  type="button"
                  onClick={() => handleRetry(item.localId)}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-rose-900/60 text-white"
                >
                  <AlertTriangle className="size-4" />
                  <span className="flex items-center gap-1 text-[10px] font-bold">
                    <RotateCcw className="size-3" /> Thử lại
                  </span>
                </button>
              ) : (
                item.status !== "done" && (
                  <div className="absolute inset-x-0 bottom-0 space-y-1 bg-black/45 px-1.5 pb-1.5 pt-2">
                    <div className="h-1 overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full rounded-full bg-white transition-[width] duration-200"
                        style={{
                          width: `${item.status === "compressing" ? 8 : Math.max(item.progress, 8)}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-white">
                      {item.status === "compressing"
                        ? "Đang nén…"
                        : `Đang tải ${item.progress}%`}
                    </p>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={() => handleRemove(item.localId)}
                disabled={busy}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white active:scale-90 disabled:opacity-60"
                aria-label={`Xóa ảnh ${index + 1}`}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || remaining <= 0}
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/60 py-5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
      >
        {remaining <= 0 ? (
          <ImageOff className="size-5" />
        ) : (
          <Camera className="size-5" />
        )}
        <span className="text-xs font-semibold">
          {remaining <= 0 ? `Đã đủ ${WORK_PHOTOS_MAX} ảnh` : "Chụp / chọn ảnh"}
        </span>
      </button>

      {pendingCount > 0 && (
        <p className="text-center text-[11px] font-semibold text-muted-foreground">
          Đang xử lý {pendingCount} ảnh — bạn vẫn có thể chụp tiếp
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        capture="environment"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </section>
  );
}
