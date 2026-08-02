/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
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

  // Đóng vai messageRepo + attachmentRepo. Cần create/save vì ghi vết thao tác
  // quản trị (audit) lưu vào luồng INTERNAL của ticket_messages.
  const findRepo = {
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((x: any) => x),
    save: jest.fn().mockResolvedValue({}),
  };
  const ticketServiceMock = {
    loadMessagePage: jest
      .fn()
      .mockResolvedValue({ messages: [], attachments: [], hasMore: false }),
    // Mở lại ticket dùng chung logic ở TicketService (reset cờ + tính lại SLA).
    prepareReopen: jest.fn((t: any) => {
      t.status = SupportTicketStatus.IN_PROGRESS;
      t.closedAt = null;
      t.resolvedAt = null;
      t.slaBreached = false;
      return Promise.resolve();
    }),
  };

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
      { findOne: jest.fn().mockResolvedValue(null) } as any, // surveyRepo
      ticketServiceMock as any, // ticketService
      {
        onPause: jest.fn(),
        onResume: jest.fn(),
        applyPause: jest.fn().mockResolvedValue(true),
        applyResume: jest.fn(),
        recomputeForPriority: jest.fn(),
        refreshBreachFlag: jest.fn(),
        cancelBreach: jest.fn(),
        scheduleBreach: jest.fn(),
        scheduleAutoClose: jest.fn(),
        cancelAutoClose: jest.fn(),
        enqueueCsat: jest.fn(),
        scheduleFirstResponse: jest.fn(),
        cancelFirstResponse: jest.fn(),
      } as any, // sla
      { notify: jest.fn().mockResolvedValue(undefined) } as any, // notification
      { uploadImage: jest.fn() } as any, // uploadService
      {
        emitMessage: jest.fn(),
        emitRead: jest.fn(),
        emitTyping: jest.fn(),
        emitUnread: jest.fn(),
      } as any, // realtime
      {
        encrypt: (x: string) => x,
        decrypt: (x: string) => x,
        decryptEntities: (x: unknown) => x,
      } as any, // crypto
      { getDefaultPriority: jest.fn() } as any, // config
      // changeStatus chạy trong transaction: manager trả về đúng repo mock.
      {
        transaction: (cb: any) =>
          cb({
            getRepository: (entity: any) => {
              const name = entity?.name ?? '';
              if (name.includes('StatusLog')) return statusLogRepo;
              if (name.includes('Resolution')) return resolutionRepo;
              return ticketRepo;
            },
          }),
      } as any, // dataSource
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

  it('CLOSED → IN_PROGRESS (mở lại) → gọi prepareReopen + ghi log', async () => {
    ticket.status = SupportTicketStatus.CLOSED;
    ticket.closedAt = new Date();
    ticket.slaBreached = true;
    await change(SupportTicketStatus.IN_PROGRESS, {
      note: 'Khách chưa hài lòng',
    });
    expect(ticketServiceMock.prepareReopen).toHaveBeenCalledWith(ticket);
    expect(ticket.status).toBe('IN_PROGRESS');
    expect(ticket.closedAt).toBeNull();
    // Hạn SLA được đặt lại nên cờ vi phạm cũ phải được xoá.
    expect(ticket.slaBreached).toBe(false);
    expect(statusLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: 'CLOSED',
        newStatus: 'IN_PROGRESS',
        note: 'Khách chưa hài lòng',
      }),
    );
  });

  it('admin KHÁC đang phụ trách → 422, không đổi trạng thái', async () => {
    ticket.assignedAdmin = { id: 'admin-2', fullName: 'Trần B' };
    await expect(
      change(SupportTicketStatus.IN_PROGRESS),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(ticket.status).toBe('NEW');
    expect(ticketRepo.save).not.toHaveBeenCalled();
  });

  it('ticket CHƯA gán → người xử lý đầu tiên tự nhận phụ trách', async () => {
    await change(SupportTicketStatus.IN_PROGRESS);
    expect(ticket.assignedAdmin).toEqual({ id: ADMIN });
  });

  it('đang phụ trách chính mình → cho phép xử lý', async () => {
    ticket.assignedAdmin = { id: ADMIN, fullName: 'Tôi' };
    await change(SupportTicketStatus.IN_PROGRESS);
    expect(ticket.status).toBe('IN_PROGRESS');
  });

  it('PENDING/WAIT_INTERNAL → không huỷ job breach (SLA vẫn chạy)', async () => {
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    (svc as any).sla.applyPause.mockResolvedValue(false);
    await change(SupportTicketStatus.PENDING, {
      pendingReason: TicketPendingReason.WAIT_INTERNAL,
    });
    expect((svc as any).sla.cancelBreach).not.toHaveBeenCalled();
  });

  it('validate hỏng → KHÔNG đụng tới hàng đợi job (side effect sau commit)', async () => {
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    resolutionRepo.count.mockResolvedValue(0); // chặn RESOLVED
    await expect(change(SupportTicketStatus.RESOLVED)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect((svc as any).sla.scheduleAutoClose).not.toHaveBeenCalled();
    expect((svc as any).sla.enqueueCsat).not.toHaveBeenCalled();
  });

  it('RESOLVED → IN_PROGRESS (reopen) → xoá resolvedAt', async () => {
    ticket.status = SupportTicketStatus.RESOLVED;
    ticket.resolvedAt = new Date();
    await change(SupportTicketStatus.IN_PROGRESS);
    expect(ticket.status).toBe('IN_PROGRESS');
    expect(ticket.resolvedAt).toBeNull();
  });

  // ── bulk assign ─────────────────────────────────────────────────────────
  it('bulkAssign: bỏ qua ticket của admin khác, vẫn gán phần còn lại', async () => {
    const mine = { id: 'tk1', ticketCode: 'TK-1', assignedAdmin: null };
    const theirs = {
      id: 'tk2',
      ticketCode: 'TK-2',
      assignedAdmin: { id: 'admin-2' },
    };
    ticketRepo.find = jest.fn().mockResolvedValue([mine, theirs]);
    (svc as any).userRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: ADMIN, role: 'ADMIN', fullName: 'Tôi' }),
    };

    const res = await svc.bulkAssign(
      { ticketIds: ['tk1', 'tk2'] } as any,
      ADMIN,
    );
    expect(res.assigned).toBe(1);
    expect(res.skipped).toEqual(['TK-2']);
    expect(mine.assignedAdmin).toEqual({ id: ADMIN });
    expect(theirs.assignedAdmin).toEqual({ id: 'admin-2' });
  });

  // ── reclassify: ghi vết + kéo theo ưu tiên & SLA ────────────────────────
  it('reclassify: đổi loại không nêu ưu tiên → lấy mặc định của loại mới + tính lại SLA', async () => {
    ticket.category = TicketCategory.OTHER;
    ticket.priority = 'LOW';
    (svc as any).config.getDefaultPriority.mockResolvedValue('URGENT');
    await svc.reclassify(
      'tk1',
      { category: TicketCategory.PROPERTY_DAMAGE } as any,
      ADMIN,
    );
    expect(ticket.priority).toBe('URGENT');
    expect((svc as any).sla.recomputeForPriority).toHaveBeenCalledWith(ticket);
  });

  it('reclassify: ưu tiên không đổi → KHÔNG tính lại SLA', async () => {
    ticket.category = TicketCategory.SERVICE_QUALITY;
    ticket.priority = 'MEDIUM';
    await svc.reclassify(
      'tk1',
      { category: TicketCategory.SERVICE_QUALITY, priority: 'MEDIUM' } as any,
      ADMIN,
    );
    expect((svc as any).sla.recomputeForPriority).not.toHaveBeenCalled();
  });

  it('reclassify: ghi vết vào luồng INTERNAL', async () => {
    ticket.category = TicketCategory.OTHER;
    (svc as any).config.getDefaultPriority.mockResolvedValue('HIGH');
    await svc.reclassify(
      'tk1',
      { category: TicketCategory.TASKER_BEHAVIOR } as any,
      ADMIN,
    );
    expect(findRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isInternal: true,
        audience: 'INTERNAL',
        body: expect.stringContaining('Phân loại: OTHER → TASKER_BEHAVIOR'),
      }),
    );
  });

  it('reclassify: admin khác đang phụ trách → 422', async () => {
    ticket.assignedAdmin = { id: 'admin-2', fullName: 'Trần B' };
    await expect(
      svc.reclassify(
        'tk1',
        { category: TicketCategory.SCHEDULING } as any,
        ADMIN,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
