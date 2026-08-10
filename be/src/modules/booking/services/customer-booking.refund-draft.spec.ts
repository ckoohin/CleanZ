import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { CustomerBookingService } from './customer-booking.service';
import type { BookingQuoteEntity } from '../entity/booking-quote.entity';

/**
 * Hoàn tiền đơn nháp ONLINE.
 *
 * Tiền đã vào PayOS rồi mới chạy tới đây, nên hai điều tuyệt đối không được xảy ra:
 * ghi REFUNDED khi ví chưa được cộng đồng nào, và cộng ví hai lần cho một đơn.
 */

interface Recorder {
  /** Các lần update lên bảng booking_quotes. */
  quoteUpdates: Array<Record<string, unknown>>;
  /** Số lần thực sự cộng tiền vào ví. */
  credits: number;
  /** Thông báo đã đẩy cho khách. */
  notifications: Array<Record<string, unknown>>;
  /** Số lần thử thu hồi nợ sau khi tiền đã vào ví. */
  debtRecoveries: number;
}

/**
 * Dựng service với đúng hai phụ thuộc mà luồng hoàn tiền dùng tới; phần còn lại
 * không được chạm vào trong test này nên để trống.
 */
function makeService(opts: {
  customerFound: boolean;
  existingRefund?: boolean;
  /** Lỗi mà `creditWallet` sẽ ném — dùng để mô phỏng lỗi từ driver Postgres. */
  creditThrows?: Error & { code?: string };
}): { service: CustomerBookingService; rec: Recorder } {
  const rec: Recorder = {
    quoteUpdates: [],
    credits: 0,
    notifications: [],
    debtRecoveries: 0,
  };

  const manager = {
    getRepository: (entity: { name?: string }) => {
      if (entity?.name === 'CustomerEntity') {
        return {
          findOne: () =>
            Promise.resolve(opts.customerFound ? { id: 'cus-1' } : null),
        };
      }
      // WalletTransactionEntity — kiểm tra đã hoàn tiền trước đó chưa.
      return {
        findOne: () =>
          Promise.resolve(opts.existingRefund ? { id: 'tx-1' } : null),
      };
    },
  };

  const dataSource = {
    transaction: <T>(cb: (m: typeof manager) => Promise<T>) => cb(manager),
    getRepository: () => ({
      update: (_id: unknown, patch: Record<string, unknown>) => {
        rec.quoteUpdates.push(patch);
        return Promise.resolve(undefined);
      },
    }),
  };

  const walletService = {
    getOrCreateCustomerWallet: () => Promise.resolve({ id: 'w-1' }),
    creditWallet: () => {
      if (opts.creditThrows) throw opts.creditThrows;
      rec.credits += 1;
      return Promise.resolve({ id: 'w-1' });
    },
  };

  const notificationService = {
    notify: (payload: Record<string, unknown>) => {
      rec.notifications.push(payload);
      return Promise.resolve(undefined);
    },
  };
  const customerDebtService = {
    recoverForCustomer: () => {
      rec.debtRecoveries += 1;
      return Promise.resolve(0);
    },
  };

  const blank = {} as never;
  const service = new CustomerBookingService(
    dataSource as never, // dataSource
    blank, // bookingLocationPolicyService
    blank, // bookingPolicyService
    blank, // bookingScheduleService
    blank, // paymentService
    blank, // pricingService
    blank, // voucherService
    notificationService as never, // notificationService
    blank, // bookingDispatchService
    blank, // notificationGateway
    blank, // bookingWalletPaymentService
    blank, // taskerScheduleAvailabilityService
    blank, // bookingLifecycleScheduler
    blank, // systemConfigService
    blank, // bookingOnlinePaymentService
    blank, // payosService
    walletService as never, // walletService
    blank, // configService
    customerDebtService as never,
  );

  return { service, rec };
}

