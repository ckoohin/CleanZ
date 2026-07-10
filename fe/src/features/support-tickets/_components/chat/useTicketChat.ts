"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import type {
  MarkReadDto,
  PublicMessage,
  SendMessageDto,
  TicketAttachment,
  TicketAudience,
  TicketMessageEvent,
  TicketReadEvent,
  TicketTypingEvent,
} from "../../types/my-ticket.types";
import {
  TICKET_EVENT_JOIN,
  TICKET_EVENT_LEAVE,
  TICKET_EVENT_MESSAGE,
  TICKET_EVENT_READ,
  TICKET_EVENT_TYPING,
} from "./chat.constants";

/** Adapter giao tiếp BE — cho phép tái dùng box cho user (myTicketApi) lẫn admin. */
export interface ChatApi {
  sendMessage: (dto: SendMessageDto) => Promise<PublicMessage>;
  uploadImage: (file: File) => Promise<TicketAttachment>;
  markRead?: (dto: MarkReadDto) => Promise<unknown>;
  /** Tải trang tin CŨ HƠN (cursor = id tin cũ nhất đang có). */
  loadOlder?: (
    beforeId?: string,
  ) => Promise<{ messages: PublicMessage[]; hasMore: boolean }>;
}

interface UseTicketChatArgs {
  ticketId: string;
  currentUserId: string | null;
  initialMessages: PublicMessage[];
  api: ChatApi;
  /** Lọc theo luồng (admin truyền REPORTER/COUNTERPARTY); user bỏ trống = luồng của họ. */
  audience?: TicketAudience;
  /** Khoá gửi (ticket CLOSED). */
  locked?: boolean;
  /** Còn tin cũ hơn trang đầu (từ detail) → hiện nút "tải tin cũ hơn". */
  initialHasMore?: boolean;
}

const TYPING_TIMEOUT = 3000;

