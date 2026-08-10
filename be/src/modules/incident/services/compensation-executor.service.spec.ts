import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { CompensationExecutorService } from './compensation-executor.service';

describe('CompensationExecutorService — helper dòng tiền', () => {
  const service = new CompensationExecutorService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  ) as unknown as {
    assertCompensationPreconditions: (incident: IncidentEntity) => void;
    assertCompensationInvariant: (incident: IncidentEntity) => void;
    buildCustomerRecordedPayload: (
      incident: IncidentEntity,
    ) => Record<string, unknown>;
    applyDepositRecoverySnapshot: (
      incident: IncidentEntity,
      availableDeposit: number,
    ) => void;
  };

  it('chặn chi trả khi quyết định chưa chốt', () => {
    for (const status of [
      IncidentStatus.REVIEWING,
      IncidentStatus.AWAITING_RESPONSE,
      IncidentStatus.REPORTED,
    ]) {
      expect(() =>
        service.assertCompensationPreconditions({ status } as IncidentEntity),
      ).toThrow(ConflictException);
    }
  });

  it('cho chi trả khi đang chờ chi (AWAITING_PAYOUT)', () => {
    expect(() =>
      service.assertCompensationPreconditions({
        status: IncidentStatus.AWAITING_PAYOUT,
      } as IncidentEntity),
    ).not.toThrow();
  });

  it('không chi trả lần hai cho sự cố đã chi', () => {
    expect(() =>
      service.assertCompensationPreconditions({
        status: IncidentStatus.COMPENSATED,
      } as IncidentEntity),
    ).toThrow(ConflictException);
  });

  it('rejects invalid compensation allocation invariant', () => {
    expect(() =>
      service.assertCompensationInvariant({
        approvedCompensationAmount: 1_000_000,
        taskerBorneAmount: 400_000,
        platformBorneAmount: 500_000,
      } as IncidentEntity),
    ).toThrow(UnprocessableEntityException);
  });

  it('builds customer recorded payload without internal split', () => {
    const payload = service.buildCustomerRecordedPayload({
      id: 'incident-1',
      incidentCode: 'IC-1',
      decisionVersion: 4,
      approvedCompensationAmount: 1_000_000,
      taskerBorneAmount: 400_000,
      platformBorneAmount: 600_000,
      allocationReason: 'internal',
      internalDecisionNote: 'admin-only',
    } as IncidentEntity);

    expect(payload).toMatchObject({
      incidentId: 'incident-1',
      incidentCode: 'IC-1',
      decisionVersion: 4,
      approvedAmount: 1_000_000,
    });
    expect(payload).not.toHaveProperty('taskerBorneAmount');
    expect(payload).not.toHaveProperty('platformBorneAmount');
    expect(payload).not.toHaveProperty('allocationReason');
    expect(payload).not.toHaveProperty('internalDecisionNote');
  });

  describe('applyDepositRecoverySnapshot (C2) — available = ví + cọc', () => {
    const snap = (taskerBorne: number, availableDeposit: number) => {
      const e = { taskerBorneAmount: taskerBorne } as IncidentEntity;
      service.applyDepositRecoverySnapshot(e, availableDeposit);
      return {
        depositBalanceSnapshot: e.depositBalanceSnapshot,
        recoverableFromDepositAmount: e.recoverableFromDepositAmount,
        uncoveredLiabilityAmount: e.uncoveredLiabilityAmount,
      };
    };

    it('quỹ khả dụng (ví+cọc) đủ: recoverable = toàn bộ Tasker chịu, không nợ', () => {
      // ví 3tr + cọc 2tr = 5tr ≥ 1.5tr chịu
      expect(snap(1_500_000, 5_000_000)).toEqual({
        depositBalanceSnapshot: 5_000_000,
        recoverableFromDepositAmount: 1_500_000,
        uncoveredLiabilityAmount: 0,
      });
    });

    it('quỹ khả dụng thiếu: recoverable giới hạn bởi quỹ, phần còn lại là nợ', () => {
      // ví 0.6tr + cọc 0.4tr = 1tr < 1.5tr chịu
      expect(snap(1_500_000, 1_000_000)).toEqual({
        depositBalanceSnapshot: 1_000_000,
        recoverableFromDepositAmount: 1_000_000,
        uncoveredLiabilityAmount: 500_000,
      });
    });

    it('Quỹ nền tảng chịu toàn bộ (Tasker chịu 0): không thu hồi, không nợ', () => {
      expect(snap(0, 5_000_000)).toEqual({
        depositBalanceSnapshot: 5_000_000,
        recoverableFromDepositAmount: 0,
        uncoveredLiabilityAmount: 0,
      });
    });

    it('không có quỹ khả dụng: recoverable = 0, toàn bộ Tasker chịu thành nợ', () => {
      expect(snap(1_000_000, 0)).toEqual({
        depositBalanceSnapshot: 0,
        recoverableFromDepositAmount: 0,
        uncoveredLiabilityAmount: 1_000_000,
      });
    });
  });

  describe('settleCompensation (P2.1) — chuyển tiền thật, bảo toàn tổng', () => {
    const makeSvc = (walletService: Record<string, jest.Mock>) =>
      new CompensationExecutorService(
        {} as never,
        {} as never,
        {} as never,
        walletService as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      ) as unknown as {
        settleCompensation: (
          manager: unknown,
          incident: IncidentEntity,
          taskerWallet: unknown,
        ) => Promise<void>;
        settleManual: (
          manager: unknown,
          incident: IncidentEntity,
          taskerWallet: unknown,
        ) => Promise<void>;
      };

    it('cọc thiếu: trừ ví Tasker (recoverable), hoàn ví Customer (approved), quỹ SYSTEM chi platform+uncovered', async () => {
      const walletService = {
        debitWallet: jest.fn().mockResolvedValue({}),
        creditWallet: jest.fn().mockResolvedValue({}),
        getOrCreateCustomerWallet: jest
          .fn()
          .mockResolvedValue({ id: 'cust-w' }),
        getOrCreateSystemWallet: jest
          .fn()
          .mockResolvedValue({ id: 'sys-w', balance: 5_000_000 }),
      };
      const svc = makeSvc(walletService);
      const manager = { getRepository: () => ({ update: jest.fn() }) };
      const taskerWallet = { id: 'tk-w', balance: 1_000_000 };
      const incident = {
        id: 'inc-1',
        incidentCode: 'IC-1',
        decisionVersion: 2,
        approvedCompensationAmount: 1_500_000,
        recoverableFromDepositAmount: 1_000_000,
        uncoveredLiabilityAmount: 500_000,
        platformBorneAmount: 0,
        tasker: { id: 'tk-1' },
        customer: { id: 'cus-1' },
      } as unknown as IncidentEntity;

      await svc.settleCompensation(manager, incident, taskerWallet);

      // Trừ ví Tasker = recoverable (1tr) — DEPOSIT_DEDUCT
      expect(walletService.debitWallet).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          wallet: taskerWallet,
          amount: 1_000_000,
          type: WalletTransactionType.DEPOSIT_DEDUCT,
          referenceType: 'INCIDENT_COMPENSATION:v2',
        }),
      );
      // Hoàn ví Customer = approved (1.5tr) — REFUND
      expect(walletService.creditWallet).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          amount: 1_500_000,
          type: WalletTransactionType.REFUND,
        }),
      );
      // Quỹ SYSTEM chi platform(0)+uncovered(0.5tr) = 0.5tr — ADJUSTMENT
      expect(walletService.debitWallet).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          amount: 500_000,
          type: WalletTransactionType.ADJUSTMENT,
        }),
      );
      // Bảo toàn: tasker 1tr + system 0.5tr = customer 1.5tr
    });

    it('quỹ SYSTEM không đủ → ném lỗi (rollback)', async () => {
      const walletService = {
        debitWallet: jest.fn().mockResolvedValue({}),
        creditWallet: jest.fn().mockResolvedValue({}),
        getOrCreateCustomerWallet: jest
          .fn()
          .mockResolvedValue({ id: 'cust-w' }),
        getOrCreateSystemWallet: jest
          .fn()
          .mockResolvedValue({ id: 'sys-w', balance: 100_000 }),
      };
      const svc = makeSvc(walletService);
      const manager = { getRepository: () => ({ update: jest.fn() }) };
      const incident = {
        id: 'inc-2',
        decisionVersion: 2,
        approvedCompensationAmount: 1_500_000,
        recoverableFromDepositAmount: 1_000_000,
        uncoveredLiabilityAmount: 500_000,
        platformBorneAmount: 0,
        tasker: { id: 'tk' },
        customer: { id: 'cus' },
      } as unknown as IncidentEntity;

      await expect(
        svc.settleCompensation(manager, incident, {
          id: 'tk-w',
          balance: 1_000_000,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('settleManual — chi trả thủ công', () => {
    const makeSvc = (walletService: Record<string, jest.Mock>) =>
      new CompensationExecutorService(
        {} as never,
        {} as never,
        {} as never,
        walletService as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      ) as unknown as {
        settleManual: (
          manager: unknown,
          incident: IncidentEntity,
          taskerWallet: unknown,
        ) => Promise<void>;
      };

    const incident = {
      id: 'inc-m',
      incidentCode: 'IC-M',
      decisionVersion: 1,
      approvedCompensationAmount: 1_500_000,
      recoverableFromDepositAmount: 1_000_000,
      uncoveredLiabilityAmount: 200_000,
      platformBorneAmount: 300_000,
      tasker: { id: 'tk' },
      customer: { id: 'cus' },
    } as unknown as IncidentEntity;

    const walletMocks = () => ({
      debitWallet: jest.fn().mockResolvedValue({}),
      creditWallet: jest.fn().mockResolvedValue({}),
      getOrCreateSystemWallet: jest.fn().mockResolvedValue({ id: 'sys-w' }),
      getOrCreateCustomerWallet: jest.fn(),
    });

    it('trừ ví Tasker phần thu hồi được và chuyển về ví SYSTEM', async () => {
      const walletService = walletMocks();
      const taskerWallet = { id: 'tk-w', balance: 1_000_000 };
      await makeSvc(walletService).settleManual({}, incident, taskerWallet);

      expect(walletService.debitWallet).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          wallet: taskerWallet,
          amount: 1_000_000,
          type: WalletTransactionType.DEPOSIT_DEDUCT,
        }),
      );
      expect(walletService.creditWallet).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          amount: 1_000_000,
          type: WalletTransactionType.ADJUSTMENT,
        }),
      );
    });

    it('KHÔNG debit ví SYSTEM — luồng này chạy đúng lúc ví SYSTEM đang cạn', async () => {
      const walletService = walletMocks();
      await makeSvc(walletService).settleManual({}, incident, {
        id: 'tk-w',
        balance: 1_000_000,
      });
      const systemDebits = walletService.debitWallet.mock.calls.filter(
        (c) => (c[1] as { wallet: { id: string } }).wallet.id === 'sys-w',
      );
      expect(systemDebits).toHaveLength(0);
    });

    it('không hoàn ví Khách (tiền đã chuyển khoản ngoài)', async () => {
      const walletService = walletMocks();
      await makeSvc(walletService).settleManual({}, incident, {
        id: 'tk-w',
        balance: 1_000_000,
      });
      expect(walletService.getOrCreateCustomerWallet).not.toHaveBeenCalled();
    });
  });
});
