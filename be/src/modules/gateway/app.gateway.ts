import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/',
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  afterInit() {
    this.logger.log('✅ WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ---- Booking Events ----

  /** Emit khi booking status thay đổi */
  emitBookingStatusChanged(bookingId: string, status: string) {
    this.server.emit('booking:statusChanged', { bookingId, status });
  }

  /** Emit khi assign cleaner thành công */
  emitCleanerAssigned(bookingId: string, cleanerId: string) {
    this.server.emit('booking:cleanerAssigned', { bookingId, cleanerId });
  }

  // ---- Cleaner Tracking ----

  /** Client (cleaner app) gửi vị trí lên */
  @SubscribeMessage('cleaner:updateLocation')
  handleCleanerLocation(
    @MessageBody() data: { bookingId: string; lat: number; lng: number },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Cleaner ${client.id} location: ${JSON.stringify(data)}`);
    // Broadcast vị trí tới customer theo bookingId
    this.server.emit(`cleaner:location:${data.bookingId}`, {
      lat: data.lat,
      lng: data.lng,
    });
  }

  // ---- Notification ----

  /** Emit notification tới user cụ thể */
  emitNotification(userId: string, payload: Record<string, unknown>) {
    this.server.emit(`notification:${userId}`, payload);
  }
}
