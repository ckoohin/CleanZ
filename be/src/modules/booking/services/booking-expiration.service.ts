import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { NotificationService } from 'src/modules/notification/notification.service';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingEntity } from '../entity/booking.entity';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';

export interface ExpireOverdueBookingsResponse {
  expiredCount: number;
  bookingIds: string[];
}

@Injectable()
export class BookingExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingExpirationService.name);
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly vouchersService: VouchersService,
    private readonly notificationService: NotificationService,
    configService: ConfigService,
  ) {
    this.intervalMs = Number(
      configService.get<string>('BOOKING_EXPIRATION_INTERVAL_MS') ?? 300_000,
    );
    this.batchSize = Number(
      configService.get<string>('BOOKING_EXPIRATION_BATCH_SIZE') ?? 100,
    );
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) {
      return;
    }

    this.interval = setInterval(() => {
      void this.expireOverduePostedBookingsSilently();
    }, this.intervalMs);
    this.interval.unref?.();

    void this.expireOverduePostedBookingsSilently();
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  expireOverduePostedBookings(): Promise<ExpireOverdueBookingsResponse> {
    return asyncHandleOperation(async () => {
      if (this.isRunning) {
        return { expiredCount: 0, bookingIds: [] };
      }

      this.isRunning = true;
      try {
        return await this.dataSource.transaction((manager) =>
          this.expireBatch(manager),
        );
      } finally {
        this.isRunning = false;
      }
    }, 'Không thể xử lý booking quá hạn');
  }

  private async expireOverduePostedBookingsSilently(): Promise<void> {
    try {
      const result = await this.expireOverduePostedBookings();
      if (result.expiredCount > 0) {
        this.logger.log(`Expired ${result.expiredCount} overdue bookings`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to expire overdue bookings',
        error instanceof Error ? error.stack : undefined,
      );
    }

    try {
      const result = await this.cancelExpiredPendingConfirmations();
      if (result.cancelledCount > 0) {
        this.logger.log(
          `Cancelled ${result.cancelledCount} timed-out pending confirmation bookings`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to cancel expired pending confirmation bookings',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async cancelExpiredPendingConfirmations(): Promise<{
    cancelledCount: number;
    bookingIds: string[];
  }> {
    return asyncHandleOperation(async () => {
      // Select FOR UPDATE và update phải nằm chung một transaction
      const bookings = await this.dataSource.transaction(async (manager) => {
        const bookingRepository = manager.getRepository(BookingEntity);
        const logRepository = manager.getRepository(BookingStatusLogEntity);

        const lockedBookings = await bookingRepository
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .setLock('pessimistic_write', undefined, ['booking'])
          .setOnLocked('skip_locked')
          .where('booking.status = :status', {
            status: BookingStatus.PENDING_CUSTOMER_CONFIRMATION,
          })
          .andWhere('booking.confirmation_deadline IS NOT NULL')
          .andWhere('booking.confirmation_deadline < NOW()')
          .take(100)
          .getMany();

        for (const booking of lockedBookings) {
          const oldStatus = booking.status;
          booking.status = BookingStatus.CANCELLED;
          booking.cancelledBy = CancelledBy.SYSTEM_TIMEOUT;
          booking.cancelledAt = new Date();
          booking.confirmationDeadline = null;
          await bookingRepository.save(booking);

          const statusLog = logRepository.create({
            booking,
            oldStatus,
            newStatus: BookingStatus.CANCELLED,
            changedByUser: null,
            note: 'Hết thời hạn xác nhận',
            cancelledBy: CancelledBy.SYSTEM_TIMEOUT,
            cancellationFee: 0,
            refundAmount: 0,
          });
          await logRepository.save(statusLog);
        }

        return lockedBookings;
      });

      if (!bookings.length) {
        return { cancelledCount: 0, bookingIds: [] };
      }

      // Notify taskers sau khi transaction commit
      for (const booking of bookings) {
        const taskerUserId = booking.tasker?.user?.id;
        if (taskerUserId) {
          void this.notificationService
            .notify({
              userId: taskerUserId,
              type: NotificationType.BOOKING_CANCELLED,
              title: 'Đơn hết hạn xác nhận',
              content: `Đơn ${booking.bookingCode} đã tự động hủy do khách không xác nhận trong thời hạn.`,
              referenceType: NotificationRefType.BOOKING,
              referenceId: booking.id,
              dedupeKey: `booking:${booking.id}:system_timeout`,
            })
            .catch((err) =>
              this.logger.error(
                `Không thể gửi thông báo timeout booking=${booking.id}: ${err}`,
              ),
            );
        }
      }

      return {
        cancelledCount: bookings.length,
        bookingIds: bookings.map((b) => b.id),
      };
    }, 'Không thể hủy booking hết hạn xác nhận');
  }

  private async expireBatch(
    manager: EntityManager,
  ): Promise<ExpireOverdueBookingsResponse> {
    const bookingRepository = manager.getRepository(BookingEntity);
    const logRepository = manager.getRepository(BookingStatusLogEntity);

    const bookings = await bookingRepository
      .createQueryBuilder('booking')
      .setLock('pessimistic_write', undefined, ['booking'])
      .setOnLocked('skip_locked')
      .where('booking.status = :status', { status: BookingStatus.POSTED })
      .andWhere('booking.tasker_id IS NULL')
      .andWhere('booking.scheduled_start_date IS NOT NULL')
      .andWhere('booking.scheduled_start_time IS NOT NULL')
      .andWhere(
        "(booking.scheduled_start_date + booking.scheduled_start_time) <= timezone('Asia/Ho_Chi_Minh', now())",
      )
      .orderBy('booking.scheduledStartDate', 'ASC')
      .addOrderBy('booking.scheduledStartTime', 'ASC')
      .take(this.batchSize)
      .getMany();

    if (!bookings.length) {
      return { expiredCount: 0, bookingIds: [] };
    }

    for (const booking of bookings) {
      const oldStatus = booking.status;
      booking.status = BookingStatus.EXPIRED;
      await this.vouchersService.releaseReservationForBooking(
        manager,
        booking.id,
      );
      await bookingRepository.save(booking);

      const statusLog = logRepository.create({
        booking,
        oldStatus,
        newStatus: BookingStatus.EXPIRED,
        changedByUser: null,
        note: 'Booking quá hạn',
        cancellationFee: 0,
        refundAmount: 0,
      });
      await logRepository.save(statusLog);
    }

    return {
      expiredCount: bookings.length,
      bookingIds: bookings.map((booking) => booking.id),
    };
  }
}
