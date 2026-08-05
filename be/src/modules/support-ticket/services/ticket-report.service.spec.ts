/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { ExcelSheetSpec } from 'src/common/helpers/excel-report.helper';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { TicketSource } from 'src/common/enums/ticket-source.enum';
import { EXPORT_MAX_ROWS, TicketReportService } from './ticket-report.service';

const STATS = {
  range: { from: new Date('2026-07-01'), to: new Date('2026-07-31') },
  total: 10,
  byStatus: { NEW: 4, RESOLVED: 6 },
  byCategory: {},
  byPriority: {},
  sla: {
    resolutionBreached: 2,
    firstResponseBreached: 1,
    resolutionComplianceRate: 80,
    firstResponseComplianceRate: 90,
  },
  handling: {
    resolvedCount: 6,
    avgFirstResponseMins: 18.4,
    avgResolutionMins: 742.5,
  },
  csat: {
    invited: 6,
    responses: 4,
    avgRating: 4.3,
    distribution: { '1': 0, '2': 0, '3': 1, '4': 1, '5': 2 },
  },
};

function makeTicket(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    ticketCode: 'TK-0001',
    subject: 'Dọn chưa sạch',
    category: TicketCategory.SERVICE_QUALITY,
    subtype: null,
    priority: TicketPriority.HIGH,
    status: SupportTicketStatus.RESOLVED,
    source: TicketSource.CUSTOMER_APP,
    reporter: { fullName: 'Nguyễn A' },
    counterparty: null,
    assignedAdmin: { fullName: 'Trần B' },
    booking: { bookingCode: 'BK-9' },
    createdAt: new Date('2026-07-01T08:00:00+07:00'),
    firstRespondedAt: new Date('2026-07-01T09:00:00+07:00'),
    resolvedAt: new Date('2026-07-01T18:00:00+07:00'),
    closedAt: null,
    slaPausedAccumMs: '0',
    slaBreached: false,
    firstResponseBreached: false,
    pendingReason: null,
    ...over,
  };
}

function makeService(
  over: {
    tickets?: unknown[];
    count?: number;
    resolutions?: Record<string, unknown>[];
    resolutionBreakdown?: Record<string, unknown>[];
  } = {},
) {
  const qb: Record<string, any> = {};
  for (const m of [
    'leftJoinAndSelect',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'limit',
  ]) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getCount = jest.fn().mockResolvedValue(over.count ?? 1);
  qb.getMany = jest.fn().mockResolvedValue(over.tickets ?? [makeTicket()]);

  const ticketRepo = { createQueryBuilder: jest.fn(() => qb) };

  const query = jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM users WHERE id')) {
      return Promise.resolve([{ name: 'Trần B' }]);
    }
    if (sql.includes('FROM bookings WHERE id')) {
      return Promise.resolve([{ code: 'BK-9' }]);
    }
    // Nhận diện bằng `WHERE ticket_id = ANY` chứ không phải `FROM
    // ticket_resolutions`: query tổng hợp bồi hoàn cũng đọc bảng đó, khớp tên
    // bảng thôi sẽ nuốt luôn nhánh kia.
    if (sql.includes('ticket_resolutions') && sql.includes('ANY($1)')) {
      return Promise.resolve(
        over.resolutions ?? [
          { ticket_id: 't1', type: 'EXPLANATION', amount: null },
          { ticket_id: 't1', type: 'REFUND', amount: '150000' },
        ],
      );
    }
    if (sql.includes('FROM ticket_surveys')) {
      return Promise.resolve([{ ticket_id: 't1', rating: 5 }]);
    }
    if (sql.includes('GROUP BY category')) {
      return Promise.resolve([
        { k: 'SERVICE_QUALITY', c: 6, breached: 3, avg_res: '600' },
      ]);
    }
    if (sql.includes('GROUP BY priority')) {
      return Promise.resolve([{ k: 'HIGH', c: 4, breached: 1, avg_res: null }]);
    }
    if (sql.includes('GROUP BY t.assigned_admin_id')) {
      return Promise.resolve([
        {
          name: 'Trần B',
          total: 8,
          resolved: 6,
          breached: 2,
          avg_res: '720',
          avg_csat: '4.5',
        },
      ]);
    }
    if (sql.includes('GROUP BY r.type')) {
      return Promise.resolve(
        over.resolutionBreakdown ?? [
          { k: 'REFUND', c: 2, total_amount: '300000' },
        ],
      );
    }
    return Promise.resolve([]);
  });

  const statsService = { getStats: jest.fn().mockResolvedValue(STATS) };

  return {
    svc: new TicketReportService(
      ticketRepo as any,
      { query } as any,
      statsService as any,
    ),
    qb,
    statsService,
  };
}

