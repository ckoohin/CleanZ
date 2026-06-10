"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { cn } from "../utils";

interface BaseImageUploadProps {
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  onUpload?: (file: File) => Promise<string>;
  maxFiles?: number;
  label?: string;
  description?: string;
  className?: string;
}

export function BaseImageUpload({
  value,
  onChange,
  onUpload,
  maxFiles = 1,
  label = "Tải ảnh lên",
  description = "Chấp nhận file định dạng JPG, PNG kích thước tối đa 5MB",
  className,
}: BaseImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMultiple = maxFiles > 1;
  const urls = Array.isArray(value) ? value : value ? [value] : [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  const processFiles = async (fileList: File[]) => {
    if (!onUpload) return;
    setError(null);

    const validFiles = fileList.filter((file) => {
      if (!file.type.startsWith("image/")) {
        setError("Chỉ chấp nhận file định dạng ảnh.");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Ảnh không được vượt quá 5MB.");
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = validFiles.slice(0, maxFiles - urls.length).map(async (file) => {
        return await onUpload(file);
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      if (isMultiple) {
        const newUrls = [...urls, ...uploadedUrls];
        onChange?.(newUrls);
      } else {
        onChange?.(uploadedUrls[0] || "");
      }
    } catch (err) {
      setError("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isUploading) return;
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  const handleRemove = (indexToRemove: number) => {
    const newUrls = urls.filter((_, idx) => idx !== indexToRemove);
    if (isMultiple) {
      onChange?.(newUrls);
    } else {
      onChange?.("");
    }
  };

  return (
    <div className={cn("space-y-3 w-full", className)}>
      {label && <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</label>}

      {/* Preview container */}
      {urls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {urls.map((url, index) => (
            <div key={url + index} className="group relative aspect-video rounded-xl border border-border overflow-hidden bg-muted">
              <img src={url} alt={`Upload preview ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop zone */}
      {urls.length < maxFiles && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-card/20 hover:bg-card/40 cursor-pointer transition-all duration-200 text-center select-none",
            isUploading && "opacity-60 cursor-not-allowed pointer-events-none"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple={isMultiple}
            accept="image/*"
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" aria-hidden="true" />
              <p className="text-sm font-semibold text-muted-foreground">Đang tải ảnh lên...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UploadCloud size={24} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Kéo thả hoặc nhấp để tải ảnh</p>
                {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">{description}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}
