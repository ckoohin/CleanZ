import { AuditOutboxStatus } from 'src/common/enums/audit-outbox-status.enum';
import { AuditSeverity } from 'src/common/enums/audit-severity.enum';
import { AdminActivityStatus } from '../entities/admin-activity-log.entity';
import { AuditOutboxWorkerService } from './audit-outbox-worker.service';
import { AuditActionCode } from './audit-action-codes';

/**
 * Điểm dễ sai nhất của kiến trúc outbox: nhật ký được GHI ở một thời điểm khác
 * hẳn thời điểm thao tác XẢY RA. Nếu dấu thời gian lấy theo lúc worker chạy thì
 * mọi bản ghi lệch ít nhất một chu kỳ quét, và hai thao tác sẽ ĐẢO THỨ TỰ khi một
 * trong hai phải retry — dòng thời gian dựng lại từ nhật ký kể sai trình tự sự việc.
 */
describe('AuditOutboxWorkerService', () => {
  const OCCURRED_AT = new Date('2026-08-09T03:00:00.000Z');

  function makeWorker(
    row: Record<string, unknown> | null,
    opts: { failInsert?: boolean } = {},
  ) {
    const insertedLogs: Record<string, unknown>[] = [];
    const savedOutbox: Record<string, unknown>[] = [];

    const logRepo = {
      create: (value: Record<string, unknown>) => value,
      save: (value: Record<string, unknown>) => {
        if (opts.failInsert) throw new Error('insert hỏng');
        insertedLogs.push(value);
        return Promise.resolve(value);
      },
    };
    const outboxRepo = {
      save: (value: Record<string, unknown>) => {
        savedOutbox.push(value);
        return Promise.resolve(value);
      },
    };

    const manager = {
      getRepository: (target: unknown) =>
        typeof target === 'function' && target.name.includes('AdminActivityLog')
          ? logRepo
          : outboxRepo,
      query: () =>
        Promise.resolve([{ now: new Date('2026-08-09T03:05:00.000Z') }]),
    };

    const dataSource = {
      transaction: (fn: (m: unknown) => Promise<unknown>) => fn(manager),
    };

    const alerts: Array<{ key: string; severity: string }> = [];
    const alert = {
      send: (key: string, _message: string, severity: string) => {
        alerts.push({ key, severity });
        return Promise.resolve(true);
      },
    };

    const worker = new AuditOutboxWorkerService(
      dataSource as never,
      alert as never,
      {
        get: () => undefined,
      } as never,
    );

    // `lockNextDueRow` chạy SQL thật, thay bằng hàng đã dựng sẵn. Trả đúng MỘT
    // lần rồi hết — hàng đã xử lý không còn tới hạn nên vòng lặp phải dừng lại,
    // trả mãi một hàng sẽ chạy đủ 50 lượt của batch.
    const remaining = row ? [row] : [];
    (
      worker as unknown as { lockNextDueRow: () => Promise<unknown> }
    ).lockNextDueRow = () => Promise.resolve(remaining.shift() ?? null);

    return { worker, insertedLogs, savedOutbox, alerts };
  }

  const payload = {
    actorUserId: 'admin-1',
    actorEmail: 'admin@cleanz.vn',
    action: 'Điều chỉnh ví',
    actionCode: AuditActionCode.WALLET_MANUAL_ADJUSTMENT,
    severity: AuditSeverity.CRITICAL,
    resource: 'tài chính',
    method: 'POST',
    path: '/api/v1/admin/finance/transactions/adjustment',
    handler: 'FinanceController.createAdjustment',
    targetId: 'wallet-1',
    changes: null,
    status: AdminActivityStatus.SUCCESS,
    statusCode: 200,
    errorMessage: null,
    durationMs: 12,
    correlationId: '44444444-4444-4444-8444-444444444444',
  };

  it('ghi nhật ký với dấu thời gian lúc THAO TÁC xảy ra, không phải lúc worker chạy', async () => {
    const row = {
      id: 'outbox-1',
      payload,
      occurredAt: OCCURRED_AT,
      retryCount: 0,
      status: AuditOutboxStatus.PENDING,
    };
    const { worker, insertedLogs } = makeWorker(row);

    const result = await worker.runDueBatch();

    expect(result.applied).toBe(1);
    expect(insertedLogs).toHaveLength(1);
    expect(insertedLogs[0].createdAt).toEqual(OCCURRED_AT);
    expect(insertedLogs[0].actionCode).toBe(
      AuditActionCode.WALLET_MANUAL_ADJUSTMENT,
    );
  });

  /**
   * Bản ghi hết số lần thử = hệ thống đã mất vĩnh viễn khả năng trả lời "ai đã
   * làm gì" cho một thao tác đã xảy ra thật. Nếu chỉ nằm trong log console thì
   * không ai biết, và càng phát hiện muộn thì càng không còn gì để dựng lại.
   */
  it('bắn cảnh báo CRITICAL khi bản ghi chết vĩnh viễn', async () => {
    const row = {
      id: 'outbox-2',
      payload,
      occurredAt: OCCURRED_AT,
      // maxRetries mặc định là 5 → lần thử này là lần thứ 5, hết đường lùi.
      retryCount: 4,
      status: AuditOutboxStatus.FAILED,
    };
    const { worker, alerts, savedOutbox } = makeWorker(row, {
      failInsert: true,
    });
    // `countTerminalFailedRows` chạy QueryBuilder thật; chỉ dùng để ghép số vào
    // nội dung cảnh báo nên thay bằng hằng số.
    const internals = worker as unknown as {
      countTerminalFailedRows: () => Promise<number>;
      runSilently: () => Promise<void>;
    };
    internals.countTerminalFailedRows = () => Promise.resolve(1);

    // Đi qua `runSilently` — đó mới là đường bộ đếm giờ chạy, và cũng là nơi duy
    // nhất phát cảnh báo. Gọi thẳng `runDueBatch` sẽ bỏ qua bước này.
    await internals.runSilently();

    expect(alerts).toEqual([
      { key: 'audit-outbox-terminal-failed', severity: 'CRITICAL' },
    ]);
    // Payload phải còn lại để dựng tay, kèm dấu vết vì sao hỏng.
    expect(savedOutbox[0]).toMatchObject({ status: AuditOutboxStatus.FAILED });
    expect(savedOutbox[0].lastError).toContain('insert hỏng');
  });

  it('không còn hàng tới hạn thì dừng, không lặp hết batch', async () => {
    const { worker, insertedLogs } = makeWorker(null);

    const result = await worker.runDueBatch();

    expect(result).toEqual({
      processed: 0,
      applied: 0,
      failed: 0,
      terminalFailed: 0,
    });
    expect(insertedLogs).toHaveLength(0);
  });
});
