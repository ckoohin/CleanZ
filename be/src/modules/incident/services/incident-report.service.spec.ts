/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { ExcelSheetSpec } from 'src/common/helpers/excel-report.helper';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import {
  INCIDENT_EXPORT_MAX_ROWS,
  IncidentReportService,
} from './incident-report.service';

const OVERVIEW = {
  total: 10,
  finalized: 8,
  compensated: 6,
  rejected: 1,
  overdue: 2,
  avg_mins: '600',
  claimed: '5000000',
  approved: '3000000',
  tasker_borne: '2000000',
  platform_borne: '1000000',
  recovered: '1500000',
  uncovered: '500000',
  external_payout: '250000',
};

function makeIncident(over: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    incidentCode: 'SC-0001',
    title: 'Vỡ bình hoa',
    type: 'PROPERTY_DAMAGE',
    source: 'CUSTOMER_REPORT',
    severity: IncidentSeverity.MAJOR,
    status: IncidentStatus.COMPENSATED,
    decisionOutcome: 'COMPENSATE',
    closureReason: 'COMPENSATED',
    responsibilityParty: 'TASKER',
    customer: { user: { fullName: 'Nguyễn A' } },
    tasker: { user: { fullName: 'Trần B' } },
    booking: { bookingCode: 'BK-9' },
    finalizedByAdmin: { fullName: 'Admin C' },
    reportedAt: new Date('2026-07-01T08:00:00+07:00'),
    decisionDueAt: new Date('2026-07-03T08:00:00+07:00'),
    finalizedAt: new Date('2026-07-02T08:00:00+07:00'),
    resolvedAt: null,
    // Cột numeric của Postgres về TS là CHUỖI — mock đúng như thật.
    claimedAmount: '1000000',
    approvedCompensationAmount: '800000',
    taskerBorneAmount: '500000',
    platformBorneAmount: '300000',
    recoverableFromDepositAmount: '400000',
    uncoveredLiabilityAmount: '100000',
    externalPayoutAmount: '0',
    ...over,
  };
}

