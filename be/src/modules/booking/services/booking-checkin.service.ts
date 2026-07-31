import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource, EntityManager } from 'typeorm';
import { BookingEntity } from '../entity/booking.entity';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import { BookingSettlementService } from './booking-settlement.service';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import {
  BookingSurchargeStatus,
  isSurchargePending,
} from 'src/common/enums/booking-surcharge-status.enum';
import { BookingOvertimeRequestStatus } from 'src/common/enums/booking-overtime-request-status.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { BookingCheckinReviewStatus } from 'src/common/enums/booking-checkin-review-status.enum';
import { BookingCheckinVerificationSource } from 'src/common/enums/booking-checkin-verification-source.enum';
import { BookingNoShowReviewStatus } from 'src/common/enums/booking-no-show-review-status.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { PaymentService } from 'src/modules/payment/payment.service';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { toNumber } from 'src/common/helpers/number.helper';
import { createVietnamDateTime } from 'src/common/helpers/vietnam-time.helper';
import {
  assessCheckinLateness,
  assessCheckinLocation,
  CHECKIN_MAX_ACCURACY_METERS,
  CheckinAssessment,
  CheckinTimingPolicy,
  resolveCheckinTimingPolicy,
} from './booking-checkin.policy';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';

export const BOOKING_CHECKIN_QUEUE = 'bookingCheckinQueue';

export const CHECKIN_JOB = {
  REMIND: 'booking:checkin-remind',
  LATE_WARNING: 'booking:checkin-late-warning',
  AUTO_CANCEL: 'booking:checkin-auto-cancel',
  AUTO_CHECKOUT: 'booking:auto-checkout',
  SURCHARGE_TIMEOUT: 'booking:surcharge-timeout',
  SURCHARGE_RECEIPT_TIMEOUT: 'booking:surcharge-receipt-timeout',
  OVERTIME_REQUEST_TIMEOUT: 'booking:overtime-request-timeout',
} as const;

/**
 * Chờ khách xác nhận phần phát sinh — ngắn để tasker còn tại chỗ, còn khả năng
 * trao đổi trực tiếp và thu tiền mặt.
 */
export const SURCHARGE_CONFIRM_WINDOW_MS = 30 * 60_000;

/**
 * Lưới an toàn chống đơn kẹt khi tasker quên bấm "đã nhận tiền". Khách đã đồng ý
 * trả nên hết hạn thì mặc định coi như đã thu đủ.
 */
export const SURCHARGE_RECEIPT_WINDOW_MS = 12 * 60 * 60_000;

/** Chờ khách duyệt yêu cầu thêm giờ — phải đủ ngắn để tasker kịp checkout đúng giờ. */
export const OVERTIME_REQUEST_WINDOW_MS = 20 * 60_000;

// Các mốc lifecycle chưa nằm trong scope cấu hình của tab Vận hành.
const LATE_WARNING_MINUTES = 15; // cảnh báo ở T+15
const AUTO_CANCEL_MINUTES = 45; // hủy ở T+45
const AUTO_CHECKOUT_AFTER_END_MINUTES = 30; // nhắc checkout T_end+30
const LIFECYCLE_JOB_RETENTION_SECONDS = 7 * 24 * 60 * 60;

/** Vị trí + ảnh minh chứng tasker gửi lúc bấm check-in (xem CheckinDto). */
export interface CheckinLocationInput {
  currentLatitude?: number;
  currentLongitude?: number;
  accuracyMeters?: number;
  proofPhotoUrl?: string;
}

// Điểm cảnh báo
export const NO_SHOW_WARNING_POINTS = 3;

export interface CheckinJobData {
  bookingId: string;
}

export interface TaskerCheckinPolicy extends CheckinTimingPolicy {
  openBeforeMinutes: number;
  autoApproveRadiusMeters: number;
  maxAccuracyMeters: number;
  autoCancelAfterMinutes: number;
}
function checkinJobId(bookingId: string, kind: string): string {
  return `${bookingId}-${kind}`;
}