/** Mọi khoá dùng trong `rows` phải có cột tương ứng, nếu không dữ liệu rơi mất im lặng. */
function expectRowsMatchColumns(sheet: ExcelSheetSpec) {
  const keys = new Set(sheet.columns.map((c) => c.key));
  for (const row of sheet.rows) {
    for (const key of Object.keys(row)) {
      expect(keys.has(key)).toBe(true);
    }
  }
}

describe('TicketReportService.buildTicketListSheet', () => {
  it('đổi enum sang nhãn tiếng Việt, không để lọt giá trị thô', async () => {
    const { svc } = makeService();
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(sheet.rows[0]).toMatchObject({
      category: 'Chất lượng dịch vụ',
      priority: 'Cao',
      status: 'Đã giải quyết',
      source: 'Ứng dụng khách hàng',
    });
    expectRowsMatchColumns(sheet);
  });

  it('cộng tiền của MỌI lần ghi nhận, không chỉ lần cuối', async () => {
    // Ticket xử lý 2 bước: giải thích (không tiền) rồi hoàn tiền + bồi thường.
    // Chỉ lấy bản mới nhất thì tổng ở sheet này sẽ lệch với sheet bồi hoàn.
    const { svc } = makeService({
      resolutions: [
        { ticket_id: 't1', type: 'EXPLANATION', amount: null },
        { ticket_id: 't1', type: 'REFUND', amount: '150000' },
        { ticket_id: 't1', type: 'COMPENSATION', amount: '50000' },
      ],
    });
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(sheet.rows[0].outflow).toBe(200000);
    expect(sheet.rows[0].resolutionType).toBe(
      'Giải thích · Hoàn tiền · Bồi thường',
    );
  });

  it('KHÔNG cộng lẫn tiền phạt Tasker vào tiền chi cho khách', async () => {
    // `amount` luôn ≥ 0, dấu nằm ở `type` — gộp một tổng là ra số vô nghĩa.
    const { svc } = makeService({
      resolutions: [
        { ticket_id: 't1', type: 'REFUND', amount: '150000' },
        { ticket_id: 't1', type: 'TASKER_PENALTY', amount: '80000' },
      ],
    });
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(sheet.rows[0].outflow).toBe(150000);
    expect(sheet.rows[0].inflow).toBe(80000);
  });

  it('voucher là bù hiện vật nên không vào cột tiền nào', async () => {
    const { svc } = makeService({
      resolutions: [{ ticket_id: 't1', type: 'VOUCHER', amount: '100000' }],
    });
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(sheet.rows[0].outflow).toBe(0);
    expect(sheet.rows[0].inflow).toBe(0);
    expect(sheet.rows[0].resolutionType).toBe('Voucher');
  });

  it('ticket chưa có kết luận xử lý thì tiền là 0, không phải rỗng', async () => {
    const { svc } = makeService({ resolutions: [] });
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(sheet.rows[0].outflow).toBe(0);
    expect(sheet.rows[0].inflow).toBe(0);
    expect(sheet.rows[0].resolutionType).toBe('Chưa có');
  });

  it('không ép múi giờ khi in mốc lấy từ cột timestamp', async () => {
    // Các cột timestamp lưu sẵn giờ VN dạng wall clock; ép 'Asia/Ho_Chi_Minh'
    // sẽ dịch thêm một lần nữa khi TZ tiến trình không phải VN.
    const created = new Date(2026, 6, 1, 8, 30); // 08:30 giờ địa phương
    const { svc } = makeService({
      tickets: [makeTicket({ createdAt: created })],
    });
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(sheet.rows[0].createdAt).toBe(created.toLocaleString('vi-VN'));
  });

  it('mô tả kỳ lọc đổi thẳng chuỗi ngày, không đi qua Date', async () => {
    const { svc } = makeService();
    const sheet = await svc.buildTicketListSheet({
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    } as any);

    expect(sheet.filterSummary).toContain('01/07/2026 → 31/07/2026');
  });

  it('trừ thời gian SLA tạm dừng khỏi thời gian xử lý', async () => {
    // 10 giờ thô, tạm dừng 2 giờ (bigint → chuỗi) ⇒ còn 8 giờ.
    const { svc } = makeService({
      tickets: [makeTicket({ slaPausedAccumMs: String(2 * 3600 * 1000) })],
    });
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(sheet.rows[0].firstResponseHours).toBe(1);
    expect(sheet.rows[0].resolutionHours).toBe(8);
  });

  it('mốc thời gian còn thiếu thì để gạch ngang, không ra NaN', async () => {
    const { svc } = makeService({
      tickets: [makeTicket({ resolvedAt: null, firstRespondedAt: null })],
    });
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(sheet.rows[0].resolvedAt).toBe('—');
    expect(sheet.rows[0].resolutionHours).toBe('—');
  });

  it('giới hạn 5.000 dòng và nói rõ đã bị cắt trong mô tả sheet', async () => {
    const { svc, qb } = makeService({ count: 12_345 });
    const sheet = await svc.buildTicketListSheet({} as any);

    expect(qb.limit).toHaveBeenCalledWith(EXPORT_MAX_ROWS);
    expect(sheet.subtitle).toContain('12.345');
    expect(sheet.subtitle).toContain('thu hẹp');
  });

  it('luôn chốt thứ tự bằng id để hai lần xuất ra cùng một tập', async () => {
    // Không có tie-breaker thì các ticket trùng mốc tạo có thứ tự tuỳ Postgres,
    // và tập bị cắt ở trần 5.000 dòng sẽ khác nhau giữa hai lần bấm.
    const { svc, qb } = makeService();
    await svc.buildTicketListSheet({} as any);

    expect(qb.addOrderBy).toHaveBeenCalledWith('t.id', 'DESC');
  });

  it('mô tả bộ lọc dịch id sang tên người, không để lộ UUID', async () => {
    const { svc } = makeService();
    const sheet = await svc.buildTicketListSheet({
      status: SupportTicketStatus.NEW,
      assignedAdminId: '0b8a…',
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    } as any);

    expect(sheet.filterSummary).toContain('Trạng thái: Mới');
    expect(sheet.filterSummary).toContain('Phụ trách: Trần B');
    expect(sheet.filterSummary).not.toContain('0b8a');
  });
});

