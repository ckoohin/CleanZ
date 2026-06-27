import { Injectable } from '@nestjs/common';
import { NotificationGateway } from 'src/modules/notification/notification.gateway';
import { ADMINS_ROOM } from 'src/modules/notification/notification.constants';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { AdminMessage, PublicMessage } from '../dto/ticket-response.dto';
import {
  TICKET_EVENT_MESSAGE,
  TICKET_EVENT_READ,
  TICKET_EVENT_TYPING,
  TICKET_EVENT_UNREAD,
  TicketMessagePayload,
  TicketReadPayload,
  TicketTypingPayload,
  ticketAudienceRoom,
} from './ticket-events.constants';

/**
 * Phát realtime ChatBox qua NotificationGateway tới ROOM theo (ticket, audience).
 * Mọi người đang mở đúng luồng (kể cả nhiều admin chưa được gán) đều nhận tức
 * thì — không phụ thuộc assignedAdmin. Cô lập đảm bảo vì server kiểm quyền khi
 * cho join (xem SupportChatGateway). Emit TRỰC TIẾP sau commit (không qua BullMQ).
 * Client tự dedupe theo id + bỏ qua event của chính mình.
 */
/** Cửa sổ gộp ping badge cho phòng admin (chống "refetch storm"). */
const ADMIN_UNREAD_THROTTLE_MS = 5_000;

@Injectable()
export class TicketRealtimeService {
  constructor(private readonly gateway: NotificationGateway) {}

  /** Mốc lần cuối đã ping ADMINS_ROOM theo từng ticket (leading throttle). */
  private readonly adminUnreadAt = new Map<string, number>();

  emitMessage(
    ticket: SupportTicketEntity,
    audience: TicketMessageAudience,
    message: PublicMessage | AdminMessage,
  ): void {
    const payload: TicketMessagePayload = {
      ticketId: ticket.id,
      audience,
      message,
    };
    this.emit(ticket.id, audience, TICKET_EVENT_MESSAGE, payload);
  }

  emitRead(
    ticket: SupportTicketEntity,
    audience: TicketMessageAudience,
    byUserId: string,
    lastReadMessageId: string | null,
    readAt: Date,
  ): void {
    const payload: TicketReadPayload = {
      ticketId: ticket.id,
      audience,
      byUserId,
      lastReadMessageId,
      readAt: readAt.toISOString(),
    };
    this.emit(ticket.id, audience, TICKET_EVENT_READ, payload);
  }

  emitTyping(
    ticket: SupportTicketEntity,
    audience: TicketMessageAudience,
    fromUserId: string,
    fromRole: string,
  ): void {
    const payload: TicketTypingPayload = {
      ticketId: ticket.id,
      audience,
      fromUserId,
      fromRole,
    };
    this.emit(ticket.id, audience, TICKET_EVENT_TYPING, payload);
  }

  /**
   * Ping tới room riêng của 1 user (kể cả khi họ KHÔNG mở ticket) để FE cập
   * nhật badge số tin chưa đọc hiển thị ngoài ticket. Nhẹ — chỉ kèm ticketId.
   */
  emitUnread(userId: string | null | undefined, ticketId: string): void {
    if (!userId) return;
    try {
      this.gateway.emitToUser(userId, TICKET_EVENT_UNREAD, { ticketId });
    } catch {
      // best-effort
    }
  }

  /**
   * Ping badge tới TẤT CẢ admin (ticket chưa gán). Gộp theo cửa sổ
   * {@link ADMIN_UNREAD_THROTTLE_MS}/ticket: nhiều tin liên tiếp chỉ phát 1 ping
   * → tránh mọi admin invalidate query dồn dập ("refetch storm").
   */
  emitUnreadToAdmins(ticketId: string): void {
    const now = Date.now();
    const last = this.adminUnreadAt.get(ticketId) ?? 0;
    if (now - last < ADMIN_UNREAD_THROTTLE_MS) return;
    this.adminUnreadAt.set(ticketId, now);
    try {
      this.gateway.emitToRoom(ADMINS_ROOM, TICKET_EVENT_UNREAD, { ticketId });
    } catch {
      // best-effort
    }
  }

  private emit(
    ticketId: string,
    audience: TicketMessageAudience,
    event: string,
    payload: unknown,
  ): void {
    try {
      this.gateway.emitToRoom(
        ticketAudienceRoom(ticketId, audience),
        event,
        payload,
      );
    } catch {
      // realtime là best-effort, không chặn nghiệp vụ.
    }
  }
}
