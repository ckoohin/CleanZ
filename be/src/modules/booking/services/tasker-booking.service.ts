import {
  isSurchargePending,
  BookingSurchargeStatus,
} from 'src/common/enums/booking-surcharge-status.enum';
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
import { haversineDistanceMeters } from 'src/common/helpers/geo.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { PaymentService } from 'src/modules/payment/payment.service';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { GoongMapService } from 'src/modules/goong/goong-map.service';
import { TrackingGateway } from 'src/modules/tracking/tracking.gateway';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerBookingLocationDto } from '../dto/tasker-booking-location.dto';
import { CheckinDto } from '../dto/checkin.dto';
import { CancelBookingDto } from '../dto/cancel-booking.dto';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BookingSubServiceEntity } from '../entity/booking-sub-service.entity';
import {
  BookingPolicyService,
  CANCEL_SUSPENSION_DAYS,
  WEEKLY_CANCEL_LIMIT,
} from './booking-policy.service';
import { ServicePackageEntity } from 'src/modules/service/entity/service-package.entity';
import { PricingService } from 'src/modules/pricing/services/pricing.service';
import { TaskerBalanceService } from 'src/modules/wallet/tasker-balance.service';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import {
  BookingDispatchService,
  POSTED_LIST_OPEN_TO_ALL_AFTER_MS,
} from './booking-dispatch.service';
import {
  BookingCheckinService,
  OVERTIME_REQUEST_WINDOW_MS,
  SURCHARGE_CONFIRM_WINDOW_MS,
  TaskerCheckinPolicy,
} from './booking-checkin.service';
import { BookingOvertimeRequestStatus } from 'src/common/enums/booking-overtime-request-status.enum';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';
import { BookingCheckinReviewStatus } from 'src/common/enums/booking-checkin-review-status.enum';
import { BookingCheckinVerificationSource } from 'src/common/enums/booking-checkin-verification-source.enum';
import { BookingNoShowReviewStatus } from 'src/common/enums/booking-no-show-review-status.enum';
import { TaskerEquipmentStatus } from 'src/common/enums/tasker-equipment-status.enum';
import { getTaskerPremiumEligibilityIssues } from '../helpers/premium-eligibility.helper';
import type { PremiumEligibilityIssue } from '../helpers/premium-eligibility.helper';
import { BookingSettlementService } from './booking-settlement.service';
import {
  computeWorkTiming,
  overtimeFeeForMinutes,
} from '../helpers/work-timing.helper';
import { VN_NOW_SQL } from 'src/common/helpers/vietnam-time.helper';
import type { CheckinAssessment } from './booking-checkin.policy';
import { SubmitNoShowExplanationDto } from '../dto/submit-no-show-explanation.dto';
import { BookingLifecycleSchedulerService } from './booking-lifecycle-scheduler.service';
import type { TaskerCancelPenaltyPreview } from 'src/modules/system-config/operational-policy';

interface TaskerPostedBookingItem {
  id: string;
  bookingCode: string;
  status: BookingStatus;
  serviceTier: BookingServiceTier;
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
  premiumAccess?: TaskerPremiumAccess;
  invitation: TaskerBookingInvitationAccess;
  createdAt: Date;
}

export interface TaskerPremiumAccess {
  canAccept: boolean;
  issues: PremiumEligibilityIssue[];
  message: string | null;
  equipmentStatus: TaskerEquipmentStatus;
}

export interface TaskerBookingInvitationAccess {
  /** Tasker hiện tại đã từng được hệ thống gửi lời mời cho đơn này. */
  isInvited: boolean;
  /** Đơn vẫn đang trong cửa sổ chỉ những Tasker được mời mới có thể nhận. */
  isExclusive: boolean;
  /** Thời điểm đơn được mở công khai cho pool Tasker phù hợp. */
  publicAt: Date | null;
}

export interface TaskerPostedBookingListResponse {
  total: number;
  items: TaskerPostedBookingItem[];
}

export interface TaskerCompletedBookingListResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: Array<{
    id: string;
    bookingCode: string;
    service: { id: string; name: string };
    schedule: {
      scheduledStartDate?: string | null;
      scheduledStartTime?: string | null;
      durationHours: number;
    };
    totalPrice: number;
    paymentMethod: PaymentMethod;
    completedAt?: Date | null;
  }>;
}

export interface TaskerPostedBookingDetailResponse {
  serviceTier: BookingServiceTier;
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
  premiumAccess?: TaskerPremiumAccess;
  invitation: TaskerBookingInvitationAccess;
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
  source: BookingEntity['source'];
  canContactCustomer: boolean;
  checkinPolicy: TaskerCheckinPolicy;
  taskerCancelPenalty: TaskerCancelPenaltyPreview;
  checkinResult?: CheckinAssessment;
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
    /** Phụ phí phát sinh thêm giờ (đã cộng vào totalPrice sau khi khách xác nhận). */
    waitingFee: number;
    discountAmount: number;
    /** Giá trước voucher — nền tảng thu hoa hồng trên mức này. */
    subtotal: number;
    platformCommissionRate: number;
    platformFee: number;
    taskerIncome: number;
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
  checkedOutAt?: Date | null;
  completedAt?: Date | null;
  workTiming: {
    overtimeMinutes: number;
    earlyMinutes: number;
    surchargeFee: number;
    surchargePending: boolean;
    surchargeStatus: BookingSurchargeStatus;
    /** Số phút thêm giờ khách đã duyệt trước — thu chắc chắn, không cần xác nhận lại. */
    approvedOvertimeMinutes: number;
    platformAdvanceAmount: number;
  };
  /** Yêu cầu thêm giờ đang chờ / kết quả gần nhất. */
  overtimeRequest: {
    status: BookingOvertimeRequestStatus;
    minutes: number;
    fee: number;
    respondBy: string | null;
  };
  noShow: {
    reviewStatus: BookingNoShowReviewStatus;
    detectedAt: Date | null;
    explanation: string | null;
    explanationSubmittedAt: Date | null;
    reviewedAt: Date | null;
    reviewReason: string | null;
    warningPoints: number;
  };
}

