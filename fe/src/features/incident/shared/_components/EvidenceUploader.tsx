"use client";

import React, { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Evidence } from "../incident.types";

interface EvidenceUploaderProps {
  /** Hàm upload 1 ảnh → trả Evidence (id+url). Inject từ service của actor. */
  upload: (file: File) => Promise<Evidence>;
  value: Evidence[];
  onChange: (next: Evidence[]) => void;
  max?: number;
  disabled?: boolean;
}

/**
 * Upload nhiều ảnh bằng chứng (chỉ IMAGE — override spec). Trả danh sách Evidence
 * (lấy `id` để tham chiếu vào damageItems/statement).
 */
export function EvidenceUploader({
  upload,
  value,
  onChange,
  max = 6,
  disabled,
}: EvidenceUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = max - value.length;
    const picked = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: Evidence[] = [];
      for (const file of picked) {
        if (!file.type.startsWith("image/")) {
          toast.error("Chỉ chấp nhận ảnh");
          continue;
        }
        uploaded.push(await upload(file));
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (id: string) => onChange(value.filter((e) => e.id !== id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((ev) => (
          <div key={ev.id} className="relative size-16 overflow-hidden rounded-lg border border-border/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ev.url} alt="bằng chứng" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Xoá ảnh"
              onClick={() => remove(ev.id)}
              className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex size-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            <span className="text-[10px]">Ảnh</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
