"use client";

import React from "react";
import { Lock } from "lucide-react";
import type { PublicMessage, TicketAudience } from "../../types/my-ticket.types";
import { ChatThread } from "./ChatThread";
import { ChatComposer } from "./ChatComposer";
import { ChatApi, useTicketChat } from "./useTicketChat";

interface TicketChatBoxProps {
  ticketId: string;
  currentUserId: string | null;
  initialMessages: PublicMessage[];
  api: ChatApi;
  audience?: TicketAudience;
  locked?: boolean;
  lockedHint?: string;
  /** Nội dung chèn đầu luồng (vd mô tả ban đầu). */
  threadHeader?: React.ReactNode;
  /** Lớp bao ngoài composer (vd fixed bottom cho mobile). */
  composerClassName?: string;
  threadClassName?: string;
  /** Ẩn thanh cuộn (vẫn cuộn được) — dùng cho skin mobile customer/tasker. */
  hideScrollbar?: boolean;
  /** Còn tin cũ hơn trang đầu (từ detail) → hiện nút "tải tin cũ hơn". */
  hasMore?: boolean;
}

/** Ẩn scrollbar nhưng giữ khả năng cuộn (Firefox + WebKit). */
const SCROLLBAR_HIDDEN =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/**
 * ChatBox tái sử dụng cho cả Customer/Tasker (mobile) và Admin (desktop, Slice 5).
 * Gói realtime (useTicketChat) + ChatThread + ChatComposer.
 */
export const TicketChatBox: React.FC<TicketChatBoxProps> = ({
  ticketId,
  currentUserId,
  initialMessages,
  api,
  audience,
  locked,
  lockedHint = "Ticket đã đóng — không thể gửi tin nhắn mới.",
  threadHeader,
  composerClassName,
  threadClassName,
  hideScrollbar,
  hasMore,
}) => {
  const {
    messages,
    sending,
    typingLabel,
    otherLastReadId,
    send,
    notifyTyping,
    hasMore: hasMoreState,
    loadingOlder,
    loadOlder,
  } = useTicketChat({
    ticketId,
    currentUserId,
    initialMessages,
    api,
    audience,
    locked,
    initialHasMore: hasMore,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatThread
        messages={messages}
        currentUserId={currentUserId}
        typingLabel={typingLabel}
        otherLastReadId={otherLastReadId}
        header={threadHeader}
        className={`flex-1 ${hideScrollbar ? SCROLLBAR_HIDDEN : ""} ${
          threadClassName ?? ""
        }`}
        hasMore={hasMoreState}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlder}
      />

      {locked ? (
        <div className={composerClassName}>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> {lockedHint}
          </p>
        </div>
      ) : (
        <ChatComposer
          sending={sending}
          onSend={send}
          onTyping={notifyTyping}
          className={composerClassName}
        />
      )}
    </div>
  );
};
