import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CustomerBookingService } from './customer-booking.service';
import type { BookingQuoteEntity } from '../entity/booking-quote.entity';

/**
 * Dựng booking từ đơn nháp ONLINE đã thu tiền.
 *
 * Bối cảnh lỗi được chặn ở đây: booking commit ở một transaction, `draft.booking_id`
 * từng được ghi ở transaction sau. Chết giữa hai bước để lại booking hợp lệ + draft
 * `PAID` mồ côi; vòng đối soát chạy lại thấy khách đã có đơn active nên nhận
 * `ConflictException` (409 < 500 ⇒ "lỗi nghiệp vụ") rồi hoàn TOÀN BỘ tiền — khách
 * vừa giữ đơn vừa lấy lại tiền.
 *
 * Bất biến phải giữ: một lần thu tiền ⇒ đúng một booking, và không bao giờ hoàn tiền
 * khi booking cho lần thu đó đang tồn tại.
 */

interface Recorder {
  /** Số lần thật sự dựng booking mới. */
  createCalls: number;
  /** Số lần hoàn tiền. */
  refunds: number;
  /** Các lần update lên bảng booking_quotes. */
  quoteUpdates: Array<Record<string, unknown>>;
}

function makeService(opts: {
  /** Booking đã tồn tại cho mã giao dịch này, tra ở lần kiểm tra thứ n (1-based). */
  existingBookingIdAtLookup?: Record<number, string>;
  /** Lỗi mà `createBookingRecord` sẽ ném. */
  createThrows?: Error;
}): { service: CustomerBookingService; rec: Recorder } {
  const rec: Recorder = { createCalls: 0, refunds: 0, quoteUpdates: [] };
  let lookupCount = 0;

  const dataSource = {
    getRepository: (entity: { name?: string }) => {
      if (entity?.name === 'PaymentEntity') {
        return {
          findOne: () => {
            lookupCount += 1;
            const id = opts.existingBookingIdAtLookup?.[lookupCount];
            return Promise.resolve(id ? { booking: { id } } : null);
          },
        };
      }
      // BookingQuoteEntity
      return {
        update: (_where: unknown, patch: Record<string, unknown>) => {
          rec.quoteUpdates.push(patch);
          return Promise.resolve(undefined);
        },
      };
    },
  };

  const blank = {} as never;
  const service = new CustomerBookingService(
    dataSource as never,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
    blank,
  );

  // Thay hai nhánh nặng bằng bản ghi nhận: test này soi quyết định của
  // `createBookingFromPaidDraft`, không soi việc dựng booking hay cộng ví.
  const internals = service as unknown as {
    createBookingRecord: () => Promise<{ id: string }>;
    refundOnlineDraft: () => Promise<void>;
  };
  internals.createBookingRecord = () => {
    rec.createCalls += 1;
    if (opts.createThrows) throw opts.createThrows;
    return Promise.resolve({ id: 'booking-new' });
  };
  internals.refundOnlineDraft = () => {
    rec.refunds += 1;
    return Promise.resolve(undefined);
  };

  return { service, rec };
}

const makeDraft = (): BookingQuoteEntity =>
  ({
    id: 'draft-1',
    userId: 'user-1',
    customerId: 'cus-1',
    payosOrderCode: 987654,
    totalPrice: 250_000,
    payload: { packageId: 'pkg-1' },
  }) as unknown as BookingQuoteEntity;

/** `createBookingFromPaidDraft` là private — gọi thẳng để test đúng nhánh quyết định. */
const materialize = (
  service: CustomerBookingService,
  draft: BookingQuoteEntity,
): Promise<string | null> =>
  (
    service as unknown as {
      createBookingFromPaidDraft: (
        d: BookingQuoteEntity,
      ) => Promise<string | null>;
    }
  ).createBookingFromPaidDraft(draft);

describe('CustomerBookingService — dựng booking từ đơn nháp đã thu tiền', () => {
  it('gắn lại booking đã có thay vì tạo đơn mới khi lần chạy trước đã tạo xong', async () => {
    // Ca crash-sau-commit: booking tồn tại, draft.booking_id còn trống.
    const { service, rec } = makeService({
      existingBookingIdAtLookup: { 1: 'booking-cu' },
    });
    const draft = makeDraft();

    await expect(materialize(service, draft)).resolves.toBe('booking-cu');

    expect(rec.createCalls).toBe(0);
    expect(rec.refunds).toBe(0);
    expect(draft.bookingId).toBe('booking-cu');
    expect(rec.quoteUpdates).toHaveLength(1);
    expect(rec.quoteUpdates[0]).toMatchObject({ bookingId: 'booking-cu' });
  });

  it('KHÔNG hoàn tiền khi đơn đã tồn tại nhưng lần kiểm tra đầu chưa thấy', async () => {
    // Ca đua: luồng khác commit booking xen vào giữa pre-check và lỗi 409.
    const { service, rec } = makeService({
      existingBookingIdAtLookup: { 2: 'booking-race' },
      createThrows: new ConflictException('Bạn đang có booking chưa kết thúc.'),
    });
    const draft = makeDraft();

    await expect(materialize(service, draft)).resolves.toBe('booking-race');

    expect(rec.refunds).toBe(0);
    expect(draft.bookingId).toBe('booking-race');
  });

  it('vẫn hoàn tiền khi lỗi nghiệp vụ mà thật sự chưa có booking nào', async () => {
    const { service, rec } = makeService({
      createThrows: new ConflictException('Voucher đã hết lượt'),
    });

    await expect(materialize(service, makeDraft())).resolves.toBeNull();

    expect(rec.refunds).toBe(1);
  });

  it('không hoàn tiền khi lỗi hạ tầng — để vòng đối soát thử lại', async () => {
    const boom = new InternalServerErrorException('deadlock detected');
    const { service, rec } = makeService({ createThrows: boom });

    await expect(materialize(service, makeDraft())).rejects.toThrow(boom);

    expect(rec.refunds).toBe(0);
  });
});
