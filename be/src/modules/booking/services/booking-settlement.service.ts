import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { toNumber } from 'src/common/helpers/number.helper';
import { PaymentService } from 'src/modules/payment/payment.service';
import { PricingService } from 'src/modules/pricing/services/pricing.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { TaskerBalanceService } from 'src/modules/wallet/tasker-balance.service';
import { VouchersService } from 'src/modules/voucher/services/vouchers.service';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BookingStatusLogEntity } from '../entity/booking-status-log.entity';
import { BookingWalletPaymentService } from './booking-wallet-payment.service';
import { BookingSurchargeStatus } from 'src/common/enums/booking-surcharge-status.enum';
import { overtimeFeeForMinutes } from '../helpers/work-timing.helper';

/** Trần số phút phát sinh nền tảng chịu ứng trả khi khách không thanh toán. */
export const PLATFORM_OVERTIME_ADVANCE_CAP_MINUTES = 60;

/** referenceType của bút toán ứng trả — đảm bảo idempotent, không ứng hai lần. */
export const OVERTIME_ADVANCE_REF = 'BOOKING_OVERTIME_ADVANCE';

export interface SettleCompletionInput {
  booking: BookingEntity;
  tasker: TaskerEntity;
  actorUserId: string;
  note: string;
  /**
   * Phần phụ phí phát sinh khách trả bằng TIỀN MẶT trên đơn ví (hybrid).
   * Khi > 0: ví SYSTEM chỉ giữ phần gốc (escrow), phần này tasker thu tiền mặt và
   * chỉ khấu trừ hoa hồng — giống cơ chế đơn CASH.
   */
  cashSurcharge?: number;
  /**
   * Trạng thái phụ phí sau khi quyết toán. Bỏ trống → suy ra từ `waitingFee`
   * (có phụ phí = đã thu). Truyền `DISPUTED`/`WAIVED` cho nhánh khách không trả.
   */
  surchargeStatus?: BookingSurchargeStatus;
  /**
   * AdminBookingRepository tự ghi audit có request reason/audit id riêng.
   * Mặc định service vẫn ghi status log cho mọi luồng customer/tasker.
   */
  writeStatusLog?: boolean;
}

export interface SettleCompletionResult {
  booking: BookingEntity;
  taskerEarning: number;
  platformFee: number;
}

/**
 * Quyết toán khi hoàn thành booking: chuyển trạng thái COMPLETED, trả công tasker,
 * ghi nhận hoa hồng/chi phí voucher. Tách riêng để cả luồng tasker tự hoàn thành và
 * luồng customer xác nhận phần phát sinh cùng tái sử dụng, tránh nhân đôi logic tiền.
 */
