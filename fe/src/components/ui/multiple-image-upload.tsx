"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { uploadApi } from "@/lib/api/upload.service";
import { cn } from "@/lib/utils";

interface MultipleImageUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

export function MultipleImageUpload({ value = [], onChange, disabled }: MultipleImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const newUrls: string[] = [];
      // Upload sequentially or Promise.all. Using sequential to avoid heavy load
      for (let i = 0; i < files.length; i++) {
        const url = await uploadApi.uploadImage(files[i]);
        newUrls.push(url);
      }
      onChange([...value, ...newUrls]);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = (indexToRemove: number) => {
    const newValues = value.filter((_, index) => index !== indexToRemove);
    onChange(newValues);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-border shadow-sm group">
              <img src={url} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover" />
              {!disabled && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="bg-destructive text-destructive-foreground p-1.5 rounded-full hover:scale-110 transition-transform"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <label
        className={cn(
          "flex flex-col items-center justify-center w-full aspect-[4/1] rounded-xl border-2 border-dashed transition-colors cursor-pointer",
          isUploading ? "bg-muted/50 border-muted-foreground/20 cursor-not-allowed" : "hover:bg-muted/50 border-muted-foreground/30",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mb-2" />
          ) : (
            <UploadCloud className="w-6 h-6 text-muted-foreground mb-2" />
          )}
          <p className="mb-1 text-sm text-muted-foreground font-medium">
            {isUploading ? "Đang tải ảnh lên..." : "Nhấn để tải nhiều ảnh lên"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/png, image/jpeg, image/jpg"
          disabled={disabled || isUploading}
          onChange={handleUpload}
        />
      </label>
    </div>
  );
}
