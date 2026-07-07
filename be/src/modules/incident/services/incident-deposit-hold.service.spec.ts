import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';

describe('IncidentDepositHoldService (P0.2)', () => {
  const make = (wallet: Record<string, unknown>) => {
    const walletService = {
      getOrCreateTaskerWallet: jest.fn().mockResolvedValue(wallet),
      holdFunds: jest.fn().mockResolvedValue(wallet),
      releaseFunds: jest.fn().mockResolvedValue(wallet),
    };
    const svc = new IncidentDepositHoldService(walletService as never);
    return { svc, walletService };
  };
  const manager = {} as never;
  const tasker = { id: 'tk-1' } as TaskerEntity;

  it('holdForAccept: giữ = min(claimed, số dư ví)', async () => {
    const { svc, walletService } = make({ id: 'w', balance: 2_000_000 });
    const incident = { id: 'i', claimedAmount: 1_800_000 } as IncidentEntity;
    const held = await svc.holdForAccept(manager, incident, tasker);
    expect(held).toBe(1_800_000);
    expect(incident.taskerWalletHoldAmount).toBe(1_800_000);
    expect(walletService.holdFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        amount: 1_800_000,
        type: WalletTransactionType.DEPOSIT_HOLD,
        referenceType: 'INCIDENT_HOLD',
      }),
    );
  });

  it('holdForAccept: ví ít hơn claimed → chỉ giữ được số dư ví', async () => {
    const { svc, walletService } = make({ id: 'w', balance: 500_000 });
    const incident = { id: 'i', claimedAmount: 1_800_000 } as IncidentEntity;
    const held = await svc.holdForAccept(manager, incident, tasker);
    expect(held).toBe(500_000);
    expect(walletService.holdFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ amount: 500_000 }),
    );
  });

  it('holdForAccept: idempotent — đã giữ rồi thì không giữ lại', async () => {
    const { svc, walletService } = make({ id: 'w', balance: 2_000_000 });
    const incident = {
      id: 'i',
      claimedAmount: 1_800_000,
      taskerWalletHoldAmount: 1_800_000,
    } as IncidentEntity;
    await svc.holdForAccept(manager, incident, tasker);
    expect(walletService.holdFunds).not.toHaveBeenCalled();
  });

  it('release: giải phóng = min(đã giữ, hold_balance) và reset về 0', async () => {
    const { svc, walletService } = make({ id: 'w', holdBalance: 1_800_000 });
    const incident = {
      id: 'i',
      taskerWalletHoldAmount: 1_800_000,
      tasker,
    } as unknown as IncidentEntity;
    const released = await svc.release(manager, incident, tasker);
    expect(released).toBe(1_800_000);
    expect(incident.taskerWalletHoldAmount).toBe(0);
    expect(walletService.releaseFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        amount: 1_800_000,
        type: WalletTransactionType.DEPOSIT_RELEASE,
      }),
    );
  });

  it('release: chưa từng giữ (0) → không gọi releaseFunds', async () => {
    const { svc, walletService } = make({ id: 'w', holdBalance: 0 });
    const incident = { id: 'i', taskerWalletHoldAmount: 0 } as IncidentEntity;
    await svc.release(manager, incident, tasker);
    expect(walletService.releaseFunds).not.toHaveBeenCalled();
  });
});
