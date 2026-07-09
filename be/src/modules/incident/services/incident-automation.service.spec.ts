import { IncidentAutomationService } from './incident-automation.service';

interface AutomationInternals {
  sweepSlaOverdue: () => Promise<number>;
  sweepCompRetry: () => Promise<number>;
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
  const debtRecovery = { recoverForTasker: jest.fn().mockResolvedValue(0) } as never;
  const reconciliation = {
    reconcile: jest
      .fn()
      .mockResolvedValue({ checkedCount: 0, criticalCount: 0, discrepancies: [] }),
  } as never;
  const alert = { send: jest.fn().mockResolvedValue(false) } as never;
  const service = new IncidentAutomationService(
    dataSource,
    config,
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

  describe('sweepCompRetry', () => {
    it('retries a FAILED incident using the finalizing admin as actor', async () => {
      const find = jest.fn().mockResolvedValue([
        {
          id: 'inc-1',
          incidentCode: 'INC-1',
          finalizedByAdmin: { id: 'admin-1' },
        },
      ]);
      const execute = jest.fn().mockResolvedValue(undefined);
      const { service } = makeService({ find, execute });

      expect(await service.sweepCompRetry()).toBe(1);
      expect(execute).toHaveBeenCalledWith('admin-1', 'inc-1');
    });

    it('skips incidents missing a finalizing admin (no FK actor to log)', async () => {
      const find = jest
        .fn()
        .mockResolvedValue([
          { id: 'inc-1', incidentCode: 'INC-1', finalizedByAdmin: null },
        ]);
      const execute = jest.fn();
      const { service } = makeService({ find, execute });

      expect(await service.sweepCompRetry()).toBe(0);
      expect(execute).not.toHaveBeenCalled();
    });

    it('isolates a per-incident execute failure from the rest', async () => {
      const find = jest.fn().mockResolvedValue([
        { id: 'inc-1', incidentCode: 'INC-1', finalizedByAdmin: { id: 'a1' } },
        { id: 'inc-2', incidentCode: 'INC-2', finalizedByAdmin: { id: 'a2' } },
      ]);
      const execute = jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(undefined);
      const { service } = makeService({ find, execute });

      expect(await service.sweepCompRetry()).toBe(1);
      expect(execute).toHaveBeenCalledTimes(2);
    });
  });
});
