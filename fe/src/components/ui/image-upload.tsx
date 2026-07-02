"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { uploadApi } from "@/lib/api/upload.service";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  folder?: string;
  onUploadComplete?: (result: { url: string; public_id: string }) => void;
  onUploadError?: (error: unknown) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled,
  folder,
  onUploadComplete,
  onUploadError,
  onUploadingChange,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      onUploadingChange?.(true);
      const result = await uploadApi.uploadImageResult(file, { folder });
      onChange(result.url);
      onUploadComplete?.(result);
    } catch (error) {
      console.error("Upload failed", error);
      onUploadError?.(error);
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {value ? (
        <div className="relative w-full max-w-sm aspect-video rounded-xl overflow-hidden border border-border shadow-sm group">
          <img src={value} alt="Uploaded" className="w-full h-full object-cover" />
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={onRemove}
                className="bg-destructive text-destructive-foreground p-2 rounded-full hover:scale-110 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <label
          className={cn(
            "flex flex-col items-center justify-center w-full max-w-sm aspect-video rounded-xl border-2 border-dashed transition-colors cursor-pointer",
            isUploading ? "bg-muted/50 border-muted-foreground/20 cursor-not-allowed" : "hover:bg-muted/50 border-muted-foreground/30",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
            ) : (
              <UploadCloud className="w-8 h-8 text-muted-foreground mb-3" />
            )}
            <p className="mb-2 text-sm text-muted-foreground font-medium">
              {isUploading ? "Đang tải ảnh lên..." : "Nhấn để tải ảnh lên"}
            </p>
            <p className="text-xs text-muted-foreground/70">PNG, JPG, JPEG (Max 5MB)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/jpg"
            disabled={disabled || isUploading}
            onChange={handleUpload}
          />
        </label>
      )}
    </div>
  );
}
