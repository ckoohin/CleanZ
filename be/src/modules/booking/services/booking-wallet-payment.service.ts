import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { PaymentService } from 'src/modules/payment/payment.service';
import { WalletTransactionEntity } from 'src/modules/wallet/entity/wallet-transaction.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { BookingEntity } from '../entity/booking.entity';

/**
 * Tiền của booking trả bằng ví đi theo đường ký quỹ:
 *
 *   tạo đơn   ví Khách ──PAYMENT──► ví SYSTEM      (giữ hộ)
 *   hoàn thành ví SYSTEM ─TASKER_EARNING─► ví Tasker (phần còn lại = hoa hồng − voucher, ở lại SYSTEM)
 *   hủy đơn   ví SYSTEM ──REFUND───► ví Khách      (trả lại nguyên số đã thu)
 *
 * Nhờ giữ hộ ở SYSTEM mà không có bút toán nào ghi Có không đối ứng.
 *
 * Mọi thao tác idempotent theo (referenceId = booking.id, referenceType), nên gọi
 * lại nhiều lần — retry, double-click, đường hủy chồng nhau — đều an toàn.
 */
export const BOOKING_WALLET_ESCROW_REF = 'BOOKING_WALLET_ESCROW';
/** Bù/trả chênh lệch khi đổi lịch — có thể xảy ra nhiều lần nên KHÔNG chặn trùng. */
export const BOOKING_WALLET_ADJUST_REF = 'BOOKING_WALLET_ADJUST';
export const BOOKING_WALLET_SETTLE_REF = 'BOOKING_WALLET_SETTLE';
export const BOOKING_WALLET_REFUND_REF = 'BOOKING_WALLET_REFUND';

@Injectable()
export class BookingWalletPaymentService {
  private readonly logger = new Logger(BookingWalletPaymentService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly paymentService: PaymentService,
  ) {}

  isWalletBooking(booking: BookingEntity): boolean {
    return booking.paymentMethod === PaymentMethod.WALLET;
  }

  /**
   * Trừ ví khách và giữ tiền ở ví SYSTEM ngay lúc tạo đơn.
   * Ném BadRequest nếu ví không đủ — FE bắt lỗi này để mở luồng nạp thêm.
   */
  async chargeEscrow(
    manager: EntityManager,
    booking: BookingEntity,
    customer: CustomerEntity | null,
  ): Promise<void> {
    if (!this.isWalletBooking(booking)) {
      return;
    }

    if (!customer) {
      throw new BadRequestException(
        'Đơn khách vãng lai chưa có ví nên không thanh toán bằng ví được',
      );
    }

    if (await this.hasEntry(manager, booking.id, BOOKING_WALLET_ESCROW_REF)) {
      return;
    }

    const amount = Math.round(toNumber(booking.totalPrice));

    // Voucher giảm 100% → không thu đồng nào, nhưng vẫn phải đánh dấu ĐÃ THANH TOÁN.
    // Nếu bỏ qua, đơn sẽ không có bút toán ký quỹ và lúc hoàn thành rơi vào nhánh
    // quyết toán cũ — cộng tiền cho tasker mà không trừ của ai.
    if (amount <= 0) {
      await this.markBookingPaid(manager, booking);
      return;
    }

    const customerWallet = await this.walletService.getOrCreateCustomerWallet(
      manager,
      customer,
    );
    const balance = toNumber(customerWallet.balance);

    if (balance < amount) {
      const missing = amount - balance;
      throw new BadRequestException(
        `Số dư ví không đủ để thanh toán đơn này. Cần ${amount.toLocaleString('vi-VN')}đ, ` +
          `ví đang có ${balance.toLocaleString('vi-VN')}đ — thiếu ${missing.toLocaleString('vi-VN')}đ.`,
      );
    }

    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);

    await this.walletService.transfer(manager, {
      fromWallet: customerWallet,
      toWallet: systemWallet,
      amount,
      debitType: WalletTransactionType.PAYMENT,
      creditType: WalletTransactionType.PAYMENT,
      booking,
      referenceId: booking.id,
      referenceType: BOOKING_WALLET_ESCROW_REF,
      description: `Thanh toán booking ${booking.bookingCode} bằng ví`,
    });

