import {
  BadRequestException,
  Injectable,
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

@Injectable()
export class TrackingService {
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
    const route = await this.goongMapService.calculateDrivingRoute({
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
}
