import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { PaymentMethod } from 'src/common/enums/payment-method.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { PaymentService } from 'src/modules/payment/payment.service';
import { CustomerDebtService } from 'src/modules/wallet/customer-debt.service';
import { WalletService } from 'src/modules/wallet/wallet.service';
import { BookingEntity } from '../entity/booking.entity';
import {
  BOOKING_WALLET_ADJUST_REF,
  BOOKING_WALLET_ESCROW_REF,
  BOOKING_WALLET_REFUND_REF,
  BOOKING_WALLET_SETTLE_REF,
  BookingWalletPaymentService,
} from './booking-wallet-payment.service';

/** Các referenceType đã tồn tại trong wallet_transactions của booking đang test. */
let existingRefs: string[] = [];

const customerWallet = { id: 'w-cus', balance: 0 } as never;
const systemWallet = { id: 'w-sys', balance: 1_000_000 } as never;
const taskerWallet = { id: 'w-tsk' } as never;

const manager = {
  getRepository: (entity: unknown) => {
    // Đếm bút toán đã ghi → quyết định tính idempotent.
    if (
      typeof entity === 'function' &&
      entity.name === 'WalletTransactionEntity'
    ) {
      return {
        count: ({ where }: { where: { referenceType: string } }) =>
          Promise.resolve(existingRefs.includes(where.referenceType) ? 1 : 0),
      };
    }
    return {
      count: () => Promise.resolve(0),
      update: () => Promise.resolve(undefined),
      findOne: () => Promise.resolve(null),
    };
  },
} as unknown as EntityManager;

const makeBooking = (over: Partial<BookingEntity> = {}): BookingEntity =>
  ({
    id: 'bk-1',
    bookingCode: 'KS-1',
    paymentMethod: PaymentMethod.WALLET,
    paymentStatus: PaymentStatus.PENDING,
    totalPrice: 200_000,
    tasker: { id: 'tk-1' },
    customer: { id: 'cus-1' },
    ...over,
  }) as BookingEntity;

