"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { PublicMessage } from "../../types/my-ticket.types";
import { ChatBubble } from "./ChatBubble";

interface ChatThreadProps {
  messages: PublicMessage[];
  currentUserId: string | null;
  typingLabel?: string | null;
  otherLastReadId?: string | null;
  /** Nội dung chèn đầu luồng (vd mô tả ban đầu của ticket). */
  header?: React.ReactNode;
  className?: string;
}

export const ChatThread: React.FC<ChatThreadProps> = ({
  messages,
  currentUserId,
  typingLabel,
  otherLastReadId,
  header,
  className,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingLabel]);

  // id tin cuối của mình (để gắn "đã xem")
  const lastMineId = [...messages]
    .reverse()
    .find((m) => m.senderUserId === currentUserId)?.id;
  const seenReached =
    !!otherLastReadId &&
    messages.findIndex((m) => m.id === otherLastReadId) >=
      messages.findIndex((m) => m.id === lastMineId);

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {header}
      {messages.length === 0 ? (
        <div className="py-8 text-center">
          <MessageSquare className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào</p>
        </div>
      ) : (
        messages.map((m) => (
          <ChatBubble
            key={m.id}
            message={m}
            isMine={m.senderUserId === currentUserId}
            seen={m.id === lastMineId && seenReached}
            onImageClick={setZoom}
          />
        ))
      )}

      {typingLabel && (
        <div className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
          </span>
          {typingLabel}
        </div>
      )}

      <div ref={bottomRef} />

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
