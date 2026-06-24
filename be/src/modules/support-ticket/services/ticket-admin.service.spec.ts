/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { UnprocessableEntityException } from '@nestjs/common';
import { TicketAdminService } from './ticket-admin.service';
import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';

const ADMIN = 'admin-1';

describe('TicketAdminService.changeStatus (TC-U-STATE)', () => {
  let svc: TicketAdminService;
  let ticketRepo: any;
  let statusLogRepo: any;
  let resolutionRepo: any;
  let ticket: any;

  const findRepo = { find: jest.fn().mockResolvedValue([]) };

  beforeEach(() => {
    ticket = {
      id: 'tk1',
      status: SupportTicketStatus.NEW,
      category: TicketCategory.SERVICE_QUALITY,
      pendingReason: null,
    };
    ticketRepo = {
      findOne: jest.fn().mockResolvedValue(ticket),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    statusLogRepo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
      find: jest.fn().mockResolvedValue([]),
    };
    resolutionRepo = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
    };
    svc = new TicketAdminService(
      ticketRepo,
      findRepo as any,
      statusLogRepo,
      resolutionRepo,
      {} as any, // userRepo
      findRepo as any, // attachmentRepo
      {} as any, // ticketService
      {
        onPause: jest.fn(),
        onResume: jest.fn(),
        cancelBreach: jest.fn(),
        scheduleBreach: jest.fn(),
        scheduleAutoClose: jest.fn(),
        cancelAutoClose: jest.fn(),
        enqueueCsat: jest.fn(),
      } as any, // sla
      { notify: jest.fn().mockResolvedValue(undefined) } as any, // notification
      { uploadImage: jest.fn() } as any, // uploadService
      {
        emitMessage: jest.fn(),
        emitRead: jest.fn(),
        emitTyping: jest.fn(),
        emitUnread: jest.fn(),
      } as any, // realtime
    );
  });

  const change = (to: SupportTicketStatus, extra: any = {}) =>
    svc.changeStatus('tk1', { status: to, ...extra }, ADMIN);

  it('NEW → IN_PROGRESS hợp lệ + ghi status-log', async () => {
    await change(SupportTicketStatus.IN_PROGRESS);
    expect(ticket.status).toBe('IN_PROGRESS');
    expect(statusLogRepo.save).toHaveBeenCalled();
  });

  it('NEW → RESOLVED không hợp lệ → 422', async () => {
    await expect(change(SupportTicketStatus.RESOLVED)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('IN_PROGRESS → PENDING thiếu pendingReason → 422', async () => {
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    await expect(change(SupportTicketStatus.PENDING)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('IN_PROGRESS → PENDING có reason → set pendingReason', async () => {
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    await change(SupportTicketStatus.PENDING, {
      pendingReason: TicketPendingReason.WAIT_CUSTOMER,
    });
    expect(ticket.status).toBe('PENDING');
    expect(ticket.pendingReason).toBe('WAIT_CUSTOMER');
  });

  it('→ RESOLVED khi category=OTHER → 422', async () => {
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    ticket.category = TicketCategory.OTHER;
    resolutionRepo.count.mockResolvedValue(1);
    await expect(change(SupportTicketStatus.RESOLVED)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('→ RESOLVED không có resolution → 422', async () => {
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    resolutionRepo.count.mockResolvedValue(0);
    await expect(change(SupportTicketStatus.RESOLVED)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('→ RESOLVED hợp lệ (có resolution, không OTHER) → set resolvedAt', async () => {
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    resolutionRepo.count.mockResolvedValue(1);
    await change(SupportTicketStatus.RESOLVED);
    expect(ticket.status).toBe('RESOLVED');
    expect(ticket.resolvedAt).toBeInstanceOf(Date);
  });

  it('CLOSED → IN_PROGRESS không hợp lệ (CLOSED vĩnh viễn) → 422', async () => {
    ticket.status = SupportTicketStatus.CLOSED;
    await expect(
      change(SupportTicketStatus.IN_PROGRESS),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('RESOLVED → IN_PROGRESS (reopen) → xoá resolvedAt', async () => {
    ticket.status = SupportTicketStatus.RESOLVED;
    ticket.resolvedAt = new Date();
    await change(SupportTicketStatus.IN_PROGRESS);
    expect(ticket.status).toBe('IN_PROGRESS');
    expect(ticket.resolvedAt).toBeNull();
  });
});
