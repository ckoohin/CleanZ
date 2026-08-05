import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import {
  applyAdminTicketFilters,
  applyAdminTicketSort,
} from './ticket-query.filters';

/**
 * Bộ lọc này được TÁCH RA từ `TicketAdminService.list` để dùng chung với luồng
 * xuất Excel. Hàng đợi ticket là tính năng đang chạy và trước đó KHÔNG có test
 * nào phủ — nên đây là lưới an toàn cho chính việc tách đó: mỗi điều kiện phải
 * sinh ra đúng mệnh đề SQL và đúng tham số như bản gốc.
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

describe('applyAdminTicketFilters', () => {
  it('không áp điều kiện nào khi bộ lọc rỗng', () => {
    const { qb, calls } = makeQb();
    applyAdminTicketFilters(qb, {});
    expect(calls).toHaveLength(0);
  });

  it('KHÔNG BAO GIỜ gọi .where() — sẽ xoá sạch điều kiện đã set trước đó', () => {
    const { qb } = makeQb();
    applyAdminTicketFilters(qb, { status: SupportTicketStatus.NEW });
    expect(qb.where).toBeUndefined();
  });

  it('giữ nguyên từng mệnh đề như bản gốc trong list()', () => {
    const { qb, calls } = makeQb();
    applyAdminTicketFilters(qb, {
      status: SupportTicketStatus.NEW,
      priority: TicketPriority.HIGH,
      category: TicketCategory.SERVICE_QUALITY,
      reporterUserId: 'r-1',
      assignedAdminId: 'a-1',
      bookingId: 'b-1',
      slaBreached: true,
      keyword: 'TK-2026',
    });

    expect(calls.map((c) => c.sql)).toEqual([
      't.status = :status',
      't.priority = :priority',
      't.category = :category',
      't.reporter_user_id = :rid',
      't.assigned_admin_id = :aid',
      't.booking_id = :bid',
      't.sla_breached = :sb',
      '(t.ticket_code ILIKE :kw OR t.subject ILIKE :kw)',
    ]);
    expect(calls[7].params).toEqual({ kw: '%TK-2026%' });
  });

  it('slaBreached=false vẫn phải được áp, không bị nuốt như giá trị falsy', () => {
    const { qb, calls } = makeQb();
    applyAdminTicketFilters(qb, { slaBreached: false });
    expect(calls).toHaveLength(1);
    expect(calls[0].params).toEqual({ sb: false });
  });

  it('kỳ ngày dùng khoảng nửa mở: >= đầu ngày và < 00:00 ngày kế tiếp', () => {
    const { qb, calls } = makeQb();
    applyAdminTicketFilters(qb, {
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });

    expect(calls[0].sql).toBe('t.created_at >= :cFrom');
    expect((calls[0].params!.cFrom as Date).toISOString()).toBe(
      '2026-06-30T17:00:00.000Z',
    );
    expect(calls[1].sql).toBe('t.created_at < :cTo');
    expect((calls[1].params!.cTo as Date).toISOString()).toBe(
      '2026-07-31T17:00:00.000Z',
    );
  });
});

describe('applyAdminTicketSort', () => {
  it('mặc định: mới nhất trước', () => {
    const { qb, orders } = makeQb();
    applyAdminTicketSort(qb, undefined);
    expect(orders).toEqual([
      ['orderBy', 't.createdAt', 'DESC'],
      ['addOrderBy', 't.id', 'DESC'],
    ]);
  });

  it('priority: URGENT → LOW rồi mới nhất trước', () => {
    const { qb, orders } = makeQb();
    applyAdminTicketSort(qb, 'priority');
    expect(orders[0][1]).toContain("WHEN 'URGENT' THEN 0");
    expect(orders[1]).toEqual(['addOrderBy', 't.createdAt', 'DESC']);
    expect(orders[2]).toEqual(['addOrderBy', 't.id', 'DESC']);
  });

  it('dueAt: gần hạn trước, ticket không có hạn xuống cuối', () => {
    const { qb, orders } = makeQb();
    applyAdminTicketSort(qb, 'dueAt');
    expect(orders[0]).toEqual([
      'orderBy',
      't.resolutionDueAt',
      'ASC',
      'NULLS LAST',
    ]);
    expect(orders[1]).toEqual(['addOrderBy', 't.id', 'DESC']);
  });
});
