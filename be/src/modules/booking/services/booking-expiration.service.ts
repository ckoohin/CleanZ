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
import { UserRole } from 'src/common/enums/user-role.enum';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { NotificationService } from 'src/modules/notification/notification.service';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingEntity } from '../entity/booking.entity';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import { BookingOnlinePaymentService } from './booking-online-payment.service';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { VN_NOW_SQL } from 'src/common/helpers/vietnam-time.helper';

export interface ExpireOverdueBookingsResponse {
  expiredCount: number;
  bookingIds: string[];
}

@Injectable()
export class BookingExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingExpirationService.name);
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly alertThreshold: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;
  private consecutiveFailures = 0;

  constructor(
    private readonly dataSource: DataSource,
    private readonly vouchersService: VouchersService,
    private readonly notificationService: NotificationService,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly bookingOnlinePaymentService: BookingOnlinePaymentService,
    configService: ConfigService,
  ) {
    this.intervalMs = Number(
      configService.get<string>('BOOKING_EXPIRATION_INTERVAL_MS') ?? 300_000,
    );
    this.batchSize = Number(
      configService.get<string>('BOOKING_EXPIRATION_BATCH_SIZE') ?? 100,
    );
    this.alertThreshold = Number(
      configService.get<string>('BOOKING_EXPIRATION_ALERT_THRESHOLD') ?? 3,
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
      let bookings: BookingEntity[];
      try {
        bookings = await this.dataSource.transaction((manager) =>
          this.expireBatch(manager),
        );
      } finally {
        this.isRunning = false;
      }

      // Hủy PayOS link sau commit cho ONLINE+PENDING bookings — tránh customer trả tiền vào link đã hết hạn.
      for (const booking of bookings) {
        if (
          booking.paymentMethod === PaymentMethod.ONLINE &&
          booking.paymentStatus === PaymentStatus.PENDING
        ) {
          void this.bookingOnlinePaymentService
            .cancelPendingPayosLink(booking.id)
            .catch((err: unknown) =>
              this.logger.error(
                `Không thể hủy PayOS link cho booking hết hạn ${booking.id}: ${err}`,
              ),
            );
        }
      }

      // Notify customers sau khi transaction commit.
      // Đơn tạo hộ cho khách không có tài khoản thì customer là null → bỏ qua.
      for (const booking of bookings) {
        const customerUserId = booking.customer?.user?.id;
        if (customerUserId) {
          void this.notificationService
            .notify({
              userId: customerUserId,
              type: NotificationType.BOOKING_CANCELLED,
              title: 'Đơn đã hết hạn',
              content: `Đơn ${booking.bookingCode} đã hết hạn do chưa có tasker nhận. Vui lòng đặt đơn mới nếu bạn vẫn cần dịch vụ.`,
              referenceType: NotificationRefType.BOOKING,
              referenceId: booking.id,
              dedupeKey: `booking:${booking.id}:expired`,
            })
            .catch((err) =>
              this.logger.error(
                `Không thể gửi thông báo hết hạn booking=${booking.id}: ${err}`,
              ),
            );
        }
      }

      return {
        expiredCount: bookings.length,
        bookingIds: bookings.map((booking) => booking.id),
      };
    }, 'Không thể xử lý booking quá hạn');
  }

  private async expireOverduePostedBookingsSilently(): Promise<void> {
    let hadFailure = false;

    try {
      const result = await this.expireOverduePostedBookings();
      if (result.expiredCount > 0) {
        this.logger.log(`Expired ${result.expiredCount} overdue bookings`);
      }
    } catch (error) {
      hadFailure = true;
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
      hadFailure = true;
      this.logger.error(
        'Failed to cancel expired pending confirmation bookings',
        error instanceof Error ? error.stack : undefined,
      );
    }

    if (!hadFailure) {
      this.consecutiveFailures = 0;
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures === this.alertThreshold) {
      await this.notifyAdminsOfRepeatedFailures();
    }
  }
  private async notifyAdminsOfRepeatedFailures(): Promise<void> {
    try {
      const admins = await this.dataSource.getRepository(UserEntity).find({
        select: ['id'],
        where: { role: UserRole.ADMIN },
      });
      const dateKey = new Date().toISOString().slice(0, 10);
      await this.notificationService.notifyMany(
        admins.map((admin) => admin.id),
        {
          type: NotificationType.SYSTEM,
          title: 'Job xử lý booking quá hạn đang lỗi',
          content: `Job tự động xử lý booking quá hạn đã thất bại ${this.alertThreshold} lần liên tiếp. Vui lòng kiểm tra log backend.`,
          dedupeKey: `booking-expiration:job-failure:${dateKey}`,
        },
      );
    } catch (error) {
      this.logger.error(
        'Không thể gửi cảnh báo job expire cho admin',
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
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .setLock('pessimistic_write', undefined, ['booking'])
          .setOnLocked('skip_locked')
          .where('booking.status = :status', {
            status: BookingStatus.PENDING_CUSTOMER_CONFIRMATION,
          })
          .andWhere('booking.confirmation_deadline IS NOT NULL')
          .andWhere(`booking.confirmation_deadline < ${VN_NOW_SQL}`)
          .take(100)
          .getMany();

        for (const booking of lockedBookings) {
          const oldStatus = booking.status;
          booking.status = BookingStatus.CANCELLED;
          booking.cancelledBy = CancelledBy.SYSTEM_TIMEOUT;
          booking.cancelledAt = new Date();
          booking.confirmationDeadline = null;
          await this.vouchersService.releaseReservationForBooking(
            manager,
            booking.id,
          );
          await bookingRepository.save(booking);
          if (booking.paymentMethod === PaymentMethod.ONLINE && booking.paymentStatus === PaymentStatus.PAID) {
            if (booking.customer) {
              await this.bookingOnlinePaymentService.refundToWallet(manager, booking, booking.customer);
            }
          } else {
            await this.bookingWalletPaymentService.refundEscrow(manager, booking, 'quá hạn khách xác nhận');
          }

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

      // Notify tasker và customer sau khi transaction commit.
      // Đơn tạo hộ cho khách không có tài khoản thì customer là null → chỉ báo tasker.
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

        const customerUserId = booking.customer?.user?.id;
        if (customerUserId) {
          void this.notificationService
            .notify({
              userId: customerUserId,
              type: NotificationType.BOOKING_CANCELLED,
              title: 'Đơn đã tự động hủy',
              content: `Đơn ${booking.bookingCode} đã tự động hủy do bạn không xác nhận trong thời hạn.`,
              referenceType: NotificationRefType.BOOKING,
              referenceId: booking.id,
              dedupeKey: `booking:${booking.id}:system_timeout:customer`,
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

  private async expireBatch(manager: EntityManager): Promise<BookingEntity[]> {
    const bookingRepository = manager.getRepository(BookingEntity);
    const logRepository = manager.getRepository(BookingStatusLogEntity);

    const bookings = await bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
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
      return [];
    }

    for (const booking of bookings) {
      const oldStatus = booking.status;
      booking.status = BookingStatus.EXPIRED;
      await this.vouchersService.releaseReservationForBooking(
        manager,
        booking.id,
      );
      await bookingRepository.save(booking);

      // Hoàn tiền tuỳ theo phương thức thanh toán.
      if (booking.paymentMethod === PaymentMethod.WALLET) {
        await this.bookingWalletPaymentService.refundEscrow(
          manager,
          booking,
          'đơn hết hạn không có tasker nhận',
        );
      } else if (
        booking.paymentMethod === PaymentMethod.ONLINE &&
        booking.paymentStatus === PaymentStatus.PAID
      ) {
        // Hoàn vào ví CleanZ — cùng luồng với cancelByCustomer.
        if (booking.customer) {
          await this.bookingOnlinePaymentService.refundToWallet(
            manager,
            booking,
            booking.customer,
          );
        } else {
          this.logger.warn(
            `Booking ONLINE ${booking.bookingCode} hết hạn nhưng không có customer để hoàn tiền`,
          );
        }
      }

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

    return bookings;
  }
}
