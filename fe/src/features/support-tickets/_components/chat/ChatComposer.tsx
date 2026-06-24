"use client";

import React, { useRef, useState } from "react";
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
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) =>
      ALLOWED_IMAGE_MIME.includes(f.type),
    );
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_CHAT_IMAGES));
    if (inputRef.current) inputRef.current.value = "";
  };
  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const canSend = (text.trim().length > 0 || files.length > 0) && !sending;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text, files);
    setText("");
    setFiles([]);
  };

  return (
    <div className={className}>
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, idx) => (
            <div
              key={idx}
              className="relative size-14 overflow-hidden rounded-lg border border-border/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(f)}
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
