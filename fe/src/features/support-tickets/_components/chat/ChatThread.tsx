"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import type { PublicMessage } from "../../types/my-ticket.types";
import { ChatBubble } from "./ChatBubble";

interface ChatThreadProps {
  messages: PublicMessage[];
  currentUserId: string | null;
  typingLabel?: string | null;
  otherLastReadId?: string | null;
  /** Nội dung chèn đầu luồng (vd mô tả ban đầu của ticket). */
  header?: React.ReactNode;
  /** Class cho VÙNG CUỘN (ChatThread tự sở hữu scroll container). */
  className?: string;
  /** Phân trang: còn tin cũ hơn + trạng thái đang tải + handler. */
  hasMore?: boolean;
  loadingOlder?: boolean;
  onLoadOlder?: () => void;
}

/** Bỏ qua render phần ngoài viewport cho ticket dài (virtualization nhẹ, không lib). */
const OFFSCREEN_SKIP: React.CSSProperties = {
  contentVisibility: "auto",
  // `auto` ghi nhớ chiều cao thật sau lần render đầu → giảm nhảy cuộn khi cuộn lại.
  containIntrinsicSize: "auto 64px",
};

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  currentUserId,
  typingLabel,
  otherLastReadId,
  header,
  className,
  hasMore,
  loadingOlder,
  onLoadOlder,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  // Theo dõi để phân biệt APPEND (tin mới → cuộn đáy) vs PREPEND (tải cũ → giữ chỗ).
  const prevLastId = useRef<string | undefined>(undefined);
  const prevFirstId = useRef<string | undefined>(undefined);
  const prevHeight = useRef(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const lastId = messages[messages.length - 1]?.id;
    const firstId = messages[0]?.id;
    const prepended =
      !!prevFirstId.current &&
      firstId !== prevFirstId.current &&
      lastId === prevLastId.current;

    if (prepended) {
      // Tải tin cũ hơn: giữ nguyên tin đang xem (bù chiều cao mới thêm ở trên).
      el.scrollTop = el.scrollHeight - prevHeight.current;
    } else if (lastId !== prevLastId.current) {
      // Tin mới ở cuối (gửi/nhận) hoặc lần render đầu → cuộn xuống đáy.
      el.scrollTop = el.scrollHeight;
    }
    prevLastId.current = lastId;
    prevFirstId.current = firstId;
    prevHeight.current = el.scrollHeight;
  }, [messages, typingLabel]);

  return (
    <div ref={scrollRef} className={`overflow-y-auto ${className ?? ""}`}>
      {hasMore && (
        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={onLoadOlder}
            disabled={loadingOlder}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {loadingOlder && <Loader2 className="h-3 w-3 animate-spin" />}
            {loadingOlder ? "Đang tải…" : "Tải tin cũ hơn"}
          </button>
        </div>
      )}

      {header}

      {messages.length === 0 ? (
        <div className="py-8 text-center">
          <MessageSquare className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(() => {
            // Tính 1 lần (O(n)): tin cuối của mình + đã được đối phương đọc tới chưa.
            let lastMineId: string | undefined;
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].senderUserId === currentUserId) {
                lastMineId = messages[i].id;
                break;
              }
            }
            // Chưa có tin nào của mình → không có gì để hiện "đã xem".
            // (findIndex trả -1 khi không tìm thấy, mà `-1 >= -1` là đúng, nên
            // thiếu bước kiểm này thì cờ "đã xem" bật sai.)
            const mineIdx = lastMineId
              ? messages.findIndex((x) => x.id === lastMineId)
              : -1;
            const readIdx = otherLastReadId
              ? messages.findIndex((x) => x.id === otherLastReadId)
              : -1;
            const seenReached = mineIdx >= 0 && readIdx >= mineIdx;
            return messages.map((m) => (
              <div key={m.id} style={OFFSCREEN_SKIP}>
                <ChatBubble
                  message={m}
                  isMine={m.senderUserId === currentUserId}
                  seen={m.id === lastMineId && seenReached}
                  onImageClick={setZoom}
                />
              </div>
            ));
          })()}
        </div>
      )}

      {typingLabel && (
        <div className="flex items-center gap-2 pl-9 pt-3 text-xs text-muted-foreground">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
          </span>
          {typingLabel}
        </div>
      )}

      {/* Lightbox xem ảnh */}
      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="ảnh" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </div>
  );
};
