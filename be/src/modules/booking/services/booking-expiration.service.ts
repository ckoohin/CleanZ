import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
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
