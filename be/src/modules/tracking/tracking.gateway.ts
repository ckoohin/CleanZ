import {
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinRoomDto } from './dto/join-room.dto';
import { LocationUpdateDto } from './dto/location-update.dto';
import {
  AuthenticatedTrackingUser,
  BookingRoomResponse,
  TaskerLocationUpdatedPayload,
  TrackingService,
} from './tracking.service';

interface TaskerTrackingStartedResponse extends BookingRoomResponse {
  updateIntervalMs: number;
}

interface TaskerArrivedPayload {
  bookingId: string;
  status: string;
  arrivedAt: string;
  trackingStopped: boolean;
}

interface BookingProgressPayload {
  bookingId: string;
  status: string;
  startedAt: string;
}

interface BookingCompletedPayload {
  bookingId: string;
  status: string;
  completedAt: string;
  paymentStatus: string;
}

interface BookingStatusUpdatedPayload {
  bookingId: string;
  bookingCode: string;
  previousStatus: string;
  status: string;
  changedAt: string;
  actor: {
    type: 'TASKER' | 'ADMIN' | 'CUSTOMER' | 'SYSTEM';
    id?: string | null;
    name?: string | null;
  };
  checkedInAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  paymentStatus?: string | null;
}

interface TrackingSocketData {
  user?: AuthenticatedTrackingUser;
}

