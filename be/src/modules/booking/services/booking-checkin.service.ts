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
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { toNumber } from 'src/common/helpers/number.helper';
import { createVietnamDateTime } from 'src/common/helpers/vietnam-time.helper';
import {
  assessCheckinLateness,
  assessCheckinLocation,
  CheckinAssessment,
  CheckinTimingPolicy,
  resolveCheckinTimingPolicy,
} from './booking-checkin.policy';

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

// Cửa sổ thời gian (phút)
const CHECKIN_OPEN_BEFORE_MINUTES = 3000; // mở từ T-30
const LATE_WARNING_MINUTES = 15; // cảnh báo ở T+15
const AUTO_CANCEL_MINUTES = 45; // hủy ở T+45
const AUTO_CHECKOUT_AFTER_END_MINUTES = 30; // nhắc checkout T_end+30

/** Vị trí + ảnh minh chứng tasker gửi lúc bấm check-in (xem CheckinDto). */
export interface CheckinLocationInput {
  currentLatitude?: number;
  currentLongitude?: number;
  proofPhotoUrl?: string;
}

// Điểm cảnh báo
const WARN_NO_SHOW = 3; // không check-in

export interface CheckinJobData {
  bookingId: string;
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

    const jobs: Array<{ name: string; delayMs: number; jobId: string }> = [
      {
        name: CHECKIN_JOB.REMIND,
        delayMs: startMs - 60 * 60_000 - now,
        jobId: checkinJobId(booking.id, 'remind'),
      },
      {
        name: CHECKIN_JOB.AUTO_CANCEL,
        delayMs: startMs + AUTO_CANCEL_MINUTES * 60_000 - now,
        jobId: checkinJobId(booking.id, 'auto-cancel'),
      },
      {
        name: CHECKIN_JOB.AUTO_CHECKOUT,
        delayMs: endMs + AUTO_CHECKOUT_AFTER_END_MINUTES * 60_000 - now,
        jobId: checkinJobId(booking.id, 'auto-checkout'),
      },
    ];

    if (!timingPolicy.exemptFromLatePenalty) {
      jobs.push({
        name: CHECKIN_JOB.LATE_WARNING,
        delayMs: startMs + LATE_WARNING_MINUTES * 60_000 - now,
        jobId: checkinJobId(booking.id, 'late-warning'),
      });
    }

