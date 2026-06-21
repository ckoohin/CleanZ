import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { TaskerStatus } from 'src/common/enums/tasker-status.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { BookingEntity } from '../entity/booking.entity';

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

  assertTaskerCanAcceptBooking(tasker: TaskerEntity): void {
    if (tasker.status !== TaskerStatus.ACTIVE) {
      throw new BadRequestException(
        'Chỉ tasker đang hoạt động mới có thể nhận booking',
      );
    }
  }
}
