/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import { TicketSlaService } from './ticket-sla.service';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';

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
      getPauseOnWaitTasker: jest.fn().mockResolvedValue(true),
    };
    svc = new TicketSlaService(queue, config);
  });

  it('scheduleFirstResponse: hẹn job đúng mốc firstResponseDueAt', async () => {
    const due = new Date(Date.now() + 15 * 60000);
    await svc.scheduleFirstResponse({
      id: 'tk1',
      firstResponseDueAt: due,
      firstRespondedAt: null,
    } as any);
    expect(queue.add).toHaveBeenCalledWith(
      'first-response-breach',
      { ticketId: 'tk1' },
      expect.objectContaining({ jobId: 'first-response-breach-tk1' }),
    );
    const opts = queue.add.mock.calls[0][2];
    expect(opts.delay).toBeGreaterThan(14 * 60000);
    expect(opts.delay).toBeLessThanOrEqual(15 * 60000);
  });

  it('scheduleFirstResponse: đã phản hồi rồi → không hẹn job', async () => {
    await svc.scheduleFirstResponse({
      id: 'tk1',
      firstResponseDueAt: new Date(Date.now() + 60000),
      firstRespondedAt: new Date(),
    } as any);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('computeDue đúng theo matrix', async () => {
    const t0 = new Date('2026-06-18T00:00:00Z');
    const due = await svc.computeDue(TicketPriority.URGENT, t0);
    expect(due.firstResponseDueAt.getTime()).toBe(t0.getTime() + 15 * 60000);
    expect(due.resolutionDueAt.getTime()).toBe(t0.getTime() + 240 * 60000);
  });

  it('onPause khi CHỜ KHÁCH → set slaPausedAt + huỷ job breach', async () => {
    const t: any = { id: 'tk1', slaPausedAccumMs: '0' };
    await svc.onPause(t, TicketPendingReason.WAIT_CUSTOMER);
    expect(t.slaPausedAt).toBeInstanceOf(Date);
    expect(queue.remove).toHaveBeenCalledWith('sla-breach-tk1');
  });

  it('onPause khi CHỜ NỘI BỘ → KHÔNG dừng SLA (chống tự tắt đồng hồ)', async () => {
    const t: any = { id: 'tk1', slaPausedAccumMs: '0' };
    await svc.onPause(t, TicketPendingReason.WAIT_INTERNAL);
    expect(t.slaPausedAt).toBeNull();
    expect(queue.remove).not.toHaveBeenCalled();
  });

  it('onPause khi CHỜ TASKER → theo cấu hình TICKET_SLA_PAUSE_ON_WAIT_TASKER', async () => {
    config.getPauseOnWaitTasker.mockResolvedValue(false);
    const t: any = { id: 'tk1', slaPausedAccumMs: '0' };
    await svc.onPause(t, TicketPendingReason.WAIT_TASKER);
    expect(t.slaPausedAt).toBeNull();

    config.getPauseOnWaitTasker.mockResolvedValue(true);
    const t2: any = { id: 'tk2', slaPausedAccumMs: '0' };
    await svc.onPause(t2, TicketPendingReason.WAIT_TASKER);
    expect(t2.slaPausedAt).toBeInstanceOf(Date);
  });

  it('refreshBreachFlag: hạn còn ở tương lai → gỡ cờ vi phạm', () => {
    const t: any = {
      slaBreached: true,
      resolutionDueAt: new Date(Date.now() + 60000),
    };
    svc.refreshBreachFlag(t);
    expect(t.slaBreached).toBe(false);
  });

  it('refreshBreachFlag: hạn đã qua → giữ/bật cờ vi phạm', () => {
    const t: any = {
      slaBreached: false,
      resolutionDueAt: new Date(Date.now() - 60000),
    };
    svc.refreshBreachFlag(t);
    expect(t.slaBreached).toBe(true);
  });

  it('recomputeForPriority: hạn tính từ createdAt + thời gian đã tạm dừng', async () => {
    const createdAt = new Date(Date.now() - 60 * 60000); // tạo 60 phút trước
    const t: any = {
      id: 'tk1',
      createdAt,
      priority: TicketPriority.URGENT,
      slaPausedAccumMs: '600000', // đã tạm dừng 10 phút
      firstRespondedAt: null,
    };
    await svc.recomputeForPriority(t);
    // 240 phút (URGENT) + 10 phút tạm dừng, mốc gốc là lúc TẠO ticket.
    expect(t.resolutionDueAt.getTime()).toBe(
      createdAt.getTime() + 240 * 60000 + 600000,
    );
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
