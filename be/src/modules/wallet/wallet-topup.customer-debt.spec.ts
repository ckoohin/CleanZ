import { TopupStatus } from 'src/common/enums/topup-status.enum';
import { CustomerEntity } from 'src/modules/customer/entity/customer.entity';
import { CustomerDebtService } from './customer-debt.service';
import { WalletEntity } from './entity/wallet.entity';
import { WalletTopupOrderEntity } from './entity/wallet-topup-order.entity';
import { WalletTransactionEntity } from './entity/wallet-transaction.entity';
import { WalletService } from './wallet.service';
import { WalletTopupService } from './wallet-topup.service';

describe('WalletTopupService — thu hồi nợ khách sau nạp ví', () => {
  it('cộng tiền trước, thu hồi nợ sau và trả số liệu ròng chính xác/idempotent', async () => {
    const customer = { id: 'customer-1' };
    const walletEntity = { id: 'wallet-1', balance: 0 };
    const topup = {
      id: 'topup-1',
      customerId: customer.id,
      taskerId: null,
      walletId: walletEntity.id,
      status: TopupStatus.CREATED,
      amountVnd: 100_000,
      payosOrderCode: 123456,
      walletTxId: null,
      debtRecoveredAmount: 0,
    } as WalletTopupOrderEntity;

    const topupRepo = {
      findOne: () => Promise.resolve(topup),
      save: (value: WalletTopupOrderEntity) => Promise.resolve(value),
    };
    const manager = {
      getRepository: (entity: { name?: string }) => {
        if (entity?.name === WalletTopupOrderEntity.name) return topupRepo;
        if (entity?.name === WalletEntity.name) {
          return { findOne: () => Promise.resolve(walletEntity) };
        }
        if (entity?.name === WalletTransactionEntity.name) {
          return { findOne: () => Promise.resolve({ id: 'tx-topup-1' }) };
        }
        if (entity?.name === CustomerEntity.name) {
          return { findOne: () => Promise.resolve(customer) };
        }
        throw new Error(`Unexpected repository ${entity?.name}`);
      },
    };
    const dataSource = {
      manager,
      getRepository: (entity: { name?: string }) =>
        entity?.name === WalletTopupOrderEntity.name
          ? topupRepo
          : manager.getRepository(entity),
      transaction: <T>(run: (value: typeof manager) => Promise<T>) =>
        run(manager),
    };
    const walletService = {
      creditWallet: jest.fn().mockImplementation(() => {
        walletEntity.balance += 100_000;
        return Promise.resolve(walletEntity);
      }),
    };
    const debtService = {
      recoverForCustomer: jest.fn().mockImplementation(() => {
        expect(walletEntity.balance).toBe(100_000);
        walletEntity.balance -= 60_000;
        return Promise.resolve(60_000);
      }),
    };
    const payos = {
      getPaymentInfo: jest.fn().mockResolvedValue({ status: 'PAID' }),
    };
    const service = new WalletTopupService(
      dataSource as never,
      walletService as unknown as WalletService,
      payos as never,
      {} as never,
      {} as never,
      debtService as unknown as CustomerDebtService,
    );

    await expect(service.captureTopup('user-1', topup.id)).resolves.toEqual({
      topupId: topup.id,
      status: TopupStatus.COMPLETED,
      amountVnd: 100_000,
      balance: 40_000,
      debtRecovered: 60_000,
    });
    expect(debtService.recoverForCustomer).toHaveBeenCalledWith(
      manager,
      customer.id,
      100_000,
    );
    expect(topup.debtRecoveredAmount).toBe(60_000);

    await expect(service.captureTopup('user-1', topup.id)).resolves.toEqual(
      expect.objectContaining({
        balance: 40_000,
        debtRecovered: 60_000,
      }),
    );
    expect(walletService.creditWallet).toHaveBeenCalledTimes(1);
    expect(debtService.recoverForCustomer).toHaveBeenCalledTimes(1);
  });
});
