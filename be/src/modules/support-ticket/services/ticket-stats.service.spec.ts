/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { TicketStatsService } from './ticket-stats.service';

/**
 * `query` được nhận diện theo nội dung SQL, vì service chạy nhiều aggregate
 * song song — không thể dựa vào thứ tự gọi.
 */
function makeService(over: Record<string, unknown[]> = {}) {
  const query = jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('GROUP BY status')) {
      return Promise.resolve(over.status ?? [{ k: 'NEW', c: 3 }]);
    }
    if (sql.includes('GROUP BY category')) {
      return Promise.resolve(over.category ?? []);
    }
    if (sql.includes('GROUP BY priority')) {
      return Promise.resolve(over.priority ?? []);
    }
    if (sql.includes('FROM support_tickets') && sql.includes('res_breached')) {
      return Promise.resolve(
        over.agg ?? [
          {
            total: 10,
            res_breached: 2,
            fr_breached: 1,
            resolved: 6,
            avg_fr: '18.4',
            avg_res: '742.51',
          },
        ],
      );
    }
    if (sql.includes('GROUP BY s.rating')) {
      return Promise.resolve(over.dist ?? [{ rating: 5, c: 3 }]);
    }
    return Promise.resolve(
      over.csat ?? [{ invited: 6, responses: 4, avg: '4.25' }],
    );
  });
  return {
    svc: new TicketStatsService({ query } as any),
    query,
  };
}

describe('TicketStatsService.getStats', () => {
  const from = new Date('2026-07-01');
  const to = new Date('2026-08-01');

  it('tỉ lệ tuân thủ = phần KHÔNG vi phạm, làm tròn 1 chữ số', async () => {
    const { svc } = makeService();
    const s = await svc.getStats(from, to);
    // 10 ticket, 2 vi phạm hạn xử lý → 80%; 1 vi phạm hạn phản hồi → 90%
    expect(s.sla.resolutionComplianceRate).toBe(80);
    expect(s.sla.firstResponseComplianceRate).toBe(90);
  });

  it('không có ticket nào → coi như tuân thủ 100% (không chia cho 0)', async () => {
    const { svc } = makeService({
      agg: [
        {
          total: 0,
          res_breached: 0,
          fr_breached: 0,
          resolved: 0,
          avg_fr: null,
          avg_res: null,
        },
      ],
    });
    const s = await svc.getStats(from, to);
    expect(s.sla.resolutionComplianceRate).toBe(100);
    expect(s.handling.avgResolutionMins).toBeNull();
  });

  it('thời gian trung bình làm tròn 1 chữ số', async () => {
    const { svc } = makeService();
    const s = await svc.getStats(from, to);
    expect(s.handling.avgFirstResponseMins).toBe(18.4);
    expect(s.handling.avgResolutionMins).toBe(742.5);
  });

  it('phân bố CSAT luôn đủ 5 bậc (bậc thiếu = 0)', async () => {
    const { svc } = makeService();
    const s = await svc.getStats(from, to);
    expect(s.csat.distribution).toEqual({
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 3,
    });
    expect(s.csat.avgRating).toBe(4.3);
    expect(s.csat.responses).toBe(4);
  });

  it('mọi truy vấn đều giới hạn theo khoảng thời gian', async () => {
    const { svc, query } = makeService();
    await svc.getStats(from, to);
    for (const call of query.mock.calls) {
      expect(call[1]).toEqual([from, to]);
    }
  });
});
