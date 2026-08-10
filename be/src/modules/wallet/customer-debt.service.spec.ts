import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import {
  CustomerDebtEntity,
  CustomerDebtSource,
  CustomerDebtStatus,
  customerDebtOutstanding,
} from './entity/customer-debt.entity';
import { WalletService } from './wallet.service';
import { CustomerDebtService } from './customer-debt.service';

const DAY = 86_400_000;
const SOURCE = CustomerDebtSource.ABSENCE_COMPENSATION;

const makeDebt = (over: Partial<CustomerDebtEntity> = {}): CustomerDebtEntity =>
  ({
    id: 'debt-1',
    customer: { id: 'customer-1' },
    source: SOURCE,
    sourceRefId: 'report-1',
    sourceCode: 'BK-ABS-1',
    originalAmount: 100_000,
    recoveredAmount: 20_000,
    writtenOffAmount: 0,
    status: CustomerDebtStatus.OUTSTANDING,
    createdAt: new Date(Date.now() - 100 * DAY),
    ...over,
  }) as CustomerDebtEntity;

function makeOpenOrWriteOffService(debt: CustomerDebtEntity | null) {
  const saved: CustomerDebtEntity[] = [];
  const removed: CustomerDebtEntity[] = [];
  const repo = {
    findOne: () => Promise.resolve(debt),
    save: (value: CustomerDebtEntity) => {
      saved.push(value);
      return Promise.resolve(value);
    },
    remove: (value: CustomerDebtEntity) => {
      removed.push(value);
      return Promise.resolve(value);
    },
    create: (value: Partial<CustomerDebtEntity>) => ({ ...value }),
    createQueryBuilder: () => {
      const qb: Record<string, unknown> = {};
      for (const method of ['setLock', 'where', 'andWhere', 'orderBy']) {
        qb[method] = () => qb;
      }
      qb.getOne = () => Promise.resolve(debt);
      return qb;
    },
  };
  const manager = { getRepository: () => repo } as never;
  const service = new CustomerDebtService({} as WalletService);
  return { service, manager, saved, removed };
}