describe('TicketReportService.buildReportSheets', () => {
  it('dựng đủ 7 mục, mục nào cũng có tiêu đề và mô tả kỳ lọc', async () => {
    const { svc } = makeService();
    const sheets = await svc.buildReportSheets({
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });

    expect(sheets).toHaveLength(7);
    for (const sheet of sheets) {
      expect(sheet.title.length).toBeGreaterThan(0);
      expect(sheet.filterSummary).toContain('2026');
      expect(sheet.name.length).toBeLessThanOrEqual(31);
      expectRowsMatchColumns(sheet);
    }
  });

  it('sheet bồi hoàn tách chi/thu, hàng phi tiền mặt để trống', async () => {
    const { svc } = makeService({
      resolutionBreakdown: [
        { k: 'REFUND', c: 2, total_amount: '300000' },
        { k: 'TASKER_PENALTY', c: 3, total_amount: '90000' },
        { k: 'VOUCHER', c: 4, total_amount: '0' },
      ],
    });
    const sheets = await svc.buildReportSheets({});
    const resolution = sheets.find((s) => s.name === 'Kết luận & bồi hoàn')!;

    expect(resolution.rows).toEqual([
      expect.objectContaining({
        label: 'Hoàn tiền',
        direction: 'Chi cho khách',
        outflow: 300000,
        inflow: '',
        avgAmount: 150000,
      }),
      expect.objectContaining({
        label: 'Phạt Tasker',
        direction: 'Thu từ Tasker',
        outflow: '',
        inflow: 90000,
      }),
      // Ô trống, KHÔNG phải 0 — và nhờ vậy không lọt vào công thức SUM.
      expect.objectContaining({
        label: 'Voucher',
        direction: 'Không phải tiền mặt',
        outflow: '',
        inflow: '',
        avgAmount: '',
      }),
    ]);
  });

  it('không có cột nào cộng lẫn hai chiều dòng tiền', async () => {
    const { svc } = makeService();
    const sheets = await svc.buildReportSheets({});
    const resolution = sheets.find((s) => s.name === 'Kết luận & bồi hoàn')!;

    const sumableMoney = resolution.columns
      .filter((c) => c.sumable && c.numFmt?.includes('đ'))
      .map((c) => c.key);
    expect(sumableMoney).toEqual(['outflow', 'inflow']);
  });

  it('sheet Tổng quan có chi ròng = chi trừ thu', async () => {
    const { svc } = makeService({
      resolutionBreakdown: [
        { k: 'REFUND', c: 2, total_amount: '300000' },
        { k: 'COMPENSATION', c: 1, total_amount: '50000' },
        { k: 'TASKER_PENALTY', c: 3, total_amount: '90000' },
      ],
    });
    const [overview] = await svc.buildReportSheets({});
    const byLabel = (label: string) =>
      overview.rows.find((r) => r.label === label)?.value;

    expect(byLabel('Tổng chi bồi hoàn')).toBe(350000);
    expect(byLabel('Tổng thu từ phạt Tasker')).toBe(90000);
    expect(byLabel('Chi ròng')).toBe(260000);
  });

  it('nhãn kỳ lọc dừng ở ngày cuối kỳ, không nhảy sang ngày kế tiếp', () => {
    // Cận trên trong SQL là 00:00 ngày kế tiếp (khoảng nửa mở), nhưng người đọc
    // phải thấy đúng ngày họ chọn — không phải "đến 01/08" cho báo cáo tháng 7.
    const { svc } = makeService();
    const summary = svc.getReportFilterSummary({
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });

    expect(summary).toContain('từ 01/07/2026 đến 31/07/2026');
  });

  it('cận trên là 00:00 ngày kế tiếp để không bỏ sót phần nghìn giây cuối ngày', async () => {
    const { svc, statsService } = makeService();
    await svc.buildReportSheets({
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });

    const [, to] = statsService.getStats.mock.calls[0];
    // 2026-08-01T00:00:00+07:00 — mốc 23:59:59.999 sẽ để lọt bản ghi rơi vào
    // phần micro giây cuối ngày mà cột timestamp của Postgres vẫn ghi được.
    expect(to.toISOString()).toBe('2026-07-31T17:00:00.000Z');
  });

  it('đổi thời gian xử lý trung bình từ phút sang giờ', async () => {
    const { svc } = makeService();
    const [, , category] = await svc.buildReportSheets({});

    expect(category.rows[0]).toMatchObject({
      label: 'Chất lượng dịch vụ',
      avgHours: 10, // 600 phút
      breachRate: 0.5, // 3/6
    });
  });

  it('kỳ chưa có ticket nào thì vẫn ra sheet hợp lệ, không chia cho 0', async () => {
    const { svc, statsService } = makeService();
    statsService.getStats.mockResolvedValue({
      ...STATS,
      total: 0,
      byStatus: {},
      csat: { invited: 0, responses: 0, avgRating: null, distribution: {} },
    });

    const sheets = await svc.buildReportSheets({});
    const csat = sheets[sheets.length - 1];

    expect(csat.rows.every((r) => r.pct === 0)).toBe(true);
  });

  it('mặc định lấy 30 ngày gần nhất khi admin không chọn kỳ', async () => {
    const { svc, statsService } = makeService();
    await svc.buildReportSheets({});

    const [from, to] = statsService.getStats.mock.calls[0];
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });
});
