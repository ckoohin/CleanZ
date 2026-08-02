"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Paperclip, Send, X } from "lucide-react";
import {
  ALLOWED_IMAGE_MIME,
  MAX_CHAT_IMAGES,
} from "./chat.constants";

interface ChatComposerProps {
  sending: boolean;
  onSend: (body: string, files: File[]) => void;
  onTyping?: () => void;
  className?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  sending,
  onSend,
  onTyping,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  // Giữ blob URL cùng file để THU HỒI được. Trước đây gọi
  // `URL.createObjectURL(f)` thẳng trong JSX → mỗi lần re-render tạo thêm một
  // blob mới và không cái nào được giải phóng.
  const [picked, setPicked] = useState<{ file: File; url: string }[]>([]);
  const files = useMemo(() => picked.map((p) => p.file), [picked]);

  // Rời khỏi khung soạn tin → trả lại toàn bộ blob còn treo.
  useEffect(
    () => () => picked.forEach((p) => URL.revokeObjectURL(p.url)),
    [picked],
  );

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const chosen = Array.from(list).filter((f) =>
      ALLOWED_IMAGE_MIME.includes(f.type),
    );
    setPicked((prev) => {
      const room = MAX_CHAT_IMAGES - prev.length;
      const added = chosen
        .slice(0, Math.max(0, room))
        .map((file) => ({ file, url: URL.createObjectURL(file) }));
      return [...prev, ...added];
    });
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeFile = (idx: number) =>
    setPicked((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });

  const canSend = (text.trim().length > 0 || picked.length > 0) && !sending;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text, files);
    setText("");
    // `useTicketChat` tự tạo blob riêng cho tin optimistic nên thu hồi ở đây an toàn.
    picked.forEach((p) => URL.revokeObjectURL(p.url));
    setPicked([]);
  };

  return (
    <div className={className}>
      {picked.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {picked.map((p, idx) => (
            <div
              key={p.url}
              className="relative size-14 overflow-hidden rounded-lg border border-border/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt="đính kèm"
                className="size-full object-cover"
              />
              <button
                type="button"
                aria-label="Xoá ảnh"
                onClick={() => removeFile(idx)}
                className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-white"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <label className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-muted transition-colors hover:bg-primary/10">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </label>

        <textarea
          rows={1}
          placeholder="Nhập tin nhắn…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="max-h-24 flex-1 resize-none overflow-y-auto rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Gửi"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Send className="h-4 w-4 text-white" />
          )}
        </button>
      </div>
    </div>
  );
};
