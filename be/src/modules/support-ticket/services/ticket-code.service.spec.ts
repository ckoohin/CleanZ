/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { TicketCodeService } from './ticket-code.service';

describe('TicketCodeService.next (bộ đếm nguyên tử)', () => {
  function makeService(seqs: number[]) {
    const query = jest
      .fn()
      .mockImplementation(() => Promise.resolve([{ seq: seqs.shift() ?? 1 }]));
    const ticketRepo = { manager: { query } };
    return { svc: new TicketCodeService(ticketRepo as any), query };
  }

  it('định dạng TK-YYYYMMDD-NNNN, số thứ tự đệm 4 chữ số', async () => {
    const { svc } = makeService([7]);
    const code = await svc.next(new Date(2026, 5, 18));
    expect(code).toBe('TK-20260618-0007');
  });

  it('dùng UPSERT tăng seq (không MAX+1 → không đọc-rồi-ghi)', async () => {
    const { svc, query } = makeService([1]);
    await svc.next(new Date(2026, 5, 18));
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO ticket_code_counters');
    expect(sql).toContain('ON CONFLICT (day) DO UPDATE');
    expect(sql).toContain('seq = ticket_code_counters.seq + 1');
    expect(sql).toContain('RETURNING seq');
    expect(sql).not.toMatch(/MAX\(/i);
    expect(params).toEqual(['2026-06-18']);
  });

  it('hai lượt gọi liên tiếp nhận hai số khác nhau', async () => {
    const { svc } = makeService([41, 42]);
    const day = new Date(2026, 5, 18);
    await expect(svc.next(day)).resolves.toBe('TK-20260618-0041');
    await expect(svc.next(day)).resolves.toBe('TK-20260618-0042');
  });

  it('dùng manager của transaction khi được truyền vào', async () => {
    const { svc, query } = makeService([1]);
    const managerQuery = jest.fn().mockResolvedValue([{ seq: 3 }]);
    const code = await svc.next(new Date(2026, 5, 18), {
      query: managerQuery,
    } as any);
    expect(code).toBe('TK-20260618-0003');
    expect(managerQuery).toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
