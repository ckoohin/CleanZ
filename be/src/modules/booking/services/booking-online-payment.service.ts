import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import type { Webhook } from '@payos/node';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { PaymentEntity } from 'src/modules/payment/entity/payment.entity';
import { PayosService } from 'src/modules/wallet/payos.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { WalletTransactionEntity } from 'src/modules/wallet/entity/wallet-transaction.entity';
import { NotificationGateway } from 'src/modules/notification/notification.gateway';
import { PaymentService } from 'src/modules/payment/payment.service';
import { BookingEntity } from '../entity/booking.entity';
import { BookingDispatchService } from './booking-dispatch.service';

export const BOOKING_ONLINE_REFUND_REF = 'BOOKING_ONLINE_REFUND';

export interface OnlinePaymentLink {
  checkoutUrl: string;
  qrCode: string;
  orderCode: number;
  bin: string;
  accountNumber: string;
  accountName: string;
}

@Injectable()
export class BookingOnlinePaymentService {
  private readonly logger = new Logger(BookingOnlinePaymentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly payosService: PayosService,
    private readonly paymentService: PaymentService,
    private readonly walletService: WalletService,
    private readonly bookingDispatchService: BookingDispatchService,
    private readonly notificationGateway: NotificationGateway,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Tạo PayOS payment link cho booking ONLINE.
   * Gọi SAU KHI transaction tạo booking đã commit — không nằm trong transaction.
   */
  async createPaymentLink(
    booking: BookingEntity,
    customerUserId: string,
  ): Promise<OnlinePaymentLink> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3020';

    // Collision window 1ms — nếu trùng thì PayOS sẽ trả lỗi, FE retry.
    const orderCode = Date.now() % 1_000_000_000;
    const amount = toNumber(booking.totalPrice);

    const link = await this.payosService.createPaymentLink({
      amount,
      orderCode,
      description: `CleanZ ${booking.bookingCode}`,
      returnUrl: `${frontendUrl}/customer/booking/${booking.id}?payment=success`,
      cancelUrl: `${frontendUrl}/customer/booking/${booking.id}?payment=cancel`,
    });

    // Lưu orderCode + qrCode + checkoutUrl + bankInfo vào PaymentEntity để detail endpoint trả về.
    await this.paymentService.setTransactionCodeAndQr(
      this.dataSource.manager,
      booking.id,
      orderCode.toString(),
      link.qrCode,
      link.checkoutUrl,
      {
        bin: link.bin,
        accountNumber: link.accountNumber,
        accountName: link.accountName,
      },
    );

    this.logger.log(
      `PayOS link created for booking=${booking.id} orderCode=${orderCode}`,
    );

    return {
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
      orderCode,
      bin: link.bin,
      accountNumber: link.accountNumber,
      accountName: link.accountName,
    };
  }

  /**
   * Xử lý webhook PayOS xác nhận thanh toán booking.
   * Idempotent: gọi nhiều lần với cùng payload đều an toàn.
   */
  async handleWebhook(body: unknown): Promise<void> {
    const data = await this.payosService.verifyWebhook(body as Webhook);

    if (!data.orderCode) {
      this.logger.warn(`Booking PayOS webhook thiếu orderCode`);
      return;
    }

    const orderCode = data.orderCode.toString();

    // Giao dịch bị hủy/thất bại — đánh dấu payment FAILED để FE biết.
    if (data.code !== '00') {
      this.logger.warn(
        `Booking PayOS webhook không thành công: orderCode=${orderCode} code=${data.code}`,
      );
      await this.markPaymentFailed(orderCode);
      return;
    }

    // Tra payment bằng transactionCode = orderCode
    const payment = await this.dataSource.getRepository(PaymentEntity).findOne({
      where: { transactionCode: orderCode },
      relations: ['booking'],
    });

    if (!payment) {
      this.logger.warn(
        `Không tìm thấy PaymentEntity với transactionCode=${orderCode}`,
      );
      return;
    }

    // Idempotent: đã PAID rồi thì bỏ qua
    if (payment.status === PaymentStatus.PAID) {
      this.logger.log(
        `Duplicate booking webhook ignored for orderCode=${orderCode}`,
      );
      return;
    }

    await this.handleWebhookPaid(payment.booking.id, orderCode);
  }

