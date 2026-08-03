import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { NotificationService } from 'src/modules/notification/notification.service';
import { PricingService } from 'src/modules/pricing/services/pricing.service';
import { TaskerBalanceService } from 'src/modules/wallet/tasker-balance.service';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { BookingLifecycleSchedulerService } from './booking-lifecycle-scheduler.service';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BookingPolicyService } from './booking-policy.service';

@Injectable()
export class TaskerConfirmCustomerBookingService {
  private readonly logger = new Logger(
    TaskerConfirmCustomerBookingService.name,
  );

  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingPolicyService: BookingPolicyService,
    private readonly taskerBalanceService: TaskerBalanceService,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly pricingService: PricingService,
    private readonly notificationService: NotificationService,
    private readonly vouchersService: VouchersService,
    private readonly bookingLifecycleScheduler: BookingLifecycleSchedulerService,
  ) {}

  async confirmByCustomer(
    customerUserId: string,
    bookingId: string,
  ): Promise<{ id: string; bookingCode: string; status: BookingStatus }> {
    return asyncHandleOperation(async () => {
      let taskerUserId: string | undefined;

      const result = await this.dataSource.transaction(async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .leftJoinAndSelect('booking.bookingSubServices', 'bookingSubServices')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .andWhere('customerUser.id = :customerUserId', { customerUserId })
          .getOne();

        if (!booking) {
          throw new NotFoundException(
            'Booking không tồn tại hoặc không thuộc tài khoản của bạn',
          );
        }

        if (booking.status !== BookingStatus.PENDING_CUSTOMER_CONFIRMATION) {
          throw new BadRequestException(
            'Booking không ở trạng thái chờ xác nhận',
          );
        }

        if (
          booking.confirmationDeadline &&
          booking.confirmationDeadline < new Date()
        ) {
          throw new BadRequestException(
            'Đã quá thời hạn xác nhận. Đơn hàng đã tự động hủy.',
          );
        }

        // Validate tasker vẫn hợp lệ
        const tasker = booking.tasker;
        if (!tasker) {
          throw new BadRequestException('Booking không có tasker được gắn');
        }
        this.bookingPolicyService.assertTaskerCanCreateBookingForCustomer(
          tasker,
        );

        // Check concurrent/overlap constraints
        await this.bookingPolicyService.assertTaskerConcurrentAndOverlapConstraints(
          manager,
          tasker.id,
          booking,
        );

        await this.taskerBalanceService.assertMeetsMinAcceptBalance(
          manager,
          tasker.id,
        );

        // Check deposit nếu thanh toán CASH
        if (booking.paymentMethod === PaymentMethod.CASH) {
          const commissionRate =
            await this.resolvePlatformCommissionRate(manager);
          const subtotal =
            toNumber(booking.totalPrice) + toNumber(booking.discountAmount);
          const platformFee = Math.round((subtotal * commissionRate) / 100);
          await this.taskerBalanceService.holdCashCommission(
            manager,
            tasker.id,
            booking,
            platformFee,
          );
        }

        const oldStatus = booking.status;
        booking.status = BookingStatus.CONFIRMED;
        booking.confirmationDeadline = null;
        taskerUserId = tasker.user?.id;

        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus,
          newStatus: BookingStatus.CONFIRMED,
          changedByUser: { id: customerUserId } as UserEntity,
          note: 'Khách hàng xác nhận đơn do tasker tạo',
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        return savedBooking;
      });

      void this.bookingLifecycleScheduler
        .activateConfirmedBooking(result.id)
        .catch((err) =>
          this.logger.warn(
            `Không thể kích hoạt lifecycle booking=${result.id}: ${err}`,
          ),
        );

      // Notify tasker
      if (taskerUserId) {
        void this.notificationService
          .notify({
            userId: taskerUserId,
            type: NotificationType.BOOKING_CONFIRMED,
            title: 'Khách đã xác nhận đơn',
            content: `Đơn ${result.bookingCode} đã được khách hàng xác nhận. Bắt đầu di chuyển!`,
            referenceType: NotificationRefType.BOOKING,
            referenceId: bookingId,
            dedupeKey: `booking:${bookingId}:customer_confirmed`,
          })
          .catch((err) =>
            this.logger.error(
              `Không thể gửi thông báo tasker booking=${bookingId}: ${err}`,
            ),
          );
      }

      return {
        id: result.id,
        bookingCode: result.bookingCode,
        status: result.status,
      };
    }, 'Không thể xác nhận đơn hàng');
  }

  async declineByCustomer(
    customerUserId: string,
    bookingId: string,
  ): Promise<{ id: string; bookingCode: string; status: BookingStatus }> {
    return asyncHandleOperation(async () => {
      let taskerUserId: string | undefined;

      const result = await this.dataSource.transaction(async (manager) => {
        const booking = await manager
          .getRepository(BookingEntity)
          .createQueryBuilder('booking')
          .leftJoinAndSelect('booking.customer', 'customer')
          .leftJoinAndSelect('customer.user', 'customerUser')
          .leftJoinAndSelect('booking.tasker', 'tasker')
          .leftJoinAndSelect('tasker.user', 'taskerUser')
          .setLock('pessimistic_write', undefined, ['booking'])
          .where('booking.id = :bookingId', { bookingId })
          .andWhere('customerUser.id = :customerUserId', { customerUserId })
          .getOne();

        if (!booking) {
          throw new NotFoundException(
            'Booking không tồn tại hoặc không thuộc tài khoản của bạn',
          );
        }

        if (booking.status !== BookingStatus.PENDING_CUSTOMER_CONFIRMATION) {
          throw new BadRequestException(
            'Booking không ở trạng thái chờ xác nhận',
          );
        }

        taskerUserId = booking.tasker?.user?.id;
        const oldStatus = booking.status;

        booking.status = BookingStatus.CANCELLED;
        booking.cancelledBy = CancelledBy.CUSTOMER_DECLINED;
        booking.cancelledAt = new Date();
        booking.confirmationDeadline = null;
        await this.vouchersService.releaseReservationForBooking(
          manager,
          booking.id,
        );
        await this.bookingWalletPaymentService.refundEscrow(
          manager,
          booking,
          'khách từ chối đơn',
        );

        const savedBooking = await manager
          .getRepository(BookingEntity)
          .save(booking);

        const statusLog = manager.getRepository(BookingStatusLogEntity).create({
          booking: savedBooking,
          oldStatus,
          newStatus: BookingStatus.CANCELLED,
          changedByUser: { id: customerUserId } as UserEntity,
          note: 'Khách hàng từ chối đơn do tasker tạo',
          cancelledBy: CancelledBy.CUSTOMER_DECLINED,
          cancelledByUser: { id: customerUserId } as UserEntity,
          cancellationFee: 0,
          refundAmount: 0,
        });
        await manager.getRepository(BookingStatusLogEntity).save(statusLog);

        return savedBooking;
      });

      await this.bookingLifecycleScheduler.deactivateBooking(bookingId);

      // Notify tasker
      if (taskerUserId) {
        void this.notificationService
          .notify({
            userId: taskerUserId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Khách đã từ chối đơn',
            content: `Đơn ${result.bookingCode} đã bị khách hàng từ chối.`,
            referenceType: NotificationRefType.BOOKING,
            referenceId: bookingId,
            dedupeKey: `booking:${bookingId}:${NotificationType.BOOKING_CANCELLED}`,
          })
          .catch((err) =>
            this.logger.error(
              `Không thể gửi thông báo tasker booking=${bookingId}: ${err}`,
            ),
          );
      }

      return {
        id: result.id,
        bookingCode: result.bookingCode,
        status: result.status,
      };
    }, 'Không thể từ chối đơn hàng');
  }

  private async resolvePlatformCommissionRate(
    manager: EntityManager,
  ): Promise<number> {
    return this.pricingService.getPlatformCommissionRate(manager);
  }
}
