import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { WalletOwnerType } from 'src/common/enums/wallet-owner-type.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { PaymentEntity } from 'src/modules/payment/entity/payment.entity';
import { CustomerDebtSource } from 'src/modules/wallet/entity/customer-debt.entity';
import { WalletTransactionEntity } from 'src/modules/wallet/entity/wallet-transaction.entity';
import { WalletEntity } from 'src/modules/wallet/entity/wallet.entity';
import { CustomerDebtService } from 'src/modules/wallet/customer-debt.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { BookingAbsenceReportEntity } from '../entity/booking-absence-report.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BOOKING_WALLET_ESCROW_REF } from './booking-wallet-payment.service';

export const ABSENCE_REFUND_UPFRONT = 'ABSENCE_REFUND_UPFRONT';
export const ABSENCE_COMPENSATION_ESCROW = 'ABSENCE_COMPENSATION_ESCROW';
export const ABSENCE_COMPENSATION_WALLET = 'ABSENCE_COMPENSATION_WALLET';
export const ABSENCE_COMPENSATION_ADVANCE = 'ABSENCE_COMPENSATION_ADVANCE';
export const ABSENCE_COMPENSATION_PLATFORM = 'ABSENCE_COMPENSATION_PLATFORM';
export const ABSENCE_REFUND_CLOSE = 'ABSENCE_REFUND_CLOSE';

export interface AbsenceFundingPreview {
  paidFromEscrow: number;
  paidFromCustomerWallet: number;
  advancedByPlatform: number;
  platformBorneAmount: number;
}

@Injectable()
export class BookingAbsenceSettlementService {
  constructor(
    private readonly walletService: WalletService,
    private readonly customerDebtService: CustomerDebtService,
  ) {}

  getEscrowAvailable(booking: BookingEntity): number {
    if (booking.paymentMethod === PaymentMethod.CASH) return 0;
    if (booking.paymentStatus !== PaymentStatus.PAID) return 0;
    return Math.max(0, Math.round(toNumber(booking.totalPrice)));
  }

  async prepareReport(
    manager: EntityManager,
    booking: BookingEntity,
    report: BookingAbsenceReportEntity,
  ): Promise<{
    refundedUpfront: number;
    debtRecoveredUpfront: number;
    heldForReview: number;
  }> {
    const escrow = await this.resolveEscrowAvailable(manager, booking);
    if (report.isGuest && escrow > 0) {
      throw new BadRequestException({
        code: 'GUEST_PREPAID_ABSENCE_UNSUPPORTED',
        message:
          'Đơn khách vãng lai trả trước cần được bộ phận hỗ trợ xử lý thủ công',
      });
    }

    const heldForReview = Math.min(
      Math.max(0, Math.round(toNumber(report.compensationAmount))),
      escrow,
    );
    const refundedUpfront = Math.max(0, escrow - heldForReview);

    let debtRecoveredUpfront = 0;
    if (refundedUpfront > 0 && booking.customer) {
      await this.transferSystemToCustomer(
        manager,
        booking,
        refundedUpfront,
        ABSENCE_REFUND_UPFRONT,
        `Hoàn phần không tranh chấp booking ${booking.bookingCode}`,
      );
      debtRecoveredUpfront = await this.customerDebtService.recoverForCustomer(
        manager,
        booking.customer.id,
        refundedUpfront,
        { booking },
      );
    }

    await this.applyRefundStatus(manager, booking, refundedUpfront);
    return { refundedUpfront, debtRecoveredUpfront, heldForReview };
  }

  private async resolveEscrowAvailable(
    manager: EntityManager,
    booking: BookingEntity,
  ): Promise<number> {
    const candidate = this.getEscrowAvailable(booking);
    if (candidate <= 0) return 0;

    if (booking.paymentMethod === PaymentMethod.WALLET) {
      const escrowEntries = await manager
        .getRepository(WalletTransactionEntity)
        .count({
          where: {
            referenceId: booking.id,
            referenceType: BOOKING_WALLET_ESCROW_REF,
          },
        });
      return escrowEntries > 0 ? candidate : 0;
    }

    if (booking.paymentMethod === PaymentMethod.ONLINE) {
      const paidPayments = await manager.getRepository(PaymentEntity).count({
        where: {
          booking: { id: booking.id },
          method: PaymentMethod.ONLINE,
          status: PaymentStatus.PAID,
        },
      });
      return paidPayments > 0 ? candidate : 0;
    }

    return 0;
  }

