"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkPhotoItem {
  id: string;
  url: string;
  uploadedAt?: string;
}

interface BookingWorkPhotoGalleryProps {
  before?: WorkPhotoItem[];
  after?: WorkPhotoItem[];
  /** Bọc bằng khung sẵn có (admin) thay vì khung mặc định của khách. */
  bare?: boolean;
  className?: string;
}

function PhotoRow({
  label,
  photos,
  onOpen,
}: {
  label: string;
  photos: WorkPhotoItem[];
  onOpen: (url: string) => void;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">
        {label} · {photos.length} ảnh
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => onOpen(photo.url)}
            className="relative aspect-square overflow-hidden rounded-xl border border-border/60 transition-transform active:scale-95"
            aria-label={`Xem ${label.toLowerCase()}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={label}
              loading="lazy"
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Ảnh hiện trường của ca làm việc — dùng chung cho màn khách và màn admin.
 * Không render gì khi đơn chưa có ảnh nào.
 */
export function BookingWorkPhotoGallery({
  before = [],
  after = [],
  bare = false,
  className,
}: BookingWorkPhotoGalleryProps) {
  const [preview, setPreview] = useState<string | null>(null);

  if (before.length === 0 && after.length === 0) return null;

  const content = (
    <>
      <PhotoRow
        label="Trước khi làm"
        photos={before}
        onOpen={(url) => setPreview(url)}
      />
      <PhotoRow
        label="Sau khi làm"
        photos={after}
        onOpen={(url) => setPreview(url)}
      />
    </>
  );

  return (
    <>
      {bare ? (
        <div className={cn("space-y-4", className)}>{content}</div>
      ) : (
        <section
          className={cn(
            "space-y-4 rounded-3xl border border-border bg-card p-5 shadow-sm",
            className,
          )}
        >
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-foreground">
              Hình ảnh công việc
            </h3>
            <p className="text-xs text-muted-foreground">
              Ảnh do nhân viên chụp tại hiện trường.
            </p>
          </div>
          {content}
        </section>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Ảnh công việc"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain"
          />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white"
            aria-label="Đóng ảnh"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </>
  );
}
