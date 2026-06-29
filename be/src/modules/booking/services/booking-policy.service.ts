import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { CancelledBy } from 'src/common/enums/cancelled-by.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';

/** Phí phạt (VND) theo số lần hủy trong 7 ngày (1-indexed: lần 1, 2, 3+) */
export const TASKER_CANCEL_PENALTY_TIERS: Record<number, number> = {
  1: 50_000,
  2: 100_000,
  3: 200_000,
};
export const WEEKLY_CANCEL_LIMIT = 3;
export const CANCEL_SUSPENSION_DAYS = 7;

const FINISHED_BOOKING_STATUSES = [
  BookingStatus.CANCELLED,
  BookingStatus.EXPIRED,
  BookingStatus.COMPLETED,
];

export const ACTIVE_BOOKING_STATUSES = Object.values(BookingStatus).filter(
  (status) => !FINISHED_BOOKING_STATUSES.includes(status),
);

const CUSTOMER_CANCELABLE_STATUSES = [
  BookingStatus.POSTED,
  BookingStatus.CONFIRMED,
];

@Injectable()
export class BookingPolicyService {
  async assertCustomerCanCreateBooking(
    manager: EntityManager,
    customerId: string,
  ): Promise<void> {
    await manager.getRepository(CustomerEntity).findOne({
      where: { id: customerId },
      lock: { mode: 'pessimistic_write' },
    });

    const activeBooking = await manager.getRepository(BookingEntity).findOne({
      where: {
        customer: { id: customerId },
        status: In(ACTIVE_BOOKING_STATUSES),
      },
      order: { createdAt: 'DESC' },
    });

    if (activeBooking) {
      throw new ConflictException({
        message: 'Bạn đang có booking chưa kết thúc.',
        bookingId: activeBooking.id,
        bookingCode: activeBooking.bookingCode,
        status: activeBooking.status,
      });
    }
  }

  assertCanUpdateScheduleAndAddress(booking: BookingEntity): void {
    if (booking.tasker || booking.status !== BookingStatus.POSTED) {
      throw new BadRequestException(
        'Booking đã được nhận nên không thể đổi thông tin',
      );
    }

    if (booking.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'Booking đã thanh toán nên không thể đổi địa chỉ, ngày hoặc giờ',
      );
    }
  }

  assertCustomerCanCancel(booking: BookingEntity): void {
    if (!CUSTOMER_CANCELABLE_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        'Customer chỉ có thể hủy booking ở trạng thái POSTED hoặc CONFIRMED',
      );
    }
  }

  assertTaskerCanCancel(booking: BookingEntity): void {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        'Tasker chỉ có thể hủy khi đơn ở trạng thái CONFIRMED (chưa di chuyển tới địa chỉ khách)',
      );
    }
  }

  assertTaskerNotCancelSuspended(tasker: TaskerEntity): void {
    const until = tasker.cancelSuspendedUntil;
    if (until && until > new Date()) {
      const fmt = until.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      throw new ForbiddenException(
        `Tài khoản bị tạm khóa nhận đơn đến ${fmt} do hủy quá ${WEEKLY_CANCEL_LIMIT} lần trong 7 ngày.`,
      );
    }
  }

  async countWeeklyCancels(
    manager: EntityManager,
    taskerId: string,
  ): Promise<number> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return manager
      .getRepository(BookingStatusLogEntity)
      .createQueryBuilder('log')
      .innerJoin('log.booking', 'booking')
      .innerJoin('booking.tasker', 'tasker')
      .where('tasker.id = :taskerId', { taskerId })
      .andWhere('log.cancelledBy = :by', { by: CancelledBy.TASKER })
      .andWhere('log.createdAt >= :since', { since })
      .getCount();
  }

  resolveCancelPenaltyAmount(weeklyCount: number): number {
    const tier = Math.min(weeklyCount, WEEKLY_CANCEL_LIMIT);
    return (
      TASKER_CANCEL_PENALTY_TIERS[tier] ??
      TASKER_CANCEL_PENALTY_TIERS[WEEKLY_CANCEL_LIMIT]
    );
  }

  assertTaskerCanAcceptBooking(tasker: TaskerEntity): void {
    this.assertTaskerNotCancelSuspended(tasker);
    if (tasker.status !== TaskerStatus.ACTIVE) {
      throw new BadRequestException(
        'Chỉ tasker đang hoạt động mới có thể nhận booking',
      );
    }
  }
}
