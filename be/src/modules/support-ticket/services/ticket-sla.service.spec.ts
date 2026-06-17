/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { TicketSlaService } from './ticket-sla.service';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';

describe('TicketSlaService (TC-U-SLA)', () => {
  let svc: TicketSlaService;
  let queue: any;
  let config: any;

  beforeEach(() => {
    queue = {
      add: jest.fn().mockResolvedValue({}),
      remove: jest.fn().mockResolvedValue({}),
    };
    config = {
      getSlaWindow: jest
        .fn()
        .mockResolvedValue({ responseMins: 15, resolutionMins: 240 }),
      getAutoCloseHours: jest.fn().mockResolvedValue(48),
    };
    svc = new TicketSlaService(queue, config);
  });

  it('computeDue đúng theo matrix', async () => {
    const t0 = new Date('2026-06-18T00:00:00Z');
    const due = await svc.computeDue(TicketPriority.URGENT, t0);
    expect(due.firstResponseDueAt.getTime()).toBe(t0.getTime() + 15 * 60000);
    expect(due.resolutionDueAt.getTime()).toBe(t0.getTime() + 240 * 60000);
  });

  it('onPause → set slaPausedAt + huỷ job breach', async () => {
    const t: any = { id: 'tk1', slaPausedAccumMs: '0' };
    await svc.onPause(t);
    expect(t.slaPausedAt).toBeInstanceOf(Date);
    expect(queue.remove).toHaveBeenCalledWith('sla-breach-tk1');
  });

  it('onResume → cộng dồn accum + dời resolutionDueAt + đặt lại breach', async () => {
    const pausedAt = new Date(Date.now() - 5000); // pause 5s
    const due = new Date(Date.now() + 60000);
    const t: any = {
      id: 'tk1',
      slaPausedAt: pausedAt,
      slaPausedAccumMs: '1000',
      resolutionDueAt: new Date(due),
    };
    await svc.onResume(t);
    expect(Number(t.slaPausedAccumMs)).toBeGreaterThanOrEqual(6000);
    expect(t.resolutionDueAt.getTime()).toBeGreaterThan(due.getTime());
    expect(t.slaPausedAt).toBeNull();
    expect(queue.add).toHaveBeenCalled();
  });

  it('onResume khi không pause → không đổi accum, vẫn schedule breach', async () => {
    const t: any = {
      id: 'tk1',
      slaPausedAt: null,
      slaPausedAccumMs: '0',
      resolutionDueAt: new Date(Date.now() + 60000),
    };
    await svc.onResume(t);
    expect(t.slaPausedAccumMs).toBe('0');
    expect(queue.add).toHaveBeenCalled();
  });

  it('scheduleAutoClose dùng config hours + jobId chuẩn', async () => {
    await svc.scheduleAutoClose('tk1');
    const call = queue.add.mock.calls[0];
    expect(call[0]).toBe('auto-close');
    expect(call[2].jobId).toBe('auto-close-tk1');
    expect(call[2].delay).toBe(48 * 3600000);
  });
});
