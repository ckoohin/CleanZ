import { BadRequestException } from '@nestjs/common';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import { TaskerBalanceService } from './tasker-balance.service';

/**
 * Hoa hồng đơn tiền mặt: GIỮ lúc nhận đơn, THU lúc quyết toán.
 *
 * Trước đây chỉ kiểm số dư lúc nhận rồi trừ lúc quyết toán — số dư tụt ở giữa là hỏng
 * việc hoàn tất đơn (rollback cả booking) đúng lúc việc đã làm xong.
 */
function makeService(walletState: { balance: number; holdBalance: number }) {
  const wallet = { id: 'tk-w', ...walletState };

  const walletService = {
    getOrCreateTaskerWallet: jest.fn().mockResolvedValue(wallet),
    holdFunds: jest.fn().mockImplementation((_m, i: { amount: number }) => {
      wallet.balance -= i.amount;
      wallet.holdBalance += i.amount;
      return Promise.resolve(wallet);
    }),
    captureHeldFunds: jest
      .fn()
      .mockImplementation((_m, i: { amount: number }) => {
        wallet.holdBalance -= i.amount;
        return Promise.resolve(wallet);
      }),
    releaseFunds: jest.fn().mockImplementation((_m, i: { amount: number }) => {
      wallet.holdBalance -= i.amount;
      wallet.balance += i.amount;
      return Promise.resolve(wallet);
    }),
    debitWallet: jest.fn().mockImplementation((_m, i: { amount: number }) => {
      wallet.balance -= i.amount;
      return Promise.resolve(wallet);
    }),
  };

  // `lockTaskerWallet` đọc LẠI ví qua repository (FOR UPDATE) nên mock phải trả đúng
  // object ví theo entity, không phải một object rỗng dùng chung.
  /** Nợ tồn đọng do `sumOutstandingDebt` đọc qua repository của sổ nợ. */
  let outstandingDebt = 0;

  // `lockTaskerWallet` đọc LẠI ví qua repository (FOR UPDATE) nên mock phải trả đúng
  // object ví theo entity; `clearHoldMarker` thì ghi mốc hold xuống bảng bookings.
  const manager = {
    getRepository: (entity: { name?: string }) => {
      if (entity?.name === 'WalletEntity') {
        return { findOne: () => Promise.resolve(wallet), update: jest.fn() };
      }
      if (entity?.name === 'TaskerDebtEntity') {
        const qb: Record<string, unknown> = {};
        for (const m of ['select', 'where', 'andWhere']) qb[m] = () => qb;
        qb.getRawOne = () =>
          Promise.resolve({ total: String(outstandingDebt) });
        return { createQueryBuilder: () => qb };
      }
      return {
        findOne: () => Promise.resolve({ id: 'tk-1' }),
        update: jest.fn().mockResolvedValue({}),
      };
    },
  } as never;

  const svc = new TaskerBalanceService(
    walletService as never,
    {} as never,
    {} as never,
  );
  return {
    svc,
    manager,
    walletService,
    wallet,
    setDebt: (v: number) => {
      outstandingDebt = v;
    },
  };
}

const makeBooking = (over: Partial<BookingEntity> = {}): BookingEntity =>
  ({
    id: 'bk-1',
    bookingCode: 'BKG-1',
    tasker: { id: 'tk-1' },
    ...over,
  }) as BookingEntity;