const draft = {
  id: 'draft-1',
  customerId: 'cus-1',
  userId: 'user-1',
  totalPrice: 250_000,
} as unknown as BookingQuoteEntity;

/** `refundOnlineDraft` là private — gọi thẳng để test đúng nhánh xử lý tiền. */
const refund = (
  service: CustomerBookingService,
  reason = 'lý do',
  amount?: number,
): Promise<void> =>
  (
    service as unknown as {
      refundOnlineDraft: (
        d: BookingQuoteEntity,
        r: string,
        a?: number,
      ) => Promise<void>;
    }
  ).refundOnlineDraft(draft, reason, amount);

describe('refundOnlineDraft', () => {
  it('cộng ví rồi mới đánh REFUNDED và báo khách', async () => {
    const { service, rec } = makeService({ customerFound: true });
    await refund(service);

    expect(rec.credits).toBe(1);
    expect(rec.quoteUpdates).toEqual([
      { paymentState: PaymentStatus.REFUNDED, failReason: 'lý do' },
    ]);
    expect(rec.notifications).toHaveLength(1);
    expect(rec.debtRecoveries).toBe(1);
  });

  it('KHÔNG có customer thì không đánh REFUNDED và không báo "đã hoàn tiền"', async () => {
    // Lỗi #2: `return` trong callback transaction chỉ thoát callback, nên đoạn sau
    // vẫn chạy — DB ghi REFUNDED và khách nhận thông báo đã hoàn tiền trong khi ví
    // không được cộng đồng nào. Đối soát tài chính không bao giờ phát hiện ra.
    const { service, rec } = makeService({ customerFound: false });
    await refund(service);

    expect(rec.credits).toBe(0);
    expect(rec.debtRecoveries).toBe(0);
    expect(rec.notifications).toHaveLength(0);
    expect(rec.quoteUpdates).toHaveLength(1);
    expect(rec.quoteUpdates[0]).not.toHaveProperty('paymentState');
    expect(String(rec.quoteUpdates[0].failReason)).toContain(
      'HOÀN TIỀN THẤT BẠI',
    );
  });

  it('đã hoàn trước đó thì không cộng ví lần nữa nhưng vẫn chốt REFUNDED', async () => {
    const { service, rec } = makeService({
      customerFound: true,
      existingRefund: true,
    });
    await refund(service);

    expect(rec.credits).toBe(0);
    expect(rec.quoteUpdates[0]).toHaveProperty(
      'paymentState',
      PaymentStatus.REFUNDED,
    );
  });

  it('luồng song song thắng (unique_violation) được coi là đã hoàn, không ném lỗi', async () => {
    // Chốt chặn thật của #18 là index UQ_wallet_tx_online_draft_refund. Webhook và
    // verify-payment cùng chạy: một bên ghi được, bên kia phải nuốt 23505 chứ không
    // được ném 500 ra ngoài.
    const { service, rec } = makeService({
      customerFound: true,
      creditThrows: Object.assign(new Error('duplicate key'), {
        code: '23505',
      }),
    });

    await expect(refund(service)).resolves.toBeUndefined();
    expect(rec.credits).toBe(0);
    expect(rec.quoteUpdates[0]).toHaveProperty(
      'paymentState',
      PaymentStatus.REFUNDED,
    );
  });

  it('lỗi DB khác vẫn ném ra ngoài để không âm thầm nuốt sự cố', async () => {
    const { service } = makeService({
      customerFound: true,
      creditThrows: Object.assign(new Error('deadlock'), { code: '40P01' }),
    });

    await expect(refund(service)).rejects.toThrow('deadlock');
  });

  it('hoàn đúng số thực nhận khi cổng báo số tiền lệch', async () => {
    const { service, rec } = makeService({ customerFound: true });
    await refund(service, 'lệch số tiền', 10_000);

    expect(rec.credits).toBe(1);
    expect(String(rec.notifications[0].content)).toContain('10.000');
  });
});
