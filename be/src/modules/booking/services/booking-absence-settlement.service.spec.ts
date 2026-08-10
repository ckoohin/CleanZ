import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CustomerDebtService } from 'src/modules/wallet/customer-debt.service';
import { WalletEntity } from 'src/modules/wallet/entity/wallet.entity';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { BookingAbsenceReportEntity } from '../entity/booking-absence-report.entity';
import { BookingEntity } from '../entity/booking.entity';
import {
  ABSENCE_COMPENSATION_ADVANCE,
  ABSENCE_COMPENSATION_ESCROW,
  ABSENCE_COMPENSATION_PLATFORM,
  ABSENCE_COMPENSATION_WALLET,
  ABSENCE_REFUND_CLOSE,
  ABSENCE_REFUND_UPFRONT,
  BookingAbsenceSettlementService,
} from './booking-absence-settlement.service';
import { BOOKING_WALLET_ESCROW_REF } from './booking-wallet-payment.service';

const customerWallet = { id: 'wallet-customer', balance: 0 } as never;
const systemWallet = { id: 'wallet-system', balance: 2_000_000 } as never;
const taskerWallet = { id: 'wallet-tasker', balance: 0 } as never;

const makeBooking = (over: Partial<BookingEntity> = {}): BookingEntity =>
  ({
    id: 'booking-1',
    bookingCode: 'BK-ABS-1',
    paymentMethod: PaymentMethod.WALLET,
    paymentStatus: PaymentStatus.PAID,
    totalPrice: 200_000,
    discountAmount: 0,
    customer: { id: 'customer-1' },
    tasker: { id: 'tasker-1' },
    ...over,
  }) as BookingEntity;

const makeReport = (
  over: Partial<BookingAbsenceReportEntity> = {},
): BookingAbsenceReportEntity => {
  const booking = over.booking ?? makeBooking();
  return {
    id: 'report-1',
    booking,
    customer: booking.customer ?? null,
    tasker: booking.tasker!,
    isGuest: !booking.customer,
    compensationAmount: 50_000,
    refundedUpfront: 150_000,
    debtRecoveredUpfront: 0,
    heldForReview: 50_000,
    paidFromEscrow: 0,
    paidFromCustomerWallet: 0,
    advancedByPlatform: 0,
    platformBorneAmount: 0,
    refundedOnClose: 0,
    debtRecoveredOnClose: 0,
    ...over,
  } as BookingAbsenceReportEntity;
};

