"use client";

import React from "react";
import { Check, CheckCheck, Clock } from "lucide-react";
import type { PublicMessage } from "../../types/my-ticket.types";

function fmtTime(d: string) {
  return new Date(d).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ChatBubbleProps {
  message: PublicMessage;
  isMine: boolean;
  /** Tin cuối của mình đã được đối phương đọc. */
  seen?: boolean;
  onImageClick?: (url: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isMine,
  seen,
  onImageClick,
}) => {
  const isAdmin = message.senderRole === "ADMIN";
  const hasImages = message.attachments.length > 0;

  return (
    <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      {!isMine && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <span className="text-[10px] font-bold text-primary">
            {isAdmin ? "CZ" : message.senderRole === "TASKER" ? "T" : "K"}
          </span>
        </div>
      )}
      <div className={`flex max-w-[78%] flex-col ${isMine ? "items-end" : "items-start"}`}>
        {hasImages && (
          <div
            className={`mb-1 grid gap-1 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {message.attachments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onImageClick?.(a.url)}
                className="overflow-hidden rounded-xl border border-border/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt="ảnh đính kèm"
                  className="h-32 w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
        {message.body && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm ${
              isMine
                ? "rounded-br-sm bg-primary text-white"
                : "rounded-tl-sm border border-border/40 bg-card text-foreground"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
          <span>{fmtTime(message.createdAt)}</span>
          {isMine &&
            (message.pending ? (
              <Clock className="h-3 w-3" />
            ) : seen ? (
              <CheckCheck className="h-3 w-3 text-primary" />
            ) : (
              <Check className="h-3 w-3" />
            ))}
        </div>
      </div>
    </div>
  );
};
