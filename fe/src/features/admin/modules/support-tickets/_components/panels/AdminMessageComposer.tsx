"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Send } from "lucide-react";
import { useAddTicketMessage } from "../../hooks/useSupportTicket";

/**
 * Soạn tin nhắn admin: public reply hoặc internal note (`isInternal`).
 * Internal note chỉ admin thấy & không notify khách (API spec §2.6).
 */
export function AdminMessageComposer({ ticketId }: { ticketId: string }) {
  const addMessage = useAddTicketMessage(ticketId);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const handleSend = () => {
    if (!body.trim()) return;
    addMessage.mutate(
      { body: body.trim(), isInternal },
      {
        onSuccess: () => {
          setBody("");
          setIsInternal(false);
        },
      },
    );
  };

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
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Switch
            checked={isInternal}
            onCheckedChange={setIsInternal}
            aria-label="Ghi chú nội bộ"
          />
          <Lock className="w-3 h-3" /> Ghi chú nội bộ
        </label>
        <Button
          size="sm"
          className="rounded-full gap-1.5 text-xs"
          onClick={handleSend}
          disabled={!body.trim() || addMessage.isPending}
        >
          <Send className="w-3 h-3" />
          {addMessage.isPending ? "Đang gửi..." : isInternal ? "Lưu ghi chú" : "Gửi"}
        </Button>
      </div>
    </div>
  );
}
