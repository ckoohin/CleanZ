import { IncidentAutomationService } from './incident-automation.service';
import { IncidentStateService } from './incident-state.service';

interface AutomationInternals {
  sweepSlaOverdue: () => Promise<number>;
  sweepPayoutOverdue: () => Promise<number>;
}

function makeService(overrides: {
  find?: jest.Mock;
  notify?: jest.Mock;
  execute?: jest.Mock;
}): { service: AutomationInternals; notify: jest.Mock; execute: jest.Mock } {
  const find = overrides.find ?? jest.fn().mockResolvedValue([]);
  const notify = overrides.notify ?? jest.fn();
  const execute = overrides.execute ?? jest.fn().mockResolvedValue(undefined);
  const dataSource = { getRepository: () => ({ find }) } as never;
  const config = {} as never;
  const notifier = { notify } as never;
  const executor = { execute } as never;
  const configService = { get: () => '0' } as never;
  const depositHold = { release: jest.fn() } as never;
  const debtRecovery = {
    recoverForTasker: jest.fn().mockResolvedValue(0),
  } as never;
  const reconciliation = {
    reconcile: jest.fn().mockResolvedValue({
      checkedCount: 0,
      criticalCount: 0,
      discrepancies: [],
    }),
  } as never;
  const alert = { send: jest.fn().mockResolvedValue(false) } as never;
  const state = new IncidentStateService();
  const evidenceLifecycle = {
    purgeAbandonedUploads: jest.fn().mockResolvedValue(0),
  } as never;
  const service = new IncidentAutomationService(
    dataSource,
    config,
    state,
    evidenceLifecycle,
    notifier,
    executor,
    depositHold,
    debtRecovery,
    reconciliation,
    alert,
    configService,
  ) as unknown as AutomationInternals;
  return { service, notify, execute };
}

describe('IncidentAutomationService S7 sweeps', () => {
  describe('sweepSlaOverdue', () => {
    it('warns Tasker & Customer for an overdue incident (distinct dedupe events)', async () => {
      const find = jest.fn().mockResolvedValue([
        {
          id: 'inc-1',
          incidentCode: 'INC-1',
          tasker: { user: { id: 'tasker-user' } },
          customer: { user: { id: 'customer-user' } },
        },
      ]);
      const { service, notify } = makeService({ find });
      const warned = await service.sweepSlaOverdue();

      expect(warned).toBe(1);
      expect(notify).toHaveBeenCalledTimes(2);
      expect(notify).toHaveBeenCalledWith(
        'tasker-user',
        'inc-1',
        expect.any(String),
        expect.any(String),
        'sla-overdue-decision-tasker',
      );
      expect(notify).toHaveBeenCalledWith(
        'customer-user',
        'inc-1',
        expect.any(String),
        expect.any(String),
        'sla-overdue-decision-customer',
      );
    });

    it('does nothing when no incident is overdue', async () => {
      const { service, notify } = makeService({
        find: jest.fn().mockResolvedValue([]),
      });
      expect(await service.sweepSlaOverdue()).toBe(0);
      expect(notify).not.toHaveBeenCalled();
    });
  });

  /**
   * Thay cho `sweepCompRetry` cũ (quét `compensationStatus=FAILED` — giá trị không nơi
   * nào ghi, nên vòng quét đó chưa từng chạy). Tín hiệu thật là sự cố kẹt ở AWAITING_PAYOUT.
   */
  describe('sweepPayoutOverdue', () => {
    it('nhắc Admin đã chốt khi sự cố kẹt ở trạng thái chờ chi trả', async () => {
      const find = jest.fn().mockResolvedValue([
        {
          id: 'inc-1',
          incidentCode: 'INC-1',
          finalizedByAdmin: { id: 'admin-1' },
        },
      ]);
      const { service, notify } = makeService({ find });

      expect(await service.sweepPayoutOverdue()).toBe(1);
      expect(notify).toHaveBeenCalledWith(
        'admin-1',
        'inc-1',
        expect.any(String),
        expect.any(String),
        'payout-overdue',
      );
    });

    it('không nhắc gì khi không có sự cố nào quá hạn chi trả', async () => {
      const { service, notify } = makeService({
        find: jest.fn().mockResolvedValue([]),
      });
      expect(await service.sweepPayoutOverdue()).toBe(0);
      expect(notify).not.toHaveBeenCalled();
    });
  });
});
