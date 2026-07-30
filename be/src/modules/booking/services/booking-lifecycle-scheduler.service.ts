import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { createVietnamDateTime } from 'src/common/helpers/vietnam-time.helper';
import { BookingEntity } from '../entity/booking.entity';
import { BookingCheckinService } from './booking-checkin.service';
import { BookingDispatchService } from './booking-dispatch.service';

const RECONCILABLE_BOOKING_STATUSES = [
  BookingStatus.CONFIRMED,
  BookingStatus.TASKER_ON_THE_WAY,
  BookingStatus.CHECKED_IN,
  BookingStatus.IN_PROGRESS,
];

export interface BookingLifecycleReconciliationResult {
  scannedCount: number;
  scheduledCount: number;
  failedBookingIds: string[];
}

/**
 * Một cửa vào duy nhất cho side effects sau khi booking đổi trạng thái.
 *
 * Transaction chỉ lưu trạng thái booking. Dispatch/check-in jobs luôn chạy sau
 * commit; nếu Redis lỗi, vòng reconciliation sẽ enqueue lại bằng jobId cố định.
 */
@Injectable()
export class BookingLifecycleSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BookingLifecycleSchedulerService.name);
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private interval?: NodeJS.Timeout;
  private isReconciling = false;
  private reconciliationCursor?: { updatedAt: Date; id: string };

  constructor(
    private readonly dataSource: DataSource,
    private readonly dispatchService: BookingDispatchService,
    private readonly checkinService: BookingCheckinService,
    configService: ConfigService,
  ) {
    const configuredInterval = Number(
      configService.get<string>(
        'BOOKING_LIFECYCLE_RECONCILIATION_INTERVAL_MS',
      ) ?? 300_000,
    );
    this.intervalMs =
      configuredInterval === 0
        ? 0
        : Number.isFinite(configuredInterval) && configuredInterval >= 1_000
          ? Math.floor(configuredInterval)
          : 300_000;

    const configuredBatchSize = Number(
      configService.get<string>(
        'BOOKING_LIFECYCLE_RECONCILIATION_BATCH_SIZE',
      ) ?? 200,
    );
    this.batchSize =
      Number.isFinite(configuredBatchSize) && configuredBatchSize > 0
        ? Math.min(Math.floor(configuredBatchSize), 1_000)
        : 200;
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) return;

    this.interval = setInterval(() => {
      void this.reconcileActiveBookingsSilently();
    }, this.intervalMs);
    this.interval.unref?.();
    void this.reconcileActiveBookingsSilently();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async activateConfirmedBooking(bookingId: string): Promise<boolean> {
    const booking = await this.findBookingForLifecycle(bookingId);
    if (!booking || booking.status !== BookingStatus.CONFIRMED) return false;

    // cancelPendingDispatch tự nuốt lỗi remove từng job; lỗi schedule được ném
    // ra để caller ghi log và reconciliation có thể phục hồi.
    await this.dispatchService.cancelPendingDispatch(bookingId);
    await this.checkinService.scheduleCheckinJobs(booking);
    return true;
  }

  async deactivateBooking(bookingId: string): Promise<void> {
    await Promise.allSettled([
      this.dispatchService.cancelPendingDispatch(bookingId),
      this.checkinService.cancelCheckinJobs(bookingId),
    ]);
  }

  /**
   * Dùng khi Admin khôi phục đơn về POSTED. Chỉ dispatch được đơn có customer,
   * tọa độ và lịch hẹn hợp lệ; đơn guest phải được Admin gán Tasker trực tiếp.
   */
  async activatePostedDispatch(bookingId: string): Promise<boolean> {
    const booking = await this.dataSource.getRepository(BookingEntity).findOne({
      where: { id: bookingId },
      relations: ['customer', 'customer.user'],
    });
    if (!booking || booking.status !== BookingStatus.POSTED) return false;

    const customerUserId = booking.customer?.user?.id;
    const latitude = booking.latitude == null ? null : Number(booking.latitude);
    const longitude =
      booking.longitude == null ? null : Number(booking.longitude);
    const scheduledStart = this.resolveScheduledStart(booking);
    if (
      !customerUserId ||
      latitude === null ||
      longitude === null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !scheduledStart
    ) {
      this.logger.warn(
        `Không thể khôi phục dispatch booking=${bookingId}: thiếu customer, tọa độ hoặc lịch hẹn`,
      );
      return false;
    }

    await this.dispatchService.enqueueDispatch(
      booking.id,
      customerUserId,
      latitude,
      longitude,
      scheduledStart,
      {
        customerId: booking.customer?.id ?? null,
        serviceTier: booking.serviceTier,
        preferredTaskerId: booking.preferredTaskerId ?? null,
      },
    );
    return true;
  }

  async reconcileActiveBookings(): Promise<BookingLifecycleReconciliationResult> {
    if (this.isReconciling) {
      return { scannedCount: 0, scheduledCount: 0, failedBookingIds: [] };
    }

    this.isReconciling = true;
    try {
      const repository = this.dataSource.getRepository(BookingEntity);
      const findBatch = () => {
        const query = repository
          .createQueryBuilder('booking')
          .where('booking.status IN (:...statuses)', {
            statuses: RECONCILABLE_BOOKING_STATUSES,
          })
          .andWhere('booking.tasker IS NOT NULL')
          .orderBy('booking.updatedAt', 'ASC')
          .addOrderBy('booking.id', 'ASC')
          .take(this.batchSize);

        if (this.reconciliationCursor) {
          query.andWhere(
            `(
              booking.updatedAt > :cursorUpdatedAt
              OR (
                booking.updatedAt = :cursorUpdatedAt
                AND booking.id > :cursorId
              )
            )`,
            {
              cursorUpdatedAt: this.reconciliationCursor.updatedAt,
              cursorId: this.reconciliationCursor.id,
            },
          );
        }
        return query.getMany();
      };

      let bookings = await findBatch();
      // Đã đi hết một vòng: bắt đầu lại ngay để không có một chu kỳ rỗng.
      if (!bookings.length && this.reconciliationCursor) {
        this.reconciliationCursor = undefined;
        bookings = await findBatch();
      }

      const lastBooking = bookings.at(-1);
      this.reconciliationCursor =
        bookings.length === this.batchSize && lastBooking
          ? {
              updatedAt: lastBooking.updatedAt,
              id: lastBooking.id,
            }
          : undefined;

      let scheduledCount = 0;
      const failedBookingIds: string[] = [];
      // Chạy tuần tự để startup/reconciliation không dồn hàng trăm lệnh Redis.
      for (const booking of bookings) {
        try {
          await this.dispatchService.cancelPendingDispatch(booking.id);
          await this.checkinService.scheduleCheckinJobs(booking);
          scheduledCount += 1;
        } catch (error) {
          failedBookingIds.push(booking.id);
          this.logger.error(
            `Không thể reconcile lifecycle booking=${booking.id}: ${String(error)}`,
          );
        }
      }

      return {
        scannedCount: bookings.length,
        scheduledCount,
        failedBookingIds,
      };
    } finally {
      this.isReconciling = false;
    }
  }

  private async reconcileActiveBookingsSilently(): Promise<void> {
    try {
      const result = await this.reconcileActiveBookings();
      if (result.scannedCount > 0 || result.failedBookingIds.length > 0) {
        this.logger.log(
          `Lifecycle reconciliation: scanned=${result.scannedCount} scheduled=${result.scheduledCount} failed=${result.failedBookingIds.length}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Lifecycle reconciliation thất bại',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private findBookingForLifecycle(
    bookingId: string,
  ): Promise<BookingEntity | null> {
    return this.dataSource.getRepository(BookingEntity).findOne({
      where: { id: bookingId },
    });
  }

  private resolveScheduledStart(booking: BookingEntity): Date | null {
    if (
      booking.scheduledStart &&
      !Number.isNaN(booking.scheduledStart.getTime())
    ) {
      return booking.scheduledStart;
    }
    if (!booking.scheduledStartDate || !booking.scheduledStartTime) return null;

    const value = createVietnamDateTime(
      String(booking.scheduledStartDate).slice(0, 10),
      String(booking.scheduledStartTime).slice(0, 5),
    );
    return Number.isNaN(value.getTime()) ? null : value;
  }
}
