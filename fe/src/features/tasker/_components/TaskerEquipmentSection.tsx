"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Crown, Loader2, Trash2, Upload, Wrench } from "lucide-react";
import http from "@/lib/api/http";
import { useSubmitTaskerEquipment } from "../hooks/tasker.hooks";
import type {
  TaskerEquipmentStatus,
  TaskerProfile,
} from "../types/tasker.type";

const MAX_PHOTOS = 8;

const STATUS_META: Record<
  TaskerEquipmentStatus,
  { label: string; className: string; hint: string }
> = {
  NONE: {
    label: "Chưa nộp",
    className: "bg-muted text-muted-foreground border-border/60",
    hint: "Nộp ảnh dụng cụ chuyên dụng để nhận đơn có thu nhập tốt hơn.",
  },
  PENDING: {
    label: "Chờ duyệt",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    hint: "CleanZ đang kiểm tra hồ sơ dụng cụ của bạn.",
  },
  APPROVED: {
    label: "Đã duyệt",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    hint: "Bạn đủ điều kiện nhận đơn premium. Nộp lại ảnh mới sẽ phải duyệt lại.",
  },
  REJECTED: {
    label: "Bị từ chối",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
    hint: "Xem lý do bên dưới, bổ sung ảnh rồi nộp lại.",
  },
};

interface TaskerEquipmentSectionProps {
  profile: TaskerProfile;
}

export const TaskerEquipmentSection: React.FC<TaskerEquipmentSectionProps> = ({
  profile,
}) => {
  const equipment = profile.equipment;
  const status: TaskerEquipmentStatus = equipment?.status ?? "NONE";
  const meta = STATUS_META[status];

  const [photoUrls, setPhotoUrls] = useState<string[]>(
    equipment?.photoUrls ?? [],
  );
  const [note, setNote] = useState(
    // Ghi chú của admin khi REJECTED không phải mô tả của tasker — không đổ lại.
    status === "REJECTED" ? "" : (equipment?.note ?? ""),
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitMutation = useSubmitTaskerEquipment();

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photoUrls.length;
    if (remaining <= 0) {
      toast.error(`Tối đa ${MAX_PHOTOS} ảnh`);
      return;
    }

    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await http.post("/upload/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const url = (res.data?.data ?? res.data)?.url as string | undefined;
        if (url) uploaded.push(url);
      }
      setPhotoUrls((prev) => [...prev, ...uploaded]);
    } catch {
      toast.error("Không thể tải ảnh lên, vui lòng thử lại");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (photoUrls.length === 0) {
      toast.error("Vui lòng tải lên ít nhất 1 ảnh bộ dụng cụ");
      return;
    }
    submitMutation.mutate({ photoUrls, note: note.trim() || undefined });
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Wrench className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              Bộ dụng cụ chuyên dụng
              <Crown className="w-3.5 h-3.5 text-amber-500" />
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.hint}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-black ${meta.className}`}
        >
          {meta.label}
        </span>
      </div>

      {status === "REJECTED" && equipment?.note && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-600">
          <span className="font-bold">Lý do từ chối: </span>
          {equipment.note}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {photoUrls.map((url) => (
          <div
            key={url}
            className="relative aspect-square overflow-hidden rounded-lg border border-border/50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Ảnh dụng cụ"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() =>
                setPhotoUrls((prev) => prev.filter((u) => u !== url))
              }
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white active:scale-90"
              aria-label="Xóa ảnh"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {photoUrls.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span className="text-[10px] font-semibold">Thêm ảnh</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        multiple
        className="hidden"
        onChange={(e) => void handleUpload(e.target.files)}
      />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Mô tả bộ dụng cụ: máy hút bụi công nghiệp, máy chà sàn, hoá chất sinh học…"
        className="w-full resize-none rounded-xl border border-border/60 bg-background p-3 text-sm outline-none focus:border-primary/50"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitMutation.isPending || isUploading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black text-primary-foreground transition-all active:scale-[0.99] disabled:opacity-60"
      >
        {submitMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wrench className="h-4 w-4" />
        )}
        {status === "NONE" ? "Gửi hồ sơ dụng cụ" : "Gửi lại hồ sơ dụng cụ"}
      </button>
    </div>
  );
};