  /**
   * Hoàn tiền booking ONLINE đã PAID vào ví CleanZ của customer.
   * Gọi bên trong transaction của cancelByCustomer.
   * Idempotent: kiểm tra BOOKING_ONLINE_REFUND trước khi ghi.
   */
  async refundToWallet(
    manager: EntityManager,
    booking: BookingEntity,
    customer: CustomerEntity,
  ): Promise<number> {
    const refundAmount = toNumber(booking.totalPrice);
    if (refundAmount <= 0) return 0;

    // Idempotency: không hoàn 2 lần
    const existing = await manager
      .getRepository(WalletTransactionEntity)
      .findOne({
        where: {
          referenceId: booking.id,
          referenceType: BOOKING_ONLINE_REFUND_REF,
        },
      });
    if (existing) {
      this.logger.log(`Bỏ qua hoàn tiền trùng cho booking=${booking.id}`);
      return refundAmount;
    }

    const wallet = await this.walletService.getOrCreateCustomerWallet(
      manager,
      customer,
    );

    await this.walletService.creditWallet(manager, {
      wallet,
      amount: refundAmount,
      type: WalletTransactionType.REFUND,
      referenceId: booking.id,
      referenceType: BOOKING_ONLINE_REFUND_REF,
      description: `Hoàn tiền booking ${booking.bookingCode} (thanh toán online)`,
    });

    await this.paymentService.markLatestPaidPaymentAsRefunded(
      manager,
      booking.id,
      new Date(),
    );

    this.logger.log(
      `Refunded ${refundAmount} VND to customer wallet for booking=${booking.id}`,
    );

    return refundAmount;
  }

  /**
   * Hủy link cũ và tạo link mới khi giá booking ONLINE+PENDING thay đổi (customer đổi lịch).
   * Trả về bankInfo mới để FE có thể cập nhật QR.
   */
  async recreatePayosLink(
    booking: BookingEntity,
    customerUserId: string,
  ): Promise<OnlinePaymentLink> {
    const paymentRepo = this.dataSource.getRepository(PaymentEntity);
    const existing = await paymentRepo.findOne({
      where: { booking: { id: booking.id } },
      order: { createdAt: 'DESC' },
    });

    // Hủy link cũ — bỏ qua lỗi nếu link đã hết hạn hoặc không tồn tại.
    if (existing?.transactionCode) {
      await this.payosService.cancelPaymentLink(
        Number(existing.transactionCode),
      );
    }

    return this.createPaymentLink(booking, customerUserId);
  }