describe('holdCashCommission — giữ phí lúc nhận đơn', () => {
  it('chuyển phí từ số dư sang hold và ghi mốc lên booking', async () => {
    const { svc, manager, wallet } = makeService({
      balance: 500_000,
      holdBalance: 0,
    });
    const booking = makeBooking();

    await svc.holdCashCommission(manager, 'tk-1', booking, 60_000);

    expect(wallet.balance).toBe(440_000);
    expect(wallet.holdBalance).toBe(60_000);
    expect(booking.taskerCommissionHoldAmount).toBe(60_000);
  });

  it('ví không đủ → fail NGAY lúc nhận đơn, không để dồn tới lúc quyết toán', async () => {
    const { svc, manager } = makeService({ balance: 10_000, holdBalance: 0 });
    await expect(
      svc.holdCashCommission(manager, 'tk-1', makeBooking(), 60_000),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('đổi Tasker: giải phóng hold cũ trước rồi mới giữ cho người mới', async () => {
    const { svc, manager, walletService, wallet } = makeService({
      balance: 440_000,
      holdBalance: 60_000,
    });
    const booking = makeBooking({ taskerCommissionHoldAmount: 60_000 });

    await svc.holdCashCommission(manager, 'tk-2', booking, 80_000);

    expect(walletService.releaseFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ amount: 60_000 }),
    );
    expect(wallet.holdBalance).toBe(80_000);
    expect(booking.taskerCommissionHoldAmount).toBe(80_000);
  });

  it('còn nợ bồi thường → chặn nhận đơn tiền mặt (nhưng không chặn loại đơn khác)', async () => {
    const { svc, manager, setDebt } = makeService({
      balance: 500_000,
      holdBalance: 0,
    });
    setDebt(250_000);
    await expect(
      svc.holdCashCommission(manager, 'tk-1', makeBooking(), 60_000),
    ).rejects.toThrow(/còn nợ/);
  });
});

describe('captureCashCommission — thu lúc quyết toán', () => {
  it('phí đúng bằng khoản đã giữ → thu trọn, không đụng số dư khả dụng', async () => {
    const { svc, manager, walletService, wallet } = makeService({
      balance: 440_000,
      holdBalance: 60_000,
    });
    const booking = makeBooking({ taskerCommissionHoldAmount: 60_000 });

    await svc.captureCashCommission(manager, 'tk-1', booking, 60_000);

    expect(walletService.captureHeldFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        amount: 60_000,
        type: WalletTransactionType.PLATFORM_FEE,
      }),
    );
    expect(wallet.balance).toBe(440_000); // số dư không đổi — tiền đã tách từ lúc giữ
    expect(wallet.holdBalance).toBe(0);
    expect(booking.taskerCommissionHoldAmount).toBe(0);
  });

  /**
   * Đây là kịch bản mà cơ chế cũ hỏng: số dư khả dụng bị rút/thu nợ sạch sau khi nhận đơn.
   * Có hold thì quyết toán vẫn thành công.
   */
  it('số dư khả dụng về 0 sau khi nhận đơn → vẫn thu được, đơn hoàn tất bình thường', async () => {
    const { svc, manager, wallet } = makeService({
      balance: 0,
      holdBalance: 60_000,
    });
    const booking = makeBooking({ taskerCommissionHoldAmount: 60_000 });

    await expect(
      svc.captureCashCommission(manager, 'tk-1', booking, 60_000),
    ).resolves.toBeUndefined();
    expect(wallet.holdBalance).toBe(0);
  });

  it('giá đơn giảm → thu đúng phí, trả lại phần giữ thừa', async () => {
    const { svc, manager, walletService, wallet } = makeService({
      balance: 440_000,
      holdBalance: 60_000,
    });
    const booking = makeBooking({ taskerCommissionHoldAmount: 60_000 });

    await svc.captureCashCommission(manager, 'tk-1', booking, 40_000);

    expect(walletService.captureHeldFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ amount: 40_000 }),
    );
    expect(walletService.releaseFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ amount: 20_000 }),
    );
    expect(wallet.balance).toBe(460_000);
    expect(wallet.holdBalance).toBe(0);
  });

  it('giá đơn tăng → thu nốt phần chênh từ số dư (chỉ phần chênh, không phải toàn bộ phí)', async () => {
    const { svc, manager, walletService, wallet } = makeService({
      balance: 440_000,
      holdBalance: 60_000,
    });
    const booking = makeBooking({ taskerCommissionHoldAmount: 60_000 });

    await svc.captureCashCommission(manager, 'tk-1', booking, 75_000);

    expect(walletService.captureHeldFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ amount: 60_000 }),
    );
    expect(walletService.debitWallet).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ amount: 15_000 }),
    );
    expect(wallet.balance).toBe(425_000);
    expect(wallet.holdBalance).toBe(0);
  });
});

describe('releaseCashCommissionHold — huỷ đơn / dọn hold sót', () => {
  it('trả lại toàn bộ khoản giữ về số dư', async () => {
    const { svc, manager, wallet } = makeService({
      balance: 440_000,
      holdBalance: 60_000,
    });
    const booking = makeBooking({ taskerCommissionHoldAmount: 60_000 });

    expect(await svc.releaseCashCommissionHold(manager, booking)).toBe(60_000);
    expect(wallet.balance).toBe(500_000);
    expect(booking.taskerCommissionHoldAmount).toBe(0);
  });

  it('idempotent: gọi lại không giải phóng thêm lần nữa', async () => {
    const { svc, manager, walletService } = makeService({
      balance: 500_000,
      holdBalance: 0,
    });
    const booking = makeBooking({ taskerCommissionHoldAmount: 0 });

    expect(await svc.releaseCashCommissionHold(manager, booking)).toBe(0);
    expect(walletService.releaseFunds).not.toHaveBeenCalled();
  });

  it('ví đã bị giải phóng bằng đường khác → không ném lỗi, chỉ trả phần còn giữ được', async () => {
    const { svc, manager } = makeService({ balance: 500_000, holdBalance: 0 });
    const booking = makeBooking({ taskerCommissionHoldAmount: 60_000 });

    expect(await svc.releaseCashCommissionHold(manager, booking)).toBe(0);
    expect(booking.taskerCommissionHoldAmount).toBe(0);
  });
});
