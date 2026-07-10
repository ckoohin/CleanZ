import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
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
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { GoongMapService } from 'src/modules/goong/goong-map.service';
import { TrackingGateway } from 'src/modules/tracking/tracking.gateway';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerBookingLocationDto } from '../dto/tasker-booking-location.dto';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingEntity } from '../entity/booking.entity';
import {
  BookingPolicyService,
  CANCEL_SUSPENSION_DAYS,
  WEEKLY_CANCEL_LIMIT,
} from './booking-policy.service';
import { ServicePackageEntity } from 'src/modules/service/entity/service-package.entity';
import { PricingService } from 'src/modules/pricing/services/pricing.service';
import { TaskerDepositService } from 'src/modules/wallet/tasker-deposit.service';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import {
  BookingDispatchService,
  POSTED_LIST_OPEN_TO_ALL_AFTER_MS,
} from './booking-dispatch.service';
import { BookingCheckinService } from './booking-checkin.service';

const DEFAULT_PLATFORM_COMMISSION_RATE = 20;

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
    addonPrice: number;
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
    addonPrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
    platformCommissionRate: number;
    platformFee: number;
    taskerIncome: number;
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
    contactName?: string | null;
    contactPhone?: string | null;
    buildingFloor?: string | null;
    gate?: string | null;
    driverNote?: string | null;
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
    addonPrice: number;
    peakFee: number;
    petFee: number;
    discountAmount: number;
  };
  payment?: {
    method: string;
    status: string;
  };
  customer?: {
    // id = null khi là khách vãng lai (đơn offline không gắn tài khoản).
    id: string | null;
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

interface DistanceCacheEntry {
  distance: TaskerAssignedBookingDetailResponse['distance'];
  originLatitude: number;
  originLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  calculatedAt: number;
  lastAccessedAt: number;
}

const CUSTOMER_CONTACT_VISIBLE_STATUSES = [
  BookingStatus.TASKER_ON_THE_WAY,
  BookingStatus.CHECKED_IN,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

const CUSTOMER_STATUS_NOTIFICATION: Partial<
  Record<
    BookingStatus,
    {
      type: NotificationType;
      title: string;
      content: string;
    }
  >
> = {
  [BookingStatus.CONFIRMED]: {
    type: NotificationType.BOOKING_CONFIRMED,
    title: 'Đơn đặt lịch đã được xác nhận',
    content: 'Tasker đã nhận đơn của bạn. Vui lòng chuẩn bị cho buổi dịch vụ.',
  },
  [BookingStatus.TASKER_ON_THE_WAY]: {
    type: NotificationType.TASKER_ON_THE_WAY,
    title: 'Tasker đang trên đường tới',
    content: 'Tasker đã bắt đầu di chuyển tới địa điểm của bạn.',
  },
  [BookingStatus.CHECKED_IN]: {
    type: NotificationType.SYSTEM,
    title: 'Tasker đã đến nơi',
    content: 'Tasker đã check-in tại địa điểm làm việc.',
  },
  [BookingStatus.IN_PROGRESS]: {
    type: NotificationType.SYSTEM,
    title: 'Dịch vụ đã bắt đầu',
    content: 'Tasker đã bắt đầu thực hiện công việc.',
  },
  [BookingStatus.COMPLETED]: {
    type: NotificationType.BOOKING_COMPLETED,
    title: 'Dịch vụ đã hoàn thành',
    content: 'Tasker đã hoàn thành công việc của bạn.',
  },
};

@Injectable()
export class TaskerBookingService {
  private readonly logger = new Logger(TaskerBookingService.name);
  private readonly distanceRefreshIntervalMs = 90_000;
  private readonly distanceRefreshMeters = 50;
  private readonly distanceCacheTtlMs = 6 * 60 * 60 * 1000;
  private readonly distanceCache = new Map<string, DistanceCacheEntry>();
  private readonly pendingDistanceRequests = new Map<
    string,
    Promise<TaskerAssignedBookingDetailResponse['distance']>
  >();

  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingPolicyService: BookingPolicyService,
    private readonly paymentService: PaymentService,
    private readonly pricingService: PricingService,
    private readonly walletService: WalletService,
    private readonly taskerDepositService: TaskerDepositService,
    private readonly goongMapService: GoongMapService,
    private readonly trackingGateway: TrackingGateway,
    private readonly notificationService: NotificationService,
    private readonly vouchersService: VouchersService,
    private readonly bookingDispatchService: BookingDispatchService,
    private readonly bookingCheckinService: BookingCheckinService,
  ) {}

  private emitBookingNotification(
    userId: string | undefined,
    type: NotificationType,
    bookingId: string,
    title: string,
    content: string,
    dedupeKey?: string,
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
        dedupeKey: `booking:${bookingId}:${dedupeKey ?? type}`,
      })
      .catch((err) =>
        this.logger.error(
          `Không thể enqueue noti booking ${bookingId}/${type}: ${err}`,
        ),
      );
  }

  private async emitCustomerBookingStatusChanged(input: {
    booking: BookingEntity;
    previousStatus: BookingStatus;
    changedAt: Date;
    actorUserId: string;
    startedAt?: Date | null;
  }): Promise<void> {
    const { booking, previousStatus, changedAt, actorUserId, startedAt } =
      input;

    await this.trackingGateway.emitBookingStatusUpdated(booking.id, {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      previousStatus,
      status: booking.status,
      changedAt: changedAt.toISOString(),
      actor: {
        type: 'TASKER',
        id: actorUserId,
        name: booking.tasker?.user?.fullName ?? null,
      },
      checkedInAt: booking.checkedInAt?.toISOString() ?? null,
      startedAt: startedAt?.toISOString() ?? null,
      completedAt: booking.completedAt?.toISOString() ?? null,
      paymentStatus: booking.paymentStatus ?? null,
    });

    const notification = CUSTOMER_STATUS_NOTIFICATION[booking.status];
    if (notification) {
      this.emitBookingNotification(
        booking.customer?.user?.id,
        notification.type,
        booking.id,
        notification.title,
        notification.content,
        notification.type === NotificationType.SYSTEM
          ? `${booking.status}`
          : undefined,
      );
    }
  }

  async findPostedBookings(
    userId: string,
  ): Promise<TaskerPostedBookingListResponse> {
    return asyncHandleOperation(async () => {
      await this.assertTaskerProfileExists(userId);

      // Trong POSTED_LIST_OPEN_TO_ALL_AFTER_MS đầu tiên, đơn chỉ được gửi riêng
      // cho các tasker nằm trong ring dispatch (qua notification → vào thẳng
      // trang chi tiết để nhận). Chỉ hiện trong danh sách "Nhận đơn" chủ động
      // (mọi tasker đều thấy) sau khi đã hết cửa sổ dispatch riêng này, tránh
      // tasker khác thấy đơn nhưng bấm "Nhận" bị 403 vì chưa được mời.
      // Dùng NOW() của Postgres thay vì Date của Node để tránh lệch múi giờ
      // giữa TZ của process Node và TZ của session Postgres khi so sánh cột
      // "timestamp without time zone".
      const bookings = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .where('booking.status = :status', { status: BookingStatus.POSTED })
        .andWhere('tasker.id IS NULL')
        .andWhere(
          `booking.createdAt <= NOW() - (:openToAllAfterSeconds || ' seconds')::interval`,
          { openToAllAfterSeconds: POSTED_LIST_OPEN_TO_ALL_AFTER_MS / 1000 },
        )
        .orderBy('booking.scheduledStartDate', 'ASC')
        .addOrderBy('booking.scheduledStartTime', 'ASC')
        .addOrderBy('booking.createdAt', 'ASC')
        .getMany();

      const packages = await this.findPackagesByBookingPackageIds(bookings);
      const items = bookings.map((booking) =>
        this.mapPostedBookingItem(booking, packages),
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
        `posted:${booking.id}:${userId}`,
      );
      if (!distance) {
        throw new NotFoundException('Booking thiếu tọa độ địa chỉ');
      }
      const service = await this.findServiceByBooking(booking);
      const platformCommissionRate = await this.resolvePlatformCommissionRate(
        this.dataSource.manager,
        booking,
      );
      const totalPrice = toNumber(booking.totalPrice);
      const discountAmount = toNumber(booking.discountAmount);
      const subtotal = totalPrice + discountAmount;
      const platformFee = Math.round((subtotal * platformCommissionRate) / 100);

      return {
        distance,
        service,
        price: {
          totalPrice,
          basePrice: toNumber(booking.basePrice),
          addonPrice: toNumber(booking.addonPrice),
          peakFee: toNumber(booking.peakFee),
          petFee: toNumber(booking.petFee),
          discountAmount,
          platformCommissionRate,
          platformFee,
          taskerIncome: Math.max(subtotal - platformFee, 0),
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

        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .getOne();

        if (!booking) {
          throw new NotFoundException('Booking không tồn tại');
        }

        if (booking.status !== BookingStatus.POSTED || booking.tasker) {
          if (booking.status === BookingStatus.EXPIRED) {
            throw new ConflictException(
              'Đơn đã hết hạn do quá giờ hẹn mà chưa có ai nhận',
            );
          }
          if (booking.status === BookingStatus.CANCELLED) {
            throw new ConflictException('Đơn đã bị hủy');
          }
          throw new ConflictException('Đơn đã có người nhận');
        }

        await this.assertTaskerHasActiveDispatchInvitation(
          booking.id,
          tasker.id,
        );

        await this.bookingPolicyService.assertTaskerConcurrentAndOverlapConstraints(
          manager,
          tasker.id,
          booking,
        );

        if (booking.paymentMethod === PaymentMethod.CASH) {
          const commissionRate = await this.resolvePlatformCommissionRate(
            manager,
            booking,
          );
          // Dùng subtotal (trước voucher) vì nền tảng thu phí trên giá gốc của tasker
          const subtotalForCommission =
            toNumber(booking.totalPrice) + toNumber(booking.discountAmount);
          const platformFee = Math.round(
            (subtotalForCommission * commissionRate) / 100,
          );
          await this.taskerDepositService.assertCanCoverCashCommission(
            manager,
            tasker.id,
            platformFee,
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

      await this.emitCustomerBookingStatusChanged({
        booking: {
          id: result.id,
          bookingCode: result.bookingCode,
          status: result.status,
          customer: {
            user: { id: customerUserId } as UserEntity,
          } as CustomerEntity,
          tasker: {
            id: result.tasker.id,
            user: {
              id: userId,
              fullName: result.tasker.fullName ?? undefined,
            } as UserEntity,
          } as TaskerEntity,
        } as BookingEntity,
        previousStatus: BookingStatus.POSTED,
        changedAt: new Date(),
        actorUserId: userId,
      });

      void this.trackingGateway
        .emitToBookingRoom(result.id, 'booking:status_changed', {
          bookingId: result.id,
          status: BookingStatus.CONFIRMED,
          tasker: result.tasker,
        })
        .catch((err) =>
          this.logger.error(
            `Không thể phát sự kiện socket booking:confirmed: ${err}`,
          ),
        );

      // Hủy các delayed dispatch job còn đang chờ cho booking này
      void this.bookingDispatchService
        .cancelPendingDispatch(result.id)
        .catch((err) =>
          this.logger.warn(
            `Không thể hủy dispatch job cho booking=${result.id}: ${err}`,
          ),
        );

      // Schedule checkin/auto-cancel jobs theo lịch hẹn
      void this.dataSource
        .getRepository(BookingEntity)
        .findOne({
          where: { id: result.id },
          select: [
            'id',
            'bookingCode',
            'scheduledStart',
            'scheduledEnd',
            'scheduledStartDate',
            'scheduledStartTime',
            'scheduledEndDate',
            'scheduledEndTime',
            'durationHours',
          ],
        })
        .then((b) => b && this.bookingCheckinService.scheduleCheckinJobs(b))
        .catch((err) =>
          this.logger.warn(
            `Không thể schedule checkin jobs cho booking=${result.id}: ${err}`,
          ),
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
        `assigned:${booking.id}:${tasker.id}`,
      );
      return this.mapAssignedBookingDetail(booking, service, distance);
    }, 'Không thể lấy chi tiết booking của tasker');
  }

  async findActiveBooking(
    userId: string,
  ): Promise<TaskerAssignedBookingDetailResponse | null> {
    return asyncHandleOperation(async () => {
      const tasker = await this.dataSource
        .getRepository(TaskerEntity)
        .findOne({ where: { user: { id: userId } }, relations: ['user'] });

      if (!tasker) return null;
      const booking = await this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .where('tasker.id = :taskerId', { taskerId: tasker.id })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [
            BookingStatus.CONFIRMED,
            BookingStatus.TASKER_ON_THE_WAY,
            BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS,
          ],
        })
        .orderBy('booking.updatedAt', 'DESC')
        .getOne();

      if (!booking) {
        return null;
      }

      const service = await this.findServiceByBooking(booking);
      return this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể lấy booking đang hoạt động của tasker');
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

      await this.emitCustomerBookingStatusChanged({
        booking,
        previousStatus: BookingStatus.CONFIRMED,
        changedAt: new Date(),
        actorUserId: userId,
      });

      void this.trackingGateway
        .emitToBookingRoom(booking.id, 'booking:status_changed', {
          bookingId: booking.id,
          status: BookingStatus.TASKER_ON_THE_WAY,
        })
        .catch((err) =>
          this.logger.error(
            `Không thể phát sự kiện socket booking:on_the_way: ${err}`,
          ),
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
      // Validate quyền sở hữu booking trước khi vào transaction check-in
      const tasker = await this.findTaskerProfile(userId);

      const ownerCheck = await this.dataSource
        .getRepository(BookingEntity)
        .findOne({
          where: { id: bookingId, tasker: { id: tasker.id } },
          select: ['id'],
        });
      if (!ownerCheck) {
        throw new NotFoundException(
          'Booking không tồn tại hoặc không thuộc tasker hiện tại',
        );
      }

      // Delegate sang BookingCheckinService để validate time window + ghi log
      const booking = await this.dataSource.transaction(async (manager) => {
        await this.bookingCheckinService.performCheckin(
          userId,
          bookingId,
          manager,
        );

        // Load lại booking với đầy đủ relations để map response
        return manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.addressRef', 'addressRef')
          .where('booking.id = :bookingId', { bookingId })
          .getOne();
      });

      if (!booking)
        throw new NotFoundException('Booking không tìm thấy sau check-in');

      const arrivedAt =
        booking.checkedInAt?.toISOString() ?? new Date().toISOString();
      await this.trackingGateway.emitTaskerArrived(booking.id, {
        bookingId: booking.id,
        status: booking.status,
        arrivedAt,
        trackingStopped: true,
      });
      await this.emitCustomerBookingStatusChanged({
        booking,
        previousStatus: BookingStatus.TASKER_ON_THE_WAY,
        changedAt: booking.checkedInAt ?? new Date(),
        actorUserId: userId,
      });

      // Hủy auto-cancel job vì đã check-in thành công
      void this.bookingCheckinService
        .cancelCheckinJobs(bookingId)
        .catch(() => null);

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
      await this.emitCustomerBookingStatusChanged({
        booking,
        previousStatus: BookingStatus.CHECKED_IN,
        changedAt: startedAt,
        actorUserId: userId,
        startedAt,
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
          .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
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
        await this.vouchersService.markBookingVoucherUsed(manager, booking.id);
        const savedBooking = await bookingRepository.save(booking);

        // Voucher do nền tảng chịu: tasker nhận tiền tính trên subtotal (trước giảm giá)
        const totalPrice = toNumber(savedBooking.totalPrice);
        const discountAmount = toNumber(savedBooking.discountAmount);
        const subtotal = totalPrice + discountAmount;
        const commissionRate = await this.resolvePlatformCommissionRate(
          manager,
          savedBooking,
        );
        const platformFee = Math.round((subtotal * commissionRate) / 100);
        const taskerEarning = Math.max(subtotal - platformFee, 0);

        if (savedBooking.paymentMethod === PaymentMethod.CASH) {
          if (platformFee > 0) {
            await this.taskerDepositService.deductCashCommission(
              manager,
              tasker.id,
              savedBooking,
              platformFee,
            );
          }
        } else {
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
        }
        if (platformFee > 0) {
          await this.walletService.recordPlatformIncome(
            manager,
            platformFee,
            savedBooking,
            `Phí nền tảng từ booking ${savedBooking.bookingCode}`,
          );
        }
        // Ghi nhận chi phí voucher nền tảng chịu
        if (discountAmount > 0) {
          await this.walletService.recordPlatformExpense(
            manager,
            discountAmount,
            savedBooking,
            `Nền tảng chịu voucher cho booking ${savedBooking.bookingCode}`,
          );
        }

        await manager
          .getRepository(TaskerEntity)
          .increment({ id: tasker.id }, 'totalCompletedJobs', 1);
        // Đơn offline/vãng lai không gắn customer → bỏ qua cộng totalBookings.
        if (savedBooking.customer) {
          await manager
            .getRepository(CustomerEntity)
            .increment({ id: savedBooking.customer.id }, 'totalBookings', 1);
        }

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
      await this.emitCustomerBookingStatusChanged({
        booking: settlement.booking,
        previousStatus: BookingStatus.IN_PROGRESS,
        changedAt: settlement.booking.completedAt ?? new Date(),
        actorUserId: userId,
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

  private async assertTaskerHasActiveDispatchInvitation(
    bookingId: string,
    taskerId: string,
  ): Promise<void> {
    // Đơn đã đủ tuổi để mở cho mọi tasker chủ động nhận (đồng bộ với điều kiện
    // hiển thị trong findPostedBookings) — bỏ qua yêu cầu phải nằm trong ring
    // dispatch hiện tại, tránh 403 dù đơn đã hiện trong danh sách "Nhận đơn".
    if (await this.isBookingOpenToAllTaskers(bookingId)) {
      return;
    }

    const state =
      await this.bookingDispatchService.getDispatchInvitationState(bookingId);
    const isInvited = state?.invitedTaskerIds.includes(taskerId) ?? false;
    const isExpired =
      state?.expiresAt instanceof Date &&
      Number.isFinite(state.expiresAt.getTime()) &&
      state.expiresAt.getTime() < Date.now();

    if (!isInvited || isExpired) {
      throw new ForbiddenException(
        'Đơn này chưa được gửi cho bạn hoặc lượt nhận đã hết',
      );
    }
  }

  // So sánh bằng NOW() của Postgres (không dùng Date của Node) để tránh lệch
  // múi giờ giữa TZ của process Node và TZ của session Postgres khi so sánh
  // cột "timestamp without time zone".
  private async isBookingOpenToAllTaskers(bookingId: string): Promise<boolean> {
    const rows = await this.dataSource.query<{ is_open: boolean }[]>(
      `SELECT (created_at <= NOW() - ($2 || ' seconds')::interval) AS is_open FROM bookings WHERE id = $1`,
      [bookingId, POSTED_LIST_OPEN_TO_ALL_AFTER_MS / 1000],
    );
    return rows[0]?.is_open ?? false;
  }

  private async findPackagesByBookingPackageIds(
    bookings: BookingEntity[],
  ): Promise<Map<string, ServicePackageEntity>> {
    const packageIds = [
      ...new Set(bookings.map((booking) => booking.packageId)),
    ];
    if (!packageIds.length) {
      return new Map();
    }

    const packages = await this.dataSource.manager
      .getRepository(ServicePackageEntity)
      .find({
        where: { id: In(packageIds) },
      });

    return new Map(packages.map((pkg) => [pkg.id, pkg]));
  }

  private mapPostedBookingItem(
    booking: BookingEntity,
    packages: Map<string, ServicePackageEntity>,
  ): TaskerPostedBookingItem {
    const pkg = packages.get(booking.packageId);

    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      service: pkg
        ? {
            id: pkg.id,
            name: pkg.name,
            description: pkg.policyDescription,
          }
        : {
            id: booking.packageId,
            name: 'Gói dịch vụ đã ngừng hoạt động',
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
        addonPrice: toNumber(booking.addonPrice),
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
        addonPrice: toNumber(booking.addonPrice),
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
          id: booking.customer?.id ?? null,
          fullName:
            booking.customer?.user?.fullName ?? booking.guestName ?? null,
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
        contactName: booking.addressRef?.contactName ?? null,
        contactPhone: booking.addressRef?.contactPhone ?? null,
        buildingFloor: booking.addressRef?.buildingFloor ?? null,
        gate: booking.addressRef?.gate ?? null,
        driverNote: booking.addressRef?.driverNote ?? null,
      },
      payment: {
        method: booking.paymentMethod,
        status: booking.paymentStatus,
      },
      customer: {
        // Guest: lấy tên/SĐT từ thông tin lưu trên đơn để tasker liên hệ.
        id: booking.customer?.id ?? null,
        fullName: booking.customer?.user?.fullName ?? booking.guestName ?? null,
        phone: booking.customer?.user?.phone ?? booking.guestPhone ?? null,
        avatarUrl: booking.customer?.user?.avatarUrl ?? null,
      },
      note: booking.note,
    };
  }

  private async calculateDistanceFromTaskerLocation(
    booking: BookingEntity,
    location?: TaskerLocationInput,
    cacheKey = booking.id,
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
    const destinationLatitude = Number(addressLatitude);
    const destinationLongitude = Number(addressLongitude);
    const now = Date.now();
    this.removeExpiredDistanceCacheEntries(now);

    const cached = this.distanceCache.get(cacheKey);
    if (
      cached &&
      cached.destinationLatitude === destinationLatitude &&
      cached.destinationLongitude === destinationLongitude
    ) {
      cached.lastAccessedAt = now;

      const elapsedMs = now - cached.calculatedAt;
      const movedMeters = this.calculateDistanceMeters(
        cached.originLatitude,
        cached.originLongitude,
        currentLatitude,
        currentLongitude,
      );

      if (
        elapsedMs < this.distanceRefreshIntervalMs ||
        movedMeters < this.distanceRefreshMeters
      ) {
        return cached.distance;
      }
    }

    const pendingRequest = this.pendingDistanceRequests.get(cacheKey);
    if (pendingRequest) {
      return pendingRequest;
    }

    const routeRequest = this.goongMapService
      .calculateDrivingRoute({
        originLatitude: currentLatitude,
        originLongitude: currentLongitude,
        destinationLatitude,
        destinationLongitude,
      })
      .then((route) => {
        this.distanceCache.set(cacheKey, {
          distance: route.distance,
          originLatitude: currentLatitude,
          originLongitude: currentLongitude,
          destinationLatitude,
          destinationLongitude,
          calculatedAt: Date.now(),
          lastAccessedAt: Date.now(),
        });

        return route.distance;
      })
      .finally(() => {
        this.pendingDistanceRequests.delete(cacheKey);
      });

    this.pendingDistanceRequests.set(cacheKey, routeRequest);
    this.logger.debug(`Refreshing Goong distance for ${cacheKey}`);

    return routeRequest;
  }

  private removeExpiredDistanceCacheEntries(now: number): void {
    for (const [cacheKey, entry] of this.distanceCache) {
      if (now - entry.lastAccessedAt > this.distanceCacheTtlMs) {
        this.distanceCache.delete(cacheKey);
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

  private async findServiceByBooking(booking: BookingEntity): Promise<{
    id: string;
    name: string;
    description?: string | null;
  }> {
    const pkg = await this.dataSource.manager
      .getRepository(ServicePackageEntity)
      .findOne({
        where: { id: booking.packageId },
      });
    return {
      id: booking.packageId,
      name: pkg?.name || 'Gói dịch vụ',
      description: pkg?.policyDescription || null,
    };
  }

  private async resolvePlatformCommissionRate(
    manager: EntityManager,
    booking: BookingEntity,
  ): Promise<number> {
    const subServiceId = booking.bookingSubServices?.[0]?.subServiceId;
    if (!subServiceId) {
      return DEFAULT_PLATFORM_COMMISSION_RATE;
    }

    try {
      return await this.pricingService.getPlatformCommissionRateByServiceId(
        manager,
        subServiceId,
      );
    } catch (error) {
      this.logger.warn(
        `Cannot resolve sub-service commission for booking ${booking.id}, fallback ${DEFAULT_PLATFORM_COMMISSION_RATE}%`,
        error instanceof Error ? error.stack : undefined,
      );
      return DEFAULT_PLATFORM_COMMISSION_RATE;
    }
  }

  async cancelByTasker(
    userId: string,
    bookingId: string,
    dto: CancelBookingDto,
  ): Promise<{
    message: string;
    penaltyAmount: number;
    weeklyCount: number;
    suspended: boolean;
    suspendedUntil?: string;
  }> {
    return asyncHandleOperation(async () => {
      let customerUserId: string | undefined;
      let taskerUserId: string = userId;
      let bookingCode = '';
      let penaltyAmount = 0;
      let weeklyCount = 0;
      let suspended = false;
      let suspendedUntil: Date | undefined;

      await this.dataSource.transaction(async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .andWhere('taskerUser.id = :userId', { userId })
          .getOne();

        if (!booking) {
          throw new NotFoundException(
            'Booking không tồn tại hoặc không thuộc tasker hiện tại',
          );
        }

        const tasker = booking.tasker!;
        this.bookingPolicyService.assertTaskerCanCancel(booking);
        this.bookingPolicyService.assertTaskerNotCancelSuspended(tasker);

        customerUserId = booking.customer?.user?.id;
        taskerUserId = tasker.user?.id ?? userId;
        bookingCode = booking.bookingCode;

        // Đếm lần hủy trong 7 ngày (TRƯỚC lần này)
        weeklyCount = await this.bookingPolicyService.countWeeklyCancels(
          manager,
          tasker.id,
        );
        // Lần hủy này là weeklyCount + 1
        const thisCancel = weeklyCount + 1;
        penaltyAmount =
          this.bookingPolicyService.resolveCancelPenaltyAmount(thisCancel);

        // 1. Hủy đơn. Đơn offline/vãng lai (không gắn customer) KHÔNG re-post lên
        //    chợ — không có khách thật để phục vụ lại → hủy chốt luôn.
        const oldStatus = booking.status;
        const isGuestBooking = !booking.customer;
        if (isGuestBooking) {
          booking.status = BookingStatus.CANCELLED;
          booking.cancelledBy = CancelledBy.TASKER;
          booking.cancelledByUserId = userId;
          booking.cancelledAt = new Date();
        } else {
          booking.status = BookingStatus.POSTED;
          booking.tasker = null;
          await this.vouchersService.releaseReservationForBooking(
            manager,
            booking.id,
          );
        }
        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);

        // 2. Log status
        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus,
          newStatus: isGuestBooking
            ? BookingStatus.CANCELLED
            : BookingStatus.POSTED,
          changedByUser: { id: userId } as UserEntity,
          note: isGuestBooking
            ? `Tasker hủy đơn offline (lần ${thisCancel}/tuần) — phí phạt ${penaltyAmount.toLocaleString('vi-VN')}đ`
            : `Tasker hủy đơn (lần ${thisCancel}/tuần) — phí phạt ${penaltyAmount.toLocaleString('vi-VN')}đ`,
          cancelledBy: CancelledBy.TASKER,
          cancelledByUser: { id: userId } as UserEntity,
          cancelReason: dto.reason?.trim() || null,
          cancellationFee: penaltyAmount,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        // 3. Trừ ví tasker nếu có phí phạt
        if (penaltyAmount > 0) {
          const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
            manager,
            tasker,
          );
          await this.walletService.debitWallet(manager, {
            wallet: taskerWallet,
            amount: penaltyAmount,
            type: WalletTransactionType.CANCELLATION_FEE,
            booking: savedBooking,
            description: `Phí phạt hủy đơn #${bookingCode} (lần ${thisCancel}/tuần)`,
          });
        }

        // 4. Khóa nếu đủ 3 lần trong tuần
        if (thisCancel >= WEEKLY_CANCEL_LIMIT) {
          suspendedUntil = new Date(
            Date.now() + CANCEL_SUSPENSION_DAYS * 24 * 60 * 60 * 1000,
          );
          tasker.cancelSuspendedUntil = suspendedUntil;
          suspended = true;
          await manager.getRepository(TaskerEntity).save(tasker);
        }
      });

      // 5. Notify customer
      if (customerUserId) {
        await this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.BOOKING_CANCELLED,
          referenceType: NotificationRefType.BOOKING,
          referenceId: bookingId,
          title: 'Tasker đã hủy đơn của bạn',
          content: `Đơn #${bookingCode} đang được tìm tasker mới. Xin lỗi vì sự bất tiện này.`,
        });
      }

      // 6. Notify tasker nếu bị khóa
      if (suspended && suspendedUntil) {
        const fmt = suspendedUntil.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'Asia/Ho_Chi_Minh',
        });
        await this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.SYSTEM,
          referenceType: NotificationRefType.BOOKING,
          referenceId: bookingId,
          title: 'Tài khoản bị tạm khóa nhận đơn',
          content: `Bạn đã hủy ${WEEKLY_CANCEL_LIMIT} đơn trong 7 ngày. Tài khoản bị khóa nhận đơn đến ${fmt}.`,
        });
      }

      return {
        message: suspended
          ? `Đã hủy đơn. Phí phạt ${penaltyAmount.toLocaleString('vi-VN')}đ đã bị trừ. Tài khoản bị khóa nhận đơn ${CANCEL_SUSPENSION_DAYS} ngày.`
          : `Đã hủy đơn.`,
        penaltyAmount,
        weeklyCount: weeklyCount + 1,
        suspended,
        suspendedUntil: suspendedUntil?.toISOString(),
      };
    }, 'Lỗi khi tasker hủy đơn');
  }
}
