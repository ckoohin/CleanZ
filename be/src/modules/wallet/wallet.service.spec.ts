import { DataSource } from 'typeorm';
import { WalletService } from './wallet.service';

describe('WalletService — chi tiết thu nhập Tasker', () => {
  it('gom giao dịch theo ngày Việt Nam đã lưu trong DB mà không cộng thêm 7 giờ', async () => {
    const vietnamNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const anchor = [
      vietnamNow.getUTCFullYear(),
      String(vietnamNow.getUTCMonth() + 1).padStart(2, '0'),
      String(vietnamNow.getUTCDate()).padStart(2, '0'),
    ].join('-');
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ bucket: anchor, amount: '805500.00' }]),
    };
    const dataSource = {
      manager: {},
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
    } as unknown as DataSource;
    const service = new WalletService(dataSource, undefined as never);

    Object.assign(service, {
      findTaskerByUserId: jest.fn().mockResolvedValue({
        id: 'tasker-id',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      getOrCreateTaskerWallet: jest
        .fn()
        .mockResolvedValue({ id: 'tasker-wallet-id' }),
    });

    const result = await service.getMyTaskerEarningsBreakdown(
      'tasker-user-id',
      'today',
      anchor,
    );

    expect(queryBuilder.select).toHaveBeenCalledWith(
      "TO_CHAR(DATE_TRUNC('day', tx.createdAt), 'YYYY-MM-DD')",
      'bucket',
    );
    expect(result).toMatchObject({
      selectedValue: anchor,
      total: 805_500,
      points: [{ key: anchor, amount: 805_500 }],
    });
  });
});