  async previewApproval(
    manager: EntityManager,
    report: BookingAbsenceReportEntity,
  ): Promise<AbsenceFundingPreview> {
    const booking = report.booking;
    const compensation = Math.max(
      0,
      Math.round(toNumber(report.compensationAmount)),
    );
    if (report.isGuest || !report.customer) {
      return {
        paidFromEscrow: 0,
        paidFromCustomerWallet: 0,
        advancedByPlatform: 0,
        platformBorneAmount: compensation,
      };
    }

    const paidFromEscrow = Math.min(
      compensation,
      Math.max(0, Math.round(toNumber(report.heldForReview))),
    );
    const fundedByCustomer = Math.min(
      compensation,
      Math.max(0, Math.round(toNumber(booking.totalPrice))),
    );
    const additionalCustomer = Math.max(0, fundedByCustomer - paidFromEscrow);
    // Đây còn được dùng cho màn xem trước của Admin, vì vậy chỉ đọc số dư và
    // không tạo ví như một tác dụng phụ của GET.
    const wallet = await manager.getRepository(WalletEntity).findOne({
      where: {
        customer: { id: report.customer.id },
        ownerType: WalletOwnerType.CUSTOMER,
      },
    });
    const paidFromCustomerWallet = Math.min(
      additionalCustomer,
      Math.max(0, Math.round(toNumber(wallet?.balance ?? 0))),
    );

    return {
      paidFromEscrow,
      paidFromCustomerWallet,
      advancedByPlatform: additionalCustomer - paidFromCustomerWallet,
      platformBorneAmount: Math.max(0, compensation - fundedByCustomer),
    };
  }

