import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { AdminMessage, PublicMessage } from '../dto/ticket-response.dto';

/** Sự kiện socket realtime cho ChatBox (phát qua NotificationGateway). */
export const TICKET_EVENT_MESSAGE = 'ticket:message';
export const TICKET_EVENT_TYPING = 'ticket:typing';
export const TICKET_EVENT_READ = 'ticket:read';
export const TICKET_EVENT_JOIN = 'ticket:join';
export const TICKET_EVENT_LEAVE = 'ticket:leave';
/** Ping per-user (room theo user) để FE cập nhật badge số tin chưa đọc ngoài ticket. */
export const TICKET_EVENT_UNREAD = 'ticket:unread';

/**
 * Room realtime theo (ticket, audience). Mọi người đang MỞ luồng đó (kể cả
 * nhiều admin chưa được gán) đều join → nhận tin tức thì, không phụ thuộc
 * assignedAdmin. Cô lập vẫn đảm bảo vì server kiểm quyền trước khi cho join.
 */
export function ticketAudienceRoom(
  ticketId: string,
  audience: TicketMessageAudience,
): string {
  return `ticket:${ticketId}:${audience}`;
}

export interface TicketMessagePayload {
  ticketId: string;
  audience: TicketMessageAudience;
  message: PublicMessage | AdminMessage;
}

export interface TicketTypingPayload {
  ticketId: string;
  audience: TicketMessageAudience;
  fromUserId: string;
  fromRole: string;
}

export interface TicketReadPayload {
  ticketId: string;
  audience: TicketMessageAudience;
  byUserId: string;
  lastReadMessageId: string | null;
  readAt: string;
}
