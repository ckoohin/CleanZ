import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';

describe('IncidentDepositHoldService (P0.2)', () => {
  const make = (wallet: Record<string, unknown>, policyCap = 10_000_000) => {
    const walletService = {
      getOrCreateTaskerWallet: jest.fn().mockResolvedValue(wallet),
      holdFunds: jest.fn().mockResolvedValue(wallet),
      releaseFunds: jest.fn().mockResolvedValue(wallet),
    };
    const config = {
      getCompensationPolicyCap: jest.fn().mockResolvedValue(policyCap),
    };
    const svc = new IncidentDepositHoldService(
      walletService as never,
      config as never,
    );
    return { svc, walletService };
  };
  const manager = {} as never;
  const tasker = { id: 'tk-1' } as TaskerEntity;

  it('holdForAccept: giữ = min(claimed, trần chính sách, số dư ví)', async () => {
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

  /**
   * Khách tự khai số yêu cầu; trách nhiệm tối đa thật của Tasker là trần chính sách.
   * Không chặn theo trần thì khai khống sát trần claim sẽ đóng băng ví gấp đôi rủi ro thật.
   */
  it('holdForAccept: khách khai vượt trần chính sách → chỉ giữ tới trần', async () => {
    const { svc, walletService } = make(
      { id: 'w', balance: 50_000_000 },
      10_000_000,
    );
    const incident = { id: 'i', claimedAmount: 20_000_000 } as IncidentEntity;

    const held = await svc.holdForAccept(manager, incident, tasker);

    expect(held).toBe(10_000_000);
    expect(walletService.holdFunds).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ amount: 10_000_000 }),
    );
  });

  it('holdForAccept: khai dưới trần → vẫn giữ đúng số khai', async () => {
    const { svc } = make({ id: 'w', balance: 50_000_000 }, 10_000_000);
    const incident = { id: 'i', claimedAmount: 3_000_000 } as IncidentEntity;
    expect(await svc.holdForAccept(manager, incident, tasker)).toBe(3_000_000);
  });

  describe('shrinkTo — co về mức rủi ro còn lại sau thẩm định', () => {
    const drafted = (held: number): IncidentEntity =>
      ({
        id: 'i',
        incidentCode: 'IC-1',
        taskerWalletHoldAmount: held,
        tasker,
      }) as unknown as IncidentEntity;

    it('trả lại đúng phần giữ thừa so với số Tasker phải chịu', async () => {
      const { svc, walletService } = make({ id: 'w', holdBalance: 8_000_000 });
      const incident = drafted(8_000_000);

      expect(await svc.shrinkTo(manager, incident, 1_500_000)).toBe(1_500_000);
      expect(incident.taskerWalletHoldAmount).toBe(1_500_000);
      expect(walletService.releaseFunds).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          amount: 6_500_000,
          type: WalletTransactionType.DEPOSIT_RELEASE,
          referenceType: 'INCIDENT_HOLD',
        }),
      );
    });

    /** Nới thêm = siết tiền mới về của Tasker dựa trên một bản nháp chưa chốt. */
    it('không bao giờ nới thêm khi số phải chịu lớn hơn phần đang giữ', async () => {
      const { svc, walletService } = make({ id: 'w', holdBalance: 500_000 });
      const incident = drafted(500_000);

      expect(await svc.shrinkTo(manager, incident, 3_000_000)).toBe(500_000);
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
      expect(incident.taskerWalletHoldAmount).toBe(500_000);
    });

    it('gọi lại với cùng số → không nhả thêm lần nữa (idempotent)', async () => {
      const { svc, walletService } = make({ id: 'w', holdBalance: 2_000_000 });
      const incident = drafted(2_000_000);

      await svc.shrinkTo(manager, incident, 2_000_000);
      expect(walletService.releaseFunds).not.toHaveBeenCalled();
    });

    /** Không tin `hold_amount` trên hồ sơ hơn số thật trong ví. */
    it('không nhả quá số ví đang thực giữ', async () => {
      const { svc, walletService } = make({ id: 'w', holdBalance: 1_000_000 });
      const incident = drafted(8_000_000);

      await svc.shrinkTo(manager, incident, 0);
      expect(walletService.releaseFunds).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({ amount: 1_000_000 }),
      );
      expect(incident.taskerWalletHoldAmount).toBe(7_000_000);
    });
  });
});
