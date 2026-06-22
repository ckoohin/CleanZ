"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImagePlus, Loader2, Lock, Send, X } from "lucide-react";
import { useAddTicketMessage } from "../../hooks/useSupportTicket";
import { supportTicketAdminApi } from "../../services/support-ticket.service";

/**
 * Soạn tin nhắn admin: public reply / internal note (`isInternal`) + đính kèm ảnh.
 * Ảnh upload trước (POST /attachments) lấy attachmentId rồi gửi kèm message.
 */
export function AdminMessageComposer({ ticketId }: { ticketId: string }) {
  const addMessage = useAddTicketMessage(ticketId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setImages((prev) => [...prev, ...picked].slice(0, 5));
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSend = async () => {
    if (!body.trim()) return;
    // 1) Upload ảnh → attachmentIds → 2) gửi message kèm
    let attachmentIds: string[] | undefined;
    if (images.length > 0) {
      setUploading(true);
      try {
        const uploaded = await Promise.all(
          images.map((f) => supportTicketAdminApi.uploadAttachment(ticketId, f)),
        );
        attachmentIds = uploaded.map((u) => u.id);
      } catch {
        toast.error("Tải ảnh lên thất bại");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    addMessage.mutate(
      { body: body.trim(), isInternal, ...(attachmentIds ? { attachmentIds } : {}) },
      {
        onSuccess: () => {
          setBody("");
          setIsInternal(false);
          setImages([]);
        },
      },
    );
  };

  const busy = uploading || addMessage.isPending;

  return (
    <div className="border border-border/40 rounded-xl p-3 space-y-2">
      <Textarea
        placeholder={isInternal ? "Ghi chú nội bộ (khách không thấy)..." : "Nhập tin nhắn phản hồi..."}
        className="text-sm resize-none border-0 p-0 focus-visible:ring-0 shadow-none bg-transparent"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Nội dung tin nhắn"
      />

      {/* Ảnh đính kèm */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((file, idx) => (
            <div key={idx} className="relative size-14 overflow-hidden rounded-lg border border-border/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={URL.createObjectURL(file)} alt="đính kèm" className="size-full object-cover" />
              <button
                type="button"
                aria-label="Xoá ảnh"
                onClick={() => removeImage(idx)}
                className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={isInternal} onCheckedChange={setIsInternal} aria-label="Ghi chú nội bộ" />
            <Lock className="w-3 h-3" /> Nội bộ
          </label>
          {images.length < 5 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <ImagePlus className="w-3.5 h-3.5" /> Ảnh
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
        <Button
          size="sm"
          className="rounded-full gap-1.5 text-xs"
          onClick={handleSend}
          disabled={!body.trim() || busy}
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          {uploading ? "Đang tải ảnh..." : addMessage.isPending ? "Đang gửi..." : isInternal ? "Lưu ghi chú" : "Gửi"}
        </Button>
      </div>
    </div>
  );
}