function dedupeById(list: PublicMessage[]): PublicMessage[] {
  const seen = new Map<string, PublicMessage>();
  for (const m of list) seen.set(m.id, m);
  return [...seen.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function useTicketChat({
  ticketId,
  currentUserId,
  initialMessages,
  api,
  audience,
  locked,
  initialHasMore,
}: UseTicketChatArgs) {
  const socket = useSocket();
  const [messages, setMessages] = useState<PublicMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingFrom, setTypingFrom] = useState<string | null>(null);
  const [otherLastReadId, setOtherLastReadId] = useState<string | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingEmitRef = useRef<number>(0);

  // Đồng bộ khi dữ liệu server đổi (refetch): MERGE theo id, giữ cả tin đã nhận
  // qua realtime / vừa gửi (chưa kịp về trong refetch) — server thắng nếu trùng id.
  useEffect(() => {
    setMessages((prev) => dedupeById([...prev, ...initialMessages]));
  }, [initialMessages]);

  useEffect(() => {
    setHasMore(!!initialHasMore);
  }, [initialHasMore]);

  // ─── Tải tin cũ hơn (prepend, giữ vị trí cuộn do ChatThread xử lý) ──────────
  const loadOlder = useCallback(async () => {
    if (!api.loadOlder || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const oldestId = messages[0]?.id;
      const res = await api.loadOlder(oldestId);
      setMessages((prev) => dedupeById([...res.messages, ...prev]));
      setHasMore(res.hasMore);
    } catch {
      // im lặng — người dùng có thể bấm lại
    } finally {
      setLoadingOlder(false);
    }
  }, [api, hasMore, loadingOlder, messages]);

  const matchesThread = useCallback(
    (evtAudience: TicketAudience) => !audience || audience === evtAudience,
    [audience],
  );

  // ─── Join/leave room realtime của luồng (server kiểm quyền) ─────────────────
  useEffect(() => {
    if (!socket) return;
    const join = () => socket.emit(TICKET_EVENT_JOIN, { ticketId, audience });
    join();
    // Re-join sau khi reconnect (room mất theo socket id cũ).
    socket.on("connect", join);
    return () => {
      socket.off("connect", join);
      socket.emit(TICKET_EVENT_LEAVE, { ticketId });
    };
  }, [socket, ticketId, audience]);

  // ─── Lắng nghe realtime ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onMessage = (evt?: TicketMessageEvent | null) => {
      if (!evt?.message || evt.ticketId !== ticketId || !matchesThread(evt.audience)) return;
      setMessages((prev) => dedupeById([...prev, evt.message]));
    };
    const onTyping = (evt?: TicketTypingEvent | null) => {
      if (!evt || evt.ticketId !== ticketId || !matchesThread(evt.audience)) return;
      if (evt.fromUserId === currentUserId) return;
      setTypingFrom(evt.fromRole);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      typingClearRef.current = setTimeout(
        () => setTypingFrom(null),
        TYPING_TIMEOUT,
      );
    };
    const onRead = (evt?: TicketReadEvent | null) => {
      if (!evt || evt.ticketId !== ticketId || !matchesThread(evt.audience)) return;
      if (evt.byUserId === currentUserId) return;
      setOtherLastReadId(evt.lastReadMessageId);
    };

    socket.on(TICKET_EVENT_MESSAGE, onMessage);
    socket.on(TICKET_EVENT_TYPING, onTyping);
    socket.on(TICKET_EVENT_READ, onRead);
    return () => {
      socket.off(TICKET_EVENT_MESSAGE, onMessage);
      socket.off(TICKET_EVENT_TYPING, onTyping);
      socket.off(TICKET_EVENT_READ, onRead);
    };
  }, [socket, ticketId, currentUserId, matchesThread]);

  // ─── Đánh dấu đã đọc khi có tin mới của đối phương ──────────────────────────
  const lastMsg = messages[messages.length - 1];
  useEffect(() => {
    if (!api.markRead || !lastMsg || lastMsg.pending) return;
    if (lastMsg.senderUserId === currentUserId) return;
    void api.markRead({ lastMessageId: lastMsg.id }).catch(() => undefined);
  }, [api, lastMsg, currentUserId]);

  // ─── Báo đang gõ (debounce ~1.5s) ───────────────────────────────────────────
  const notifyTyping = useCallback(() => {
    if (!socket) return;
    const now = Date.now();
    if (now - typingEmitRef.current < 1500) return;
    typingEmitRef.current = now;
    socket.emit(TICKET_EVENT_TYPING, { ticketId, audience });
  }, [socket, ticketId, audience]);

  // ─── Gửi tin (upload ảnh → attachmentIds → send) với optimistic ─────────────
  const send = useCallback(
    async (body: string, files: File[]): Promise<boolean> => {
      const text = body.trim();
      if (locked || sending) return false;
      if (!text && files.length === 0) return false;

      const tempId = `temp-${Date.now()}`;
      const optimistic: PublicMessage = {
        id: tempId,
        senderUserId: currentUserId,
        senderRole: "CUSTOMER",
        body: text,
        attachments: files.map((f, i) => ({
          id: `${tempId}-${i}`,
          url: URL.createObjectURL(f),
        })),
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setSending(true);
      try {
        let attachmentIds: string[] | undefined;
        if (files.length > 0) {
          const uploaded = await Promise.all(files.map((f) => api.uploadImage(f)));
          attachmentIds = uploaded.map((u) => u.id);
        }
        const real = await api.sendMessage({
          body: text || undefined,
          ...(attachmentIds ? { attachmentIds } : {}),
        });
        setMessages((prev) =>
          dedupeById(prev.filter((m) => m.id !== tempId).concat(real)),
        );
        return true;
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return false;
      } finally {
        setSending(false);
      }
    },
    [api, currentUserId, locked, sending],
  );

  const typingLabel = useMemo(() => {
    if (!typingFrom) return null;
    return typingFrom === "ADMIN" ? "CleanZ đang nhập…" : "Đang nhập…";
  }, [typingFrom]);

  return {
    messages,
    sending,
    typingLabel,
    otherLastReadId,
    send,
    notifyTyping,
    hasMore,
    loadingOlder,
    loadOlder,
  };
}