interface TaskerLocationInput {
  currentLatitude?: number;
  currentLongitude?: number;
}

interface ResolvedTaskerBookingInvitationAccess extends TaskerBookingInvitationAccess {
  isPublic: boolean;
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
    private readonly taskerBalanceService: TaskerBalanceService,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly goongMapService: GoongMapService,
    private readonly trackingGateway: TrackingGateway,
    private readonly notificationService: NotificationService,
    private readonly vouchersService: VouchersService,
    private readonly bookingDispatchService: BookingDispatchService,
    private readonly bookingCheckinService: BookingCheckinService,
    private readonly bookingSettlementService: BookingSettlementService,
    private readonly bookingLifecycleScheduler: BookingLifecycleSchedulerService,
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
      const tasker = await this.findTaskerProfile(userId);
      const premiumAccess = this.buildTaskerPremiumAccess(tasker);
      const premiumDispatchConfig =
        await this.bookingDispatchService.getPremiumDispatchConfig();
      const standardOpenAfterSeconds = POSTED_LIST_OPEN_TO_ALL_AFTER_MS / 1000;
      const premiumOpenAfterSeconds =
        premiumDispatchConfig.favoriteWaitMs / 1000;

      // Notification được persist trước khi emit realtime nên đây là nguồn bền
      // vững để lời mời vẫn xuất hiện trong danh sách sau khi Tasker đóng popup,
      // đổi trang hoặc Redis dispatch state hết TTL.
      const isInvitedSql = `EXISTS (
        SELECT 1
        FROM notifications invitation
        WHERE invitation.user_id = :invitedUserId
          AND invitation.reference_type = :bookingReferenceType
          AND invitation.reference_id = booking.id
          AND invitation.type = :newBookingNotificationType
      )`;
      const isPublicSql = `booking.createdAt <= ${VN_NOW_SQL} - make_interval(
        secs => (
          CASE
            WHEN booking.serviceTier = :premiumServiceTier
              THEN :premiumOpenAfterSeconds
            ELSE :standardOpenAfterSeconds
          END
        )::double precision
      )`;

      // Tasker được mời thấy đơn ngay trong danh sách. Tasker chưa được mời chỉ
      // thấy đơn STANDARD sau 60 giây, hoặc đơn PREMIUM sau cửa sổ 15 phút.
      // Điều kiện tương tự được kiểm tra lại ở API chi tiết và API nhận đơn.
      const query = this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .addSelect(isInvitedSql, 'access_is_invited')
        .addSelect(isPublicSql, 'access_is_public')
        .where('booking.status = :status', { status: BookingStatus.POSTED })
        .andWhere('tasker.id IS NULL')
        .andWhere(`(${isInvitedSql} OR ${isPublicSql})`)
        .setParameters({
          invitedUserId: userId,
          bookingReferenceType: NotificationRefType.BOOKING,
          newBookingNotificationType: NotificationType.BOOKING_NEW_AVAILABLE,
          premiumServiceTier: BookingServiceTier.PREMIUM,
          premiumOpenAfterSeconds,
          standardOpenAfterSeconds,
        })
        .orderBy('booking.scheduledStartDate', 'ASC')
        .addOrderBy('booking.scheduledStartTime', 'ASC')
        .addOrderBy('booking.createdAt', 'ASC');

      const { entities: bookings, raw } = await query.getRawAndEntities<{
        booking_id: string;
        access_is_invited: boolean;
        access_is_public: boolean;
      }>();
      const accessByBookingId = new Map(
        raw.map((item) => [
          item.booking_id,
          {
            isInvited: item.access_is_invited === true,
            isPublic: item.access_is_public === true,
          },
        ]),
      );

      const packages = await this.findPackagesByBookingPackageIds(bookings);
      const items = bookings.map((booking) => {
        const access = accessByBookingId.get(booking.id) ?? {
          isInvited: false,
          isPublic: true,
        };
        return this.mapPostedBookingItem(
          booking,
          packages,
          premiumAccess,
          this.buildTaskerBookingInvitationAccess(
            booking,
            access,
            premiumDispatchConfig.favoriteWaitMs,
          ),
        );
      });

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
      const tasker = await this.findTaskerProfile(userId);

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

