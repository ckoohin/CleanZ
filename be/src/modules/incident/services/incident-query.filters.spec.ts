import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';
import {
  applyAdminIncidentFilters,
  applyAdminIncidentSort,
} from './incident-query.filters';

/**
 * Bộ lọc này được TÁCH RA từ `IncidentAdminService.list` để dùng chung với
 * luồng xuất Excel. Hàng đợi sự cố là tính năng đang chạy và `list()` trước đó
 * không có test nào phủ — đây là lưới an toàn cho chính việc tách đó.
 */
function makeQb() {
  const calls: { sql: string; params?: Record<string, unknown> }[] = [];
  const orders: unknown[][] = [];
  const qb: any = {
    andWhere: jest.fn((sql: string, params?: Record<string, unknown>) => {
      calls.push({ sql, params });
      return qb;
    }),
    orderBy: jest.fn((...args: unknown[]) => {
      orders.push(['orderBy', ...args]);
      return qb;
    }),
    addOrderBy: jest.fn((...args: unknown[]) => {
      orders.push(['addOrderBy', ...args]);
      return qb;
    }),
  };
  return { qb, calls, orders };
}

describe('applyAdminIncidentFilters', () => {
  it('không áp điều kiện nào khi bộ lọc rỗng', () => {
    const { qb, calls } = makeQb();
    applyAdminIncidentFilters(qb, {});
    expect(calls).toHaveLength(0);
  });

  it('KHÔNG BAO GIỜ gọi .where() — sẽ xoá sạch điều kiện đã set trước đó', () => {
    const { qb } = makeQb();
    applyAdminIncidentFilters(qb, { status: IncidentStatus.REPORTED });
    expect(qb.where).toBeUndefined();
  });

  it('giữ nguyên từng mệnh đề như bản gốc trong list()', () => {
    const { qb, calls } = makeQb();
    applyAdminIncidentFilters(qb, {
      status: IncidentStatus.REVIEWING,
      severity: IncidentSeverity.MAJOR,
      taskerId: 't-1',
      customerId: 'c-1',
    });

    expect(calls.map((c) => c.sql)).toEqual([
      'i.status = :status',
      'i.severity = :sev',
      'i.tasker_id = :tid',
      'i.customer_id = :cid',
    ]);
  });

  /**
   * `decision_due_at` là `timestamp without time zone` lưu giờ VN, còn `now()` trần trả
   * timestamptz và bị ép theo TimeZone của SESSION — UTC qua pooler. So hai thứ đó là
   * hàng đợi quá hạn lệch đúng 7 tiếng, và lệch trong im lặng.
   */
  it('quá hạn: so bằng giờ VN, không phải now() trần, và loại sự cố đã đóng', () => {
    const { qb, calls } = makeQb();
    applyAdminIncidentFilters(qb, { overdue: 'true' });

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe(
      "(i.decision_due_at IS NOT NULL AND i.decision_due_at < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AND i.status <> :closed)",
    );
    expect(calls[0].sql).not.toContain('< now()');
    expect(calls[0].params).toEqual({ closed: IncidentStatus.CLOSED });
  });

  it('trong hạn là PHẦN BÙ của quá hạn, không phải điều kiện rỗng', () => {
    // Chọn "Trong hạn" trước đây không sinh mệnh đề nào: danh sách giữ nguyên
    // trong khi giao diện trông như đã lọc.
    const { qb, calls } = makeQb();
    applyAdminIncidentFilters(qb, { overdue: 'false' });

    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toBe(
      "NOT (i.decision_due_at IS NOT NULL AND i.decision_due_at < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AND i.status <> :closed)",
    );
    expect(calls[0].params).toEqual({ closed: IncidentStatus.CLOSED });
  });

  it('hai nhánh quá hạn/trong hạn phủ định nhau từng ký tự', () => {
    const a = makeQb();
    applyAdminIncidentFilters(a.qb, { overdue: 'true' });
    const b = makeQb();
    applyAdminIncidentFilters(b.qb, { overdue: 'false' });

    expect(b.calls[0].sql).toBe(`NOT ${a.calls[0].sql}`);
  });

  it('kỳ ngày lọc theo reported_at, khoảng nửa mở', () => {
    // `reported_at` mới là trục thời gian nghiệp vụ của sự cố — lọc nhầm sang
    // `created_at` sẽ lệch với chính cột mà hàng đợi đang sắp xếp.
    const { qb, calls } = makeQb();
    applyAdminIncidentFilters(qb, {
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });

    expect(calls[0].sql).toBe('i.reported_at >= :rFrom');
    expect((calls[0].params!.rFrom as Date).toISOString()).toBe(
      '2026-06-30T17:00:00.000Z',
    );
    expect(calls[1].sql).toBe('i.reported_at < :rTo');
    expect((calls[1].params!.rTo as Date).toISOString()).toBe(
      '2026-07-31T17:00:00.000Z',
    );
  });
});

describe('applyAdminIncidentSort', () => {
  it('mặc định: mới báo cáo nhất trước, chốt bằng id', () => {
    const { qb, orders } = makeQb();
    applyAdminIncidentSort(qb, undefined);
    expect(orders).toEqual([
      ['orderBy', 'i.reportedAt', 'DESC'],
      ['addOrderBy', 'i.id', 'DESC'],
    ]);
  });

  it('severity và decisionDueAt đều có tie-breaker', () => {
    const a = makeQb();
    applyAdminIncidentSort(a.qb, 'severity');
    expect(a.orders).toEqual([
      ['orderBy', 'i.severity', 'ASC'],
      ['addOrderBy', 'i.id', 'DESC'],
    ]);

    const b = makeQb();
    applyAdminIncidentSort(b.qb, 'decisionDueAt');
    expect(b.orders).toEqual([
      ['orderBy', 'i.decisionDueAt', 'ASC'],
      ['addOrderBy', 'i.id', 'DESC'],
    ]);
  });
});
