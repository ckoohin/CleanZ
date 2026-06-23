import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Server } from 'socket.io';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { BookingEntity } from '../booking/entity/booking.entity';
import { GoongMapService, GoongRouteSummary } from '../goong/goong-map.service';
import { LocationUpdateDto } from './dto/location-update.dto';

export interface BookingRoomResponse {
  bookingId: string;
  room: string;
}

export interface TaskerLocationUpdatedPayload {
  bookingId: string;
  status: BookingStatus;
  tasker: {
    id: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  };
  currentLocation: {
    latitude: number;
    longitude: number;
    updatedAt: string;
    accuracy?: number | null;
    capturedAt?: string | null;
  };
  destination: {
    latitude: number;
    longitude: number;
    address: string;
    addressId?: string | null;
  };
  route: GoongRouteSummary;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface TrackingEmitResult {
  room: string;
  roomMemberCount: number;
}

interface RouteCacheEntry {
  route: GoongRouteSummary;
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  calculatedAt: number;
  lastAccessedAt: number;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly routeRefreshIntervalMs = 90_000;
  private readonly routeRefreshDistanceMeters = 50;
  private readonly routeCacheTtlMs = 6 * 60 * 60 * 1000;
  private readonly routeCache = new Map<string, RouteCacheEntry>();
  private readonly pendingRouteRequests = new Map<
    string,
    Promise<GoongRouteSummary>
  >();

  constructor(
    private readonly dataSource: DataSource,
    private readonly goongMapService: GoongMapService,
  ) {}

  async buildBookingRoom(bookingId: string): Promise<BookingRoomResponse> {
    const bookingExists = await this.dataSource
      .getRepository(BookingEntity)
      .exists({ where: { id: bookingId } });

    if (!bookingExists) {
      throw new NotFoundException('Booking không tồn tại');
    }

    return {
      bookingId,
      room: this.getBookingRoom(bookingId),
    };
  }

  async emitToBookingRoom<TPayload>(
    server: Server,
    bookingId: string,
    event: string,
    payload: TPayload,
  ): Promise<TrackingEmitResult> {
    const room = this.getBookingRoom(bookingId);
    const roomSockets = await server.in(room).allSockets();
    server.to(room).emit(event, payload);

    return {
      room,
      roomMemberCount: roomSockets.size,
    };
  }

  getBookingRoom(bookingId: string): string {
    return `booking:${bookingId}`;
  }

  async buildTaskerLocationUpdatedPayload(
    dto: LocationUpdateDto,
  ): Promise<TaskerLocationUpdatedPayload> {
    const bookingId = dto.bookingId?.trim();
    if (!bookingId) {
      throw new BadRequestException('bookingId là bắt buộc');
    }

    const latitude = Number(dto.latitude);
    const longitude = Number(dto.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException('Tọa độ tasker không hợp lệ');
    }

    const booking = await this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('booking.addressRef', 'addressRef')
      .where('booking.id = :bookingId', { bookingId })
      .andWhere('booking.status = :status', {
        status: BookingStatus.TASKER_ON_THE_WAY,
      })
      .andWhere('tasker.id IS NOT NULL')
      .getOne();

    if (!booking) {
      throw new NotFoundException(
        'Booking không tồn tại, chưa ở trạng thái tasker đang tới hoặc chưa có tasker nhận',
      );
    }

    const tasker = booking.tasker;
    if (!tasker) {
      throw new NotFoundException('Booking chưa có tasker nhận');
    }

    const destinationLatitude = Number(booking.addressRef?.latitude);
    const destinationLongitude = Number(booking.addressRef?.longitude);
    if (
      !Number.isFinite(destinationLatitude) ||
      !Number.isFinite(destinationLongitude)
    ) {
      throw new NotFoundException('Không tìm thấy tọa độ địa chỉ booking');
    }

    const updatedAt = new Date().toISOString();
    const accuracy = Number(dto.accuracy);
    const route = await this.getDrivingRoute({
      bookingId: booking.id,
      originLatitude: latitude,
      originLongitude: longitude,
      destinationLatitude,
      destinationLongitude,
    });

    return {
      bookingId: booking.id,
      status: booking.status,
      tasker: {
        id: tasker.id,
        fullName: tasker.user?.fullName ?? null,
        avatarUrl: tasker.user?.avatarUrl ?? null,
      },
      currentLocation: {
        latitude,
        longitude,
        updatedAt,
        accuracy: Number.isFinite(accuracy) ? accuracy : null,
        capturedAt: dto.capturedAt ?? null,
      },
      destination: {
        latitude: destinationLatitude,
        longitude: destinationLongitude,
        address: booking.addressRef?.fullAddress ?? booking.address,
        addressId: booking.addressRef?.id ?? null,
      },
      route,
      latitude,
      longitude,
      updatedAt,
    };
  }