      const resolvedInvitation =
        await this.resolveTaskerBookingInvitationAccess(userId, booking);
      if (!resolvedInvitation.isInvited && !resolvedInvitation.isPublic) {
        throw new ForbiddenException(
          'Đơn này đang được ưu tiên cho Tasker khác',
        );
      }
      const invitation =
        this.toTaskerBookingInvitationAccess(resolvedInvitation);

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
      );
      const totalPrice = toNumber(booking.totalPrice);
      const discountAmount = toNumber(booking.discountAmount);
      const subtotal = totalPrice + discountAmount;
      const platformFee = Math.round((subtotal * platformCommissionRate) / 100);
      const premiumAccess =
        booking.serviceTier === BookingServiceTier.PREMIUM
          ? this.buildTaskerPremiumAccess(tasker)
          : undefined;

      return {
        distance,
        service,
        serviceTier: booking.serviceTier,
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
        ...(premiumAccess ? { premiumAccess } : {}),
        invitation,
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

        this.assertTaskerEligibleForServiceTier(booking, tasker);

        await this.assertTaskerHasActiveDispatchInvitation(userId, booking);

        await this.bookingPolicyService.assertTaskerConcurrentAndOverlapConstraints(
          manager,
          tasker.id,
          booking,
        );

        await this.taskerBalanceService.assertMeetsMinAcceptBalance(
          manager,
          tasker.id,
        );

        if (booking.paymentMethod === PaymentMethod.CASH) {
          const commissionRate =
            await this.resolvePlatformCommissionRate(manager);
          // Dùng subtotal (trước voucher) vì nền tảng thu phí trên giá gốc của tasker
          const subtotalForCommission =
            toNumber(booking.totalPrice) + toNumber(booking.discountAmount);
          const platformFee = Math.round(
            (subtotalForCommission * commissionRate) / 100,
          );
          // Giữ luôn phí thay vì chỉ kiểm số dư: tới lúc quyết toán không thể thiếu tiền.
          await this.taskerBalanceService.holdCashCommission(
            manager,
            tasker.id,
            booking,
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

      // Side effects sau commit: hủy dispatch và lên đủ mốc lifecycle.
      void this.bookingLifecycleScheduler
        .activateConfirmedBooking(result.id)
        .catch((err) =>
          this.logger.warn(
            `Không thể kích hoạt lifecycle booking=${result.id}: ${err}`,
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
      const hasCurrentLocation =
        Number.isFinite(location?.currentLatitude) &&
        Number.isFinite(location?.currentLongitude);
      const distance = hasCurrentLocation
        ? await this.calculateDistanceFromTaskerLocation(
            booking,
            location,
            `assigned:${booking.id}:${tasker.id}`,
          )
        : null;
      return await this.mapAssignedBookingDetail(booking, service, distance);
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
      return await this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể lấy booking đang hoạt động của tasker');
  }

  async findCompletedBookings(
    userId: string,
    page = 1,
    limit = 10,
    fromAt?: string,
    toAt?: string,
  ): Promise<TaskerCompletedBookingListResponse> {
    return asyncHandleOperation(async () => {
      const tasker = await this.findTaskerProfile(userId);
      const safePage = Math.max(1, page);
      const safeLimit = Math.min(50, Math.max(1, limit));

      if (Boolean(fromAt) !== Boolean(toAt)) {
        throw new BadRequestException(
          'Phải truyền đồng thời thời gian bắt đầu và kết thúc',
        );
      }

      const fromDate = fromAt ? new Date(fromAt) : null;
      const toDate = toAt ? new Date(toAt) : null;
      if (fromDate && toDate) {
        const rangeMs = toDate.getTime() - fromDate.getTime();
        if (rangeMs <= 0 || rangeMs > 370 * 24 * 60 * 60 * 1000) {
          throw new BadRequestException(
            'Khoảng thời gian xem đơn không hợp lệ hoặc vượt quá một năm',
          );
        }
      }

      const query = this.dataSource
        .getRepository(BookingEntity)
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.package', 'package')
        .where('booking.tasker = :taskerId', { taskerId: tasker.id })
        .andWhere('booking.status = :status', {
          status: BookingStatus.COMPLETED,
        });

      if (fromDate && toDate) {
        query
          .andWhere('booking.completedAt >= :fromAt', { fromAt: fromDate })
          .andWhere('booking.completedAt < :toAt', { toAt: toDate });
      }

      const [bookings, total] = await query
        .orderBy('booking.completedAt', 'DESC', 'NULLS LAST')
        .addOrderBy('booking.updatedAt', 'DESC')
        .skip((safePage - 1) * safeLimit)
        .take(safeLimit)
        .getManyAndCount();

      return {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
        items: bookings.map((booking) => ({
          id: booking.id,
          bookingCode: booking.bookingCode,
          service: {
            id: booking.packageId,
            name: booking.package?.name ?? 'Gói dịch vụ đã ngừng hoạt động',
          },
          schedule: {
            scheduledStartDate: booking.scheduledStartDate,
            scheduledStartTime: booking.scheduledStartTime,
            durationHours: toNumber(booking.durationHours),
          },
          totalPrice: toNumber(booking.totalPrice),
          paymentMethod: booking.paymentMethod,
          completedAt: booking.completedAt,
        })),
      };
    }, 'Không thể lấy danh sách đơn đã hoàn tất');
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
      return await this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể cập nhật trạng thái tasker đang tới');
  }

  async markCheckedIn(
    userId: string,
    bookingId: string,
    checkinDto: CheckinDto = {},
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
      const checkin = await this.dataSource.transaction(async (manager) => {
        const result = await this.bookingCheckinService.performCheckin(
          userId,
          bookingId,
          manager,
          checkinDto,
        );

        // Load lại booking với đầy đủ relations để map response
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.addressRef', 'addressRef')
          .where('booking.id = :bookingId', { bookingId })
          .getOne();
        return { booking, result };
      });

      const { booking, result } = checkin;
      if (!booking)
        throw new NotFoundException('Booking không tìm thấy sau check-in');

      const arrivedAt =
        booking.checkedInAt?.toISOString() ?? new Date().toISOString();
      if (!result.alreadyCheckedIn) {
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
      }

      // Hủy auto-cancel job vì đã check-in thành công
      void this.bookingCheckinService
        .cancelArrivalJobs(bookingId)
        .catch(() => null);

      const service = await this.findServiceByBooking(booking);
      return {
        ...(await this.mapAssignedBookingDetail(booking, service, null)),
        checkinResult: result,
      };
    }, 'Không thể check-in booking');
  }

  /**
   * Nhánh cứu hộ có audit dành riêng cho Admin. Không giả lập GPS và không đi
   * qua endpoint đổi trạng thái chung.
   */
  async adminOverrideCheckin(
    adminUserId: string,
    bookingId: string,
    reason: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      const booking = await this.dataSource.transaction(async (manager) => {
        const locked = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.addressRef', 'addressRef')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .getOne();
        if (!locked) {
          throw new NotFoundException('Booking không tồn tại');
        }
        if (!locked.tasker) {
          throw new ConflictException(
            'Booking chưa có Tasker nên không thể override check-in',
          );
        }
        if (locked.status !== BookingStatus.TASKER_ON_THE_WAY) {
          throw new ConflictException(
            'Admin chỉ có thể override booking đang ở TASKER_ON_THE_WAY',
          );
        }

        const addressLatitude =
          locked.addressRef?.latitude != null
            ? Number(locked.addressRef.latitude)
            : null;
        const addressLongitude =
          locked.addressRef?.longitude != null
            ? Number(locked.addressRef.longitude)
            : null;
        const hasAddressTarget =
          addressLatitude !== null &&
          addressLongitude !== null &&
          Number.isFinite(addressLatitude) &&
          Number.isFinite(addressLongitude);
        const snapshotLatitude =
          locked.latitude != null ? Number(locked.latitude) : null;
        const snapshotLongitude =
          locked.longitude != null ? Number(locked.longitude) : null;
        const hasSnapshotTarget =
          snapshotLatitude !== null &&
          snapshotLongitude !== null &&
          Number.isFinite(snapshotLatitude) &&
          Number.isFinite(snapshotLongitude);
        const checkedInAt = new Date();

        locked.status = BookingStatus.CHECKED_IN;
        locked.checkedInAt = checkedInAt;
        locked.checkinLatitude = null;
        locked.checkinLongitude = null;
        locked.checkinAccuracyMeters = null;
        locked.checkinTargetLatitude = hasAddressTarget
          ? addressLatitude
          : hasSnapshotTarget
            ? snapshotLatitude
            : null;
        locked.checkinTargetLongitude = hasAddressTarget
          ? addressLongitude
          : hasSnapshotTarget
            ? snapshotLongitude
            : null;
        locked.checkinDistanceMeters = null;
        locked.checkinProofPhotoUrl = null;
        locked.checkinFar = true;
        locked.checkinVerificationSource =
          BookingCheckinVerificationSource.ADMIN_OVERRIDE;
        locked.checkinReviewStatus = BookingCheckinReviewStatus.APPROVED;
        locked.checkinReviewedByAdmin = {
          id: adminUserId,
        } as UserEntity;
        locked.checkinReviewedAt = checkedInAt;
        locked.checkinReviewReason = reason;
        const saved = await manager.getRepository(BookingEntity).save(locked);

        await manager.getRepository(BookingStatusLogEntity).save(
          manager.getRepository(BookingStatusLogEntity).create({
            booking: saved,
            oldStatus: BookingStatus.TASKER_ON_THE_WAY,
            newStatus: BookingStatus.CHECKED_IN,
            changedByUser: { id: adminUserId } as UserEntity,
            note: `Admin override check-in — ${reason}`,
            cancellationFee: 0,
            refundAmount: 0,
          }),
        );
        return saved;
      });

      const checkedInAt =
        booking.checkedInAt?.toISOString() ?? new Date().toISOString();
      await Promise.allSettled([
        this.trackingGateway.emitTaskerArrived(booking.id, {
          bookingId: booking.id,
          status: booking.status,
          arrivedAt: checkedInAt,
          trackingStopped: true,
        }),
        this.trackingGateway.emitBookingStatusUpdated(booking.id, {
          bookingId: booking.id,
          bookingCode: booking.bookingCode,
          previousStatus: BookingStatus.TASKER_ON_THE_WAY,
          status: booking.status,
          changedAt: checkedInAt,
          actor: { type: 'ADMIN', id: adminUserId },
          checkedInAt,
          paymentStatus: booking.paymentStatus,
        }),
      ]);
      this.emitBookingNotification(
        booking.customer?.user?.id,
        NotificationType.SYSTEM,
        booking.id,
        'Admin đã xác nhận Tasker có mặt',
        `Đơn ${booking.bookingCode} đã được check-in thủ công sau khi xác minh.`,
        'admin-checkin-override-customer',
      );
      this.emitBookingNotification(
        booking.tasker?.user?.id,
        NotificationType.SYSTEM,
        booking.id,
        'Check-in đã được Admin xác nhận',
        `Đơn ${booking.bookingCode} đã được check-in thủ công. Lý do: ${reason}`,
        'admin-checkin-override-tasker',
      );

      void this.bookingCheckinService
        .cancelArrivalJobs(bookingId)
        .catch(() => null);
      const service = await this.findServiceByBooking(booking);
      return this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể override check-in booking');
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
      return await this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể bắt đầu booking');
  }

  async submitNoShowExplanation(
    userId: string,
    bookingId: string,
    dto: SubmitNoShowExplanationDto,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      const explanation = dto.explanation.trim();
      const booking = await this.dataSource.transaction(async (manager) => {
        const bookingRepo = manager.getRepository(BookingEntity);
        const locked = await bookingRepo
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.addressRef', 'addressRef')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .andWhere('taskerUser.id = :userId', { userId })
          .getOne();

        if (!locked) {
          throw new NotFoundException(
            'Booking không tồn tại hoặc không thuộc tasker hiện tại',
          );
        }
        if (
          locked.status !== BookingStatus.CANCELLED ||
          locked.noShowReviewStatus !== BookingNoShowReviewStatus.PENDING_REVIEW
        ) {
          throw new BadRequestException(
            'Booking không ở trạng thái chờ giải trình no-show',
          );
        }

        // Retry cùng payload là idempotent, không tạo thêm timeline.
        if (locked.noShowExplanation === explanation) return locked;

        locked.noShowExplanation = explanation;
        locked.noShowExplanationSubmittedAt = new Date();
        const saved = await bookingRepo.save(locked);
        await manager.getRepository(BookingStatusLogEntity).save(
          manager.getRepository(BookingStatusLogEntity).create({
            booking: saved,
            oldStatus: BookingStatus.CANCELLED,
            newStatus: BookingStatus.CANCELLED,
            changedByUser: { id: userId } as UserEntity,
            note: 'Tasker đã gửi/cập nhật giải trình no-show để Admin review',
            cancellationFee: 0,
            refundAmount: 0,
          }),
        );
        return saved;
      });

      const service = await this.findServiceByBooking(booking);
      return this.mapAssignedBookingDetail(booking, service, null);
    }, 'Không thể gửi giải trình no-show');
  }

  async markCompleted(
    userId: string,
    bookingId: string,
  ): Promise<TaskerAssignedBookingDetailResponse> {
    return asyncHandleOperation(async () => {
      const outcome = await this.dataSource.transaction(async (manager) => {
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

        if (isSurchargePending(booking.surchargeStatus)) {
          throw new BadRequestException(
            'Đã checkout và đang chờ xác nhận phần phát sinh',
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

        const checkoutAt = new Date();
        const timing = computeWorkTiming({
          checkedInAt: booking.checkedInAt,
          checkoutAt,
          durationHours: toNumber(booking.durationHours),
          basePrice: toNumber(booking.basePrice),
        });

        booking.checkedOutAt = checkoutAt;
        booking.earlyMinutes = timing.earlyMinutes;
        booking.overtimeMinutes = timing.billableOvertimeMinutes;

        const hasCustomer = !!booking.customer;

        // Phần khách đã duyệt TRƯỚC là cam kết → thu chắc chắn, không hỏi lại.
        // Chỉ phần vượt ngoài hạn mức đã duyệt mới phải chờ khách xác nhận.
        const approvedMinutes = toNumber(booking.approvedOvertimeMinutes);
        const coveredMinutes = Math.min(
          timing.billableOvertimeMinutes,
          approvedMinutes,
        );
        const excessMinutes = timing.billableOvertimeMinutes - coveredMinutes;

        const durationHours = toNumber(booking.durationHours);
        const basePrice = toNumber(booking.basePrice);
        const coveredFee = overtimeFeeForMinutes(
          coveredMinutes,
          durationHours,
          basePrice,
        );
        const excessFee = overtimeFeeForMinutes(
          excessMinutes,
          durationHours,
          basePrice,
        );

        // Đơn ví đã bị giữ tiền cho toàn bộ phần duyệt trước; làm ít hơn thì hoàn lại.
        if (
          approvedMinutes > 0 &&
          booking.paymentMethod === PaymentMethod.WALLET
        ) {
          const heldFee = overtimeFeeForMinutes(
            approvedMinutes,
            durationHours,
            basePrice,
          );
          if (heldFee !== coveredFee) {
            const previousTotalPrice = toNumber(booking.totalPrice);
            booking.totalPrice = previousTotalPrice - heldFee + coveredFee;
            await this.bookingWalletPaymentService.adjustEscrow(
              manager,
              booking,
              previousTotalPrice,
            );
          }
          booking.waitingFee = coveredFee;
        } else if (coveredFee > 0) {
          // Đơn tiền mặt có phần đã duyệt trước → cộng thẳng vào tổng phải thu.
          booking.totalPrice = toNumber(booking.totalPrice) + coveredFee;
          booking.waitingFee = coveredFee;
        }

        // Còn phần vượt ngoài hạn mức đã duyệt và đơn gắn khách → hoãn hoàn thành,
        // chờ khách xác nhận/thanh toán (đơn vãng lai không có khách để xác nhận
        // nên cộng thẳng vào tổng và hoàn thành ngay bên dưới).
        if (excessMinutes > 0 && hasCustomer) {
          booking.waitingFee = excessFee;
          booking.surchargeStatus = BookingSurchargeStatus.PENDING_CUSTOMER;
          booking.confirmationDeadline = new Date(
            checkoutAt.getTime() + SURCHARGE_CONFIRM_WINDOW_MS,
          );
          const savedBooking = await bookingRepository.save(booking);

          await manager.getRepository(BookingStatusLogEntity).save(
            manager.getRepository(BookingStatusLogEntity).create({
              booking: savedBooking,
              oldStatus: BookingStatus.IN_PROGRESS,
              newStatus: BookingStatus.IN_PROGRESS,
              changedByUser: { id: userId } as UserEntity,
              note:
                `Tasker checkout — phát sinh ${timing.billableOvertimeMinutes} phút ` +
                `(đã duyệt trước ${coveredMinutes} phút), chờ khách xác nhận ` +
                `${excessMinutes} phút = ${excessFee.toLocaleString('vi-VN')}đ`,
              cancellationFee: 0,
              refundAmount: 0,
            }),
          );

          await this.bookingCheckinService.scheduleSurchargeTimeout(
            savedBooking.id,
            SURCHARGE_CONFIRM_WINDOW_MS,
          );

          return {
            mode: 'PENDING_SURCHARGE' as const,
            booking: savedBooking,
            timing,
          };
        }

        // Đơn vãng lai có phát sinh → cộng thẳng phần chưa duyệt vào tổng (thu
        // tiền mặt), vì không có tài khoản khách để chạy luồng xác nhận.
        if (excessMinutes > 0 && !hasCustomer) {
          booking.waitingFee = toNumber(booking.waitingFee) + excessFee;
          booking.totalPrice = toNumber(booking.totalPrice) + excessFee;
        }

        const result =
          await this.bookingSettlementService.settleCompletedBooking(manager, {
            booking,
            tasker,
            actorUserId: userId,
            note:
              timing.earlyMinutes > 0
                ? `Tasker hoàn thành (checkout sớm ${timing.earlyMinutes} phút)`
                : 'Tasker hoàn thành công việc',
          });

        return { mode: 'COMPLETED' as const, booking: result.booking, timing };
      });

      await this.bookingLifecycleScheduler.deactivateBooking(
        outcome.booking.id,
      );
      await this.emitCompletionNotifications(userId, outcome);

      const service = await this.findServiceByBooking(outcome.booking);
      return await this.mapAssignedBookingDetail(
        outcome.booking,
        service,
        null,
      );
    }, 'Không thể hoàn thành booking');
  }

  /**
   * Thông báo sau khi checkout: hoàn thành ngay, hoặc chờ khách xác nhận phụ phí;
   * kèm cảnh báo checkout sớm cho tasker và ghi log đơn sớm bất thường cho admin.
   */
  private async emitCompletionNotifications(
    actorUserId: string,
    outcome: {
      mode: 'COMPLETED' | 'PENDING_SURCHARGE';
      booking: BookingEntity;
      timing: ReturnType<typeof computeWorkTiming>;
    },
  ): Promise<void> {
    const { booking, timing, mode } = outcome;
    const taskerUserId = booking.tasker?.user?.id;
    const customerUserId = booking.customer?.user?.id;

    // Cảnh báo tasker khi checkout sớm hơn thời lượng đặt.
    if (timing.earlyMinutes > 0) {
      this.emitBookingNotification(
        taskerUserId,
        NotificationType.SYSTEM,
        booking.id,
        'Bạn đã checkout sớm',
        `Bạn kết thúc sớm ${timing.earlyMinutes} phút so với thời lượng đặt của `,
        'early_checkout',
      );
      if (timing.isEarlyAbnormal) {
        this.logger.warn(
          `Booking ${booking.bookingCode} checkout sớm bất thường ${timing.earlyMinutes} phút — cần admin kiểm tra`,
        );
      }
    }

    if (mode === 'PENDING_SURCHARGE') {
      this.emitBookingNotification(
        customerUserId,
        NotificationType.BOOKING_SURCHARGE_PENDING,
        booking.id,
        'Xác nhận phần phát sinh thêm giờ',
        `Booking #${booking.bookingCode} phát sinh ${timing.billableOvertimeMinutes} phút ` +
          `(${timing.overtimeFee.toLocaleString('vi-VN')}đ). Vui lòng xác nhận và ` +
          `chọn hình thức thanh toán phần phát sinh.`,
        'surcharge_pending',
      );
      this.emitBookingNotification(
        taskerUserId,
        NotificationType.SYSTEM,
        booking.id,
        'Chờ khách xác nhận phát sinh',
        `Bạn đã checkout booking #${booking.bookingCode}. Đang chờ khách xác nhận ` +
          `và thanh toán phần phát sinh ${timing.overtimeFee.toLocaleString('vi-VN')}đ.`,
        'surcharge_pending_tasker',
      );
      return;
    }

    const completedAt =
      booking.completedAt?.toISOString() ?? new Date().toISOString();
    await this.trackingGateway.emitBookingCompleted(booking.id, {
      bookingId: booking.id,
      status: booking.status,
      completedAt,
      paymentStatus: booking.paymentStatus,
    });
    await this.emitCustomerBookingStatusChanged({
      booking,
      previousStatus: BookingStatus.IN_PROGRESS,
      changedAt: booking.completedAt ?? new Date(),
      actorUserId,
    });
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

  /**
   * Chốt chặn cuối cùng của đơn PREMIUM.
   *
   * Khi hết cửa sổ 15 phút, đơn chỉ mở cho pool phù hợp; vì vậy guard hạng dịch
   * vụ này vẫn chạy trước guard lời mời và không có ngoại lệ theo thời gian.
   */
  private assertTaskerEligibleForServiceTier(
    booking: BookingEntity,
    tasker: TaskerEntity,
  ): void {
    if (booking.serviceTier !== BookingServiceTier.PREMIUM) return;

    const access = this.buildTaskerPremiumAccess(tasker);
    if (access.canAccept) return;

    // Đơn Cao cấp hiển thị cho mọi thợ nhưng chỉ thợ đã đăng ký (dụng cụ đã
    // duyệt) mới nhận được — thợ chưa đủ điều kiện nhận hướng dẫn đăng ký.
    throw new ForbiddenException(
      access.message ?? 'Bạn cần đăng ký thợ Cao cấp để nhận đơn này',
    );
  }

  private buildTaskerPremiumAccess(tasker: TaskerEntity): TaskerPremiumAccess {
    const issues = getTaskerPremiumEligibilityIssues(tasker);
    let message: string | null = null;

    if (issues.includes('EQUIPMENT_NOT_APPROVED')) {
      if (tasker.equipmentStatus === TaskerEquipmentStatus.PENDING) {
        message = 'Hồ sơ bộ dụng cụ đang chờ duyệt, hãy thử lại sau';
      } else if (tasker.equipmentStatus === TaskerEquipmentStatus.REJECTED) {
        message = 'Bộ dụng cụ chưa được duyệt, hãy thử lại sau';
      } else {
        message = 'Đăng ký trở thành thợ premium để nhận đơn này.';
      }
    }

    return {
      canAccept: issues.length === 0,
      issues,
      message,
      equipmentStatus: tasker.equipmentStatus,
    };
  }

  private async assertTaskerHasActiveDispatchInvitation(
    userId: string,
    booking: BookingEntity,
  ): Promise<void> {
    const access = await this.resolveTaskerBookingInvitationAccess(
      userId,
      booking,
    );
    if (!access.isInvited && !access.isPublic) {
      throw new ForbiddenException(
        'Đơn này chưa được gửi cho bạn hoặc lượt nhận đã hết',
      );
    }
  }

  /**
   * Quyền xem/nhận đơn POSTED không phụ thuộc vào trạng thái modal phía FE:
   * notification đã persist chứng minh Tasker từng được mời; hết cửa sổ thì
   * đơn tự mở công khai theo thời gian của PostgreSQL.
   */
  private async resolveTaskerBookingInvitationAccess(
    userId: string,
    booking: Pick<BookingEntity, 'id' | 'serviceTier' | 'createdAt'>,
  ): Promise<ResolvedTaskerBookingInvitationAccess> {
    const premiumDispatchConfig =
      await this.bookingDispatchService.getPremiumDispatchConfig();
    const standardOpenAfterSeconds = POSTED_LIST_OPEN_TO_ALL_AFTER_MS / 1000;
    const premiumOpenAfterSeconds = premiumDispatchConfig.favoriteWaitMs / 1000;

    const rows = await this.dataSource.query<
      { is_public: boolean; is_invited: boolean }[]
    >(
      `
        SELECT
          (
            ${VN_NOW_SQL} >= b.created_at + make_interval(
              secs => CASE
                WHEN b.service_tier = $6
                  THEN $5::double precision
                ELSE $4::double precision
              END
            )
          ) AS is_public,
          EXISTS (
            SELECT 1
            FROM notifications invitation
            WHERE invitation.user_id = $2
              AND invitation.reference_type = $3
              AND invitation.reference_id = b.id
              AND invitation.type = $7
          ) AS is_invited
        FROM bookings b
        WHERE b.id = $1
      `,
      [
        booking.id,
        userId,
        NotificationRefType.BOOKING,
        standardOpenAfterSeconds,
        premiumOpenAfterSeconds,
        BookingServiceTier.PREMIUM,
        NotificationType.BOOKING_NEW_AVAILABLE,
      ],
    );
    const row = rows[0];
    return {
      ...this.buildTaskerBookingInvitationAccess(
        booking,
        {
          isInvited: row?.is_invited ?? false,
          isPublic: row?.is_public ?? false,
        },
        premiumDispatchConfig.favoriteWaitMs,
      ),
      isPublic: row?.is_public ?? false,
    };
  }

  private buildTaskerBookingInvitationAccess(
    booking: Pick<BookingEntity, 'serviceTier' | 'createdAt'>,
    access: { isInvited: boolean; isPublic: boolean },
    premiumOpenAfterMs: number,
  ): TaskerBookingInvitationAccess {
    const openAfterMs =
      booking.serviceTier === BookingServiceTier.PREMIUM
        ? premiumOpenAfterMs
        : POSTED_LIST_OPEN_TO_ALL_AFTER_MS;

    return {
      isInvited: access.isInvited,
      isExclusive: access.isInvited && !access.isPublic,
      publicAt: new Date(booking.createdAt.getTime() + openAfterMs),
    };
  }

  private toTaskerBookingInvitationAccess(
    access: ResolvedTaskerBookingInvitationAccess,
  ): TaskerBookingInvitationAccess {
    return {
      isInvited: access.isInvited,
      isExclusive: access.isExclusive,
      publicAt: access.publicAt,
    };
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

    // withDeleted: đây là tra cứu lịch sử theo bookings.package_id — gói đã xóa
    // mềm vẫn phải hiện đúng tên, nếu không đơn cũ sẽ mất thông tin dịch vụ.
    const packages = await this.dataSource.manager
      .getRepository(ServicePackageEntity)
      .find({
        where: { id: In(packageIds) },
        withDeleted: true,
      });

    return new Map(packages.map((pkg) => [pkg.id, pkg]));
  }

  private mapPostedBookingItem(
    booking: BookingEntity,
    packages: Map<string, ServicePackageEntity>,
    premiumAccess: TaskerPremiumAccess,
    invitation: TaskerBookingInvitationAccess,
  ): TaskerPostedBookingItem {
    const pkg = packages.get(booking.packageId);

    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      serviceTier: booking.serviceTier,
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
      ...(booking.serviceTier === BookingServiceTier.PREMIUM
        ? { premiumAccess }
        : {}),
      invitation,
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

  private async mapAssignedBookingDetail(
    booking: BookingEntity,
    service: {
      id: string;
      name: string;
      description?: string | null;
    },
    distance: TaskerAssignedBookingDetailResponse['distance'],
  ): Promise<TaskerAssignedBookingDetailResponse> {
    const canContactCustomer = CUSTOMER_CONTACT_VISIBLE_STATUSES.includes(
      booking.status,
    );
    const [price, taskerCancelPenalty, checkinPolicy] = await Promise.all([
      this.buildTaskerPriceBreakdown(booking),
      this.bookingPolicyService.resolveTaskerCancelPenalty(
        this.dataSource.manager,
        booking,
      ),
      this.bookingCheckinService.getTaskerCheckinPolicy(
        this.dataSource.manager,
        booking,
      ),
    ]);
    const baseResponse = {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      serviceTier: booking.serviceTier,
      source: booking.source,
      canContactCustomer,
      checkinPolicy,
      taskerCancelPenalty,
      service,
      distance,
      schedule: {
        scheduledStartDate: booking.scheduledStartDate,
        scheduledStartTime: booking.scheduledStartTime,
        scheduledEndDate: booking.scheduledEndDate,
        scheduledEndTime: booking.scheduledEndTime,
        durationHours: toNumber(booking.durationHours),
      },
      price,
      // Thông tin tiền/thanh toán không phải PII → hiển thị ở mọi trạng thái,
      // kể cả đơn đã hoàn thành (lúc này thông tin liên hệ khách bị ẩn).
      payment: {
        method: booking.paymentMethod,
        status: booking.paymentStatus,
      },
      flags: {
        hasPet: booking.addressRef?.hasPet ?? false,
      },
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      checkedInAt: booking.checkedInAt ?? null,
      checkedOutAt: booking.checkedOutAt ?? null,
      completedAt: booking.completedAt ?? null,
      workTiming: {
        overtimeMinutes: toNumber(booking.overtimeMinutes),
        earlyMinutes: toNumber(booking.earlyMinutes),
        surchargeFee: toNumber(booking.waitingFee),
        surchargePending: isSurchargePending(booking.surchargeStatus),
        surchargeStatus: booking.surchargeStatus,
        approvedOvertimeMinutes: toNumber(booking.approvedOvertimeMinutes),
        platformAdvanceAmount: toNumber(booking.platformAdvanceAmount),
      },
      overtimeRequest: {
        status: booking.overtimeRequestStatus,
        minutes: toNumber(booking.overtimeRequestMinutes),
        fee: toNumber(booking.overtimeRequestFee),
        respondBy:
          booking.overtimeRequestStatus ===
            BookingOvertimeRequestStatus.PENDING && booking.overtimeRequestedAt
            ? new Date(
                booking.overtimeRequestedAt.getTime() +
                  OVERTIME_REQUEST_WINDOW_MS,
              ).toISOString()
            : null,
      },
      noShow: {
        reviewStatus: booking.noShowReviewStatus,
        detectedAt: booking.noShowDetectedAt ?? null,
        explanation: booking.noShowExplanation ?? null,
        explanationSubmittedAt: booking.noShowExplanationSubmittedAt ?? null,
        reviewedAt: booking.noShowReviewedAt ?? null,
        reviewReason: booking.noShowReviewReason ?? null,
        warningPoints: toNumber(booking.noShowWarningPoints),
      },
    };

    if (!canContactCustomer) {
      return {
        ...baseResponse,
        ...(booking.status === BookingStatus.COMPLETED
          ? {}
          : {
              area: {
                displayAddress: this.buildPublicAreaText(booking),
              },
            }),
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
    return haversineDistanceMeters(
      fromLatitude,
      fromLongitude,
      toLatitude,
      toLongitude,
    );
  }

  private async findServiceByBooking(booking: BookingEntity): Promise<{
    id: string;
    name: string;
    description?: string | null;
  }> {
    // withDeleted: tra cứu lịch sử theo đơn — gói đã xóa mềm vẫn phải hiện tên.
    const pkg = await this.dataSource.manager
      .getRepository(ServicePackageEntity)
      .findOne({
        where: { id: booking.packageId },
        withDeleted: true,
      });
    return {
      id: booking.packageId,
      name: pkg?.name || 'Gói dịch vụ',
      description: pkg?.policyDescription || null,
    };
  }

  /**
   * Bảng kê tiền tasker nhìn thấy trên đơn đã nhận/đã hoàn thành.
   * Hoa hồng tính trên subtotal (trước voucher) — khớp với BookingSettlementService.
   */
  private async buildTaskerPriceBreakdown(
    booking: BookingEntity,
  ): Promise<TaskerAssignedBookingDetailResponse['price']> {
    // Nhiều query chi tiết không join bookingSubServices — load bù để lấy đúng
    // mức hoa hồng thay vì rơi về mặc định.
    if (!booking.bookingSubServices) {
      booking.bookingSubServices = await this.dataSource
        .getRepository(BookingSubServiceEntity)
        .find({ where: { bookingId: booking.id } });
    }

    const platformCommissionRate = await this.resolvePlatformCommissionRate(
      this.dataSource.manager,
    );
    const totalPrice = toNumber(booking.totalPrice);
    const discountAmount = toNumber(booking.discountAmount);
    const subtotal = totalPrice + discountAmount;
    const platformFee = Math.round((subtotal * platformCommissionRate) / 100);

    return {
      totalPrice,
      basePrice: toNumber(booking.basePrice),
      addonPrice: toNumber(booking.addonPrice),
      peakFee: toNumber(booking.peakFee),
      petFee: toNumber(booking.petFee),
      waitingFee: toNumber(booking.waitingFee),
      discountAmount,
      subtotal,
      platformCommissionRate,
      platformFee,
      taskerIncome: Math.max(subtotal - platformFee, 0),
    };
  }

  private async resolvePlatformCommissionRate(
    manager: EntityManager,
  ): Promise<number> {
    return this.pricingService.getPlatformCommissionRate(manager);
  }

  async cancelByTasker(
    userId: string,
    bookingId: string,
    dto: CancelBookingDto,
  ): Promise<{
    message: string;
    penaltyAmount: number;
    penaltyPercent: number;
    policyVersion: number;
    weeklyCount: number;
    suspended: boolean;
    suspendedUntil?: string;
  }> {
    return asyncHandleOperation(async () => {
      let customerUserId: string | undefined;
      let taskerUserId: string = userId;
      let bookingCode = '';
      let penaltyAmount = 0;
      let penaltyPercent = 0;
      let penaltyPolicyVersion = 0;
      let weeklyCount = 0;
      let suspended = false;
      let suspendedUntil: Date | undefined;
      let shouldRedispatch = false;

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
          taskerUserId,
        );
        // Lần hủy này là weeklyCount + 1
        const thisCancel = weeklyCount + 1;
        const penalty =
          await this.bookingPolicyService.resolveTaskerCancelPenalty(
            manager,
            booking,
          );
        if (
          dto.expectedPenaltyPolicyVersion !== undefined &&
          dto.expectedPenaltyPolicyVersion !== penalty.policyVersion
        ) {
          throw new ConflictException(
            'Chính sách phí hủy vừa thay đổi. Vui lòng tải lại đơn và kiểm tra mức phí mới trước khi hủy.',
          );
        }
        penaltyAmount = penalty.amount;
        penaltyPercent = penalty.penaltyPercent;
        penaltyPolicyVersion = penalty.policyVersion;

        // 1. Hủy đơn. Đơn offline/vãng lai (không gắn customer) KHÔNG re-post lên
        //    chợ — không có khách thật để phục vụ lại → hủy chốt luôn.
        const oldStatus = booking.status;
        const isGuestBooking = !booking.customer;
        shouldRedispatch = !isGuestBooking;
        if (isGuestBooking) {
          booking.status = BookingStatus.CANCELLED;
          booking.cancelledBy = CancelledBy.TASKER;
          booking.cancelledByUserId = userId;
          booking.cancelledAt = new Date();
          await this.bookingWalletPaymentService.refundEscrow(
            manager,
            booking,
            'tasker hủy đơn',
          );
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
          policySnapshot: {
            type: 'TASKER_CANCELLATION',
            totalPrice: toNumber(booking.totalPrice),
            amount: penalty.amount,
            penaltyPercent: penalty.penaltyPercent,
            hoursBeforeStart: penalty.hoursBeforeStart,
            matchedRule: penalty.matchedRule,
            policyVersion: penalty.policyVersion,
            effectiveFrom: penalty.effectiveFrom,
            calculatedAt: new Date().toISOString(),
          },
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

      // Dọn job của lần phân công cũ trước; đơn có customer được đưa lại vào
      // dispatch ngay để không phụ thuộc việc Tasker tự mở danh sách công khai.
      await this.bookingLifecycleScheduler.deactivateBooking(bookingId);
      if (shouldRedispatch) {
        void this.bookingLifecycleScheduler
          .activatePostedDispatch(bookingId)
          .catch((error) =>
            this.logger.error(
              `Không thể redispatch booking=${bookingId}: ${String(error)}`,
            ),
          );
      }

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
          ? `Đã hủy đơn${penaltyAmount > 0 ? `. Phí phạt ${penaltyAmount.toLocaleString('vi-VN')}đ đã bị trừ` : ''}. Tài khoản bị khóa nhận đơn ${CANCEL_SUSPENSION_DAYS} ngày.`
          : penaltyAmount > 0
            ? `Đã hủy đơn. Phí phạt ${penaltyAmount.toLocaleString('vi-VN')}đ đã bị trừ.`
            : 'Đã hủy đơn. Không áp dụng phí hủy.',
        penaltyAmount,
        penaltyPercent,
        policyVersion: penaltyPolicyVersion,
        weeklyCount: weeklyCount + 1,
        suspended,
        suspendedUntil: suspendedUntil?.toISOString(),
      };
    }, 'Lỗi khi tasker hủy đơn');
  }
}