@Injectable()
export class BookingSettlementService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly pricingService: PricingService,
    private readonly walletService: WalletService,
    private readonly taskerBalanceService: TaskerBalanceService,
    private readonly bookingWalletPaymentService: BookingWalletPaymentService,
    private readonly vouchersService: VouchersService,
  ) {}

  async resolvePlatformCommissionRate(manager: EntityManager): Promise<number> {
    return this.pricingService.getPlatformCommissionRate(manager);
  }

  /**
   * Chuyển booking sang COMPLETED và thực hiện toàn bộ bút toán quyết toán.
   * `booking.totalPrice` phải đã là số tiền CUỐI (đã gồm phụ phí phát sinh nếu có);
   * với đơn ví trả phụ phí bằng ví thì escrow phải được `adjustEscrow` trước khi gọi.
   */
  async settleCompletedBooking(
    manager: EntityManager,
    input: SettleCompletionInput,
  ): Promise<SettleCompletionResult> {
    const { booking, tasker, actorUserId, note } = input;
    const cashSurcharge = Math.round(toNumber(input.cashSurcharge ?? 0));

    const completedAt = new Date();
    const oldStatus = booking.status;
    booking.status = BookingStatus.COMPLETED;
    booking.completedAt = completedAt;
    booking.surchargeStatus =
      input.surchargeStatus ??
      (toNumber(booking.waitingFee) > 0
        ? BookingSurchargeStatus.PAID
        : BookingSurchargeStatus.NONE);
    booking.confirmationDeadline = null;

    if (booking.paymentMethod === PaymentMethod.CASH) {
      booking.paymentStatus = PaymentStatus.PAID;
      await this.paymentService.markLatestPendingPaymentAsPaid(
        manager,
        booking.id,
        completedAt,
      );
    }
    await this.vouchersService.markBookingVoucherUsed(manager, booking.id);
    const savedBooking = await manager
      .getRepository(BookingEntity)
      .save(booking);

    // Voucher do nền tảng chịu: tasker nhận tiền tính trên subtotal (trước giảm giá).
    const totalPrice = toNumber(savedBooking.totalPrice);
    const discountAmount = toNumber(savedBooking.discountAmount);
    const subtotal = totalPrice + discountAmount;
    const commissionRate = await this.resolvePlatformCommissionRate(manager);
    const platformFee = Math.round((subtotal * commissionRate) / 100);
    const taskerEarning = Math.max(subtotal - platformFee, 0);

    if (cashSurcharge > 0) {
      await this.settleWalletBaseWithCashSurcharge(
        manager,
        savedBooking,
        tasker,
        subtotal,
        cashSurcharge,
        commissionRate,
      );
      await this.finalizeStats(manager, savedBooking, tasker, actorUserId, {
        oldStatus,
        note,
        writeStatusLog: input.writeStatusLog !== false,
      });
      return { booking: savedBooking, taskerEarning, platformFee };
    }

    // Đơn trả bằng ví: tiền khách đã nằm sẵn ở ví SYSTEM từ lúc tạo đơn (và đã bù
    // chênh nếu có phụ phí), nên chỉ cần chuyển phần công cho tasker. Hoa hồng tự
    // động ở lại SYSTEM — không ghi thêm income/expense để tránh cộng khống lần hai.
    const settledFromWallet =
      await this.bookingWalletPaymentService.settleOnCompletion(
        manager,
        savedBooking,
        taskerEarning,
      );

    if (!settledFromWallet) {
      if (savedBooking.paymentMethod === PaymentMethod.CASH) {
        // Phí đã được GIỮ từ lúc nhận đơn → chỉ thu khoản giữ, không thể thiếu tiền.
        await this.taskerBalanceService.captureCashCommission(
          manager,
          tasker.id,
          savedBooking,
          platformFee,
        );
      } else {
        const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
          manager,
          tasker,
        );
        await this.walletService.creditWallet(manager, {
          wallet: taskerWallet,
          amount: taskerEarning,
          type: WalletTransactionType.TASKER_EARNING,
          booking: savedBooking,
          description:
            `Thu nhập booking ${savedBooking.bookingCode}: ` +
            `tổng công ${subtotal.toLocaleString('vi-VN')}đ − ` +
            `chiết khấu nền tảng ${platformFee.toLocaleString('vi-VN')}đ`,
        });
      }
      if (platformFee > 0) {
        await this.walletService.recordPlatformIncome(
          manager,
          platformFee,
          savedBooking,
          `Phí nền tảng từ booking ${savedBooking.bookingCode}`,
        );
      }
      if (discountAmount > 0) {
        await this.walletService.recordPlatformExpense(
          manager,
          discountAmount,
          savedBooking,
          `Nền tảng chịu voucher cho booking ${savedBooking.bookingCode}`,
        );
      }
    }

    await this.finalizeStats(manager, savedBooking, tasker, actorUserId, {
      oldStatus,
      note,
      writeStatusLog: input.writeStatusLog !== false,
    });
    return { booking: savedBooking, taskerEarning, platformFee };
  }

  /**
   * Khách không trả phần phát sinh → hoàn thành đơn theo GIÁ GỐC, nhưng nền tảng
   * ứng trả tasker phần phát sinh trong hạn mức và đánh dấu DISPUTED để admin xử.
   *
   * Khác luồng cũ ở chỗ **giữ nguyên `overtimeMinutes`** làm bằng chứng — chỉ đưa
   * `waitingFee` về 0 vì khách không trả khoản đó.
   */
  async settleDisputedSurcharge(
    manager: EntityManager,
    input: {
      booking: BookingEntity;
      tasker: TaskerEntity;
      actorUserId: string;
      reason: string;
      note: string;
    },
  ): Promise<
    SettleCompletionResult & { advanceBase: number; netPaid: number }
  > {
    const { booking, tasker, actorUserId, reason, note } = input;
    const surcharge = Math.round(toNumber(booking.waitingFee));

    // Khách không trả → tổng đơn giữ nguyên giá gốc, bỏ khoản phụ phí khỏi hoá đơn.
    booking.waitingFee = 0;
    booking.surchargeDisputeReason = reason;

    const advance = await this.advanceOvertimeToTasker(
      manager,
      booking,
      tasker,
      surcharge,
    );

    const result = await this.settleCompletedBooking(manager, {
      booking,
      tasker,
      actorUserId,
      note,
      surchargeStatus: BookingSurchargeStatus.DISPUTED,
    });

    return {
      ...result,
      advanceBase: advance.advanceBase,
      netPaid: advance.netPaid,
    };
  }

  /**
   * Khách không trả phần phát sinh (từ chối rõ ràng, hoặc ví không đủ khi quá hạn)
   * → nền tảng ứng trả tasker phần phát sinh trong hạn mức, rồi đòi khách sau.
   *
   * Khoản ứng vẫn áp dụng hoa hồng để xác định số tiền thực trả tasker, nhưng
   * chưa ghi nhận income vì khách chưa thanh toán khoản phát sinh này.
   * Idempotent theo `(bookingId, OVERTIME_ADVANCE_REF)` nên gọi lại không nhân đôi.
   */
  async advanceOvertimeToTasker(
    manager: EntityManager,
    booking: BookingEntity,
    tasker: TaskerEntity,
    surcharge: number,
  ): Promise<{ advanceBase: number; advanceFee: number; netPaid: number }> {
    const cap = overtimeFeeForMinutes(
      PLATFORM_OVERTIME_ADVANCE_CAP_MINUTES,
      toNumber(booking.durationHours),
      toNumber(booking.basePrice),
    );
    const advanceBase = Math.min(Math.round(toNumber(surcharge)), cap);
    if (advanceBase <= 0) {
      return { advanceBase: 0, advanceFee: 0, netPaid: 0 };
    }

    const commissionRate = await this.resolvePlatformCommissionRate(manager);
    const advanceFee = Math.round((advanceBase * commissionRate) / 100);
    const netPaid = Math.max(advanceBase - advanceFee, 0);

    const systemWallet =
      await this.walletService.getOrCreateSystemWallet(manager);
    const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
      manager,
      tasker,
    );

    await this.walletService.transfer(manager, {
      fromWallet: systemWallet,
      toWallet: taskerWallet,
      amount: netPaid,
      debitType: WalletTransactionType.ADJUSTMENT,
      creditType: WalletTransactionType.TASKER_EARNING,
      booking,
      referenceId: booking.id,
      referenceType: OVERTIME_ADVANCE_REF,
      description:
        `Nền tảng ứng trả phần phát sinh booking ${booking.bookingCode}: ` +
        `${advanceBase.toLocaleString('vi-VN')}đ − phí nền tảng ` +
        `${advanceFee.toLocaleString('vi-VN')}đ (khách chưa thanh toán)`,
    });

    booking.platformAdvanceAmount = advanceBase;
    return { advanceBase, advanceFee, netPaid };
  }

  /**
   * Hybrid: đơn ví, phần gốc quyết toán qua escrow, phần phụ phí trả tiền mặt.
   */
  private async settleWalletBaseWithCashSurcharge(
    manager: EntityManager,
    booking: BookingEntity,
    tasker: TaskerEntity,
    subtotal: number,
    cashSurcharge: number,
    commissionRate: number,
  ): Promise<void> {
    const escrowSubtotal = Math.max(subtotal - cashSurcharge, 0);
    const escrowFee = Math.round((escrowSubtotal * commissionRate) / 100);
    const escrowEarning = Math.max(escrowSubtotal - escrowFee, 0);

    // Phần gốc: trả công tasker từ ví SYSTEM (chỉ giữ phần gốc), hoa hồng gốc ở lại.
    await this.bookingWalletPaymentService.settleOnCompletion(
      manager,
      booking,
      escrowEarning,
      escrowSubtotal,
    );

    // Phần phụ phí trả tiền mặt: tasker giữ tiền mặt, chỉ khấu trừ hoa hồng vào ví.
    const cashFee = Math.round((cashSurcharge * commissionRate) / 100);
    if (cashFee > 0) {
      await this.taskerBalanceService.deductCashCommission(
        manager,
        tasker.id,
        booking,
        cashFee,
      );
      await this.walletService.recordPlatformIncome(
        manager,
        cashFee,
        booking,
        `Phí nền tảng phần phát sinh (tiền mặt) booking ${booking.bookingCode}`,
      );
    }
  }

  private async finalizeStats(
    manager: EntityManager,
    booking: BookingEntity,
    tasker: TaskerEntity,
    actorUserId: string,
    meta: {
      oldStatus: BookingStatus;
      note: string;
      writeStatusLog: boolean;
    },
  ): Promise<void> {
    await manager
      .getRepository(TaskerEntity)
      .increment({ id: tasker.id }, 'totalCompletedJobs', 1);
    // Đơn offline/vãng lai không gắn customer → bỏ qua cộng totalBookings.
    if (booking.customer) {
      await manager
        .getRepository(CustomerEntity)
        .increment({ id: booking.customer.id }, 'totalBookings', 1);
    }

    if (!meta.writeStatusLog) return;

    const statusLog = manager.getRepository(BookingStatusLogEntity).create({
      booking,
      oldStatus: meta.oldStatus,
      newStatus: BookingStatus.COMPLETED,
      changedByUser: { id: actorUserId } as UserEntity,
      note: meta.note,
      cancellationFee: 0,
      refundAmount: 0,
    });
    await manager.getRepository(BookingStatusLogEntity).save(statusLog);
  }
}
