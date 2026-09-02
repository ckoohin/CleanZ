import { IncidentAutomationService } from './incident-automation.service';
import { IncidentStateService } from './incident-state.service';

interface AutomationInternals {
  sweepSlaOverdue: () => Promise<number>;
  sweepPayoutOverdue: () => Promise<number>;
  sweepReportedExpiry: () => Promise<number>;
}

function makeService(overrides: { find?: jest.Mock; notify?: jest.Mock }): {
  service: AutomationInternals;
  notify: jest.Mock;
} {
  const find = overrides.find ?? jest.fn().mockResolvedValue([]);
  const notify = overrides.notify ?? jest.fn();
  const dataSource = { getRepository: () => ({ find }) } as never;
  const config = {} as never;
  const notifier = { notify } as never;
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
    depositHold,
    debtRecovery,
    reconciliation,
    alert,
    configService,
  ) as unknown as AutomationInternals;
  return { service, notify };
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

/**
 * Khoá cụm cho housekeeping: một lượt quét chỉ được chạy ở MỘT tiến trình. Test dựng
 * DataSource giả trả về kết quả của `pg_try_advisory_lock` để kiểm đúng phần điều phối,
 * không phụ thuộc Postgres thật (đã có int-spec lo phần đó).
 */
describe('IncidentAutomationService — khoá chạy housekeeping', () => {
  function makeWithLock(lockOk: boolean) {
    const query = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('pg_try_advisory_lock')) {
        return Promise.resolve([{ ok: lockOk }]);
      }
      return Promise.resolve([]);
    });
    const release = jest.fn().mockResolvedValue(undefined);
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query,
      release,
    };
    const sweep = jest.fn().mockResolvedValue(0);
    const dataSource = {
      createQueryRunner: () => queryRunner,
      getRepository: () => ({ find: jest.fn().mockResolvedValue([]) }),
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn().mockResolvedValue(0),
    } as never;

    const service = new IncidentAutomationService(
      dataSource,
      {} as never,
      new IncidentStateService(),
      { purgeAbandonedUploads: sweep } as never,
      { notify: jest.fn() } as never,
      { release: jest.fn() } as never,
      { recoverForTasker: jest.fn().mockResolvedValue(0) } as never,
      {
        reconcile: jest.fn().mockResolvedValue({
          checkedCount: 0,
          criticalCount: 0,
          discrepancies: [],
        }),
      } as never,
      { send: jest.fn().mockResolvedValue(false) } as never,
      { get: () => '0' } as never,
    );
    // Từng sweep có đường đi DB riêng và đã được kiểm ở chỗ khác; ở đây chỉ quan tâm phần
    // điều phối khoá, nên thay tất cả bằng một hàm đếm.
    for (const name of [
      'sweepReportedExpiry',
      'sweepAutoClose',
      'sweepSlaOverdue',
      'sweepPayoutOverdue',
      'sweepDebtRecovery',
      'sweepSystemWalletFloat',
      'sweepReconciliation',
      'sweepAbandonedEvidence',
    ]) {
      (service as unknown as Record<string, unknown>)[name] = sweep;
    }
    return { service, query, release, sweep };
  }

  it('không quét gì khi tiến trình khác đang giữ khoá', async () => {
    const { service, query, release, sweep } = makeWithLock(false);

    const r = await service.runHousekeeping();

    expect(r.skipped).toBe(true);
    expect(sweep).not.toHaveBeenCalled();
    // Không sở hữu khoá thì cũng không được nhả — nhả hộ người khác là mở cửa cho
    // hai lượt quét cùng chạy.
    expect(
      query.mock.calls.filter(([sql]: [string]) =>
        sql.includes('pg_advisory_unlock'),
      ),
    ).toHaveLength(0);
    expect(release).toHaveBeenCalled();
  });

  it('chạy rồi nhả khoá và trả connection khi giành được khoá', async () => {
    const { service, query, release, sweep } = makeWithLock(true);

    const r = await service.runHousekeeping();

    expect(r.skipped).toBe(false);
    expect(sweep).toHaveBeenCalled();
    expect(
      query.mock.calls.filter(([sql]: [string]) =>
        sql.includes('pg_advisory_unlock'),
      ),
    ).toHaveLength(1);
    expect(release).toHaveBeenCalled();
  });

  it('vẫn nhả khoá khi một sweep ném lỗi giữa chừng', async () => {
    const { service, query, release } = makeWithLock(true);
    (
      service as unknown as { sweepReportedExpiry: () => Promise<number> }
    ).sweepReportedExpiry = () => Promise.reject(new Error('boom'));

    await expect(service.runHousekeeping()).rejects.toThrow();

    expect(
      query.mock.calls.filter(([sql]: [string]) =>
        sql.includes('pg_advisory_unlock'),
      ),
    ).toHaveLength(1);
    expect(release).toHaveBeenCalled();
  });
});

/**
 * Hồ sơ khách gửi mà quá hạn không ai tiếp nhận thì bị đóng — và trước đây đóng trong IM
 * LẶNG. Khách đã kê khai thiệt hại, tải ảnh, rồi chờ; không báo nghĩa là để họ chờ tiếp một
 * kết quả sẽ không bao giờ tới, trên chính nhánh mà lỗi thuộc về nền tảng chứ không phải họ.
 */
describe('sweepReportedExpiry — không đóng hồ sơ trong im lặng', () => {
  function makeExpiryService(rows: unknown[]) {
    const notify = jest.fn();
    const find = jest.fn().mockResolvedValue(rows);
    const save = jest.fn();
    const manager = {
      getRepository: () => ({ find, save, create: (x: unknown) => x }),
    };
    const dataSource = {
      transaction: (fn: (m: unknown) => Promise<unknown>) => fn(manager),
    } as never;
    const config = {
      getReportedExpiryDays: jest.fn().mockResolvedValue(30),
    } as never;
    const service = new IncidentAutomationService(
      dataSource,
      config,
      new IncidentStateService(),
      { purgeAbandonedUploads: jest.fn() } as never,
      { notify } as never,
      { release: jest.fn() } as never,
      { recoverForTasker: jest.fn() } as never,
      { reconcile: jest.fn() } as never,
      { send: jest.fn() } as never,
      { get: () => '0' } as never,
    ) as unknown as AutomationInternals;
    return { service, notify };
  }

  it('báo cho khách khi hồ sơ của họ bị đóng vì quá hạn tiếp nhận', async () => {
    const { service, notify } = makeExpiryService([
      {
        id: 'inc-1',
        incidentCode: 'INC-1',
        status: 'REPORTED',
        customer: { user: { id: 'customer-user' } },
      },
    ]);

    const closed = await service.sweepReportedExpiry();

    expect(closed).toBe(1);
    expect(notify).toHaveBeenCalledTimes(1);
    const [userId, incidentId, title, content, event] = notify.mock.calls[0];
    expect(userId).toBe('customer-user');
    expect(incidentId).toBe('inc-1');
    expect(title).toMatch(/đóng/i);
    // Phải nói rõ vì sao đóng và làm gì tiếp — "đã đóng" trơ trọi không giúp được gì.
    expect(content).toMatch(/INC-1/);
    expect(content).toMatch(/liên hệ hỗ trợ/i);
    expect(event).toBe('reported-expired');
  });

  it('không có hồ sơ nào quá hạn thì không gửi gì', async () => {
    const { service, notify } = makeExpiryService([]);

    expect(await service.sweepReportedExpiry()).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });
});
