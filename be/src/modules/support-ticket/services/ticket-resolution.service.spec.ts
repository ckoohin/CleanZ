/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { NotFoundException } from '@nestjs/common';
import { TicketResolutionService } from './ticket-resolution.service';
import { ResolutionType } from 'src/common/enums/resolution-type.enum';

describe('TicketResolutionService.create (TC-U-RES)', () => {
  let svc: TicketResolutionService;
  let ticketRepo: any;
  let resolutionRepo: any;
  let executor: any;
  let saved: any;

  beforeEach(() => {
    ticketRepo = { findOne: jest.fn().mockResolvedValue({ id: 'tk1' }) };
    resolutionRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => {
        saved = { id: 'r1', createdAt: new Date(), ...x };
        return Promise.resolve(saved);
      }),
    };
    executor = { execute: jest.fn().mockResolvedValue({}) };
    svc = new TicketResolutionService(ticketRepo, resolutionRepo, executor);
  });

  it('money type (COMPENSATION) → ghi amount, walletTransactionId NULL (record-only)', async () => {
    const res = await svc.create(
      'tk1',
      { type: ResolutionType.COMPENSATION, amount: 500000 } as any,
      'admin-1',
    );
    expect(saved.amount).toBe('500000.00');
    expect(res.walletTransactionId).toBeNull();
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });

  it('EXPLANATION → không amount', async () => {
    const res = await svc.create(
      'tk1',
      { type: ResolutionType.EXPLANATION, note: 'giải thích' } as any,
      'admin-1',
    );
    expect(res.amount).toBeNull();
    expect(res.type).toBe('EXPLANATION');
  });

  it('executor trả walletTransactionId (mô phỏng Phase 2) → set vào resolution', async () => {
    executor.execute.mockResolvedValue({ walletTransactionId: 'wtx-1' });
    const res = await svc.create(
      'tk1',
      { type: ResolutionType.REFUND, amount: 100 } as any,
      'admin-1',
    );
    expect(res.walletTransactionId).toBe('wtx-1');
  });

  it('ticket không tồn tại → 404', async () => {
    ticketRepo.findOne.mockResolvedValue(null);
    await expect(
      svc.create(
        'nope',
        { type: ResolutionType.EXPLANATION } as any,
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