    await this.markBookingPaid(manager, booking);
  }

  private async markBookingPaid(
    manager: EntityManager,
    booking: BookingEntity,
  ): Promise<void> {
    booking.paymentStatus = PaymentStatus.PAID;
    await manager
      .getRepository(BookingEntity)
      .update({ id: booking.id }, { paymentStatus: PaymentStatus.PAID });
    await this.paymentService.markLatestPendingPaymentAsPaid(
      manager,
      booking.id,
      new Date(),
    );
  }

  /**
   * Khách đổi lịch/địa chỉ → giá tính lại (phụ phí cao điểm, thú cưng, voucher...).
   * Ví đã bị trừ theo giá CŨ nên phải bù chênh lệch, nếu không số tiền đang giữ ở
   * SYSTEM sẽ lệch với `booking.totalPrice` — dẫn tới hoàn thiếu khi hủy, hoặc quỹ
   * SYSTEM phải bù lỗ khi quyết toán.
   *
   * Gọi SAU khi đã gán `booking.totalPrice` mới, truyền vào giá trước khi đổi.
   */
  async adjustEscrow(
    manager: EntityManager,
    booking: BookingEntity,
    previousTotalPrice: number,
  ): Promise<void> {
    if (!this.isWalletBooking(booking)) {
      return;
    }

    if (
      !(await this.hasEntry(manager, booking.id, BOOKING_WALLET_ESCROW_REF))
    ) {
      return;
    }

    const previous = Math.round(toNumber(previousTotalPrice));
    const current = Math.round(toNumber(booking.totalPrice));
    const delta = current - previous;
    if (delta === 0) {
      return;
    }

    const customer = await this.resolveCustomer(manager, booking);
    if (!customer) {
      throw new BadRequestException(
        'Không tìm thấy ví khách để điều chỉnh số tiền đã thanh toán',
      );
    }

    const customerWallet = await this.walletService.getOrCreateCustomerWallet(
      manager,
      customer,
    );
    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);

    if (delta > 0) {
      const balance = toNumber(customerWallet.balance);
      if (balance < delta) {
        throw new BadRequestException(
          `Đổi lịch làm giá tăng thêm ${delta.toLocaleString('vi-VN')}đ nhưng ví chỉ còn ` +
            `${balance.toLocaleString('vi-VN')}đ. Vui lòng nạp thêm rồi đổi lại.`,
        );
      }

      await this.walletService.transfer(manager, {
        fromWallet: customerWallet,
        toWallet: systemWallet,
        amount: delta,
        debitType: WalletTransactionType.PAYMENT,
        creditType: WalletTransactionType.PAYMENT,
        booking,
        referenceId: booking.id,
        referenceType: BOOKING_WALLET_ADJUST_REF,
        description: `Thu thêm do đổi lịch booking ${booking.bookingCode}`,
      });
    } else {
      await this.walletService.transfer(manager, {
        fromWallet: systemWallet,
        toWallet: customerWallet,
        amount: -delta,
        debitType: WalletTransactionType.REFUND,
        creditType: WalletTransactionType.REFUND,
        booking,
        referenceId: booking.id,
        referenceType: BOOKING_WALLET_ADJUST_REF,
        description: `Trả lại do đổi lịch booking ${booking.bookingCode}`,
      });
    }

    // Bản ghi payment đang ở PAID nên updateLatestPendingPaymentAmount() bỏ qua nó.
    await this.paymentService.updateLatestPaymentAmount(
      manager,
      booking.id,
      current,
    );
  }

  /**
   * Hoàn thành đơn: trả công tasker từ chỗ tiền đang giữ ở SYSTEM.
   * Trả về `true` nếu đã xử lý — caller phải BỎ QUA nhánh quyết toán cũ
   * (creditWallet + recordPlatformIncome), nếu không sẽ cộng tiền hai lần.
   */
  async settleOnCompletion(
    manager: EntityManager,
    booking: BookingEntity,
    taskerEarning: number,
    /**
     * Với đơn ví trả phần phát sinh bằng tiền mặt (hybrid), ví SYSTEM chỉ giữ phần
     * GỐC chứ không phải `totalPrice` (đã gồm phụ phí). Truyền subtotal phần ký quỹ
     * để mô tả/hoa hồng tính đúng trên phần thực nằm ở SYSTEM.
     */
    escrowSubtotalOverride?: number,
  ): Promise<boolean> {
    if (!this.isWalletBooking(booking)) {
      return false;
    }

    // Chưa thu tiền (dữ liệu cũ / lỗi) → để caller xử lý như cũ.
    // Dùng paymentStatus chứ không dùng sự tồn tại của bút toán ký quỹ, vì đơn được
    // voucher giảm 100% là đơn ví hợp lệ nhưng KHÔNG có bút toán nào.
    if (booking.paymentStatus !== PaymentStatus.PAID) {
      this.logger.warn(
        `Booking ${booking.bookingCode} là WALLET nhưng chưa thanh toán — bỏ qua quyết toán ví`,
      );
      return false;
    }

    if (await this.hasEntry(manager, booking.id, BOOKING_WALLET_SETTLE_REF)) {
      return true;
    }

    const earning = Math.round(toNumber(taskerEarning));
    const settleSubtotal =
      escrowSubtotalOverride !== undefined
        ? Math.round(toNumber(escrowSubtotalOverride))
        : Math.round(toNumber(booking.totalPrice)) +
          Math.round(toNumber(booking.discountAmount));
    const settleFee = Math.max(settleSubtotal - earning, 0);
    if (earning > 0 && booking.tasker) {
      const systemWallet =
        await this.walletService.getOrCreateSystemWallet(manager);
      const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
        manager,
        booking.tasker,
      );

      // Voucher lớn hơn hoa hồng → nền tảng phải bù phần chênh từ quỹ của mình.
      // Quỹ cạn thì báo đúng nguyên nhân, thay vì để debitWallet ném "Số dư ví không
      // đủ" khiến người đọc tưởng ví tasker/khách mới là chỗ thiếu tiền.
      const systemBalance = toNumber(systemWallet.balance);
      if (systemBalance < earning) {
        throw new BadRequestException(
          `Quỹ nền tảng không đủ để trả công tasker cho booking ${booking.bookingCode} ` +
            `(cần ${earning.toLocaleString('vi-VN')}đ, quỹ còn ${systemBalance.toLocaleString('vi-VN')}đ). ` +
            `Thường do voucher giảm nhiều hơn hoa hồng thu được — cần nạp bù quỹ hệ thống.`,
        );
      }

      await this.walletService.transfer(manager, {
        fromWallet: systemWallet,
        toWallet: taskerWallet,
        amount: earning,
        debitType: WalletTransactionType.TASKER_EARNING,
        creditType: WalletTransactionType.TASKER_EARNING,
        booking,
        referenceId: booking.id,
        referenceType: BOOKING_WALLET_SETTLE_REF,
        description:
          `Thu nhập booking ${booking.bookingCode} (thanh toán bằng ví): ` +
          `tổng công ${settleSubtotal.toLocaleString('vi-VN')}đ − ` +
          `chiết khấu nền tảng ${settleFee.toLocaleString('vi-VN')}đ`,
      });
    }

    return true;
  }

  /**
   * Hủy/hết hạn đơn đã thu tiền → trả lại nguyên số đã trừ.
   * Trả về số tiền đã hoàn (0 nếu không có gì để hoàn).
   */
  async refundEscrow(
    manager: EntityManager,
    booking: BookingEntity,
    reason: string,
  ): Promise<number> {
    if (!this.isWalletBooking(booking)) {
      return 0;
    }

    if (
      !(await this.hasEntry(manager, booking.id, BOOKING_WALLET_ESCROW_REF))
    ) {
      return 0;
    }

    // Đã quyết toán cho tasker rồi thì tiền không còn ở SYSTEM để trả lại.
    if (await this.hasEntry(manager, booking.id, BOOKING_WALLET_SETTLE_REF)) {
      return 0;
    }

    if (await this.hasEntry(manager, booking.id, BOOKING_WALLET_REFUND_REF)) {
      return 0;
    }

    const customer = await this.resolveCustomer(manager, booking);
    if (!customer) {
      this.logger.error(
        `Không tìm thấy customer để hoàn tiền booking ${booking.bookingCode}`,
      );
      return 0;
    }

    const amount = Math.round(toNumber(booking.totalPrice));
    if (amount <= 0) {
      return 0;
    }

    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);
    const customerWallet = await this.walletService.getOrCreateCustomerWallet(
      manager,
      customer,
    );

    await this.walletService.transfer(manager, {
      fromWallet: systemWallet,
      toWallet: customerWallet,
      amount,
      debitType: WalletTransactionType.REFUND,
      creditType: WalletTransactionType.REFUND,
      booking,
      referenceId: booking.id,
      referenceType: BOOKING_WALLET_REFUND_REF,
      description: `Hoàn tiền booking ${booking.bookingCode} (${reason})`,
    });

    booking.paymentStatus = PaymentStatus.REFUNDED;
    await manager
      .getRepository(BookingEntity)
      .update({ id: booking.id }, { paymentStatus: PaymentStatus.REFUNDED });
    await this.paymentService.markLatestPaidPaymentAsRefunded(
      manager,
      booking.id,
      new Date(),
    );

    return amount;
  }

  private async hasEntry(
    manager: EntityManager,
    bookingId: string,
    referenceType: string,
  ): Promise<boolean> {
    const count = await manager.getRepository(WalletTransactionEntity).count({
      where: { referenceId: bookingId, referenceType },
    });
    return count > 0;
  }

  private async resolveCustomer(
    manager: EntityManager,
    booking: BookingEntity,
  ): Promise<CustomerEntity | null> {
    if (booking.customer) {
      return booking.customer;
    }

    const loaded = await manager.getRepository(BookingEntity).findOne({
      where: { id: booking.id },
      relations: ['customer'],
    });

    return loaded?.customer ?? null;
  }
}
