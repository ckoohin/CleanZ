"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import type {
  MarkReadDto,
  MessageSenderRole,
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
  /**
   * Vai của người đang gửi — dùng cho tin optimistic để bong bóng "đang gửi"
   * mang đúng senderRole (trước đây hardcode "CUSTOMER", sai với tasker/admin).
   */
  currentUserRole?: MessageSenderRole;
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
  currentUserRole,
  initialMessages,
  api,
  audience,
  locked,
  initialHasMore,
}: UseTicketChatArgs) {
  const socket = useSocket();
  /**
   * State chia 2 rổ thay vì một mảng gộp:
   *  - `olderPages`: các trang tin CŨ do người dùng chủ động bấm "tải thêm";
   *  - `extra`: tin đến qua realtime + tin optimistic CHƯA có trong trang server.
   *
   * `initialMessages` (trang mới nhất từ server) là NGUỒN SỰ THẬT và không được
   * sao chép vào state. Cách cũ merge tất cả vào một mảng và không bao giờ loại
   * bớt: state phình dần khi chuyển qua lại giữa các luồng, và tin đã xoá ở
   * server thì vĩnh viễn không biến mất khỏi UI.
   */
  const [olderPages, setOlderPages] = useState<PublicMessage[]>([]);
  const [extra, setExtra] = useState<PublicMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [typingFrom, setTypingFrom] = useState<string | null>(null);
  const [otherLastReadId, setOtherLastReadId] = useState<string | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingEmitRef = useRef<number>(0);

  // Server đã trả tin nào thì bỏ bản sao trong `extra` — giữ `extra` luôn nhỏ.
  useEffect(() => {
    const baseIds = new Set(initialMessages.map((m) => m.id));
    setExtra((prev) =>
      prev.some((m) => baseIds.has(m.id))
        ? prev.filter((m) => !baseIds.has(m.id))
        : prev,
    );
  }, [initialMessages]);

  const messages = useMemo(
    () => dedupeById([...olderPages, ...initialMessages, ...extra]),
    [olderPages, initialMessages, extra],
  );

  // `loadOlder` cần id tin cũ nhất nhưng KHÔNG được phụ thuộc vào `messages`,
  // nếu không hàm bị tạo lại mỗi lần có tin mới và phá memo của ChatThread.
  const oldestIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    oldestIdRef.current = messages[0]?.id;
  }, [messages]);

  useEffect(() => {
    setHasMore(!!initialHasMore);
  }, [initialHasMore]);

  // ─── Tải tin cũ hơn (prepend, giữ vị trí cuộn do ChatThread xử lý) ──────────
  const loadOlder = useCallback(async () => {
    if (!api.loadOlder || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const res = await api.loadOlder(oldestIdRef.current);
      setOlderPages((prev) => dedupeById([...res.messages, ...prev]));
      setHasMore(res.hasMore);
    } catch {
      // im lặng — người dùng có thể bấm lại
    } finally {
      setLoadingOlder(false);
    }
  }, [api, hasMore, loadingOlder]);

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
      setExtra((prev) => dedupeById([...prev, evt.message]));
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
  // Mỗi lần gọi kéo theo một lượt invalidate danh sách ở phía trên, nên phải
  // chống gọi lặp cho CÙNG một tin (effect chạy lại khi `api` đổi định danh).
  const lastMarkedRef = useRef<string | null>(null);
  const lastMsg = messages[messages.length - 1];
  useEffect(() => {
    if (!api.markRead || !lastMsg || lastMsg.pending) return;
    if (lastMsg.senderUserId === currentUserId) return;
    if (lastMarkedRef.current === lastMsg.id) return;
    lastMarkedRef.current = lastMsg.id;
    void api.markRead({ lastMessageId: lastMsg.id }).catch(() => {
      lastMarkedRef.current = null; // lỗi → cho phép thử lại
    });
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
      // Ảnh xem trước dùng blob URL — PHẢI thu hồi sau khi tin optimistic bị
      // thay bằng tin thật (hoặc bị gỡ khi lỗi), nếu không blob nằm lại trong
      // bộ nhớ cho tới khi tải lại trang.
      const previewUrls = files.map((f) => URL.createObjectURL(f));
      const revokePreviews = () => previewUrls.forEach(URL.revokeObjectURL);

      const optimistic: PublicMessage = {
        id: tempId,
        senderUserId: currentUserId,
        senderRole: currentUserRole ?? "CUSTOMER",
        body: text,
        attachments: previewUrls.map((url, i) => ({
          id: `${tempId}-${i}`,
          url,
        })),
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setExtra((prev) => [...prev, optimistic]);
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
        setExtra((prev) =>
          dedupeById(prev.filter((m) => m.id !== tempId).concat(real)),
        );
        revokePreviews();
        return true;
      } catch {
        setExtra((prev) => prev.filter((m) => m.id !== tempId));
        revokePreviews();
        return false;
      } finally {
        setSending(false);
      }
    },
    [api, currentUserId, currentUserRole, locked, sending],
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
