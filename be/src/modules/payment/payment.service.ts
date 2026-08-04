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
    customer: CustomerEntity | null,
    method: PaymentMethod,
    amount: number,
  ): Promise<PaymentEntity> {
    const paymentRepository = manager.getRepository(PaymentEntity);
    const payment = paymentRepository.create({
      booking,
      customer: customer ?? null,
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

  async findLatestByBookingIds(
    manager: EntityManager,
    bookingIds: string[],
  ): Promise<PaymentEntity[]> {
    if (bookingIds.length === 0) return [];
    return manager
      .getRepository(PaymentEntity)
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.booking', 'booking')
      .where('p.booking_id IN (:...ids)', { ids: bookingIds })
      .orderBy('p.createdAt', 'DESC')
      .getMany();
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

  /**
   * Cập nhật số tiền của bản ghi thanh toán mới nhất bất kể trạng thái.
   * Dùng cho đơn trả bằng ví (đã PAID) khi khách đổi lịch làm giá thay đổi —
   * `updateLatestPendingPaymentAmount` sẽ bỏ qua vì không còn bản ghi PENDING nào.
   */
  async updateLatestPaymentAmount(
    manager: EntityManager,
    bookingId: string,
    amount: number,
  ): Promise<PaymentEntity | null> {
    const paymentRepository = manager.getRepository(PaymentEntity);
    const payment = await paymentRepository.findOne({
      where: { booking: { id: bookingId } },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      return null;
    }

    payment.amount = amount;
    return paymentRepository.save(payment);
  }

  /** Hoàn tiền đơn đã thanh toán (dùng cho booking trả bằng ví bị hủy). */
  async markLatestPaidPaymentAsRefunded(
    manager: EntityManager,
    bookingId: string,
    refundedAt: Date,
  ): Promise<PaymentEntity | null> {
    const paymentRepository = manager.getRepository(PaymentEntity);
    const payment = await paymentRepository.findOne({
      where: {
        booking: { id: bookingId },
        status: PaymentStatus.PAID,
      },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      return null;
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = refundedAt;
    return paymentRepository.save(payment);
  }

  /** Lưu mã giao dịch từ cổng thanh toán (vd: PayOS orderCode) vào bản ghi payment mới nhất. */
  async setTransactionCode(
    manager: EntityManager,
    bookingId: string,
    code: string,
  ): Promise<void> {
    const payment = await manager.getRepository(PaymentEntity).findOne({
      where: { booking: { id: bookingId } },
      order: { createdAt: 'DESC' },
    });
    if (!payment) return;
    payment.transactionCode = code;
    await manager.getRepository(PaymentEntity).save(payment);
  }

  /** Lưu orderCode + qrCode + checkoutUrl + bankInfo PayOS để detail endpoint trả về cho FE. */
  async setTransactionCodeAndQr(
    manager: EntityManager,
    bookingId: string,
    code: string,
    qrCode: string,
    checkoutUrl?: string,
    bankInfo?: { bin: string; accountNumber: string; accountName: string },
  ): Promise<void> {
    const payment = await manager.getRepository(PaymentEntity).findOne({
      where: { booking: { id: bookingId } },
      order: { createdAt: 'DESC' },
    });
    if (!payment) return;
    payment.transactionCode = code;
    payment.qrCode = qrCode;
    if (checkoutUrl) payment.checkoutUrl = checkoutUrl;
    if (bankInfo) {
      payment.bin = bankInfo.bin;
      payment.accountNumber = bankInfo.accountNumber;
      payment.accountName = bankInfo.accountName;
    }
    await manager.getRepository(PaymentEntity).save(payment);
  }

  async markLatestPendingPaymentAsPaid(
    manager: EntityManager,
    bookingId: string,
    paidAt: Date,
  ): Promise<PaymentEntity | null> {
    const paymentRepository = manager.getRepository(PaymentEntity);
    // Cho phép cả PENDING và FAILED → PAID (retry sau khi cancel)
    const payment = await paymentRepository.findOne({
      where: [
        { booking: { id: bookingId }, status: PaymentStatus.PENDING },
        { booking: { id: bookingId }, status: PaymentStatus.FAILED },
      ],
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      return null;
    }

    payment.status = PaymentStatus.PAID;
    payment.paidAt = paidAt;
    return paymentRepository.save(payment);
  }
}