    await Promise.all(
      jobs
        .filter((j) => j.delayMs > 0)
        .map((j) =>
          this.checkinQueue.add(j.name, data, {
            delay: j.delayMs,
            jobId: j.jobId,
            removeOnComplete: true,
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

    if (minutesDiff < -CHECKIN_OPEN_BEFORE_MINUTES) {
      const remaining = Math.ceil(-minutesDiff - CHECKIN_OPEN_BEFORE_MINUTES);
      throw new BadRequestException(
        `Chưa đến cửa sổ check-in. Còn ${remaining} phút nữa.`,
      );
    }

    if (minutesDiff > AUTO_CANCEL_MINUTES) {
      throw new BadRequestException(
        'Đã quá hạn check-in. Booking có thể đang bị hủy tự động.',
      );
    }

    // ── Chốt vị trí: phải ở trong bán kính 50m quanh địa chỉ khách ──────────
    // GPS thiếu (từ chối quyền định vị) được đối xử như đang ở xa: muốn
    // check-in phải kèm ảnh minh chứng, và đơn bị gắn cờ cho admin theo dõi.
    const { currentLatitude, currentLongitude, proofPhotoUrl } = checkinInput;
    const { distanceMeters, isFar: isFarCheckin } = assessCheckinLocation({
      currentLatitude,
      currentLongitude,
      addressLatitude:
        booking.addressRef?.latitude != null
          ? toNumber(booking.addressRef.latitude)
          : null,
      addressLongitude:
        booking.addressRef?.longitude != null
          ? toNumber(booking.addressRef.longitude)
          : null,
    });

    if (isFarCheckin && !proofPhotoUrl) {
      throw new BadRequestException(
        distanceMeters !== null
          ? `Hãy chụp ảnh địa chỉ để xác minh`
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
    booking.status = BookingStatus.CHECKED_IN;
    booking.checkedInAt = now;
    booking.checkinLatitude = hasGps ? currentLatitude : null;
    booking.checkinLongitude = hasGps ? currentLongitude : null;
    booking.checkinDistanceMeters =
      distanceMeters !== null ? Math.round(distanceMeters * 10) / 10 : null;
    booking.checkinFar = isFarCheckin;
    booking.checkinProofPhotoUrl = isFarCheckin
      ? (proofPhotoUrl ?? null)
      : null;
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
          isFarCheckin
            ? distanceMeters !== null
              ? `check-in xa ~${Math.round(distanceMeters)}m, có ảnh minh chứng`
              : 'check-in không có GPS, có ảnh minh chứng'
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
        }),
      customerUserId &&
        this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.SYSTEM,
          title: 'Nhân viên chưa đến',
          content: `Nhân viên cho booking #${booking.bookingCode} chưa check-in. Nếu sau 30 phút không có mặt, đơn sẽ tự hủy và hoàn tiền 100%.`,
          referenceId: booking.id,
          referenceType: NotificationRefType.BOOKING,
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

    await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(BookingEntity);
      const locked = await bookingRepo
        .createQueryBuilder('b')
        .setLock('pessimistic_write', undefined, ['b'])
        .where('b.id = :bookingId', { bookingId })
        .getOne();

      if (!locked || !cancelableStatuses.includes(locked.status)) return;

      locked.status = BookingStatus.CANCELLED;
      locked.cancelledAt = new Date();
      locked.cancelledBy = CancelledBy.SYSTEM;
      await bookingRepo.save(locked);

      await this.bookingWalletPaymentService.refundEscrow(
        manager,
        locked,
        'hệ thống hủy đơn quá hạn check-in',
      );

      await manager.getRepository(BookingStatusLogEntity).save(
        manager.getRepository(BookingStatusLogEntity).create({
          booking: locked,
          oldStatus: booking.status,
          newStatus: BookingStatus.CANCELLED,
          note: 'Tự động hủy: tasker không check-in sau 45 phút',
          cancellationFee: 0,
          refundAmount: 0,
        }),
      );

      if (booking.tasker?.id) {
        await manager
          .getRepository(TaskerEntity)
          .increment({ id: booking.tasker.id }, 'warningPoints', WARN_NO_SHOW);
        this.logger.warn(
          `Tasker ${booking.tasker.id} +${WARN_NO_SHOW} điểm no-show (booking=${bookingId})`,
        );
      }
    });

    const taskerUserId = booking.tasker?.user?.id;
    const customerUserId = booking.customer?.user?.id;

    await Promise.all([
      customerUserId &&
        this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Đơn bị hủy tự động',
          content: `Nhân viên không đến đúng giờ cho booking #${booking.bookingCode}. Bạn sẽ được hoàn tiền 100%.`,
          referenceId: bookingId,
          referenceType: NotificationRefType.BOOKING,
        }),
      taskerUserId &&
        this.notificationService.notify({
          userId: taskerUserId,
          type: NotificationType.BOOKING_CANCELLED,
          title: 'Đơn bị hủy do không check-in',
          content: `Booking #${booking.bookingCode} đã bị hủy tự động vì không check-in đúng giờ. Bạn bị cộng ${WARN_NO_SHOW} điểm cảnh báo.`,
          referenceId: bookingId,
          referenceType: NotificationRefType.BOOKING,
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
        }),
      customerUserId &&
        this.notificationService.notify({
          userId: customerUserId,
          type: NotificationType.SYSTEM,
          title: 'Xác nhận hoàn thành',
          content: `Booking #${booking.bookingCode} đã qua giờ dự kiến kết thúc. Vui lòng xác nhận nếu công việc đã hoàn tất.`,
          referenceId: bookingId,
          referenceType: NotificationRefType.BOOKING,
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
