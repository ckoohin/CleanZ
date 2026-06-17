import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { PaymentService } from 'src/modules/payment/payment.service';
import { PricingService } from 'src/modules/pricing/pricing.service';
import { ServiceEntity } from 'src/modules/pricing/entity/service.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { GoongMapService } from 'src/modules/goong/goong-map.service';
import { TrackingGateway } from 'src/modules/tracking/tracking.gateway';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
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
  checkedInAt?: Date | null;
  completedAt?: Date | null;
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
    private readonly paymentService: PaymentService,
    private readonly pricingService: PricingService,
    private readonly walletService: WalletService,
    private readonly goongMapService: GoongMapService,
    private readonly trackingGateway: TrackingGateway,
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

      const booking = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .where('booking.id = :bookingId', { bookingId })
        .andWhere('booking.status = :status', { status: BookingStatus.POSTED })
        .andWhere('tasker.id IS NULL')
        .andWhere('addressRef.latitude IS NOT NULL')
        .andWhere('addressRef.longitude IS NOT NULL')
        .getOne();

      if (!booking) {
        throw new NotFoundException(
          'Booking không tồn tại, không còn ở trạng thái posted hoặc thiếu tọa độ địa chỉ',
        );
      }

      const distance = await this.calculateDistanceFromTaskerLocation(
        booking,
        location,
      );
      if (!distance) {
        throw new NotFoundException('Booking thiếu tọa độ địa chỉ');
      }
      const service = await this.findServiceByBooking(booking);

      return {
        distance,
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

  async markCheckedIn(
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

        if (booking.status !== BookingStatus.TASKER_ON_THE_WAY) {
          throw new BadRequestException(
            'Chỉ booking ở trạng thái TASKER_ON_THE_WAY mới có thể check-in',
          );
        }

        const oldStatus = booking.status;
        const checkedInAt = new Date();
        booking.status = BookingStatus.CHECKED_IN;
        booking.checkedInAt = checkedInAt;
        const savedBooking = await bookingRepository.save(booking);

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus,
          newStatus: BookingStatus.CHECKED_IN,
          changedByUser: { id: userId } as UserEntity,
          note: 'Tasker đã đến nơi',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        return savedBooking;
      });

      const arrivedAt =
        booking.checkedInAt?.toISOString() ?? new Date().toISOString();
      await this.trackingGateway.emitTaskerArrived(booking.id, {
        bookingId: booking.id,
        status: booking.status,
        arrivedAt,
        trackingStopped: true,
      });

      const service = await this.findServiceByBooking(booking);
      return this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể check-in booking');
  }

  async markInProgress(
    userId: string,
    bookingId: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      const startedAt = new Date();
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

        if (booking.status !== BookingStatus.CHECKED_IN) {
          throw new BadRequestException(
            'Chỉ booking ở trạng thái CHECKED_IN mới có thể bắt đầu làm việc',
          );
        }

        const oldStatus = booking.status;
        booking.status = BookingStatus.IN_PROGRESS;
        const savedBooking = await bookingRepository.save(booking);

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus,
          newStatus: BookingStatus.IN_PROGRESS,
          changedByUser: { id: userId } as UserEntity,
          note: 'Tasker bắt đầu làm việc',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        return savedBooking;
      });

      await this.trackingGateway.emitBookingInProgress(booking.id, {
        bookingId: booking.id,
        status: booking.status,
        startedAt: startedAt.toISOString(),
      });

      const service = await this.findServiceByBooking(booking);
      return this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể bắt đầu booking');
  }

  async markCompleted(
    userId: string,
    bookingId: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      const settlement = await this.dataSource.transaction(async (manager) => {
        const tasker = await this.findTaskerProfile(userId);
        const bookingRepository = manager.getRepository(BookingEntity);
        const booking = await bookingRepository
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
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

        if (booking.status !== BookingStatus.IN_PROGRESS) {
          throw new BadRequestException(
            'Chỉ booking ở trạng thái IN_PROGRESS mới có thể hoàn thành',
          );
        }

        if (
          booking.paymentMethod !== PaymentMethod.CASH &&
          booking.paymentStatus !== PaymentStatus.PAID
        ) {
          throw new BadRequestException(
            'Booking chưa thanh toán nên chưa thể hoàn thành',
          );
        }

        const completedAt = new Date();
        const oldStatus = booking.status;
        booking.status = BookingStatus.COMPLETED;
        booking.completedAt = completedAt;
        if (booking.paymentMethod === PaymentMethod.CASH) {
          booking.paymentStatus = PaymentStatus.PAID;
          await this.paymentService.markLatestPendingPaymentAsPaid(
            manager,
            booking.id,
            completedAt,
          );
        }
        const savedBooking = await bookingRepository.save(booking);

        const totalPrice = toNumber(savedBooking.totalPrice);
        const commissionRate =
          await this.pricingService.getPlatformCommissionRateByServiceId(
            manager,
            savedBooking.serviceId,
          );
        const platformFee = Math.round((totalPrice * commissionRate) / 100);
        const taskerEarning = Math.max(totalPrice - platformFee, 0);
        const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
          manager,
          tasker,
        );
        await this.walletService.creditWallet(manager, {
          wallet: taskerWallet,
          amount: taskerEarning,
          type: WalletTransactionType.TASKER_EARNING,
          booking: savedBooking,
          description: `Thu nhập tasker từ booking ${savedBooking.bookingCode}`,
        });
        if (platformFee > 0) {
          await this.walletService.recordPlatformIncome(
            manager,
            platformFee,
            savedBooking,
            `Phí nền tảng từ booking ${savedBooking.bookingCode}`,
          );
        }

        await manager
          .getRepository(TaskerEntity)
          .increment({ id: tasker.id }, 'totalCompletedJobs', 1);
        await manager
          .getRepository(CustomerEntity)
          .increment({ id: savedBooking.customer.id }, 'totalBookings', 1);

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus,
          newStatus: BookingStatus.COMPLETED,
          changedByUser: { id: userId } as UserEntity,
          note: 'Tasker hoàn thành công việc',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        return {
          booking: savedBooking,
          taskerEarning,
          platformFee,
        };
      });

      const completedAt =
        settlement.booking.completedAt?.toISOString() ??
        new Date().toISOString();
      await this.trackingGateway.emitBookingCompleted(settlement.booking.id, {
        bookingId: settlement.booking.id,
        status: settlement.booking.status,
        completedAt,
        paymentStatus: settlement.booking.paymentStatus,
      });

      const service = await this.findServiceByBooking(settlement.booking);
      return this.mapAssignedBookingDetail(settlement.booking, service, null);
    }, 'Không thể hoàn thành booking');
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

    const route = await this.goongMapService.calculateDrivingRoute({
      originLatitude: currentLatitude,
      originLongitude: currentLongitude,
      destinationLatitude: Number(addressLatitude),
      destinationLongitude: Number(addressLongitude),
    });

    return route.distance;
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
}