@WebSocketGateway({
  namespace: '/tracking',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TrackingGateway.name);
  private readonly taskerLocationUpdateIntervalMs = 10_000;
  private readonly taskerTrackingTimers = new Map<string, NodeJS.Timeout>();
  private readonly taskerTrackingBookings = new Map<string, string>();

  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly trackingService: TrackingService) {}

  afterInit(): void {
    this.logger.log('Socket.io tracking gateway is ready at /tracking');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.authenticateClient(client);
      this.getSocketData(client).user = user;
      this.logger.log(
        `Socket connected: ${client.id} user=${user.id} role=${user.role}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể xác thực socket';
      this.logger.warn(`Socket rejected: ${client.id}. ${message}`);
      client.emit('tracking:error', {
        event: 'connect',
        message,
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.stopTaskerTrackingTimer(client.id);
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('booking:join')
  async joinBookingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto | string,
  ): Promise<BookingRoomResponse> {
    try {
      this.logger.log(
        `Socket ${client.id} received booking:join payload=${JSON.stringify(
          payload,
        )}`,
      );

      const data = this.parseSocketPayload<JoinRoomDto>(payload);
      const bookingId = data.bookingId?.trim();
      if (!bookingId) {
        throw new BadRequestException('bookingId là bắt buộc');
      }

      const response = await this.trackingService.buildBookingRoom(
        bookingId,
        this.getClientUser(client),
      );
      await client.join(response.room);
      const roomSockets = await this.server.in(response.room).allSockets();
      client.emit('booking:joined', {
        ...response,
        roomMemberCount: roomSockets.size,
      });
      this.logger.log(
        `Socket ${client.id} joined room ${response.room}. roomMembers=${roomSockets.size}`,
      );

      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể join booking room';
      this.logger.error(`Socket ${client.id} failed booking:join: ${message}`);
      client.emit('tracking:error', {
        event: 'booking:join',
        message,
      });
      throw error;
    }
  }

  @SubscribeMessage('tasker:tracking:start')
  async startTaskerTracking(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto | string,
  ): Promise<TaskerTrackingStartedResponse> {
    try {
      this.logger.log(
        `Socket ${client.id} received tasker:tracking:start payload=${JSON.stringify(
          payload,
        )}`,
      );

      const data = this.parseSocketPayload<JoinRoomDto>(payload);
      const bookingId = data.bookingId?.trim();
      if (!bookingId) {
        throw new BadRequestException('bookingId là bắt buộc');
      }

      const response = await this.trackingService.buildTaskerTrackingRoom(
        bookingId,
        this.getClientUser(client),
      );
      await client.join(response.room);
      this.startTaskerTrackingTimer(client, bookingId);

      const result = {
        ...response,
        updateIntervalMs: this.taskerLocationUpdateIntervalMs,
      };
      client.emit('tasker:tracking:started', result);

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không thể bắt đầu tracking';
      this.logger.error(
        `Socket ${client.id} failed tasker:tracking:start: ${message}`,
      );
      client.emit('tracking:error', {
        event: 'tasker:tracking:start',
        message,
      });
      throw error;
    }
  }

  @SubscribeMessage('tasker:tracking:stop')
  stopTaskerTracking(@ConnectedSocket() client: Socket): { stopped: boolean } {
    const stopped = this.stopTaskerTrackingTimer(client.id);
    client.emit('tasker:tracking:stopped', { stopped });

    return { stopped };
  }

  emitToBookingRoom<TPayload>(
    bookingId: string,
    event: string,
    payload: TPayload,
  ): Promise<{ room: string; roomMemberCount: number }> {
    return this.trackingService.emitToBookingRoom(
      this.server,
      bookingId,
      event,
      payload,
    );
  }

  async emitTaskerArrived(
    bookingId: string,
    payload: TaskerArrivedPayload,
  ): Promise<{ room: string; roomMemberCount: number; stoppedTimers: number }> {
    const stoppedTimers = this.stopTaskerTrackingForBooking(bookingId);
    this.trackingService.clearBookingRouteCache(bookingId);
    const emitResult = await this.emitToBookingRoom(
      bookingId,
      'tasker:arrived',
      payload,
    );

    this.logger.log(
      `Emitted tasker:arrived to ${emitResult.room}. roomMembers=${emitResult.roomMemberCount}, stoppedTimers=${stoppedTimers}`,
    );

    return {
      ...emitResult,
      stoppedTimers,
    };
  }

  emitBookingInProgress(
    bookingId: string,
    payload: BookingProgressPayload,
  ): Promise<{ room: string; roomMemberCount: number }> {
    return this.emitToBookingRoom(bookingId, 'booking:in_progress', payload);
  }

  emitBookingStatusUpdated(
    bookingId: string,
    payload: BookingStatusUpdatedPayload,
  ): Promise<{ room: string; roomMemberCount: number }> {
    return this.emitToBookingRoom(bookingId, 'booking:status_updated', payload);
  }

  async emitBookingCompleted(
    bookingId: string,
    payload: BookingCompletedPayload,
  ): Promise<{ room: string; roomMemberCount: number }> {
    this.trackingService.clearBookingRouteCache(bookingId);
    const emitResult = await this.emitToBookingRoom(
      bookingId,
      'booking:completed',
      payload,
    );
    await this.emitToBookingRoom(bookingId, 'customer:notification', {
      type: 'BOOKING_COMPLETED',
      title: 'Dịch vụ đã hoàn thành',
      message: 'Tasker đã hoàn thành công việc của bạn',
      bookingId,
      createdAt: payload.completedAt,
    });

    return emitResult;
  }

  @SubscribeMessage('tasker:location:update')
  async updateTaskerLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LocationUpdateDto | string,
  ): Promise<TaskerLocationUpdatedPayload> {
    try {
      this.logger.log(
        `Socket ${client.id} received tasker:location:update payload=${JSON.stringify(
          payload,
        )}`,
      );

      const location =
        await this.trackingService.buildTaskerLocationUpdatedPayload(
          this.parseSocketPayload<LocationUpdateDto>(payload),
          this.getClientUser(client),
        );

      const emitResult = await this.emitToBookingRoom(
        location.bookingId,
        'tasker:location:updated',
        location,
      );
      client.emit('tasker:location:accepted', {
        ...location,
        room: emitResult.room,
        roomMemberCount: emitResult.roomMemberCount,
        nextUpdateInMs: this.taskerLocationUpdateIntervalMs,
      });
      this.logger.log(
        `Socket ${client.id} updated tasker location for ${emitResult.room}. roomMembers=${emitResult.roomMemberCount}`,
      );

      return location;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật vị trí tasker';
      this.logger.error(
        `Socket ${client.id} failed tasker:location:update: ${message}`,
      );
      client.emit('tracking:error', {
        event: 'tasker:location:update',
        message,
      });
      throw error;
    }
  }

  private parseSocketPayload<TPayload>(payload: TPayload | string): TPayload {
    if (typeof payload !== 'string') {
      return payload;
    }

    return JSON.parse(payload) as TPayload;
  }

  private async authenticateClient(
    client: Socket,
  ): Promise<AuthenticatedTrackingUser> {
    const handshakeAuth = client.handshake.auth as
      | { token?: unknown }
      | undefined;
    const authToken =
      typeof handshakeAuth?.token === 'string'
        ? handshakeAuth.token
        : undefined;
    const headers = client.handshake.headers as {
      authorization?: unknown;
      cookie?: unknown;
    };
    const authorizationHeader = Array.isArray(headers.authorization)
      ? headers.authorization.find(
          (value): value is string => typeof value === 'string',
        )
      : typeof headers.authorization === 'string'
        ? headers.authorization
        : undefined;
    const cookieHeader =
      typeof headers.cookie === 'string' ? headers.cookie : undefined;

    return this.trackingService.authenticateSocket({
      cookieHeader,
      authorizationHeader,
      authToken,
    });
  }

  private getClientUser(client: Socket): AuthenticatedTrackingUser {
    const user = this.getSocketData(client).user;
    if (!user) {
      throw new UnauthorizedException('Socket chưa được xác thực');
    }

    return user;
  }

  private getSocketData(client: Socket): TrackingSocketData {
    return client.data as TrackingSocketData;
  }

  private startTaskerTrackingTimer(client: Socket, bookingId: string): void {
    this.stopTaskerTrackingTimer(client.id);
    this.emitLocationRequest(client, bookingId);

    const timer = setInterval(() => {
      this.emitLocationRequest(client, bookingId);
    }, this.taskerLocationUpdateIntervalMs);

    this.taskerTrackingTimers.set(client.id, timer);
    this.taskerTrackingBookings.set(client.id, bookingId);
    this.logger.log(
      `Socket ${client.id} started tasker tracking for booking:${bookingId} every ${this.taskerLocationUpdateIntervalMs}ms`,
    );
  }

  private stopTaskerTrackingTimer(clientId: string): boolean {
    const timer = this.taskerTrackingTimers.get(clientId);
    if (!timer) {
      return false;
    }

    clearInterval(timer);
    this.taskerTrackingTimers.delete(clientId);
    this.taskerTrackingBookings.delete(clientId);
    this.logger.log(`Socket ${clientId} stopped tasker tracking`);

    return true;
  }

  private stopTaskerTrackingForBooking(bookingId: string): number {
    let stoppedTimers = 0;

    for (const [clientId, trackedBookingId] of this.taskerTrackingBookings) {
      if (trackedBookingId !== bookingId) {
        continue;
      }

      if (this.stopTaskerTrackingTimer(clientId)) {
        stoppedTimers += 1;
      }
    }

    return stoppedTimers;
  }

  private emitLocationRequest(client: Socket, bookingId: string): void {
    client.emit('tasker:location:request', {
      bookingId,
      updateIntervalMs: this.taskerLocationUpdateIntervalMs,
      requestedAt: new Date().toISOString(),
    });
  }
}
