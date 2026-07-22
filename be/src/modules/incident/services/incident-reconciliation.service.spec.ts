import { IncidentReconciliationService } from './incident-reconciliation.service';

/**
 * DataSource giả lập: 3 truy vấn theo thứ tự cố định trong reconcile():
 *  (1) danh sách incident COMPENSATED, (2) bút toán ví gộp, (3) danh sách có proof.
 */
function makeService(
  incidents: unknown[],
  txRows: unknown[],
  proofRows: unknown[],
): IncidentReconciliationService {
  let call = 0;
  const dataSource = {
    query: jest.fn().mockImplementation(() => {
      call += 1;
      if (call === 1) return Promise.resolve(incidents);
      if (call === 2) return Promise.resolve(txRows);
      return Promise.resolve(proofRows);
    }),
  } as never;
  return new IncidentReconciliationService(dataSource);
}

const inc = (over: Record<string, unknown> = {}) => ({
  id: 'i1',
  incident_code: 'IC-1',
  decision_version: 1,
  approved: '1000000',
  tasker_borne: '1000000',
  platform_borne: '0',
  recoverable: '1000000',
  uncovered: '0',
  uncovered_recovered: '0',
  ...over,
});

const tx = (type: string, owner: string, amount: string, cnt = 1) => ({
  reference_id: 'i1',
  reference_type: 'INCIDENT_COMPENSATION:v1',
  type,
  owner_type: owner,
  amount,
  cnt: String(cnt),
});

describe('IncidentReconciliationService.reconcile', () => {
  it('digital khớp hoàn hảo → 0 chênh lệch', async () => {
    const svc = makeService(
      [inc()],
      [
        tx('REFUND', 'CUSTOMER', '1000000'),
        tx('DEPOSIT_DEDUCT', 'TASKER', '-1000000'),
        tx('ADJUSTMENT', 'SYSTEM', '0'),
      ],
      [],
    );
    const r = await svc.reconcile();
    expect(r.checkedCount).toBe(1);
    expect(r.discrepancyCount).toBe(0);
  });

  it('digital thiếu REFUND & không proof → CUSTOMER_REFUND_MISSING (CRITICAL)', async () => {
    const svc = makeService([inc()], [], []);
    const r = await svc.reconcile();
    const kinds = r.discrepancies.map((d) => d.kind);
    expect(kinds).toContain('CUSTOMER_REFUND_MISSING');
    expect(r.criticalCount).toBeGreaterThanOrEqual(1);
  });

  it('digital REFUND lệch số tiền → CUSTOMER_REFUND_MISMATCH', async () => {
    const svc = makeService(
      [inc()],
      [
        tx('REFUND', 'CUSTOMER', '900000'),
        tx('DEPOSIT_DEDUCT', 'TASKER', '-1000000'),
      ],
      [],
    );
    const r = await svc.reconcile();
    const d = r.discrepancies.find(
      (x) => x.kind === 'CUSTOMER_REFUND_MISMATCH',
    );
    expect(d).toBeDefined();
    expect(d?.expected).toBe(1000000);
    expect(d?.actual).toBe(900000);
  });

  it('REFUND trùng → DUPLICATE_REFUND', async () => {
    const svc = makeService(
      [inc()],
      [
        tx('REFUND', 'CUSTOMER', '2000000', 2),
        tx('DEPOSIT_DEDUCT', 'TASKER', '-1000000'),
      ],
      [],
    );
    const r = await svc.reconcile();
    expect(r.discrepancies.map((d) => d.kind)).toContain('DUPLICATE_REFUND');
  });

  it('allocation lệch → ALLOCATION_MISMATCH + RECOVERABLE_MISMATCH', async () => {
    const svc = makeService(
      [
        inc({
          approved: '1000000',
          tasker_borne: '600000',
          platform_borne: '300000', // 600+300 ≠ 1000
          recoverable: '500000',
          uncovered: '50000', // 500+50 ≠ 600
        }),
      ],
      [
        tx('REFUND', 'CUSTOMER', '1000000'),
        tx('ADJUSTMENT', 'SYSTEM', '-350000'),
      ],
      [],
    );
    const r = await svc.reconcile();
    const kinds = r.discrepancies.map((d) => d.kind);
    expect(kinds).toContain('ALLOCATION_MISMATCH');
    expect(kinds).toContain('RECOVERABLE_MISMATCH');
  });

  it('manual (không REFUND, có proof) khớp SYSTEM=recoverable → 0 chênh lệch', async () => {
    const svc = makeService(
      [inc()],
      [
        tx('DEPOSIT_DEDUCT', 'TASKER', '-1000000'),
        tx('ADJUSTMENT', 'SYSTEM', '1000000'), // thu hồi từ Tasker về SYSTEM
      ],
      [{ incident_id: 'i1' }],
    );
    const r = await svc.reconcile();
    expect(r.discrepancyCount).toBe(0);
    expect(r.discrepancies).toHaveLength(0);
  });

  it('manual nhưng SYSTEM lệch → SYSTEM_LEDGER_MISMATCH (WARNING)', async () => {
    const svc = makeService(
      [inc()],
      [
        tx('DEPOSIT_DEDUCT', 'TASKER', '-1000000'),
        tx('ADJUSTMENT', 'SYSTEM', '400000'),
      ],
      [{ incident_id: 'i1' }],
    );
    const r = await svc.reconcile();
    const d = r.discrepancies.find((x) => x.kind === 'SYSTEM_LEDGER_MISMATCH');
    expect(d?.severity).toBe('WARNING');
    expect(r.criticalCount).toBe(0);
  });

  it('không có incident nào → report rỗng, không query tx', async () => {
    const svc = makeService([], [], []);
    const r = await svc.reconcile();
    expect(r.checkedCount).toBe(0);
    expect(r.discrepancyCount).toBe(0);
  });
});
