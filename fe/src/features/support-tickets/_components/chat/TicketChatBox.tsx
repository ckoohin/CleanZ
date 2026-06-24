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
}

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
}) => {
  const { messages, sending, typingLabel, otherLastReadId, send, notifyTyping } =
    useTicketChat({
      ticketId,
      currentUserId,
      initialMessages,
      api,
      audience,
      locked,
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex-1 overflow-y-auto ${threadClassName ?? ""}`}>
        <ChatThread
          messages={messages}
          currentUserId={currentUserId}
          typingLabel={typingLabel}
          otherLastReadId={otherLastReadId}
          header={threadHeader}
        />
      </div>

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