  clearBookingRouteCache(bookingId: string): void {
    this.routeCache.delete(bookingId);
    this.pendingRouteRequests.delete(bookingId);
  }

  private async getDrivingRoute(input: {
    bookingId: string;
    originLatitude: number;
    originLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
  }): Promise<GoongRouteSummary> {
    const now = Date.now();
    this.removeExpiredRouteCacheEntries(now);

    const cached = this.routeCache.get(input.bookingId);
    if (cached && this.hasSameDestination(cached, input)) {
      cached.lastAccessedAt = now;

      const elapsedMs = now - cached.calculatedAt;
      const movedMeters = this.calculateDistanceMeters(
        cached.originLatitude,
        cached.originLongitude,
        input.originLatitude,
        input.originLongitude,
      );

      if (
        elapsedMs < this.routeRefreshIntervalMs ||
        movedMeters < this.routeRefreshDistanceMeters
      ) {
        return cached.route;
      }
    }

    const pendingRequest = this.pendingRouteRequests.get(input.bookingId);
    if (pendingRequest) {
      return pendingRequest;
    }

    const routeRequest = this.goongMapService
      .calculateDrivingRoute({
        originLatitude: input.originLatitude,
        originLongitude: input.originLongitude,
        destinationLatitude: input.destinationLatitude,
        destinationLongitude: input.destinationLongitude,
      })
      .then((route) => {
        this.routeCache.set(input.bookingId, {
          route,
          originLatitude: input.originLatitude,
          originLongitude: input.originLongitude,
          destinationLatitude: input.destinationLatitude,
          destinationLongitude: input.destinationLongitude,
          calculatedAt: Date.now(),
          lastAccessedAt: Date.now(),
        });

        return route;
      })
      .finally(() => {
        this.pendingRouteRequests.delete(input.bookingId);
      });

    this.pendingRouteRequests.set(input.bookingId, routeRequest);
    this.logger.debug(`Refreshing Goong route for booking:${input.bookingId}`);

    return routeRequest;
  }

  private hasSameDestination(
    cached: RouteCacheEntry,
    input: {
      destinationLatitude: number;
      destinationLongitude: number;
    },
  ): boolean {
    return (
      cached.destinationLatitude === input.destinationLatitude &&
      cached.destinationLongitude === input.destinationLongitude
    );
  }

  private removeExpiredRouteCacheEntries(now: number): void {
    for (const [bookingId, entry] of this.routeCache) {
      if (now - entry.lastAccessedAt > this.routeCacheTtlMs) {
        this.routeCache.delete(bookingId);
      }
    }
  }

  private calculateDistanceMeters(
    fromLatitude: number,
    fromLongitude: number,
    toLatitude: number,
    toLongitude: number,
  ): number {
    const earthRadiusMeters = 6_371_000;
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const latitudeDelta = toRadians(toLatitude - fromLatitude);
    const longitudeDelta = toRadians(toLongitude - fromLongitude);
    const fromLatitudeRadians = toRadians(fromLatitude);
    const toLatitudeRadians = toRadians(toLatitude);

    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(fromLatitudeRadians) *
        Math.cos(toLatitudeRadians) *
        Math.sin(longitudeDelta / 2) ** 2;

    return (
      2 *
      earthRadiusMeters *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
    );
  }
}