describe('BookingWalletPaymentService', () => {
  let service: BookingWalletPaymentService;
  let wallet: jest.Mocked<Partial<WalletService>>;
  let payment: jest.Mocked<Partial<PaymentService>>;
  let customerDebt: jest.Mocked<Partial<CustomerDebtService>>;

  beforeEach(async () => {
    existingRefs = [];

    wallet = {
      getOrCreateCustomerWallet: jest.fn().mockResolvedValue(customerWallet),
      getOrCreateSystemWallet: jest.fn().mockResolvedValue(systemWallet),
      getOrCreateTaskerWallet: jest.fn().mockResolvedValue(taskerWallet),
      transfer: jest.fn().mockResolvedValue(undefined),
    };
    payment = {
      markLatestPendingPaymentAsPaid: jest.fn().mockResolvedValue(null),
      markLatestPaidPaymentAsRefunded: jest.fn().mockResolvedValue(null),
      updateLatestPaymentAmount: jest.fn().mockResolvedValue(null),
    };
    customerDebt = {
      recoverForCustomer: jest.fn().mockResolvedValue(0),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BookingWalletPaymentService,
        { provide: WalletService, useValue: wallet },
        { provide: PaymentService, useValue: payment },
        { provide: CustomerDebtService, useValue: customerDebt },
      ],
    }).compile();

    service = moduleRef.get(BookingWalletPaymentService);
  });

  describe('chargeEscrow', () => {
    it('trừ ví khách và chuyển sang ví SYSTEM giữ hộ', async () => {
      (customerWallet as { balance: number }).balance = 500_000;
      const booking = makeBooking();

      await service.chargeEscrow(manager, booking, { id: 'cus-1' } as never);

      expect(wallet.transfer).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          fromWallet: customerWallet,
          toWallet: systemWallet,
          amount: 200_000,
          debitType: WalletTransactionType.PAYMENT,
          creditType: WalletTransactionType.PAYMENT,
          referenceType: BOOKING_WALLET_ESCROW_REF,
        }),
      );
      expect(booking.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('ví thiếu tiền → báo lỗi kèm số còn thiếu, không trừ gì cả', async () => {
      (customerWallet as { balance: number }).balance = 50_000;

      await expect(
        service.chargeEscrow(manager, makeBooking(), { id: 'cus-1' } as never),
      ).rejects.toThrow(/thiếu 150\.000đ/);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('khách vãng lai không có ví → từ chối', async () => {
      await expect(
        service.chargeEscrow(manager, makeBooking(), null),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('đơn tiền mặt thì không đụng tới ví', async () => {
      await service.chargeEscrow(
        manager,
        makeBooking({ paymentMethod: PaymentMethod.CASH }),
        { id: 'cus-1' } as never,
      );
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('gọi lại lần hai không trừ tiền lần hai', async () => {
      (customerWallet as { balance: number }).balance = 500_000;
      existingRefs = [BOOKING_WALLET_ESCROW_REF];

      await service.chargeEscrow(manager, makeBooking(), {
        id: 'cus-1',
      } as never);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });
  });

  describe('adjustEscrow — khách đổi lịch làm giá thay đổi', () => {
    it('giá tăng → thu thêm đúng phần chênh lệch', async () => {
      existingRefs = [BOOKING_WALLET_ESCROW_REF];
      (customerWallet as { balance: number }).balance = 300_000;

      // Ví đã bị trừ 200.000 lúc tạo đơn, giá mới là 250.000.
      const booking = makeBooking({ totalPrice: 250_000 });
      await service.adjustEscrow(manager, booking, 200_000);

      expect(wallet.transfer).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          fromWallet: customerWallet,
          toWallet: systemWallet,
          amount: 50_000,
          referenceType: BOOKING_WALLET_ADJUST_REF,
        }),
      );
    });

    it('giá giảm → trả lại phần thừa cho khách', async () => {
      existingRefs = [BOOKING_WALLET_ESCROW_REF];

      const booking = makeBooking({ totalPrice: 180_000 });
      await service.adjustEscrow(manager, booking, 200_000);

      expect(wallet.transfer).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          fromWallet: systemWallet,
          toWallet: customerWallet,
          amount: 20_000,
          referenceType: BOOKING_WALLET_ADJUST_REF,
        }),
      );
    });

    it('giá tăng mà ví không đủ → chặn đổi lịch, không trừ gì', async () => {
      existingRefs = [BOOKING_WALLET_ESCROW_REF];
      (customerWallet as { balance: number }).balance = 10_000;

      await expect(
        service.adjustEscrow(
          manager,
          makeBooking({ totalPrice: 250_000 }),
          200_000,
        ),
      ).rejects.toThrow(/nạp thêm/);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('giá không đổi → không phát sinh bút toán', async () => {
      existingRefs = [BOOKING_WALLET_ESCROW_REF];

      await service.adjustEscrow(manager, makeBooking(), 200_000);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('đơn tiền mặt thì kệ, giá đổi bao nhiêu cũng không đụng ví', async () => {
      await service.adjustEscrow(
        manager,
        makeBooking({ paymentMethod: PaymentMethod.CASH, totalPrice: 999_000 }),
        200_000,
      );
      expect(wallet.transfer).not.toHaveBeenCalled();
    });
  });

  describe('ca biên voucher', () => {
    it('voucher giảm 100% (0đ) → vẫn phải đánh dấu ĐÃ THANH TOÁN', async () => {
      const booking = makeBooking({ totalPrice: 0 });

      await service.chargeEscrow(manager, booking, { id: 'cus-1' } as never);

      expect(wallet.transfer).not.toHaveBeenCalled();
      // Nếu bỏ sót PAID, lúc hoàn thành đơn sẽ rơi vào nhánh cũ → cộng tiền khống.
      expect(booking.paymentStatus).toBe(PaymentStatus.PAID);
      expect(payment.markLatestPendingPaymentAsPaid).toHaveBeenCalled();
    });

    it('đơn 0đ vẫn quyết toán từ quỹ nền tảng, không rơi về nhánh cũ', async () => {
      (systemWallet as { balance: number }).balance = 1_000_000;

      const handled = await service.settleOnCompletion(
        manager,
        makeBooking({ totalPrice: 0, paymentStatus: PaymentStatus.PAID }),
        160_000,
      );

      expect(handled).toBe(true);
      expect(wallet.transfer).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ toWallet: taskerWallet, amount: 160_000 }),
      );
    });

    it('quỹ nền tảng cạn → báo đúng nguyên nhân, không ném "ví không đủ" khó hiểu', async () => {
      (systemWallet as { balance: number }).balance = 10_000;

      await expect(
        service.settleOnCompletion(
          manager,
          makeBooking({ paymentStatus: PaymentStatus.PAID }),
          160_000,
        ),
      ).rejects.toThrow(/Quỹ nền tảng không đủ/);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });
  });

  describe('settleOnCompletion', () => {
    it('chuyển công tasker từ ví SYSTEM, hoa hồng ở lại', async () => {
      (systemWallet as { balance: number }).balance = 1_000_000;

      const handled = await service.settleOnCompletion(
        manager,
        makeBooking({ paymentStatus: PaymentStatus.PAID }),
        160_000,
      );

      expect(handled).toBe(true);
      expect(wallet.transfer).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          fromWallet: systemWallet,
          toWallet: taskerWallet,
          amount: 160_000,
          referenceType: BOOKING_WALLET_SETTLE_REF,
        }),
      );
    });

    it('đơn WALLET chưa thanh toán → trả false để caller dùng luồng cũ', async () => {
      const handled = await service.settleOnCompletion(
        manager,
        makeBooking(),
        160_000,
      );

      expect(handled).toBe(false);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('quyết toán hai lần không trả công hai lần', async () => {
      existingRefs = [BOOKING_WALLET_ESCROW_REF, BOOKING_WALLET_SETTLE_REF];

      const handled = await service.settleOnCompletion(
        manager,
        makeBooking({ paymentStatus: PaymentStatus.PAID }),
        160_000,
      );

      expect(handled).toBe(true);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });
  });

  describe('refundEscrow', () => {
    it('trả lại nguyên số đã thu từ ví SYSTEM về ví khách', async () => {
      existingRefs = [BOOKING_WALLET_ESCROW_REF];
      const booking = makeBooking();

      const refunded = await service.refundEscrow(
        manager,
        booking,
        'khách hủy',
      );

      expect(refunded).toBe(200_000);
      expect(wallet.transfer).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          fromWallet: systemWallet,
          toWallet: customerWallet,
          amount: 200_000,
          debitType: WalletTransactionType.REFUND,
          referenceType: BOOKING_WALLET_REFUND_REF,
        }),
      );
      expect(booking.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(customerDebt.recoverForCustomer).toHaveBeenCalledWith(
        manager,
        'cus-1',
        200_000,
        { booking },
      );
    });

    it('đã trả công tasker rồi thì không hoàn nữa — tiền không còn ở SYSTEM', async () => {
      existingRefs = [BOOKING_WALLET_ESCROW_REF, BOOKING_WALLET_SETTLE_REF];

      const refunded = await service.refundEscrow(
        manager,
        makeBooking(),
        'hủy',
      );

      expect(refunded).toBe(0);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('hoàn hai lần chỉ trả tiền một lần', async () => {
      existingRefs = [BOOKING_WALLET_ESCROW_REF, BOOKING_WALLET_REFUND_REF];

      const refunded = await service.refundEscrow(
        manager,
        makeBooking(),
        'hủy',
      );

      expect(refunded).toBe(0);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });

    it('đơn chưa từng thu tiền thì không hoàn', async () => {
      const refunded = await service.refundEscrow(
        manager,
        makeBooking(),
        'hủy',
      );

      expect(refunded).toBe(0);
      expect(wallet.transfer).not.toHaveBeenCalled();
    });
  });
});