describe('CustomerDebtService', () => {
  it('customerDebtOutstanding trừ đúng phần thu hồi và write-off, không âm', () => {
    expect(
      customerDebtOutstanding(
        makeDebt({ recoveredAmount: 30_000, writtenOffAmount: 40_000 }),
      ),
    ).toBe(30_000);
    expect(
      customerDebtOutstanding(
        makeDebt({ recoveredAmount: 90_000, writtenOffAmount: 90_000 }),
      ),
    ).toBe(0);
  });

  describe('openDebt', () => {
    it('tạo nợ mới; gọi lại cùng nguồn giữ nguyên số gốc và không tạo bản ghi thứ hai', async () => {
      const first = makeOpenOrWriteOffService(null);
      const created = await first.service.openDebt(first.manager, {
        customerId: 'customer-1',
        source: SOURCE,
        sourceRefId: 'report-1',
        sourceCode: 'BK-ABS-1',
        amount: 80_000,
      });
      expect(created?.status).toBe(CustomerDebtStatus.OUTSTANDING);
      expect(first.saved).toHaveLength(1);

      const second = makeOpenOrWriteOffService(created);
      await second.service.openDebt(second.manager, {
        customerId: 'customer-1',
        source: SOURCE,
        sourceRefId: 'report-1',
        sourceCode: 'BK-ABS-1',
        amount: 60_000,
      });
      expect(second.saved).toHaveLength(0);
      expect(created?.originalAmount).toBe(80_000);
    });

    it('amount về 0 không xoá bản ghi nguồn cũ', async () => {
      const setup = makeOpenOrWriteOffService(makeDebt());
      await expect(
        setup.service.openDebt(setup.manager, {
          customerId: 'customer-1',
          source: SOURCE,
          sourceRefId: 'report-1',
          amount: 0,
        }),
      ).resolves.toMatchObject({ id: 'debt-1', originalAmount: 100_000 });
      expect(setup.removed).toHaveLength(0);
    });
  });

  it('thu hồi theo nợ cũ trước, chỉ trừ tối đa số dư ví hiện có', async () => {
    const debts = [
      makeDebt({
        id: 'debt-old',
        sourceRefId: 'report-old',
        originalAmount: 50_000,
        recoveredAmount: 0,
      }),
      makeDebt({
        id: 'debt-new',
        sourceRefId: 'report-new',
        originalAmount: 70_000,
        recoveredAmount: 0,
      }),
    ];
    const saved: CustomerDebtEntity[] = [];
    const andWhere = jest.fn();
    const debtRepo = {
      save: (value: CustomerDebtEntity) => {
        saved.push(value);
        return Promise.resolve(value);
      },
      createQueryBuilder: () => {
        const qb: Record<string, unknown> = {};
        for (const method of ['setLock', 'where', 'orderBy']) {
          qb[method] = () => qb;
        }
        qb.andWhere = (...args: unknown[]) => {
          andWhere(...args);
          return qb;
        };
        qb.getMany = () => Promise.resolve(debts);
        return qb;
      },
    };
    const manager = {
      getRepository: (entity: { name?: string }) =>
        entity?.name === CustomerEntity.name
          ? { findOne: () => Promise.resolve({ id: 'customer-1' }) }
          : debtRepo,
    } as never;
    const wallet = {
      getOrCreateCustomerWallet: jest
        .fn()
        .mockResolvedValue({ id: 'wallet-customer', balance: 80_000 }),
      getOrCreateSystemWallet: jest
        .fn()
        .mockResolvedValue({ id: 'wallet-system' }),
      transfer: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CustomerDebtService(wallet as never);

    await expect(
      service.recoverForCustomer(manager, 'customer-1'),
    ).resolves.toBe(80_000);
    expect(wallet.transfer).toHaveBeenNthCalledWith(
      1,
      manager,
      expect.objectContaining({ amount: 50_000, referenceId: 'report-old' }),
    );
    expect(wallet.transfer).toHaveBeenNthCalledWith(
      2,
      manager,
      expect.objectContaining({ amount: 30_000, referenceId: 'report-new' }),
    );
    expect(saved[0].status).toBe(CustomerDebtStatus.RECOVERED);
    expect(saved[1].recoveredAmount).toBe(30_000);
    expect(saved[1].status).toBe(CustomerDebtStatus.OUTSTANDING);
    expect(andWhere).toHaveBeenCalledWith('d.source = :source', {
      source: CustomerDebtSource.ABSENCE_COMPENSATION,
    });
  });

  it('giới hạn số thu theo đúng khoản vừa được credit khi caller truyền ngân sách', async () => {
    const debt = makeDebt({ originalAmount: 100_000, recoveredAmount: 0 });
    const debtRepo = {
      save: jest.fn((value: CustomerDebtEntity) => Promise.resolve(value)),
      createQueryBuilder: () => {
        const qb: Record<string, unknown> = {};
        for (const method of ['setLock', 'where', 'andWhere', 'orderBy']) {
          qb[method] = () => qb;
        }
        qb.getMany = () => Promise.resolve([debt]);
        return qb;
      },
    };
    const manager = {
      getRepository: (entity: { name?: string }) =>
        entity?.name === CustomerEntity.name
          ? { findOne: () => Promise.resolve({ id: 'customer-1' }) }
          : debtRepo,
    } as never;
    const wallet = {
      getOrCreateCustomerWallet: jest
        .fn()
        .mockResolvedValue({ id: 'wallet-customer', balance: 80_000 }),
      getOrCreateSystemWallet: jest
        .fn()
        .mockResolvedValue({ id: 'wallet-system' }),
      transfer: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CustomerDebtService(wallet as never);
    const booking = { id: 'booking-refund-1' } as never;

    await expect(
      service.recoverForCustomer(manager, 'customer-1', 30_000, { booking }),
    ).resolves.toBe(30_000);
    expect(wallet.transfer).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ amount: 30_000, booking }),
    );
    expect(debt.recoveredAmount).toBe(30_000);
  });

  describe('writeOff', () => {
    it('xoá đúng phần còn lại và giữ nguyên số đã thu thật', async () => {
      const debt = makeDebt();
      const setup = makeOpenOrWriteOffService(debt);
      await expect(
        setup.service.writeOff(
          setup.manager,
          debt.id,
          'admin-1',
          'Khách không còn khả năng thu hồi nợ',
          90,
        ),
      ).resolves.toEqual({ writtenOff: 80_000, sourceCode: 'BK-ABS-1' });
      expect(debt.recoveredAmount).toBe(20_000);
      expect(debt.writtenOffAmount).toBe(80_000);
      expect(debt.status).toBe(CustomerDebtStatus.WRITTEN_OFF);
    });

    it('chặn lý do ngắn, khoản hết nợ và khoản chưa đủ tuổi', async () => {
      const short = makeOpenOrWriteOffService(makeDebt());
      await expect(
        short.service.writeOff(short.manager, 'debt-1', 'admin-1', 'ngắn', 90),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      const settled = makeOpenOrWriteOffService(
        makeDebt({ recoveredAmount: 100_000 }),
      );
      await expect(
        settled.service.writeOff(
          settled.manager,
          'debt-1',
          'admin-1',
          'Khoản nợ này đã được thu đủ',
          90,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      const young = makeOpenOrWriteOffService(
        makeDebt({ createdAt: new Date(Date.now() - 10 * DAY) }),
      );
      await expect(
        young.service.writeOff(
          young.manager,
          'debt-1',
          'admin-1',
          'Muốn xoá khoản nợ quá sớm',
          90,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
