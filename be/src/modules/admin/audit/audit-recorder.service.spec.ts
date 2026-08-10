import { EntityManager } from 'typeorm';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';
import { AuditActionCode } from './audit-action-codes';
import { AuditContext, AuditContextValue } from './audit-context';
import { AuditRecorder } from './audit-recorder.service';

describe('AuditRecorder', () => {
  const CORRELATION_ID = '33333333-3333-4333-8333-333333333333';

  function makeManager() {
    const saved: Record<string, unknown>[] = [];
    const repo = {
      create: (row: Record<string, unknown>) => row,
      save: (row: Record<string, unknown>) => {
        saved.push(row);
        return Promise.resolve(row);
      },
    };
    return {
      saved,
      manager: { getRepository: () => repo } as unknown as EntityManager,
    };
  }

  function context(): AuditContextValue {
    return {
      correlationId: CORRELATION_ID,
      actorUserId: 'admin-1',
      actorEmail: 'admin@cleanz.vn',
      method: 'POST',
      path: '/api/v1/admin/finance/transactions/adjustment',
      handler: 'FinanceController.createAdjustment',
      resource: 'tài chính',
      startedAt: Date.now(),
    };
  }

  const recorder = new AuditRecorder({} as never);

  const input = {
    actionCode: AuditActionCode.WALLET_MANUAL_ADJUSTMENT,
    severity: AuditSeverity.CRITICAL,
    targetType: 'WALLET',
    targetId: 'wallet-1',
    reason: '  Bồi thường sự cố tháng 6  ',
    businessData: { amount: -500_000, balanceBefore: 900_000 },
  };

  it('ghi outbox bằng manager của transaction đang chạy', async () => {
    const { saved, manager } = makeManager();

    await AuditContext.run(context(), () =>
      recorder.enqueueInTransaction(manager, input),
    );

    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ correlationId: CORRELATION_ID });
    const payload = saved[0].payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      actionCode: AuditActionCode.WALLET_MANUAL_ADJUSTMENT,
      severity: AuditSeverity.CRITICAL,
      actorUserId: 'admin-1',
      targetId: 'wallet-1',
      correlationId: CORRELATION_ID,
      reason: 'Bồi thường sự cố tháng 6',
    });
  });

  /**
   * Cờ này là thứ ngăn interceptor ghi thêm một dòng nữa cho cùng một việc.
   * Mất cờ thì mỗi lệnh chuyển tiền sinh ra hai bản ghi nhật ký khác nhau về cùng
   * một sự kiện — và người đọc không có cách nào biết đâu là bản đúng.
   */
  it('đánh dấu đã ghi trong transaction để interceptor không ghi trùng', async () => {
    const { manager } = makeManager();

    await AuditContext.run(context(), async () => {
      expect(AuditContext.wasRecordedInTransaction()).toBe(false);
      await recorder.enqueueInTransaction(manager, input);
      expect(AuditContext.wasRecordedInTransaction()).toBe(true);
    });
  });

  // Cron và worker chạy ngoài request admin. Đây là nhật ký THAO TÁC ADMIN, nên
  // ghi lại việc một job nền chạy là ghi sai loại sự kiện, không phải ghi thừa.
  it('không ghi gì khi chạy ngoài ngữ cảnh admin', async () => {
    const { saved, manager } = makeManager();

    await recorder.enqueueInTransaction(manager, input);

    expect(saved).toHaveLength(0);
  });

  it('che dữ liệu nhạy cảm trong businessData', async () => {
    const { saved, manager } = makeManager();

    await AuditContext.run(context(), () =>
      recorder.enqueueInTransaction(manager, {
        ...input,
        businessData: { amount: 1, password: 'sieu-mat' },
      }),
    );

    const payload = saved[0].payload as Record<string, unknown>;
    const businessData = payload.businessData as Record<string, unknown>;
    expect(businessData.amount).toBe(1);
    expect(businessData.password).not.toBe('sieu-mat');
  });
});