@Injectable()
export class BookingCheckinService {
  private readonly logger = new Logger(BookingCheckinService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue(BOOKING_CHECKIN_QUEUE) private readonly checkinQueue: Queue,
    private readonly notificationService: NotificationService,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly bookingSettlementService: BookingSettlementService,
    private readonly paymentService: PaymentService,
    private readonly voucherService: VouchersService,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  // ── Timeout xác nhận phụ phí phát sinh ─────────────────────────────────────
  async scheduleSurchargeTimeout(
    bookingId: string,
    delayMs: number,
  ): Promise<void> {
    await this.checkinQueue.add(
      CHECKIN_JOB.SURCHARGE_TIMEOUT,
      { bookingId },
      {
        delay: Math.max(delayMs, 0),
        jobId: checkinJobId(bookingId, 'surcharge-timeout'),
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async cancelSurchargeTimeout(bookingId: string): Promise<void> {
    await this.checkinQueue
      .remove(checkinJobId(bookingId, 'surcharge-timeout'))
      .catch(() => undefined);
  }

  // ── Timeout tasker xác nhận đã nhận tiền mặt phần phát sinh ────────────────
  async scheduleSurchargeReceiptTimeout(bookingId: string): Promise<void> {
    await this.checkinQueue.add(
      CHECKIN_JOB.SURCHARGE_RECEIPT_TIMEOUT,
      { bookingId },
      {
        delay: SURCHARGE_RECEIPT_WINDOW_MS,
        jobId: checkinJobId(bookingId, 'surcharge-receipt-timeout'),
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async cancelSurchargeReceiptTimeout(bookingId: string): Promise<void> {
    await this.checkinQueue
      .remove(checkinJobId(bookingId, 'surcharge-receipt-timeout'))
      .catch(() => undefined);
  }

  // ── Timeout khách duyệt yêu cầu thêm giờ ───────────────────────────────────
  async scheduleOvertimeRequestTimeout(bookingId: string): Promise<void> {
    await this.checkinQueue.add(
      CHECKIN_JOB.OVERTIME_REQUEST_TIMEOUT,
      { bookingId },
      {
        delay: OVERTIME_REQUEST_WINDOW_MS,
        jobId: checkinJobId(bookingId, 'overtime-request-timeout'),
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async cancelOvertimeRequestTimeout(bookingId: string): Promise<void> {
    await this.checkinQueue
      .remove(checkinJobId(bookingId, 'overtime-request-timeout'))
      .catch(() => undefined);
  }

  /**
   * Hết hạn chờ khách xác nhận phần phát sinh → hoàn thành đơn theo GIÁ GỐC (miễn
   * phần phát sinh) để đơn không kẹt. Ghi log để admin nắm được.
   */
  async handleSurchargeTimeout(bookingId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(BookingEntity);
      const booking = await bookingRepo
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.tasker', 'tasker')
        .leftJoinAndSelect('tasker.user', 'taskerUser')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
        .setLock('pessimistic_write', undefined, ['booking'])
        .where('booking.id = :bookingId', { bookingId })
        .getOne();

      if (
        !booking ||
        booking.status !== BookingStatus.IN_PROGRESS ||
        booking.surchargeStatus !== BookingSurchargeStatus.PENDING_CUSTOMER ||
        !booking.tasker
      ) {
        return;
      }

      const surcharge = Math.round(toNumber(booking.waitingFee));
      const actorUserId = booking.tasker.user?.id ?? bookingId;

      // Đơn ví: khách im lặng = mặc nhiên đồng ý (đã chấp nhận cơ chế lúc đặt đơn)
      // → tự trừ tiếp từ ví. Ví không đủ thì rơi xuống nhánh tranh chấp bên dưới.
      if (booking.paymentMethod === PaymentMethod.WALLET) {
        const previousTotalPrice = toNumber(booking.totalPrice);
        try {
          booking.totalPrice = previousTotalPrice + surcharge;
          await this.bookingWalletPaymentService.adjustEscrow(
            manager,
            booking,
            previousTotalPrice,
          );

          await this.bookingSettlementService.settleCompletedBooking(manager, {
            booking,
            tasker: booking.tasker,
            actorUserId,
            note: `Hết hạn xác nhận — tự động trừ ví phần phát sinh ${surcharge.toLocaleString('vi-VN')}đ`,
          });

          await this.notifySurchargeAutoCharged(booking, surcharge);
          return;
        } catch (error) {
          if (!(error instanceof BadRequestException)) throw error;
          // Ví không đủ số dư → khôi phục tổng gốc rồi xử lý như khách không trả.
          booking.totalPrice = previousTotalPrice;
          this.logger.warn(
            `Booking ${booking.bookingCode}: ví khách không đủ để tự trừ phần phát sinh → chuyển tranh chấp`,
          );
        }
      }

      // Đơn tiền mặt (tasker đã rời đi) hoặc ví không đủ → nền tảng ứng trả tasker.
      const result =
        await this.bookingSettlementService.settleDisputedSurcharge(manager, {
          booking,
          tasker: booking.tasker,
          actorUserId,
          reason: 'Khách không phản hồi trong thời hạn xác nhận phần phát sinh',
          note: 'Hết hạn xác nhận phát sinh — hoàn thành theo giá gốc, nền tảng ứng trả tasker',
        });

      this.logger.warn(
        `Booking ${booking.bookingCode} hết hạn xác nhận phát sinh — nền tảng ứng trả ${result.netPaid}đ cho tasker`,
      );

      await this.notifySurchargeDisputed(booking, surcharge, result.netPaid);
    });
  }

  /**
   * Tasker không bấm "đã nhận tiền" trong thời hạn. Khách đã đồng ý trả nên mặc
   * định coi như đã thu đủ và quyết toán — tránh đơn treo vô hạn.
   */
  async handleSurchargeReceiptTimeout(bookingId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const booking = await this.lockBookingForSurcharge(manager, bookingId);
      if (
        !booking ||
        booking.surchargeStatus !==
          BookingSurchargeStatus.PENDING_TASKER_CONFIRM ||
        !booking.tasker
      ) {
        return;
      }

      const surcharge = Math.round(toNumber(booking.waitingFee));
      await this.bookingSettlementService.settleCompletedBooking(manager, {
        booking,
        tasker: booking.tasker,
        actorUserId: booking.tasker.user?.id ?? bookingId,
        note: `Hết hạn xác nhận nhận tiền — mặc định đã thu đủ phần phát sinh ${surcharge.toLocaleString('vi-VN')}đ`,
        cashSurcharge:
          booking.paymentMethod === PaymentMethod.WALLET ? surcharge : 0,
      });

      this.logger.warn(
        `Booking ${booking.bookingCode}: tasker không xác nhận nhận tiền → tự quyết toán`,
      );
    });
  }

  /**
   * Khách không phản hồi yêu cầu thêm giờ → đánh dấu hết hạn, nhắc tasker checkout
   * đúng giờ vì phần làm thêm sẽ không được cam kết trước.
   */
  async handleOvertimeRequestTimeout(bookingId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const booking = await this.lockBookingForSurcharge(manager, bookingId);
      if (
        !booking ||
        booking.overtimeRequestStatus !== BookingOvertimeRequestStatus.PENDING
      ) {
        return;
      }

      booking.overtimeRequestStatus = BookingOvertimeRequestStatus.EXPIRED;
      booking.overtimeRespondedAt = new Date();
      await manager.getRepository(BookingEntity).save(booking);

      const taskerUserId = booking.tasker?.user?.id;
      if (taskerUserId) {
        await this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.BOOKING_OVERTIME_REJECTED,
          title: 'Khách chưa phản hồi yêu cầu thêm giờ',
          content: `Booking #${booking.bookingCode}: khách không phản hồi kịp. Hãy checkout đúng giờ đã đặt.`,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
        });
      }
    });
  }

  private async lockBookingForSurcharge(
    manager: EntityManager,
    bookingId: string,
  ): Promise<BookingEntity | null> {
    return manager
      .getRepository(BookingEntity)
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
      .setLock('pessimistic_write', undefined, ['booking'])
      .where('booking.id = :bookingId', { bookingId })
      .andWhere('booking.status = :status', {
        status: BookingStatus.IN_PROGRESS,
      })
      .getOne();
  }

  private async notifySurchargeAutoCharged(
    booking: BookingEntity,
    surcharge: number,
  ): Promise<void> {
    const taskerUserId = booking.tasker?.user?.id;
    const customerUserId = booking.customer?.user?.id;
    await Promise.all([
      taskerUserId &&
        this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.BOOKING_COMPLETED,
          title: 'Đơn đã hoàn thành',
          content: `Booking #${booking.bookingCode} đã thu đủ phần phát sinh ${surcharge.toLocaleString('vi-VN')}đ từ ví khách.`,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
        }),
      customerUserId &&
        this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.BOOKING_COMPLETED,
          title: 'Đã tự động trừ phần phát sinh',
          content:
            `Bạn chưa phản hồi nên booking #${booking.bookingCode} đã được ` +
            `trừ ${surcharge.toLocaleString('vi-VN')}đ phát sinh từ ví và hoàn thành.`,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
        }),
    ]);
  }

  private async notifySurchargeDisputed(
    booking: BookingEntity,
    surcharge: number,
    netPaid: number,
  ): Promise<void> {
    const taskerUserId = booking.tasker?.user?.id;
    const customerUserId = booking.customer?.user?.id;
    await Promise.all([
      taskerUserId &&
        this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.BOOKING_SURCHARGE_DISPUTED,
          title: 'Khách chưa thanh toán phần phát sinh',
          content:
            `Booking #${booking.bookingCode}: khách không phản hồi phần phát sinh ` +
            `${surcharge.toLocaleString('vi-VN')}đ. ` +
            (netPaid > 0
              ? `Nền tảng đã ứng ${netPaid.toLocaleString('vi-VN')}đ vào ví bạn.`
              : 'Bộ phận hỗ trợ sẽ liên hệ với bạn.'),
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
        }),
      customerUserId &&
        this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.BOOKING_SURCHARGE_DISPUTED,
          title: 'Chưa thanh toán phần phát sinh',
          content:
            `Booking #${booking.bookingCode} đã hoàn thành theo giá gốc. ` +
            `Khoản phát sinh ${surcharge.toLocaleString('vi-VN')}đ đang được xem xét.`,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
        }),
    ]);
  }

  // ── Schedule jobs khi booking CONFIRMED ────────────────────────────────────
  async scheduleCheckinJobs(booking: BookingEntity): Promise<void> {
    const scheduledStart = this.resolveScheduledStart(booking);
    if (!scheduledStart) return;

    const now = Date.now();
    const startMs = scheduledStart.getTime();
    const timingPolicy = this.getTimingPolicy(booking, scheduledStart);
    const endMs =
      this.resolveScheduledEnd(booking)?.getTime() ??
      startMs + toNumber(booking.durationHours) * 3_600_000;

    const data: CheckinJobData = { bookingId: booking.id };

    const arrivalStatuses = [
      BookingStatus.CONFIRMED,
      BookingStatus.TASKER_ON_THE_WAY,
    ];
    const canScheduleArrivalJobs = arrivalStatuses.includes(booking.status);
    const canScheduleCheckoutJob = [
      ...arrivalStatuses,
      BookingStatus.CHECKED_IN,
      BookingStatus.IN_PROGRESS,
    ].includes(booking.status);

    const jobs: Array<{
      name: string;
      delayMs: number;
      jobId: string;
      runIfOverdue: boolean;
      enabled: boolean;
    }> = [
      {
        name: CHECKIN_JOB.REMIND,
        delayMs: startMs - 60 * 60_000 - now,
        jobId: checkinJobId(booking.id, 'remind'),
        runIfOverdue: false,
        enabled: canScheduleArrivalJobs,
      },
      {
        name: CHECKIN_JOB.AUTO_CANCEL,
        delayMs: startMs + AUTO_CANCEL_MINUTES * 60_000 - now,
        jobId: checkinJobId(booking.id, 'auto-cancel'),
        runIfOverdue: true,
        enabled: canScheduleArrivalJobs,
      },
      {
        name: CHECKIN_JOB.AUTO_CHECKOUT,
        delayMs: endMs + AUTO_CHECKOUT_AFTER_END_MINUTES * 60_000 - now,
        jobId: checkinJobId(booking.id, 'auto-checkout'),
        runIfOverdue: true,
        enabled: canScheduleCheckoutJob,
      },
    ];

    if (canScheduleArrivalJobs && !timingPolicy.exemptFromLatePenalty) {
      jobs.push({
        name: CHECKIN_JOB.LATE_WARNING,
        delayMs: startMs + LATE_WARNING_MINUTES * 60_000 - now,
        jobId: checkinJobId(booking.id, 'late-warning'),
        runIfOverdue: true,
        enabled: true,
      });
    }

    await Promise.all(
      jobs
        .filter((job) => job.enabled)
        .filter((job) => job.delayMs > 0 || job.runIfOverdue)
        .map((j) =>
          this.checkinQueue.add(j.name, data, {
            delay: Math.max(j.delayMs, 0),
            jobId: j.jobId,
            // Giữ job đã chạy một thời gian để reconciliation không enqueue
            // lại cùng mốc và gửi thông báo lặp cho booking vẫn đang active.
            removeOnComplete: { age: LIFECYCLE_JOB_RETENTION_SECONDS },
            removeOnFail: false,
          }),
        ),
    );

    this.logger.log(`Đã schedule checkin jobs cho booking=${booking.id}`);
  }

  async cancelCheckinJobs(bookingId: string): Promise<void> {
    await Promise.allSettled([
      this.checkinQueue.remove(checkinJobId(bookingId, 'remind')),
      this.checkinQueue.remove(checkinJobId(bookingId, 'late-warning')),
      this.checkinQueue.remove(checkinJobId(bookingId, 'auto-cancel')),
      this.checkinQueue.remove(checkinJobId(bookingId, 'auto-checkout')),
    ]);
  }

  /**
   * Check-in thành công chỉ đóng các mốc "chưa đến nơi". Giữ lại auto-checkout
   * để booking IN_PROGRESS vẫn được nhắc và đưa vào hàng chờ vận hành T_end+30.
   */
  async cancelArrivalJobs(bookingId: string): Promise<void> {
    await Promise.allSettled([
      this.checkinQueue.remove(checkinJobId(bookingId, 'remind')),
      this.checkinQueue.remove(checkinJobId(bookingId, 'late-warning')),
      this.checkinQueue.remove(checkinJobId(bookingId, 'auto-cancel')),
    ]);
  }

  // ── Validate thời gian + thực hiện check-in ─────────────────────────────────
  async performCheckin(
    userId: string,
    bookingId: string,
    manager: EntityManager,
    checkinInput: CheckinLocationInput = {},
  ): Promise<CheckinAssessment> {
    const bookingRepo = manager.getRepository(BookingEntity);

    const booking = await bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('b.addressRef', 'addressRef')
      .setLock('pessimistic_write', undefined, ['b'])
      .where('b.id = :bookingId', { bookingId })
      .getOne();

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
    }
    if (booking.tasker?.user?.id !== userId) {
      throw new NotFoundException(
        'Booking không tồn tại hoặc không thuộc tasker hiện tại',
      );
    }

    if (booking.status === BookingStatus.CHECKED_IN) {
      return {
        minutesLate: 0,
        warningPoints: 0,
        alreadyCheckedIn: true,
      };
    }

    if (booking.status !== BookingStatus.TASKER_ON_THE_WAY) {
      throw new BadRequestException(
        'Chỉ booking ở TASKER_ON_THE_WAY mới có thể check-in',
      );
    }

    const scheduledStart = this.resolveScheduledStart(booking);
    if (!scheduledStart) {
      throw new BadRequestException('Booking thiếu thông tin lịch hẹn');
    }

    const now = new Date();
    const minutesDiff = (now.getTime() - scheduledStart.getTime()) / 60_000;
    const operationPolicy =
      await this.systemConfigService.getCheckinOperationPolicy(manager);

    if (minutesDiff < -operationPolicy.openBeforeMinutes) {
      const remaining = Math.ceil(
        -minutesDiff - operationPolicy.openBeforeMinutes,
      );
      throw new BadRequestException(
        `Chưa đến cửa sổ check-in. Còn ${remaining} phút nữa.`,
      );
    }

    if (minutesDiff > AUTO_CANCEL_MINUTES) {
      throw new BadRequestException(
        'Đã quá hạn check-in. Booking có thể đang bị hủy tự động.',
      );
    }

    // ── Chốt vị trí theo bán kính tự duyệt đang cấu hình quanh địa chỉ khách ──
    // GPS thiếu (từ chối quyền định vị) được đối xử như đang ở xa: muốn
    // check-in phải kèm ảnh minh chứng, và đơn bị gắn cờ cho admin theo dõi.
    const { currentLatitude, currentLongitude, accuracyMeters, proofPhotoUrl } =
      checkinInput;
    const addressTargetLatitude =
      booking.addressRef?.latitude != null
        ? Number(booking.addressRef.latitude)
        : null;
    const addressTargetLongitude =
      booking.addressRef?.longitude != null
        ? Number(booking.addressRef.longitude)
        : null;
    const bookingTargetLatitude =
      booking.latitude != null ? Number(booking.latitude) : null;
    const bookingTargetLongitude =
      booking.longitude != null ? Number(booking.longitude) : null;
    const hasAddressTarget =
      addressTargetLatitude !== null &&
      addressTargetLongitude !== null &&
      Number.isFinite(addressTargetLatitude) &&
      Number.isFinite(addressTargetLongitude);
    const hasBookingTarget =
      bookingTargetLatitude !== null &&
      bookingTargetLongitude !== null &&
      Number.isFinite(bookingTargetLatitude) &&
      Number.isFinite(bookingTargetLongitude);
    const targetLatitude = hasAddressTarget
      ? addressTargetLatitude
      : hasBookingTarget
        ? bookingTargetLatitude
        : null;
    const targetLongitude = hasAddressTarget
      ? addressTargetLongitude
      : hasBookingTarget
        ? bookingTargetLongitude
        : null;
    const hasTarget = targetLatitude !== null && targetLongitude !== null;
    const {
      distanceMeters,
      isFar: isFarCheckin,
      reviewReason: locationReviewReason,
    } = assessCheckinLocation({
      currentLatitude,
      currentLongitude,
      accuracyMeters,
      addressLatitude: targetLatitude,
      addressLongitude: targetLongitude,
      maxDistanceMeters: operationPolicy.autoApproveRadiusMeters,
    });

    if (isFarCheckin && !proofPhotoUrl) {
      throw new BadRequestException(
        locationReviewReason === 'TARGET_UNAVAILABLE'
          ? 'Địa chỉ booking chưa có tọa độ để xác minh tự động. Vui lòng chụp ảnh hiện trường để check-in; Admin sẽ kiểm tra thủ công.'
          : locationReviewReason === 'LOW_ACCURACY'
            ? accuracyMeters === undefined
              ? 'Không xác định được độ chính xác GPS. Vui lòng lấy lại vị trí, hoặc chụp ảnh hiện trường để Admin xác minh.'
              : `Tín hiệu GPS đang có sai số ~${Math.round(accuracyMeters)}m (cho phép tối đa ${CHECKIN_MAX_ACCURACY_METERS}m). Vui lòng lấy lại vị trí, hoặc chụp ảnh hiện trường để Admin xác minh.`
            : locationReviewReason === 'OUTSIDE_RADIUS' &&
                distanceMeters !== null
              ? 'Vị trí hiện tại chưa đúng, vui lòng kiểm tra lại hoặc gửi ảnh minh chứng để tiếp tục.'
              : 'Không lấy được vị trí của bạn. Vui lòng bật định vị, hoặc chụp ảnh minh chứng để check-in.',
      );
    }

    const timingPolicy = this.getTimingPolicy(booking, scheduledStart);
    const { minutesLate, warningPoints } = assessCheckinLateness(
      minutesDiff,
      timingPolicy,
    );

    // distanceMeters !== null ⇒ chắc chắn có GPS hợp lệ (xem assessCheckinLocation).
    const hasGps =
      currentLatitude !== undefined &&
      currentLongitude !== undefined &&
      Number.isFinite(currentLatitude) &&
      Number.isFinite(currentLongitude);
    const normalizedAccuracy =
      hasGps &&
      accuracyMeters !== undefined &&
      Number.isFinite(accuracyMeters) &&
      accuracyMeters >= 0
        ? Math.round(accuracyMeters * 10) / 10
        : null;
    const verificationSource = !hasTarget
      ? BookingCheckinVerificationSource.TARGET_MISSING_WITH_PROOF
      : !hasGps
        ? BookingCheckinVerificationSource.NO_GPS_WITH_PROOF
        : locationReviewReason === 'LOW_ACCURACY'
          ? BookingCheckinVerificationSource.GPS_LOW_ACCURACY_WITH_PROOF
          : isFarCheckin
            ? BookingCheckinVerificationSource.GPS_WITH_PROOF
            : BookingCheckinVerificationSource.GPS;
    const needsReview = isFarCheckin;

    booking.status = BookingStatus.CHECKED_IN;
    booking.checkedInAt = now;
    booking.checkinLatitude = hasGps ? currentLatitude : null;
    booking.checkinLongitude = hasGps ? currentLongitude : null;
    booking.checkinAccuracyMeters = normalizedAccuracy;
    booking.checkinTargetLatitude = targetLatitude;
    booking.checkinTargetLongitude = targetLongitude;
    booking.checkinDistanceMeters =
      distanceMeters !== null ? Math.round(distanceMeters * 10) / 10 : null;
    booking.checkinFar = needsReview;
    booking.checkinProofPhotoUrl = needsReview ? (proofPhotoUrl ?? null) : null;
    booking.checkinVerificationSource = verificationSource;
    booking.checkinReviewStatus = needsReview
      ? BookingCheckinReviewStatus.PENDING_REVIEW
      : BookingCheckinReviewStatus.NOT_REQUIRED;
    booking.checkinReviewedByAdmin = null;
    booking.checkinReviewedAt = null;
    booking.checkinReviewReason = null;
    const saved = await bookingRepo.save(booking);

    await manager.getRepository(BookingStatusLogEntity).save(
      manager.getRepository(BookingStatusLogEntity).create({
        booking: saved,
        oldStatus: BookingStatus.TASKER_ON_THE_WAY,
        newStatus: BookingStatus.CHECKED_IN,
        changedByUser: { id: userId } as UserEntity,
        note: [
          minutesLate > 0
            ? `Tasker check-in muộn ${Math.round(minutesLate)} phút`
            : 'Tasker đã đến nơi',
          needsReview
            ? !hasTarget
              ? 'địa chỉ thiếu tọa độ, có ảnh minh chứng; chờ Admin xác minh'
              : locationReviewReason === 'LOW_ACCURACY'
                ? `GPS sai số ${normalizedAccuracy === null ? 'không xác định' : `~${Math.round(normalizedAccuracy)}m`}, có ảnh minh chứng; chờ Admin xác minh`
                : distanceMeters !== null
                  ? `check-in xa ~${Math.round(distanceMeters)}m, có ảnh minh chứng`
                  : 'check-in không có GPS, có ảnh minh chứng; chờ Admin duyệt'
            : null,
        ]
          .filter(Boolean)
          .join(' — '),
        cancellationFee: 0,
        refundAmount: 0,
      }),
    );

    if (warningPoints > 0 && booking.tasker?.id) {
      await manager
        .getRepository(TaskerEntity)
        .increment({ id: booking.tasker.id }, 'warningPoints', warningPoints);
      this.logger.warn(
        `Tasker ${booking.tasker.id} +${warningPoints} điểm muộn (booking=${bookingId})`,
      );
    }

    return { minutesLate, warningPoints };
  }

  private resolveScheduledStart(booking: BookingEntity): Date | null {
    if (
      booking.scheduledStart &&
      !Number.isNaN(booking.scheduledStart.getTime())
    ) {
      return booking.scheduledStart;
    }

    return this.resolveVietnamDateTime(
      booking.scheduledStartDate,
      booking.scheduledStartTime,
    );
  }

  getTimingPolicy(
    booking: BookingEntity,
    scheduledStart = this.resolveScheduledStart(booking),
  ): CheckinTimingPolicy {
    if (!scheduledStart) {
      return { exemptFromLatePenalty: false, lateGraceMinutes: 5 };
    }

    return resolveCheckinTimingPolicy({
      source: booking.source,
      scheduledStart,
      createdAt: booking.createdAt,
    });
  }

  async getTaskerCheckinPolicy(
    manager: EntityManager,
    booking: BookingEntity,
  ): Promise<TaskerCheckinPolicy> {
    const operationPolicy =
      await this.systemConfigService.getCheckinOperationPolicy(manager);
    return {
      ...this.getTimingPolicy(booking),
      openBeforeMinutes: operationPolicy.openBeforeMinutes,
      autoApproveRadiusMeters: operationPolicy.autoApproveRadiusMeters,
      maxAccuracyMeters: CHECKIN_MAX_ACCURACY_METERS,
      autoCancelAfterMinutes: AUTO_CANCEL_MINUTES,
    };
  }

  private resolveScheduledEnd(booking: BookingEntity): Date | null {
    if (booking.scheduledEnd && !Number.isNaN(booking.scheduledEnd.getTime())) {
      return booking.scheduledEnd;
    }

    return this.resolveVietnamDateTime(
      booking.scheduledEndDate,
      booking.scheduledEndTime,
    );
  }

  private resolveVietnamDateTime(
    date?: string | null,
    time?: string | null,
  ): Date | null {
    if (!date || !time) return null;

    const resolved = createVietnamDateTime(date, time.slice(0, 5));
    return Number.isNaN(resolved.getTime()) ? null : resolved;
  }

  // ── Job: Nhắc nhở T-60 ──────────────────────────────────────────────────────
  async handleRemind(bookingId: string): Promise<void> {
    const booking = await this.findBookingWithParties(bookingId);
    if (
      !booking ||
      ![BookingStatus.CONFIRMED, BookingStatus.TASKER_ON_THE_WAY].includes(
        booking.status,
      )
    )
      return;

    const taskerUserId = booking.tasker?.user?.id;
    if (!taskerUserId) return;

    await this.notificationService.notify({
      userId: taskerUserId,
      type: NotificationType.SYSTEM,
      title: 'Nhắc nhở: Sắp đến lịch làm việc',
      content: `Booking #${booking.bookingCode} bắt đầu sau 1 tiếng. Hãy chuẩn bị và di chuyển đúng giờ.`,
      referenceId: booking.id,
      referenceType: NotificationRefType.BOOKING,
      dedupeKey: `booking:${bookingId}:checkin-remind`,
    });
  }

  // ── Job: Cảnh báo muộn T+15 ─────────────────────────────────────────────────
  async handleLateWarning(bookingId: string): Promise<void> {
    const booking = await this.findBookingWithParties(bookingId);
    if (!booking || booking.status !== BookingStatus.TASKER_ON_THE_WAY) return;
    if (this.getTimingPolicy(booking).exemptFromLatePenalty) return;

    const taskerUserId = booking.tasker?.user?.id;
    const customerUserId = booking.customer?.user?.id;

    await Promise.all([
      taskerUserId &&
        this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.SYSTEM,
          title: 'Bạn đang đến muộn',
          content: `Booking #${booking.bookingCode} đã bắt đầu 15 phút trước. Hãy check-in ngay hoặc đơn sẽ bị hủy sau 30 phút.`,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
          dedupeKey: `booking:${bookingId}:late-warning:tasker`,
        }),
      customerUserId &&
        this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.SYSTEM,
          title: 'Nhân viên chưa đến',
          content: `Nhân viên cho booking #${booking.bookingCode} chưa check-in. Nếu sau 30 phút không có mặt, đơn sẽ tự hủy và hoàn tiền 100%.`,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
          dedupeKey: `booking:${bookingId}:late-warning:customer`,
        }),
    ]);
  }

  // ── Job: Tự động hủy T+45 ───────────────────────────────────────────────────
  async handleAutoCancel(bookingId: string): Promise<void> {
    const booking = await this.findBookingWithParties(bookingId);
    if (!booking) return;

    const cancelableStatuses = [
      BookingStatus.CONFIRMED,
      BookingStatus.TASKER_ON_THE_WAY,
    ];
    if (!cancelableStatuses.includes(booking.status)) return;

    const outcome = await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(BookingEntity);
      const locked = await bookingRepo
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.tasker', 'tasker')
        .leftJoinAndSelect('tasker.user', 'taskerUser')
        .leftJoinAndSelect('b.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .setLock('pessimistic_write', undefined, ['b'])
        .where('b.id = :bookingId', { bookingId })
        .getOne();

      if (!locked || !cancelableStatuses.includes(locked.status)) return null;

      const oldStatus = locked.status;
      const now = new Date();
      locked.status = BookingStatus.CANCELLED;
      locked.cancelledAt = now;
      locked.cancelledBy = CancelledBy.SYSTEM;
      locked.noShowReviewStatus = BookingNoShowReviewStatus.PENDING_REVIEW;
      locked.noShowDetectedAt = now;
      locked.noShowExplanation = null;
      locked.noShowExplanationSubmittedAt = null;
      locked.noShowReviewedByAdmin = null;
      locked.noShowReviewedAt = null;
      locked.noShowReviewReason = null;
      locked.noShowWarningPoints = 0;
      await bookingRepo.save(locked);

      await this.voucherService.releaseReservationForBooking(
        manager,
        locked.id,
      );
      const refundAmount = await this.bookingWalletPaymentService.refundEscrow(
        manager,
        locked,
        'hệ thống hủy đơn do Tasker không check-in',
      );
      await bookingRepo.update(
        { id: locked.id },
        { noShowRefundAmount: refundAmount },
      );
      const latestPayment = await this.paymentService.findLatestByBookingId(
        manager,
        locked.id,
      );

      await manager.getRepository(BookingStatusLogEntity).save(
        manager.getRepository(BookingStatusLogEntity).create({
          booking: locked,
          oldStatus,
          newStatus: BookingStatus.CANCELLED,
          note:
            'Tự động hủy: Tasker không check-in sau 45 phút — ' +
            'đã mở hàng chờ Admin review no-show',
          cancelledBy: CancelledBy.SYSTEM,
          cancelReason: 'Tasker không check-in sau 45 phút',
          cancellationFee: 0,
          refundAmount,
          payment: latestPayment ?? null,
        }),
      );

      return {
        bookingCode: locked.bookingCode,
        taskerUserId: locked.tasker?.user?.id,
        customerUserId: locked.customer?.user?.id,
        refundAmount,
      };
    });

    // Một worker khác có thể đã xử lý booking sau lần đọc đầu tiên.
    if (!outcome) return;

    await Promise.all([
      outcome.customerUserId &&
        this.notificationService.notify({
          userId: outcome.customerUserId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Đơn đã hủy và hoàn tiền',
          content:
            `Tasker không check-in đúng giờ cho booking #${outcome.bookingCode}. ` +
            (outcome.refundAmount > 0
              ? `${outcome.refundAmount.toLocaleString('vi-VN')}đ đã được hoàn vào ví.`
              : 'Bạn không bị tính phí cho đơn này.') +
            ' CleanZ đang review no-show.',
          referenceId: bookingId,
          referenceType: NotificationRefType.BOOKING,
          dedupeKey: `booking:${bookingId}:no-show-customer`,
        }),
      outcome.taskerUserId &&
        this.notificationService.notify({
          userId: outcome.taskerUserId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Booking chờ review no-show',
          content:
            `Booking #${outcome.bookingCode} đã bị hủy vì chưa check-in sau 45 phút. ` +
            `Bạn chưa bị cộng điểm; hãy gửi giải trình trước khi Admin kết luận.`,
          referenceId: bookingId,
          referenceType: NotificationRefType.BOOKING,
          dedupeKey: `booking:${bookingId}:no-show-tasker`,
        }),
    ]);
  }

  // ── Job: Nhắc checkout T_end+30 ─────────────────────────────────────────────
  async handleAutoCheckout(bookingId: string): Promise<void> {
    const booking = await this.findBookingWithParties(bookingId);
    if (!booking || booking.status !== BookingStatus.IN_PROGRESS) return;
    // Đã checkout, đang chờ xác nhận phát sinh → không nhắc "bấm hoàn thành".
    if (isSurchargePending(booking.surchargeStatus)) return;

    const taskerUserId = booking.tasker?.user?.id;
    const customerUserId = booking.customer?.user?.id;

    await Promise.all([
      taskerUserId &&
        this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.SYSTEM,
          title: 'Nhắc: Bấm Hoàn thành',
          content: `Booking #${booking.bookingCode} đã qua giờ dự kiến kết thúc. Hãy bấm "Hoàn thành" nếu bạn đã xong việc.`,
          referenceId: bookingId,
          referenceType: NotificationRefType.BOOKING,
          dedupeKey: `booking:${bookingId}:checkout-overdue:tasker`,
        }),
      customerUserId &&
        this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.SYSTEM,
          title: 'Xác nhận hoàn thành',
          content: `Booking #${booking.bookingCode} đã qua giờ dự kiến kết thúc. Vui lòng xác nhận nếu công việc đã hoàn tất.`,
          referenceId: bookingId,
          referenceType: NotificationRefType.BOOKING,
          dedupeKey: `booking:${bookingId}:checkout-overdue:customer`,
        }),
    ]);
  }

  private findBookingWithParties(
    bookingId: string,
  ): Promise<BookingEntity | null> {
    return this.dataSource.getRepository(BookingEntity).findOne({
      where: { id: bookingId },
      relations: ['tasker', 'tasker.user', 'customer', 'customer.user'],
    });
  }
}