  async approve(
    manager: EntityManager,
    report: BookingAbsenceReportEntity,
  ): Promise<AbsenceFundingPreview> {
    const booking = report.booking;
    if (!booking.tasker) {
      throw new BadRequestException({
        code: 'ABSENCE_TASKER_MISSING',
        message: 'Booking không còn Tasker để chi trả bồi hoàn',
      });
    }

    const allocation = await this.previewApproval(manager, report);
    const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      booking.tasker,
    );
    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);

    await this.transferOnce(manager, booking, {
      fromWallet: systemWallet,
      toWallet: taskerWallet,
      amount: allocation.paidFromEscrow,
      referenceType: ABSENCE_COMPENSATION_ESCROW,
      description: `Bồi hoàn khách vắng từ khoản giữ booking ${booking.bookingCode}`,
    });

    if (allocation.paidFromCustomerWallet > 0 && report.customer) {
      const customerWallet = await this.walletService.getOrCreateCustomerWallet(
        manager,
        report.customer,
      );
      await this.transferOnce(manager, booking, {
        fromWallet: customerWallet,
        toWallet: taskerWallet,
        amount: allocation.paidFromCustomerWallet,
        referenceType: ABSENCE_COMPENSATION_WALLET,
        description: `Bồi hoàn khách vắng từ ví khách booking ${booking.bookingCode}`,
      });
    }

    await this.transferOnce(manager, booking, {
      fromWallet: systemWallet,
      toWallet: taskerWallet,
      amount: allocation.advancedByPlatform,
      referenceType: ABSENCE_COMPENSATION_ADVANCE,
      description: `Bồi hoàn booking ${booking.bookingCode} do khách vắng mặt`,
    });
    await this.transferOnce(manager, booking, {
      fromWallet: systemWallet,
      toWallet: taskerWallet,
      amount: allocation.platformBorneAmount,
      referenceType: ABSENCE_COMPENSATION_PLATFORM,
      description: `Bồi hoàn booking ${booking.bookingCode} do khách vắng mặt`,
    });

    if (report.customer) {
      await this.customerDebtService.openDebt(manager, {
        customerId: report.customer.id,
        source: CustomerDebtSource.ABSENCE_COMPENSATION,
        sourceRefId: report.id,
        sourceCode: booking.bookingCode,
        amount: allocation.advancedByPlatform,
      });
    }

    const refundedOnClose = Math.max(
      0,
      Math.round(toNumber(report.heldForReview)) - allocation.paidFromEscrow,
    );
    if (refundedOnClose > 0) {
      await this.refundOnClose(manager, report, refundedOnClose);
    }

    Object.assign(report, allocation);
    return allocation;
  }

  async reject(
    manager: EntityManager,
    report: BookingAbsenceReportEntity,
  ): Promise<number> {
    return this.refundOnClose(
      manager,
      report,
      Math.max(0, Math.round(toNumber(report.heldForReview))),
    );
  }

  async expire(
    manager: EntityManager,
    report: BookingAbsenceReportEntity,
  ): Promise<number> {
    const refundedOnClose = await this.refundOnClose(
      manager,
      report,
      Math.max(0, Math.round(toNumber(report.heldForReview))),
    );
    const booking = report.booking;
    if (!booking.tasker) {
      throw new BadRequestException({
        code: 'ABSENCE_TASKER_MISSING',
        message: 'Booking không còn Tasker để chi trả bồi hoàn',
      });
    }

    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);
    const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      booking.tasker,
    );
    const compensation = Math.max(
      0,
      Math.round(toNumber(report.compensationAmount)),
    );
    await this.transferOnce(manager, booking, {
      fromWallet: systemWallet,
      toWallet: taskerWallet,
      amount: compensation,
      referenceType: ABSENCE_COMPENSATION_PLATFORM,
      description: `Nền tảng chịu bồi hoàn do quá SLA booking ${booking.bookingCode}`,
    });
    report.platformBorneAmount = compensation;
    return refundedOnClose;
  }

  private async refundOnClose(
    manager: EntityManager,
    report: BookingAbsenceReportEntity,
    amount: number,
  ): Promise<number> {
    const refundedOnClose = Math.max(0, Math.round(amount));
    let debtRecoveredOnClose = 0;
    if (refundedOnClose > 0 && report.customer) {
      await this.transferSystemToCustomer(
        manager,
        report.booking,
        refundedOnClose,
        ABSENCE_REFUND_CLOSE,
        `Hoàn khoản giữ sau duyệt booking ${report.booking.bookingCode}`,
      );
      debtRecoveredOnClose = await this.customerDebtService.recoverForCustomer(
        manager,
        report.customer.id,
        refundedOnClose,
        { booking: report.booking },
      );
    }
    report.refundedOnClose = refundedOnClose;
    report.debtRecoveredOnClose = debtRecoveredOnClose;
    await this.applyRefundStatus(
      manager,
      report.booking,
      toNumber(report.refundedUpfront) + refundedOnClose,
    );
    return refundedOnClose;
  }

  private async transferSystemToCustomer(
    manager: EntityManager,
    booking: BookingEntity,
    amount: number,
    referenceType: string,
    description: string,
  ): Promise<void> {
    if (!booking.customer || amount <= 0) return;
    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);
    const customerWallet = await this.walletService.getOrCreateCustomerWallet(
      manager,
      booking.customer,
    );
    await this.transferOnce(manager, booking, {
      fromWallet: systemWallet,
      toWallet: customerWallet,
      amount,
      referenceType,
      description,
      debitType: WalletTransactionType.REFUND,
      creditType: WalletTransactionType.REFUND,
    });
  }

  private async transferOnce(
    manager: EntityManager,
    booking: BookingEntity,
    input: {
      fromWallet: Parameters<WalletService['transfer']>[1]['fromWallet'];
      toWallet: Parameters<WalletService['transfer']>[1]['toWallet'];
      amount: number;
      referenceType: string;
      description: string;
      debitType?: WalletTransactionType;
      creditType?: WalletTransactionType;
    },
  ): Promise<void> {
    const amount = Math.max(0, Math.round(input.amount));
    if (
      amount <= 0 ||
      (await this.hasEntry(manager, booking.id, input.referenceType))
    ) {
      return;
    }
    await this.walletService.transfer(manager, {
      fromWallet: input.fromWallet,
      toWallet: input.toWallet,
      amount,
      debitType: input.debitType ?? WalletTransactionType.ADJUSTMENT,
      creditType: input.creditType ?? WalletTransactionType.ADJUSTMENT,
      booking,
      referenceId: booking.id,
      referenceType: input.referenceType,
      description: input.description,
    });
  }

  private async hasEntry(
    manager: EntityManager,
    bookingId: string,
    referenceType: string,
  ): Promise<boolean> {
    return (
      (await manager.getRepository(WalletTransactionEntity).count({
        where: { referenceId: bookingId, referenceType },
      })) > 0
    );
  }

  private async applyRefundStatus(
    manager: EntityManager,
    booking: BookingEntity,
    totalRefunded: number,
  ): Promise<void> {
    const paidAmount = Math.max(0, Math.round(toNumber(booking.totalPrice)));
    if (booking.paymentMethod === PaymentMethod.CASH || paidAmount <= 0) return;

    const status =
      totalRefunded >= paidAmount
        ? PaymentStatus.REFUNDED
        : totalRefunded > 0
          ? PaymentStatus.PARTIALLY_REFUNDED
          : PaymentStatus.PAID;
    booking.paymentStatus = status;
    await manager.getRepository(BookingEntity).update(
      { id: booking.id },
      {
        paymentStatus: status,
      },
    );
    const payment = await manager.getRepository(PaymentEntity).findOne({
      where: { booking: { id: booking.id } },
      order: { createdAt: 'DESC' },
    });
    if (payment) {
      payment.status = status;
      payment.refundedAt = totalRefunded > 0 ? new Date() : payment.refundedAt;
      await manager.getRepository(PaymentEntity).save(payment);
    }
  }
}