function makeService(
  over: { incidents?: unknown[]; count?: number; groups?: any } = {},
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
  qb.getMany = jest.fn().mockResolvedValue(over.incidents ?? [makeIncident()]);

  const incidentRepo = { createQueryBuilder: jest.fn(() => qb) };

  const query = jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('FROM users WHERE id')) {
      return Promise.resolve([{ name: 'Admin C' }]);
    }
    if (sql.includes('FROM taskers'))
      return Promise.resolve([{ name: 'Trần B' }]);
    if (sql.includes('FROM customers')) {
      return Promise.resolve([{ name: 'Nguyễn A' }]);
    }
    if (sql.includes('AS overdue')) return Promise.resolve([OVERVIEW]);
    if (sql.includes('GROUP BY status')) {
      return Promise.resolve(
        over.groups?.status ?? [
          {
            k: 'COMPENSATED',
            c: 6,
            approved: '3000000',
            tasker_borne: '2000000',
            platform_borne: '1000000',
          },
        ],
      );
    }
    if (sql.includes('GROUP BY severity')) {
      return Promise.resolve([
        {
          k: 'MAJOR',
          c: 4,
          approved: '2000000',
          tasker_borne: '1000000',
          platform_borne: '1000000',
        },
      ]);
    }
    if (sql.includes('GROUP BY type')) {
      return Promise.resolve([
        {
          k: 'PROPERTY_DAMAGE',
          c: 9,
          approved: '0',
          tasker_borne: '0',
          platform_borne: '0',
        },
      ]);
    }
    if (sql.includes('GROUP BY source')) {
      return Promise.resolve([
        {
          k: 'CUSTOMER_REPORT',
          c: 7,
          approved: '0',
          tasker_borne: '0',
          platform_borne: '0',
        },
      ]);
    }
    if (sql.includes('GROUP BY responsibility_party')) {
      return Promise.resolve(
        over.groups?.resp ?? [
          {
            k: 'TASKER',
            c: 5,
            approved: '2500000',
            tasker_borne: '2000000',
            platform_borne: '500000',
          },
          {
            k: null,
            c: 2,
            approved: '0',
            tasker_borne: '0',
            platform_borne: '0',
          },
        ],
      );
    }
    if (sql.includes('GROUP BY i.finalized_by_admin_id')) {
      return Promise.resolve([
        {
          name: 'Admin C',
          c: 8,
          compensate: 6,
          no_comp: 1,
          reject: 1,
          avg_mins: '600',
          approved: '3000000',
        },
      ]);
    }
    return Promise.resolve([]);
  });

  return {
    svc: new IncidentReportService(incidentRepo as any, { query } as any),
    qb,
    query,
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

describe('IncidentReportService.buildIncidentListSheet', () => {
  it('đổi enum sang nhãn tiếng Việt, không để lọt giá trị thô', async () => {
    const { svc } = makeService();
    const sheet = await svc.buildIncidentListSheet({} as any);

    expect(sheet.rows[0]).toMatchObject({
      type: 'Hư hỏng tài sản',
      source: 'Khách tự báo cáo',
      severity: 'Lớn',
      status: 'Đã bồi thường',
      outcome: 'Bồi thường',
      responsibility: 'Tasker chịu',
    });
    expectRowsMatchColumns(sheet);
  });

  it('ép numeric-chuỗi về số, nếu không Excel nhận text và cột tổng vô nghĩa', async () => {
    const { svc } = makeService();
    const sheet = await svc.buildIncidentListSheet({} as any);

    expect(sheet.rows[0].claimed).toBe(1000000);
    expect(sheet.rows[0].approved).toBe(800000);
    expect(sheet.rows[0].taskerBorne).toBe(500000);
    expect(sheet.rows[0].platformBorne).toBe(300000);
  });

  it('duyệt chi = Tasker chịu + nền tảng chịu, và phải nói rõ để không bị cộng đôi', async () => {
    const { svc } = makeService();
    const sheet = await svc.buildIncidentListSheet({} as any);
    const r = sheet.rows[0];

    expect(Number(r.taskerBorne) + Number(r.platformBorne)).toBe(
      Number(r.approved),
    );
    expect(sheet.subtitle).toContain('ĐÃ BAO GỒM');
  });

  it('sự cố chưa chốt: mốc thiếu để gạch ngang, không ra NaN', async () => {
    const { svc } = makeService({
      incidents: [makeIncident({ finalizedAt: null, finalizedByAdmin: null })],
    });
    const sheet = await svc.buildIncidentListSheet({} as any);

    expect(sheet.rows[0].finalizedAt).toBe('—');
    expect(sheet.rows[0].handlingHours).toBe('—');
    expect(sheet.rows[0].finalizedBy).toBe('Chưa chốt');
  });

  it('giới hạn 5.000 dòng và nói rõ đã bị cắt', async () => {
    const { svc, qb } = makeService({ count: 9_999 });
    const sheet = await svc.buildIncidentListSheet({} as any);

    expect(qb.limit).toHaveBeenCalledWith(INCIDENT_EXPORT_MAX_ROWS);
    expect(sheet.subtitle).toContain('9.999');
    expect(sheet.subtitle).toContain('thu hẹp');
  });

  it('luôn chốt thứ tự bằng id để hai lần xuất ra cùng một tập', async () => {
    const { svc, qb } = makeService();
    await svc.buildIncidentListSheet({} as any);
    expect(qb.addOrderBy).toHaveBeenCalledWith('i.id', 'DESC');
  });

  it('mô tả bộ lọc dịch id sang tên người, không để lộ UUID', async () => {
    const { svc } = makeService();
    const sheet = await svc.buildIncidentListSheet({
      severity: IncidentSeverity.CRITICAL,
      taskerId: '0b8a-uuid',
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    } as any);

    expect(sheet.filterSummary).toContain('Mức độ: Nghiêm trọng');
    expect(sheet.filterSummary).toContain('Tasker: Trần B');
    expect(sheet.filterSummary).toContain('01/07/2026 → 31/07/2026');
    expect(sheet.filterSummary).not.toContain('0b8a');
  });
});

describe('IncidentReportService.buildReportSheets', () => {
  it('dựng đủ 4 mục, mục nào cũng có tiêu đề và kỳ lọc', async () => {
    const { svc } = makeService();
    const sheets = await svc.buildReportSheets({
      fromDate: '2026-07-01',
      toDate: '2026-07-31',
    });

    expect(sheets.map((s) => s.name)).toEqual([
      'Tổng quan',
      'Phân bố',
      'Trách nhiệm & phân bổ',
      'Hiệu suất thẩm định',
    ]);
    for (const sheet of sheets) {
      expect(sheet.filterSummary).toContain('2026');
      expect(sheet.name.length).toBeLessThanOrEqual(31);
      expectRowsMatchColumns(sheet);
    }
  });

  it('sheet Phân bố KHÔNG có cột sumable — cộng cả bảng sẽ ra gấp bốn', async () => {
    // Bốn cách phân loại mỗi cách đều đếm hết tập sự cố. Một dòng TỔNG CỘNG in
    // đậm ở cuối sẽ là con số sai, tệ hơn là không có dòng tổng.
    const { svc } = makeService();
    const [, distribution] = await svc.buildReportSheets({});

    expect(distribution.columns.some((c) => c.sumable)).toBe(false);
    expect(distribution.rows.map((r) => r.group)).toEqual([
      'Trạng thái',
      'Mức độ',
      'Loại sự cố',
      'Nguồn tạo',
    ]);
  });

  it('nền tảng thực chịu = nền tảng chịu + chi ngoài ví + chưa thu hồi', async () => {
    const { svc } = makeService();
    const [overview] = await svc.buildReportSheets({});
    const byLabel = (label: string) =>
      overview.rows.find((r) => r.label === label)?.value;

    expect(byLabel('Tổng tiền duyệt chi')).toBe(3000000);
    // 1.000.000 + 250.000 + 500.000
    expect(byLabel('Nền tảng thực chịu')).toBe(1750000);
  });

  it('đổi thời gian chốt trung bình từ phút sang giờ', async () => {
    const { svc } = makeService();
    const [overview, , , admin] = await svc.buildReportSheets({});

    expect(
      overview.rows.find((r) => r.label === 'Thời gian tới khi chốt trung bình')
        ?.value,
    ).toBe(10); // 600 phút
    expect(admin.rows[0].avgHours).toBe(10);
  });

  it('sự cố chưa quy trách nhiệm vẫn hiện thành một dòng có nhãn', async () => {
    const { svc } = makeService();
    const [, , resp] = await svc.buildReportSheets({});

    expect(resp.rows.map((r) => r.label)).toEqual([
      'Tasker chịu',
      'Chưa quy trách nhiệm',
    ]);
  });

  it('nhãn kỳ lọc dừng ở ngày cuối kỳ, không nhảy sang ngày kế tiếp', () => {
    const { svc } = makeService();
    expect(
      svc.getReportFilterSummary({
        fromDate: '2026-07-01',
        toDate: '2026-07-31',
      }),
    ).toContain('từ 01/07/2026 đến 31/07/2026');
  });

  it('mặc định lấy 30 ngày gần nhất khi admin không chọn kỳ', async () => {
    const { svc, query } = makeService();
    await svc.buildReportSheets({});

    const params = query.mock.calls.find((c: any[]) =>
      String(c[0]).includes('AS overdue'),
    )![1] as Date[];
    const days = (params[1].getTime() - params[0].getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });
});
