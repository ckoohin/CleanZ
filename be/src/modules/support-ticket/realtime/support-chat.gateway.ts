import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { wsCorsOptions } from 'src/common/helpers/ws-cors.helper';
import { WsJwtGuard } from 'src/modules/notification/guards/ws-jwt.guard';
import { UserRole } from 'src/common/enums/user-role.enum';
import { TicketMessageAudience } from 'src/common/enums/ticket-message-audience.enum';
import { SupportTicketEntity } from '../entity/support-ticket.entity';
import { TicketRealtimeService } from './ticket-realtime.service';
import {
  TICKET_EVENT_JOIN,
  TICKET_EVENT_LEAVE,
  TICKET_EVENT_TYPING,
  ticketAudienceRoom,
} from './ticket-events.constants';

interface TypingInbound {
  ticketId: string;
  audience?: TicketMessageAudience;
}
interface JoinInbound {
  ticketId: string;
  audience?: TicketMessageAudience;
}

/**
 * Realtime ChatBox: client join room theo (ticket, audience); server KIỂM QUYỀN
 * trước khi cho join (cô lập 2 thread + nội bộ). Mọi người đang mở đúng luồng
 * (kể cả nhiều admin chưa được gán) đều nhận tin tức thì. Chia sẻ io server với
 * NotificationGateway (đã handle connection/auth + join user room).
 */
@WebSocketGateway({ cors: wsCorsOptions() })
export class SupportChatGateway {
  private readonly logger = new Logger(SupportChatGateway.name);

  constructor(
    private readonly wsJwt: WsJwtGuard,
    private readonly realtime: TicketRealtimeService,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
  ) {}

  /** Các luồng mà user được phép thấy của ticket này. */
  private allowedAudiences(
    ticket: SupportTicketEntity,
    userId: string,
    role: string,
  ): TicketMessageAudience[] {
    if (role === (UserRole.ADMIN as string)) {
      return [
        TicketMessageAudience.REPORTER,
        TicketMessageAudience.COUNTERPARTY,
        TicketMessageAudience.INTERNAL,
      ];
    }
    if (ticket.reporter?.id === userId) return [TicketMessageAudience.REPORTER];
    if (ticket.counterparty?.id === userId)
      return [TicketMessageAudience.COUNTERPARTY];
    return [];
  }

  private async resolve(
    client: Socket,
    ticketId: string,
  ): Promise<{
    userId: string;
    role: string;
    ticket: SupportTicketEntity;
  } | null> {
    const auth = this.wsJwt.verifyPayloadFromHandshake(client);
    if (!auth || !ticketId) return null;
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['reporter', 'counterparty'],
    });
    if (!ticket) return null;
    return { userId: auth.userId, role: auth.role, ticket };
  }

  @SubscribeMessage(TICKET_EVENT_JOIN)
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinInbound,
  ): Promise<void> {
    const ctx = await this.resolve(client, data?.ticketId);
    if (!ctx) return;
    let allowed = this.allowedAudiences(ctx.ticket, ctx.userId, ctx.role);
    // Nếu client chỉ quan tâm 1 luồng (vd 1 tab admin) → join đúng luồng đó.
    if (data.audience) {
      allowed = allowed.filter((a) => a === data.audience);
    }
    for (const a of allowed) {
      await client.join(ticketAudienceRoom(data.ticketId, a));
    }
  }

  @SubscribeMessage(TICKET_EVENT_LEAVE)
  async onLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinInbound,
  ): Promise<void> {
    if (!data?.ticketId) return;
    for (const a of [
      TicketMessageAudience.REPORTER,
      TicketMessageAudience.COUNTERPARTY,
      TicketMessageAudience.INTERNAL,
    ]) {
      await client.leave(ticketAudienceRoom(data.ticketId, a));
    }
  }

  @SubscribeMessage(TICKET_EVENT_TYPING)
  async onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingInbound,
  ): Promise<void> {
    const ctx = await this.resolve(client, data?.ticketId);
    if (!ctx) return;
    const allowed = this.allowedAudiences(ctx.ticket, ctx.userId, ctx.role);
    // Audience đang gõ: client chỉ định (admin) hoặc luồng duy nhất của user.
    const audience = data.audience ?? allowed[0];
    if (
      !audience ||
      audience === TicketMessageAudience.INTERNAL ||
      !allowed.includes(audience)
    ) {
      return; // không có typing nội bộ / ngoài quyền
    }
    const fromRole =
      ctx.role === (UserRole.ADMIN as string) ? 'ADMIN' : ctx.role;
    this.realtime.emitTyping(ctx.ticket, audience, ctx.userId, fromRole);
  }
}
