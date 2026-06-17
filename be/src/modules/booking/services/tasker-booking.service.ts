import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { PricingService } from 'src/modules/pricing/pricing.service';
import { ServiceEntity } from 'src/modules/pricing/entity/service.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { TaskerBookingLocationDto } from '../dto/tasker-booking-location.dto';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BookingPolicyService } from './booking-policy.service';

interface TaskerPostedBookingItem {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  service: {
    id: string;
    name: string;
    description?: string | null;
  };
  area: {
    displayAddress?: string | null;
  };
  schedule: {
    scheduledStartDate?: string | null;
    scheduledStartTime?: string | null;
    scheduledEndDate?: string | null;
    scheduledEndTime?: string | null;
    durationHours: number;
  };
  price: {
    totalPrice: number;
    basePrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
  };
  flags: {
    hasPet: boolean;
  };
  createdAt: Date;
}

export interface TaskerPostedBookingListResponse {
  total: number;
  items: TaskerPostedBookingItem[];
}

export interface TaskerPostedBookingDetailResponse {
  distance: {
    meters: number;
    kilometers: number;
  };
  service: {
    id: string;
    name: string;
    description?: string | null;
  };
  price: {
    totalPrice: number;
    basePrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
  };
  schedule: {
    scheduledStartDate?: string | null;
    scheduledStartTime?: string | null;
    scheduledEndDate?: string | null;
    scheduledEndTime?: string | null;
    durationHours: number;
  };
}

export interface TaskerAcceptBookingResponse {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  tasker: {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  schedule: {
    scheduledStartDate?: string | null;
    scheduledStartTime?: string | null;
    scheduledEndDate?: string | null;
    scheduledEndTime?: string | null;
    durationHours: number;
  };
}

export interface TaskerAssignedBookingDetailResponse {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  canContactCustomer: boolean;
  service: {
    id: string;
    name: string;
    description?: string | null;
  };
  distance: {
    meters: number;
    kilometers: number;
  } | null;
  area?: {
    displayAddress?: string | null;
  };
  address?: {
    fullAddress: string;
    wardDetail?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    hasPet: boolean;
  };
  schedule: {
    scheduledStartDate?: string | null;
    scheduledStartTime?: string | null;
    scheduledEndDate?: string | null;
    scheduledEndTime?: string | null;
    durationHours: number;
  };
  price: {
    totalPrice: number;
    basePrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
  };
  payment?: {
    method: string;
    status: string;
  };
  customer?: {
    id: string;
    fullName?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  };
  note?: string | null;
  flags: {
    hasPet: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface BookingDistanceRaw {
  distance_meters?: string | number | null;
}

interface TaskerLocationInput {
  currentLatitude?: number;
  currentLongitude?: number;
}

const CUSTOMER_CONTACT_VISIBLE_STATUSES = [
  BookingStatus.TASKER_ON_THE_WAY,
  BookingStatus.CHECKED_IN,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

@Injectable()
export class TaskerBookingService {
  private readonly logger = new Logger(TaskerBookingService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingPolicyService: BookingPolicyService,
    private readonly pricingService: PricingService,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
  ) {}

  private emitBookingNotification(
    userId: string | undefined,
    type: NotificationType,
    bookingId: string,
    title: string,
    content: string,
  ): void {
    if (!userId) return;
    void this.notificationService
      .notify({
        userId,
        type,
        title,
        content,
        referenceType: NotificationRefType.BOOKING,
        referenceId: bookingId,
        dedupeKey: `booking:${bookingId}:${type}`,
      })
      .catch((err) =>
        this.logger.error(
          `Không thể enqueue noti booking ${bookingId}/${type}: ${err}`,
        ),
      );
  }

  async findPostedBookings(
    userId: string,
  ): Promise<TaskerPostedBookingListResponse> {
    return asyncHandleOperation(async () => {
      await this.assertTaskerProfileExists(userId);

      const bookings = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .where('booking.status = :status', { status: BookingStatus.POSTED })
        .andWhere('tasker.id IS NULL')
        .orderBy('booking.scheduledStartDate', 'ASC')
        .addOrderBy('booking.scheduledStartTime', 'ASC')
        .addOrderBy('booking.createdAt', 'ASC')
        .getMany();

      const services = await this.findServicesByBookingServiceIds(bookings);
      const items = bookings.map((booking) =>
        this.mapPostedBookingItem(booking, services),
      );

      return {
        total: items.length,
        items,
      };
    }, 'Không thể lấy danh sách booking');
  }

  async findPostedBookingDetail(
    userId: string,
    bookingId: string,
    location: TaskerBookingLocationDto,
  ): Promise<TaskerPostedBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      await this.assertTaskerProfileExists(userId);

      const distanceExpression = `
        ST_DistanceSphere(
          ST_MakePoint(:currentLongitude, :currentLatitude),
          ST_MakePoint(
            CAST(addressRef.longitude AS double precision),
            CAST(addressRef.latitude AS double precision)
          )
        )
      `;

      const { entities, raw } = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .addSelect(distanceExpression, 'distance_meters')
        .where('booking.id = :bookingId', { bookingId })
        .andWhere('booking.status = :status', { status: BookingStatus.POSTED })
        .andWhere('tasker.id IS NULL')
        .andWhere('addressRef.latitude IS NOT NULL')
        .andWhere('addressRef.longitude IS NOT NULL')
        .setParameters({
          currentLatitude: location.currentLatitude,
          currentLongitude: location.currentLongitude,
        })
        .getRawAndEntities();

      const booking = entities[0];
      if (!booking) {
        throw new NotFoundException(
          'Booking không tồn tại, không còn ở trạng thái posted hoặc thiếu tọa độ địa chỉ',
        );
      }

      const distanceMeters = this.parseDistanceMeters(
        (raw[0] as BookingDistanceRaw | undefined)?.distance_meters,
      );
      const service = await this.findServiceByBooking(booking);

      return {
        distance: {
          meters: distanceMeters,
          kilometers: Number((distanceMeters / 1000).toFixed(2)),
        },
        service,
        price: {
          totalPrice: toNumber(booking.totalPrice),
          basePrice: toNumber(booking.basePrice),
          peakFee: toNumber(booking.peakFee),
          petFee: toNumber(booking.petFee),
          discountAmount: toNumber(booking.discountAmount),
        },
        schedule: {
          scheduledStartDate: booking.scheduledStartDate,
          scheduledStartTime: booking.scheduledStartTime,
          scheduledEndDate: booking.scheduledEndDate,
          scheduledEndTime: booking.scheduledEndTime,
          durationHours: toNumber(booking.durationHours),
        },
      };
    }, 'Không thể lấy chi tiết booking posted cho tasker');
  }