  /**
   * Hủy PayOS payment link khi booking ONLINE+PENDING bị cancel.
   * Gọi SAU KHI transaction cancel đã commit.
   * Idempotent — PayOS trả lỗi nếu link đã cancel/expired/paid đều bị bỏ qua.
   */
  async cancelPendingPayosLink(bookingId: string): Promise<void> {
    const payment = await this.dataSource.getRepository(PaymentEntity).findOne({
      where: { booking: { id: bookingId } },
      order: { createdAt: 'DESC' },
    });
    if (!payment?.transactionCode) return;
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.FAILED
    )
      return;
    const orderCode = Number(payment.transactionCode);
    await this.payosService.cancelPaymentLink(orderCode);
    // Đánh dấu payment FAILED để FE không hiển thị QR cũ nếu user vẫn ở màn hình.
    payment.status = PaymentStatus.FAILED;
    await this.dataSource.getRepository(PaymentEntity).save(payment);
  }

  /** Đánh dấu PaymentEntity FAILED khi gateway báo cancel/thất bại. Idempotent. */
  private async markPaymentFailed(orderCode: string): Promise<void> {
    const payment = await this.dataSource.getRepository(PaymentEntity).findOne({
      where: { transactionCode: orderCode },
    });
    if (!payment || payment.status !== PaymentStatus.PENDING) return;
    payment.status = PaymentStatus.FAILED;
    await this.dataSource.getRepository(PaymentEntity).save(payment);
    this.logger.log(`Payment orderCode=${orderCode} đánh dấu FAILED`);
  }

  /**
   * Xác minh thanh toán trực tiếp qua PayOS API (dùng khi test local — webhook không đến được).
   * Nếu PayOS trả PAID → xử lý như webhook thành công.
   * Trả về true nếu booking vừa được PAID, false nếu chưa.
   */
  async verifyPaymentByBookingId(
    bookingId: string,
    customerUserId: string,
  ): Promise<boolean> {
    const payment = await this.dataSource.getRepository(PaymentEntity).findOne({
      where: { booking: { id: bookingId } },
      relations: ['booking', 'booking.customer', 'booking.customer.user'],
      order: { createdAt: 'DESC' },
    });

    if (!payment || !payment.transactionCode) return false;

    // Chỉ cho phép customer sở hữu booking — nếu không resolve được userId thì reject.
    if (payment.booking?.customer?.user?.id !== customerUserId) return false;
    if (payment.status === PaymentStatus.PAID) return true;

    const orderCode = Number(payment.transactionCode);
    let payosStatus: string;
    try {
      const info = await this.payosService.getPaymentInfo(orderCode);
      payosStatus = info.status;
    } catch {
      return false;
    }

    if (payosStatus !== 'PAID') return false;

    await this.handleWebhookPaid(
      bookingId,
      payment.transactionCode,
      customerUserId,
    );
    return true;
  }

  /**
   * Xử lý xác nhận PAID cho một booking cụ thể — dùng bởi cả webhook và verifyPaymentByBookingId.
   */
  private async handleWebhookPaid(
    bookingId: string,
    orderCode: string,
    customerUserIdHint?: string,
  ): Promise<void> {
    let customerUserId: string | undefined = customerUserIdHint;
    let addressLat: number | null = null;
    let addressLng: number | null = null;
    let scheduledStart: Date | undefined;

    await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(BookingEntity);
      const booking = await bookingRepo
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.customer', 'customer')
        .leftJoinAndSelect('customer.user', 'customerUser')
        .leftJoinAndSelect('booking.addressRef', 'addressRef')
        .setLock('pessimistic_write', undefined, ['booking'])
        .where('booking.id = :bookingId', { bookingId })
        .getOne();

      if (!booking) return;
      if (booking.paymentStatus === PaymentStatus.PAID) return;
      // Booking đã bị hủy/hết hạn trước khi thanh toán xác nhận — bỏ qua, không dispatch.
      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.EXPIRED
      ) {
        this.logger.warn(
          `Booking ${bookingId} đã ${booking.status} — bỏ qua xác nhận PAID (orderCode=${orderCode})`,
        );
        return;
      }

      booking.paymentStatus = PaymentStatus.PAID;
      await bookingRepo.save(booking);

      await this.paymentService.markLatestPendingPaymentAsPaid(
        manager,
        bookingId,
        new Date(),
      );

      if (!customerUserId) customerUserId = booking.customer?.user?.id;
      const rawLat = booking.addressRef?.latitude;
      const rawLng = booking.addressRef?.longitude;
      addressLat = rawLat != null ? Number(rawLat) : null;
      addressLng = rawLng != null ? Number(rawLng) : null;
      scheduledStart = booking.scheduledStart ?? undefined;
    });

    this.logger.log(
      `Booking ${bookingId} marked PAID (orderCode=${orderCode})`,
    );

    if (customerUserId) {
      this.notificationGateway.emitToUser(customerUserId, 'booking:searching', {
        bookingId,
      });
    }

    if (
      customerUserId &&
      addressLat != null &&
      addressLng != null &&
      Number.isFinite(addressLat) &&
      Number.isFinite(addressLng) &&
      scheduledStart
    ) {
      void this.bookingDispatchService
        .enqueueDispatch(
          bookingId,
          customerUserId,
          addressLat,
          addressLng,
          scheduledStart,
        )
        .catch((err: unknown) =>
          this.logger.error(`Dispatch sau verify booking=${bookingId}: ${err}`),
        );
    }
  }
}
