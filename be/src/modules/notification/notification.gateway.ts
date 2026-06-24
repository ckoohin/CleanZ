import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { wsCorsOptions } from 'src/common/helpers/ws-cors.helper';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import {
  ADMINS_ROOM,
  NOTIFICATION_EVENT_NEW,
  NOTIFICATION_EVENT_UNREAD,
  userRoom,
} from './notification.constants';
import { NotificationResponse } from './dto/notification-response.dto';

@WebSocketGateway({ cors: wsCorsOptions() })
export class NotificationGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly wsJwt: WsJwtGuard) {}

  async handleConnection(client: Socket): Promise<void> {
    const auth = this.wsJwt.verifyPayloadFromHandshake(client);
    if (!auth) {
      client.disconnect(true);
      return;
    }
    await client.join(userRoom(auth.userId));
    // Admin join room chung để nhận badge tin chưa đọc của ticket CHƯA gán.
    if (auth.role === 'ADMIN') {
      await client.join(ADMINS_ROOM);
    }
    this.logger.debug(`WS connected user=${auth.userId} sid=${client.id}`);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  /** Phát tới 1 room bất kỳ (vd ticket-audience room cho ChatBox). */
  emitToRoom(room: string, event: string, payload: unknown): void {
    this.server.to(room).emit(event, payload);
  }

  emitNewNotification(userId: string, payload: NotificationResponse): void {
    this.emitToUser(userId, NOTIFICATION_EVENT_NEW, payload);
  }

  emitUnreadCount(userId: string, count: number): void {
    this.emitToUser(userId, NOTIFICATION_EVENT_UNREAD, { count });
  }
}