  async acceptPostedBooking(
    userId: string,
    bookingId: string,
  ): Promise<TaskerAcceptBookingResponse> {
    return asyncHandleOperation(async () => {
      let customerUserId: string | undefined;
      const result = await this.dataSource.transaction(async (manager) => {
        const tasker = await this.findTaskerProfile(userId);
        this.bookingPolicyService.assertTaskerCanAcceptBooking(tasker);
        await this.walletService.getOrCreateTaskerWallet(manager, tasker);

        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .getOne();

        if (!booking) {
          throw new NotFoundException('Booking không tồn tại');
        }

        if (booking.status !== BookingStatus.POSTED || booking.tasker) {
          throw new ConflictException(
            'Booking không còn khả dụng hoặc đã có tasker nhận',
          );
        }

        booking.tasker = tasker;
        booking.status = BookingStatus.CONFIRMED;
        customerUserId = booking.customer?.user?.id;
        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus: BookingStatus.POSTED,
          newStatus: BookingStatus.CONFIRMED,
          changedByUser: { id: userId } as UserEntity,
          note: 'Tasker nhận booking',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        return {
          id: savedBooking.id,
          bookingCode: savedBooking.bookingCode,
          status: savedBooking.status,
          tasker: {
            id: tasker.id,
            fullName: tasker.user?.fullName ?? null,
            phone: tasker.user?.phone ?? null,
            avatarUrl: tasker.user?.avatarUrl ?? null,
          },
          schedule: {
            scheduledStartDate: savedBooking.scheduledStartDate,
            scheduledStartTime: savedBooking.scheduledStartTime,
            scheduledEndDate: savedBooking.scheduledEndDate,
            scheduledEndTime: savedBooking.scheduledEndTime,
            durationHours: toNumber(savedBooking.durationHours),
          },
        };
      });

      this.emitBookingNotification(
        customerUserId,
        NotificationType.BOOKING_CONFIRMED,
        result.id,
        'Đơn đặt lịch đã được xác nhận',
        `Tasker đã nhận đơn ${result.bookingCode}. Vui lòng chuẩn bị cho buổi dịch vụ.`,
      );

      return result;
    }, 'Không thể nhận booking');
  }

