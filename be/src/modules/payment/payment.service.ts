import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { PaymentEntity } from './entity/payment.entity';

@Injectable()
export class PaymentService {
  createPendingPayment(
    manager: EntityManager,
    booking: BookingEntity,
    customer: CustomerEntity,
    method: PaymentMethod,
    amount: number,
  ): Promise<PaymentEntity> {
    const paymentRepository = manager.getRepository(PaymentEntity);
    const payment = paymentRepository.create({
      booking,
      customer,
      method,
      status: PaymentStatus.PENDING,
      amount,
    });

    return paymentRepository.save(payment);
  }

  findLatestByBookingId(
    manager: EntityManager,
    bookingId: string,
  ): Promise<PaymentEntity | null> {
    return manager.getRepository(PaymentEntity).findOne({
      where: { booking: { id: bookingId } },
      order: { createdAt: 'DESC' },
    });
  }

  async updateLatestPendingPaymentAmount(
    manager: EntityManager,
    bookingId: string,
    amount: number,
  ): Promise<PaymentEntity | null> {
    const paymentRepository = manager.getRepository(PaymentEntity);
    const payment = await paymentRepository.findOne({
      where: {
        booking: { id: bookingId },
        status: PaymentStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      return null;
    }

    payment.amount = amount;
    return paymentRepository.save(payment);
  }
}