describe('BookingAbsenceSettlementService', () => {
  let service: BookingAbsenceSettlementService;
  let existingRefs: Set<string>;
  let transferredRefs: string[];
  let wallet: jest.Mocked<Partial<WalletService>>;
  let debt: jest.Mocked<Partial<CustomerDebtService>>;
  let manager: EntityManager;
  let hasEscrowEvidence: boolean;

  beforeEach(() => {
    existingRefs = new Set();
    transferredRefs = [];
    hasEscrowEvidence = true;
    (customerWallet as { balance: number }).balance = 0;

    wallet = {
      getOrCreateCustomerWallet: jest.fn().mockResolvedValue(customerWallet),
      getOrCreateSystemWallet: jest.fn().mockResolvedValue(systemWallet),
      getOrCreateTaskerWallet: jest.fn().mockResolvedValue(taskerWallet),
      transfer: jest.fn().mockImplementation((_manager, input) => {
        transferredRefs.push(input.referenceType ?? '');
        existingRefs.add(input.referenceType ?? '');
        return Promise.resolve();
      }),
    };
    debt = {
      recoverForCustomer: jest.fn().mockResolvedValue(0),
      openDebt: jest.fn().mockResolvedValue(null),
    };

    manager = {
      getRepository: (entity: { name?: string }) => {
        if (entity?.name === 'WalletTransactionEntity') {
          return {
            count: ({ where }: { where: { referenceType: string } }) =>
              Promise.resolve(
                where.referenceType === BOOKING_WALLET_ESCROW_REF
                  ? hasEscrowEvidence
                    ? 1
                    : 0
                  : existingRefs.has(where.referenceType)
                    ? 1
                    : 0,
              ),
          };
        }
        if (entity?.name === 'PaymentEntity') {
          return {
            count: () => Promise.resolve(hasEscrowEvidence ? 1 : 0),
            findOne: () => Promise.resolve(null),
            save: (value: unknown) => Promise.resolve(value),
          };
        }
        if (entity === WalletEntity) {
          return {
            findOne: () => Promise.resolve(customerWallet),
          };
        }
        return {
          update: () => Promise.resolve(undefined),
        };
      },
    } as unknown as EntityManager;

    service = new BookingAbsenceSettlementService(
      wallet as WalletService,
      debt as CustomerDebtService,
    );
  });

  describe('prepareReport — chia phần hoàn ngay và phần giữ', () => {
    it('C < totalPrice: hoàn phần dư, giữ đúng C', async () => {
      jest.mocked(debt.recoverForCustomer!).mockResolvedValueOnce(20_000);
      const booking = makeBooking();
      const result = await service.prepareReport(
        manager,
        booking,
        makeReport({ booking, compensationAmount: 50_000 }),
      );

      expect(result).toEqual({
        refundedUpfront: 150_000,
        debtRecoveredUpfront: 20_000,
        heldForReview: 50_000,
      });
      expect(transferredRefs).toEqual([ABSENCE_REFUND_UPFRONT]);
      expect(booking.paymentStatus).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });

    it('C >= totalPrice: giữ toàn bộ escrow, chưa hoàn gì', async () => {
      const booking = makeBooking({ totalPrice: 40_000 });
      await expect(
        service.prepareReport(
          manager,
          booking,
          makeReport({ booking, compensationAmount: 50_000 }),
        ),
      ).resolves.toEqual({
        refundedUpfront: 0,
        debtRecoveredUpfront: 0,
        heldForReview: 40_000,
      });
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('escrow = 0: không hoàn và không giữ', async () => {
      const booking = makeBooking({
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
      });
      await expect(
        service.prepareReport(manager, booking, makeReport({ booking })),
      ).resolves.toEqual({
        refundedUpfront: 0,
        debtRecoveredUpfront: 0,
        heldForReview: 0,
      });
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('không coi cờ PAID là escrow nếu thiếu bút toán giữ tiền', async () => {
      hasEscrowEvidence = false;
      const booking = makeBooking();

      await expect(
        service.prepareReport(manager, booking, makeReport({ booking })),
      ).resolves.toEqual({
        refundedUpfront: 0,
        debtRecoveredUpfront: 0,
        heldForReview: 0,
      });
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('guest có escrow trả trước: chặn để đối soát thủ công', async () => {
      const booking = makeBooking({ customer: null });
      await expect(
        service.prepareReport(
          manager,
          booking,
          makeReport({ booking, customer: null, isGuest: true }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('approve — phân bổ nguồn bồi hoàn', () => {
    it.each([PaymentMethod.WALLET, PaymentMethod.ONLINE])(
      '%s đã trả: dùng khoản escrow đang giữ',
      async (paymentMethod) => {
        const booking = makeBooking({ paymentMethod });
        const report = makeReport({ booking });

        await expect(service.approve(manager, report)).resolves.toEqual({
          paidFromEscrow: 50_000,
          paidFromCustomerWallet: 0,
          advancedByPlatform: 0,
          platformBorneAmount: 0,
        });
        expect(transferredRefs).toEqual([ABSENCE_COMPENSATION_ESCROW]);
      },
    );

    it('CASH, ví đủ: khách trả đủ từ ví và không sinh nợ', async () => {
      (customerWallet as { balance: number }).balance = 80_000;
      const booking = makeBooking({
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
      });

      await expect(
        service.approve(
          manager,
          makeReport({ booking, heldForReview: 0, refundedUpfront: 0 }),
        ),
      ).resolves.toEqual({
        paidFromEscrow: 0,
        paidFromCustomerWallet: 50_000,
        advancedByPlatform: 0,
        platformBorneAmount: 0,
      });
      expect(transferredRefs).toEqual([ABSENCE_COMPENSATION_WALLET]);
      expect(debt.openDebt).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ amount: 0 }),
      );
    });

    it('CASH, ví thiếu: khách trả phần có sẵn, nền tảng ứng phần còn lại thành nợ', async () => {
      (customerWallet as { balance: number }).balance = 20_000;
      const booking = makeBooking({
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
      });

      await expect(
        service.approve(
          manager,
          makeReport({ booking, heldForReview: 0, refundedUpfront: 0 }),
        ),
      ).resolves.toEqual({
        paidFromEscrow: 0,
        paidFromCustomerWallet: 20_000,
        advancedByPlatform: 30_000,
        platformBorneAmount: 0,
      });
      expect(transferredRefs).toEqual([
        ABSENCE_COMPENSATION_WALLET,
        ABSENCE_COMPENSATION_ADVANCE,
      ]);
      expect(debt.openDebt).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ amount: 30_000 }),
      );
    });

    it('CASH, ví rỗng: nền tảng ứng toàn bộ C và mở nợ toàn phần', async () => {
      const booking = makeBooking({
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
      });
      const report = makeReport({
        booking,
        heldForReview: 0,
        refundedUpfront: 0,
      });

      const result = await service.approve(manager, report);
      expect(result.advancedByPlatform).toBe(50_000);
      expect(debt.openDebt).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ amount: 50_000 }),
      );
    });

    it('voucher 100%: phần chênh do nền tảng chịu, không thành nợ khách', async () => {
      const booking = makeBooking({ totalPrice: 0 });
      const report = makeReport({
        booking,
        compensationAmount: 30_000,
        heldForReview: 0,
        refundedUpfront: 0,
      });

      await expect(service.approve(manager, report)).resolves.toEqual({
        paidFromEscrow: 0,
        paidFromCustomerWallet: 0,
        advancedByPlatform: 0,
        platformBorneAmount: 30_000,
      });
      expect(transferredRefs).toEqual([ABSENCE_COMPENSATION_PLATFORM]);
      expect(debt.openDebt).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ amount: 0 }),
      );
    });

    it('guest: nền tảng chịu toàn bộ, không mở nợ', async () => {
      const booking = makeBooking({ customer: null });
      const report = makeReport({
        booking,
        customer: null,
        isGuest: true,
        compensationAmount: 50_000,
        heldForReview: 0,
        refundedUpfront: 0,
      });

      await expect(service.approve(manager, report)).resolves.toEqual({
        paidFromEscrow: 0,
        paidFromCustomerWallet: 0,
        advancedByPlatform: 0,
        platformBorneAmount: 50_000,
      });
      expect(debt.openDebt).not.toHaveBeenCalled();
    });

    it('dữ liệu lệch có escrow giữ lớn hơn C: hoàn phần dư và không để kẹt tiền', async () => {
      const booking = makeBooking({
        paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
      });
      const report = makeReport({
        booking,
        heldForReview: 80_000,
        refundedUpfront: 120_000,
      });

      await expect(service.approve(manager, report)).resolves.toEqual({
        paidFromEscrow: 50_000,
        paidFromCustomerWallet: 0,
        advancedByPlatform: 0,
        platformBorneAmount: 0,
      });
      expect(transferredRefs).toEqual([
        ABSENCE_COMPENSATION_ESCROW,
        ABSENCE_REFUND_CLOSE,
      ]);
      expect(report.refundedOnClose).toBe(30_000);
      expect(booking.paymentStatus).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });

    it('gọi lại không nhân đôi bút toán; khoá duy nhất nguồn nợ do CustomerDebtService đảm nhiệm', async () => {
      (customerWallet as { balance: number }).balance = 20_000;
      const booking = makeBooking({
        paymentMethod: PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PENDING,
      });
      const report = makeReport({
        booking,
        heldForReview: 0,
        refundedUpfront: 0,
      });

      await service.approve(manager, report);
      await service.approve(manager, report);

      expect(wallet.transfer).toHaveBeenCalledTimes(2);
      expect(new Set(transferredRefs)).toEqual(
        new Set([ABSENCE_COMPENSATION_WALLET, ABSENCE_COMPENSATION_ADVANCE]),
      );
      expect(debt.openDebt).toHaveBeenCalledTimes(2);
      expect(debt.openDebt).toHaveBeenNthCalledWith(
        2,
        manager,
        expect.objectContaining({ sourceRefId: 'report-1', amount: 30_000 }),
      );
    });
  });

  describe('reject / expire', () => {
    it('REJECT hoàn nốt phần giữ để tổng hoàn bằng totalPrice', async () => {
      const booking = makeBooking({
        paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
      });
      const report = makeReport({ booking });

      await expect(service.reject(manager, report)).resolves.toBe(50_000);
      expect(transferredRefs).toEqual([ABSENCE_REFUND_CLOSE]);
      expect(booking.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(report.refundedOnClose).toBe(50_000);
    });

    it('EXPIRED hoàn đủ cho khách, vẫn trả đủ C cho Tasker và không mở nợ', async () => {
      const booking = makeBooking({
        paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
      });
      const report = makeReport({ booking });

      await expect(service.expire(manager, report)).resolves.toBe(50_000);
      expect(transferredRefs).toEqual([
        ABSENCE_REFUND_CLOSE,
        ABSENCE_COMPENSATION_PLATFORM,
      ]);
      expect(report.platformBorneAmount).toBe(50_000);
      expect(booking.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(debt.openDebt).not.toHaveBeenCalled();
    });
  });
});