  async findAssignedBookingDetail(
    userId: string,
    bookingId: string,
    location?: TaskerLocationInput,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerProfile(userId);
      const booking = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .where('booking.id = :bookingId', { bookingId })
        .andWhere('tasker.id = :taskerId', { taskerId: tasker.id })
        .getOne();

      if (!booking) {
        throw new NotFoundException(
          'Booking không tồn tại hoặc không thuộc tasker hiện tại',
        );
      }

      const service = await this.findServiceByBooking(booking);
      const distance = await this.calculateDistanceFromTaskerLocation(
        booking,
        location,
      );
      return this.mapAssignedBookingDetail(booking, service, distance);
    }, 'Không thể lấy chi tiết booking của tasker');
  }

  async markOnTheWay(
    userId: string,
    bookingId: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      const booking = await this.dataSource.transaction(async (manager) => {
        const tasker = await this.findTaskerProfile(userId);
        const bookingRepository = manager.getRepository(BookingEntity);
        const booking = await bookingRepository
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.addressRef', 'addressRef')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .andWhere('tasker.id = :taskerId', { taskerId: tasker.id })
          .getOne();

        if (!booking) {
          throw new NotFoundException(
            'Booking không tồn tại hoặc không thuộc tasker hiện tại',
          );
        }

        if (booking.status !== BookingStatus.CONFIRMED) {
          throw new BadRequestException(
            'Chỉ booking ở trạng thái CONFIRMED mới có thể chuyển sang TASKER_ON_THE_WAY',
          );
        }

        const oldStatus = booking.status;
        booking.status = BookingStatus.TASKER_ON_THE_WAY;
        const savedBooking = await bookingRepository.save(booking);

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus,
          newStatus: BookingStatus.TASKER_ON_THE_WAY,
          changedByUser: { id: userId } as UserEntity,
          note: 'Tasker đang tới',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        return savedBooking;
      });

      this.emitBookingNotification(
        booking.customer?.user?.id,
        NotificationType.TASKER_ON_THE_WAY,
        booking.id,
        'Tasker đang trên đường tới',
        'Tasker đã bắt đầu di chuyển tới địa điểm của bạn.',
      );

      const service = await this.findServiceByBooking(booking);
      return this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể cập nhật trạng thái tasker đang tới');
  }

  private async assertTaskerProfileExists(userId: string): Promise<void> {
    await this.findTaskerProfile(userId);
  }

  private async findTaskerProfile(userId: string): Promise<TaskerEntity> {
    const tasker = await this.dataSource.getRepository(TaskerEntity).findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!tasker) {
      throw new NotFoundException('Không tìm thấy hồ sơ tasker');
    }

    return tasker;
  }

  private async findServicesByBookingServiceIds(
    bookings: BookingEntity[],
  ): Promise<Map<string, ServiceEntity>> {
    const serviceIds = [
      ...new Set(bookings.map((booking) => booking.serviceId)),
    ];
    if (!serviceIds.length) {
      return new Map();
    }

    const services = await this.pricingService.getServicesByIds(
      this.dataSource.manager,
      serviceIds,
    );

    return new Map(services.map((service) => [service.id, service]));
  }

  private mapPostedBookingItem(
    booking: BookingEntity,
    services: Map<string, ServiceEntity>,
  ): TaskerPostedBookingItem {
    const service = services.get(booking.serviceId);

    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      service: service
        ? {
            id: service.id,
            name: service.name,
            description: service.description,
          }
        : {
            id: booking.serviceId,
            name: 'Dịch vụ đã ngừng hoạt động',
            description: null,
          },
      area: {
        displayAddress: this.buildPublicAreaText(booking),
      },
      schedule: {
        scheduledStartDate: booking.scheduledStartDate,
        scheduledStartTime: booking.scheduledStartTime,
        scheduledEndDate: booking.scheduledEndDate,
        scheduledEndTime: booking.scheduledEndTime,
        durationHours: toNumber(booking.durationHours),
      },
      price: {
        totalPrice: toNumber(booking.totalPrice),
        basePrice: toNumber(booking.basePrice),
        peakFee: toNumber(booking.peakFee),
        petFee: toNumber(booking.petFee),
        discountAmount: toNumber(booking.discountAmount),
      },
      flags: {
        hasPet: booking.addressRef?.hasPet ?? false,
      },
      createdAt: booking.createdAt,
    };
  }

  private buildPublicAreaText(booking: BookingEntity): string | null {
    const wardDetail = booking.addressRef?.wardDetail?.trim();
    if (wardDetail) {
      return wardDetail;
    }

    const addressParts = booking.address
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (addressParts.length >= 2) {
      return addressParts.slice(-2).join(', ');
    }

    return addressParts[0] ?? null;
  }

  private mapAssignedBookingDetail(
    booking: BookingEntity,
    service: {
      id: string;
      name: string;
      description?: string | null;
    },
    distance: TaskerAssignedBookingDetailResponse['distance'],
  ): TaskerAssignedBookingDetailResponse {
    const canContactCustomer = CUSTOMER_CONTACT_VISIBLE_STATUSES.includes(
      booking.status,
    );
    const baseResponse = {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      canContactCustomer,
      service,
      distance,
      schedule: {
        scheduledStartDate: booking.scheduledStartDate,
        scheduledStartTime: booking.scheduledStartTime,
        scheduledEndDate: booking.scheduledEndDate,
        scheduledEndTime: booking.scheduledEndTime,
        durationHours: toNumber(booking.durationHours),
      },
      price: {
        totalPrice: toNumber(booking.totalPrice),
        basePrice: toNumber(booking.basePrice),
        peakFee: toNumber(booking.peakFee),
        petFee: toNumber(booking.petFee),
        discountAmount: toNumber(booking.discountAmount),
      },
      flags: {
        hasPet: booking.addressRef?.hasPet ?? false,
      },
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };

    if (!canContactCustomer) {
      return {
        ...baseResponse,
        area: {
          displayAddress: this.buildPublicAreaText(booking),
        },
        customer: {
          id: booking.customer.id,
          fullName: booking.customer.user?.fullName ?? null,
        },
      };
    }

    return {
      ...baseResponse,
      address: {
        fullAddress: booking.address,
        wardDetail: booking.addressRef?.wardDetail ?? null,
        latitude: booking.addressRef?.latitude ?? null,
        longitude: booking.addressRef?.longitude ?? null,
        hasPet: booking.addressRef?.hasPet ?? false,
      },
      payment: {
        method: booking.paymentMethod,
        status: booking.paymentStatus,
      },
      customer: {
        id: booking.customer.id,
        fullName: booking.customer.user?.fullName ?? null,
        phone: booking.customer.user?.phone ?? null,
        avatarUrl: booking.customer.user?.avatarUrl ?? null,
      },
      note: booking.note,
    };
  }

  private async calculateDistanceFromTaskerLocation(
    booking: BookingEntity,
    location?: TaskerLocationInput,
  ): Promise<TaskerAssignedBookingDetailResponse['distance']> {
    const currentLatitude = location?.currentLatitude;
    const currentLongitude = location?.currentLongitude;

    if (
      currentLatitude === undefined ||
      currentLongitude === undefined ||
      !Number.isFinite(currentLatitude) ||
      !Number.isFinite(currentLongitude)
    ) {
      throw new NotFoundException('Không tìm thấy vị trí tasker');
    }

    if (
      booking.addressRef?.latitude === undefined ||
      booking.addressRef.longitude === undefined ||
      booking.addressRef.latitude === null ||
      booking.addressRef.longitude === null
    ) {
      return null;
    }
    const addressLatitude = booking.addressRef.latitude;
    const addressLongitude = booking.addressRef.longitude;

    const raw = await this.dataSource.query<
      Array<{ distance_meters: string | number | null }>
    >(
      `
        SELECT ST_DistanceSphere(
          ST_MakePoint($1, $2),
          ST_MakePoint($3, $4)
        ) AS distance_meters
      `,
      [currentLongitude, currentLatitude, addressLongitude, addressLatitude],
    );
    const distanceMeters = this.parseDistanceMeters(raw[0]?.distance_meters);

    return {
      meters: distanceMeters,
      kilometers: Number((distanceMeters / 1000).toFixed(2)),
    };
  }

  private async findServiceByBooking(booking: BookingEntity): Promise<{
    id: string;
    name: string;
    description?: string | null;
  }> {
    return this.pricingService.getServiceSummaryById(
      this.dataSource.manager,
      booking.serviceId,
    );
  }

  private parseDistanceMeters(
    value: string | number | null | undefined,
  ): number {
    const distanceMeters = Number(value);
    if (!Number.isFinite(distanceMeters)) {
      throw new BadRequestException('Không thể tính khoảng cách booking');
    }

    return Number(distanceMeters.toFixed(2));
  }
}
