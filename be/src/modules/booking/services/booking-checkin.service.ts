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
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { toNumber } from 'src/common/helpers/number.helper';
import { createVietnamDateTime } from 'src/common/helpers/vietnam-time.helper';

export const BOOKING_CHECKIN_QUEUE = 'bookingCheckinQueue';

export const CHECKIN_JOB = {
  REMIND: 'booking:checkin-remind',
  LATE_WARNING: 'booking:checkin-late-warning',
  AUTO_CANCEL: 'booking:checkin-auto-cancel',
  AUTO_CHECKOUT: 'booking:auto-checkout',
} as const;

// Cửa sổ thời gian (phút)
const CHECKIN_OPEN_BEFORE_MINUTES = 3000; // mở từ T-30
const LATE_WARNING_MINUTES = 15; // cảnh báo ở T+15
const AUTO_CANCEL_MINUTES = 45; // hủy ở T+45
const AUTO_CHECKOUT_AFTER_END_MINUTES = 30; // nhắc checkout T_end+30

// Điểm cảnh báo
const WARN_LATE_MINOR = 1; // muộn 1-15 phút
const WARN_LATE_MAJOR = 2; // muộn >15 phút
const WARN_NO_SHOW = 3; // không check-in

export interface CheckinJobData {
  bookingId: string;
}

@Injectable()
export class BookingCheckinService {
  private readonly logger = new Logger(BookingCheckinService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue(BOOKING_CHECKIN_QUEUE) private readonly checkinQueue: Queue,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Schedule jobs khi booking CONFIRMED ────────────────────────────────────
  async scheduleCheckinJobs(booking: BookingEntity): Promise<void> {
    const scheduledStart = this.resolveScheduledStart(booking);
    if (!scheduledStart) return;

    const now = Date.now();
    const startMs = scheduledStart.getTime();
    const endMs =
      this.resolveScheduledEnd(booking)?.getTime() ??
      startMs + toNumber(booking.durationHours) * 3_600_000;

    const data: CheckinJobData = { bookingId: booking.id };

    const jobs: Array<{ name: string; delayMs: number; jobId: string }> = [
      {
        name: CHECKIN_JOB.REMIND,
        delayMs: startMs - 60 * 60_000 - now,
        jobId: `${booking.id}:remind`,
      },
      {
        name: CHECKIN_JOB.LATE_WARNING,
        delayMs: startMs + LATE_WARNING_MINUTES * 60_000 - now,
        jobId: `${booking.id}:late-warning`,
      },
      {
        name: CHECKIN_JOB.AUTO_CANCEL,
        delayMs: startMs + AUTO_CANCEL_MINUTES * 60_000 - now,
        jobId: `${booking.id}:auto-cancel`,
      },
      {
        name: CHECKIN_JOB.AUTO_CHECKOUT,
        delayMs: endMs + AUTO_CHECKOUT_AFTER_END_MINUTES * 60_000 - now,
        jobId: `${booking.id}:auto-checkout`,
      },
    ];

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
      this.checkinQueue.remove(`${bookingId}:remind`),
      this.checkinQueue.remove(`${bookingId}:late-warning`),
      this.checkinQueue.remove(`${bookingId}:auto-cancel`),
      this.checkinQueue.remove(`${bookingId}:auto-checkout`),
    ]);
  }

  // ── Validate thời gian + thực hiện check-in ─────────────────────────────────
  async performCheckin(
    userId: string,
    bookingId: string,
    manager: EntityManager,
  ): Promise<{ minutesLate: number; warningPoints: number }> {
    const bookingRepo = manager.getRepository(BookingEntity);

    const booking = await bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .setLock('pessimistic_write', undefined, ['b'])
      .where('b.id = :bookingId', { bookingId })
      .getOne();

    if (!booking) {
      throw new NotFoundException('Booking không tồn tại');
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

    const minutesLate = Math.max(0, minutesDiff);
    const warningPoints =
      minutesLate > 15
        ? WARN_LATE_MAJOR
        : minutesLate > 0
          ? WARN_LATE_MINOR
          : 0;

    booking.status = BookingStatus.CHECKED_IN;
    booking.checkedInAt = now;
    const saved = await bookingRepo.save(booking);

    await manager.getRepository(BookingStatusLogEntity).save(
      manager.getRepository(BookingStatusLogEntity).create({
        booking: saved,
        oldStatus: BookingStatus.TASKER_ON_THE_WAY,
        newStatus: BookingStatus.CHECKED_IN,
        changedByUser: { id: userId } as UserEntity,
        note:
          minutesLate > 0
            ? `Tasker check-in muộn ${Math.round(minutesLate)} phút`
            : 'Tasker đã đến nơi',
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
