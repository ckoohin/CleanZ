"use client";

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Users } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { TicketChatBox } from "@/features/support-tickets/_components/chat/TicketChatBox";
import type { ChatApi } from "@/features/support-tickets/_components/chat/useTicketChat";
import type {
  MessageSenderRole,
  PublicMessage,
} from "@/features/support-tickets/types/my-ticket.types";
import { supportTicketAdminApi } from "../../services/support-ticket.service";
import type {
  AdminMessage,
  TicketAdminDetail,
  TicketAudience,
} from "../../types/support-ticket.types";

/** AdminMessage (BE) → PublicMessage (ChatBox core). */
function toPublic(m: AdminMessage): PublicMessage {
  return {
    id: m.id,
    senderUserId: m.senderUserId,
    senderRole: m.senderRole as MessageSenderRole,
    body: m.body,
    attachments: m.attachments.map((a) => ({ id: a.id, url: a.url })),
    createdAt: m.createdAt,
  };
}

/** 1 luồng (tab) — gói TicketChatBox với adapter admin theo audience. */
function AdminThreadPanel({
  ticket,
  audience,
  currentUserId,
  locked,
}: {
  ticket: TicketAdminDetail;
  audience: TicketAudience;
  currentUserId: string | null;
  locked: boolean;
}) {
  const queryClient = useQueryClient();
  const api = useMemo<ChatApi>(
    () => ({
      sendMessage: (dto) =>
        supportTicketAdminApi
          .addMessage(ticket.id, {
            body: dto.body,
            attachmentIds: dto.attachmentIds,
            targetAudience: audience,
            isInternal: audience === "INTERNAL",
          })
          .then(toPublic),
      uploadImage: (file) =>
        supportTicketAdminApi.uploadAttachment(ticket.id, file),
      markRead: async (dto) => {
        const res = await supportTicketAdminApi.markRead(ticket.id, {
          audience,
          lastMessageId: dto.lastMessageId,
        });
        // Đọc xong → cập nhật badge hàng đợi admin.
        queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
        return res;
      },
      loadOlder: (beforeId) =>
        supportTicketAdminApi
          .olderMessages(ticket.id, audience, beforeId)
          .then((page) => ({
            messages: page.messages.map(toPublic),
            hasMore: page.hasMore,
          })),
    }),
    [ticket.id, audience, queryClient],
  );

  const messages = useMemo(
    () => ticket.messages.filter((m) => m.audience === audience).map(toPublic),
    [ticket.messages, audience],
  );
  const hasMore =
    audience === "REPORTER" || audience === "COUNTERPARTY"
      ? !!ticket.messagePaging?.[audience]?.hasMore
      : false;

  return (
    <div className="h-[460px]">
      <TicketChatBox
        ticketId={ticket.id}
        currentUserId={currentUserId}
        initialMessages={messages}
        api={api}
        audience={audience}
        locked={locked}
        hasMore={hasMore}
        lockedHint="Ticket đã đóng — không thể gửi tin nhắn."
        hideScrollbar
        threadClassName="px-1 pb-2"
        composerClassName="border-t border-border/40 bg-card pt-3"
      />
    </div>
  );
}

/**
 * ChatBox admin desktop — 2 luồng hội thoại tách (admin trung gian):
 * Người báo cáo (REPORTER) · Đối tượng (COUNTERPARTY).
 * Ghi chú nội bộ (INTERNAL) đã TÁCH ra panel log riêng (InternalNotesDrawer),
 * mở từ nút cạnh "Xem chi tiết" ngoài bảng ticket — không còn là tab ở đây.
 * Giữ tỉ lệ desktop (bounded height, không ép mobile).
 */
export const AdminTicketChat: React.FC<{ ticket: TicketAdminDetail }> = ({
  ticket,
}) => {
  const { data: me } = useAuth();
  const locked = ticket.status === "CLOSED";
  const hasCounterparty = !!ticket.counterparty?.id;

  const tabs = useMemo(
    () =>
      [
        {
          key: "REPORTER" as TicketAudience,
          label: ticket.reporter?.fullName
            ? `Người báo cáo`
            : "Người báo cáo",
          icon: User,
          disabled: false,
        },
        {
          key: "COUNTERPARTY" as TicketAudience,
          label: "Đối tượng",
          icon: Users,
          disabled: !hasCounterparty,
        },
      ] as const,
    [ticket.reporter?.fullName, hasCounterparty],
  );

  const [active, setActive] = useState<TicketAudience>("REPORTER");

  // Tổng thực theo luồng (server trả) — không chỉ trang đã tải (≤30).
  const count = (a: TicketAudience) =>
    a === "REPORTER" || a === "COUNTERPARTY"
      ? (ticket.messagePaging?.[a]?.total ??
        ticket.messages.filter((m) => m.audience === a).length)
      : ticket.messages.filter((m) => m.audience === a).length;

  return (
    <div className="space-y-3">
      {/* Tab luồng */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              disabled={t.disabled}
              onClick={() => setActive(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                active === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label} ({count(t.key)})
            </button>
          );
        })}
      </div>

      <AdminThreadPanel
        key={active}
        ticket={ticket}
        audience={active}
        currentUserId={me?.id ?? null}
        locked={locked}
      />
    </div>
  );
};
