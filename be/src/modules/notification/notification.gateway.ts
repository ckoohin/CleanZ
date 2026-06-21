import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import {
  NOTIFICATION_EVENT_NEW,
  NOTIFICATION_EVENT_UNREAD,
  userRoom,
} from './notification.constants';
import { NotificationResponse } from './dto/notification-response.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3020',
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly wsJwt: WsJwtGuard) {}

  async handleConnection(client: Socket): Promise<void> {
    const userId = this.wsJwt.verifyFromHandshake(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    await client.join(userRoom(userId));
    this.logger.debug(`WS connected user=${userId} sid=${client.id}`);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  emitNewNotification(userId: string, payload: NotificationResponse): void {
    this.emitToUser(userId, NOTIFICATION_EVENT_NEW, payload);
  }

  emitUnreadCount(userId: string, count: number): void {
    this.emitToUser(userId, NOTIFICATION_EVENT_UNREAD, { count });
  }
}
