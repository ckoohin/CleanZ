/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { BookingStatus } from 'src/common/enums/booking-status.enum';

const CUST_USER = 'cust-user-1';
const TASK_USER = 'task-user-1';

function makeBooking(over: any = {}) {
  return {
    id: 'bk1',
    status: BookingStatus.CONFIRMED,
    completedAt: null,
    customer: { user: { id: CUST_USER } },
    tasker: { user: { id: TASK_USER } },
    ...over,
  };
}

describe('TicketService.create (TC-U-CRT)', () => {
  let svc: TicketService;
  let bookingRepo: any;
  let savedTicket: any;

  const managerRepo = {
    create: (x: any) => x,
    save: (x: any) =>
      Promise.resolve({
        id: 'tk1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...x,
      }),
    createQueryBuilder: () => ({
      update: () => ({
        set: () => ({
          whereInIds: () => ({
            andWhere: () => ({ execute: () => Promise.resolve({}) }),
          }),
        }),
      }),
    }),
  };
  const dataSource = {
    transaction: async (cb: any) => {
      savedTicket = await cb({ getRepository: () => managerRepo });
      return savedTicket;
    },
  };
  const ticketCode = { next: jest.fn().mockResolvedValue('TK-20260618-0001') };
  const config = {
    getDefaultPriority: jest.fn().mockResolvedValue(TicketPriority.MEDIUM),
    getSlaWindow: jest
      .fn()
      .mockResolvedValue({ responseMins: 120, resolutionMins: 1440 }),
    getComplaintWindowDays: jest.fn().mockResolvedValue(7),
  };

  beforeEach(() => {
    bookingRepo = { findOne: jest.fn() };
    svc = new TicketService(
      dataSource as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      bookingRepo,
      ticketCode as any,
      config as any,
      {} as any,
      {
        scheduleBreach: jest.fn(),
        scheduleFirstResponse: jest.fn(),
        onResume: jest.fn(),
      } as any,
      { emitMessage: jest.fn(), emitRead: jest.fn() } as any,
      {} as any,
      {
        encrypt: (x: string) => x,
        decrypt: (x: string) => x,
        decryptEntities: (x: unknown) => x,
      } as any,
      { find: jest.fn().mockResolvedValue([]) } as any, // resolutionRepo
    );
  });

  it('customer tạo ticket → counterparty = tasker user', async () => {
    bookingRepo.findOne.mockResolvedValue(makeBooking());
    await svc.create(CUST_USER, {
      bookingId: 'bk1',
      category: TicketCategory.SERVICE_QUALITY,
      subject: 's',
      description: 'd',
    } as any);
    expect(savedTicket.counterparty).toEqual({ id: TASK_USER });
    expect(savedTicket.reporter).toEqual({ id: CUST_USER });
    expect(savedTicket.status).toBe('NEW');
  });

  it('tasker tạo ticket ngược → counterparty = customer user', async () => {
    bookingRepo.findOne.mockResolvedValue(makeBooking());
    await svc.create(TASK_USER, {
      bookingId: 'bk1',
      category: TicketCategory.TASKER_BEHAVIOR,
      subject: 's',
      description: 'd',
    } as any);
    expect(savedTicket.counterparty).toEqual({ id: CUST_USER });
  });

  it('người lạ tạo ticket đơn không thuộc → 404 (IDOR)', async () => {
    bookingRepo.findOne.mockResolvedValue(makeBooking());
    await expect(
      svc.create('stranger', {
        bookingId: 'bk1',
        category: TicketCategory.SERVICE_QUALITY,
        subject: 's',
        description: 'd',
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('đơn COMPLETED quá cửa sổ N ngày → 422', async () => {
    bookingRepo.findOne.mockResolvedValue(
      makeBooking({
        status: BookingStatus.COMPLETED,
        completedAt: new Date(Date.now() - 10 * 86400000),
      }),
    );
    await expect(
      svc.create(CUST_USER, {
        bookingId: 'bk1',
        category: TicketCategory.SERVICE_QUALITY,
        subject: 's',
        description: 'd',
      } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('đơn COMPLETED trong cửa sổ → OK', async () => {
    bookingRepo.findOne.mockResolvedValue(
      makeBooking({
        status: BookingStatus.COMPLETED,
        completedAt: new Date(Date.now() - 2 * 86400000),
      }),
    );
    await svc.create(CUST_USER, {
      bookingId: 'bk1',
      category: TicketCategory.SERVICE_QUALITY,
      subject: 's',
      description: 'd',
    } as any);
    expect(savedTicket.ticketCode).toBe('TK-20260618-0001');
  });

  it('category OTHER không cần booking (không gọi bookingRepo)', async () => {
    await svc.create(CUST_USER, {
      category: TicketCategory.OTHER,
      subject: 's',
      description: 'd',
    } as any);
    expect(bookingRepo.findOne).not.toHaveBeenCalled();
    expect(savedTicket.booking).toBeNull();
  });

  it('booking-required category thiếu bookingId → 422', async () => {
    await expect(
      svc.create(CUST_USER, {
        category: TicketCategory.SERVICE_QUALITY,
        subject: 's',
        description: 'd',
      } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

// ─── Select "Đơn liên quan" dùng chung customer & tasker ─────────────────────
describe('TicketService.listEligibleBookings', () => {
  function makeService() {
    const qb: any = {
      leftJoin: jest.fn(() => qb),
      select: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      limit: jest.fn(() => qb),
      getRawMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'bk1', bookingCode: 'BK-1', myRole: 'TASKER' },
        ]),
    };
    const bookingRepo = { createQueryBuilder: jest.fn(() => qb) };
    const svc = new TicketService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      bookingRepo as any,
      {} as any,
      { getComplaintWindowDays: jest.fn().mockResolvedValue(7) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { svc, qb };
  }

  it('lấy đơn theo CẢ vai customer lẫn tasker (tasker không còn bị chặn)', async () => {
    const { svc, qb } = makeService();
    const res = await svc.listEligibleBookings(TASK_USER);
    expect(qb.where).toHaveBeenCalledWith('(cu.id = :uid OR tu.id = :uid)', {
      uid: TASK_USER,
    });
    expect(res[0].myRole).toBe('TASKER');
  });

  it('loại sẵn đơn đã quá hạn khiếu nại (khớp gate của create)', async () => {
    const { svc, qb } = makeService();
    await svc.listEligibleBookings(CUST_USER);
    const [sql, params] = qb.andWhere.mock.calls[0];
    expect(sql).toContain('completed_at > :earliest');
    // windowDays = 7 → mốc sớm nhất là ~7 ngày trước.
    const days = (Date.now() - params.earliest.getTime()) / 86400000;
    expect(days).toBeCloseTo(7, 1);
  });
});

// ─── Mở lại ticket đã đóng ───────────────────────────────────────────────────
describe('TicketService reopen', () => {
  function makeService(over: any = {}) {
    const ticket = {
      id: 'tk1',
      priority: TicketPriority.MEDIUM,
      status: 'CLOSED',
      closedAt: new Date(Date.now() - 2 * 86400000),
      resolvedAt: new Date(),
      slaBreached: true,
      firstRespondedAt: new Date(),
      reporter: { id: CUST_USER, role: 'CUSTOMER' },
      counterparty: { id: TASK_USER, role: 'TASKER' },
      ...over,
    };
    const ticketRepo = {
      findOne: jest.fn().mockResolvedValue(ticket),
      save: jest.fn((x: any) => Promise.resolve(x)),
    };
    const statusLogRepo = {
      create: (x: any) => x,
      save: jest.fn().mockResolvedValue({}),
    };
    const sla = {
      computeDue: jest.fn().mockResolvedValue({
        firstResponseDueAt: new Date(Date.now() + 120 * 60000),
        resolutionDueAt: new Date(Date.now() + 1440 * 60000),
      }),
      cancelAutoClose: jest.fn(),
      scheduleBreach: jest.fn(),
      scheduleFirstResponse: jest.fn(),
    };
    const realtime = { emitUnread: jest.fn(), emitUnreadToAdmins: jest.fn() };
    const messageRepo = {
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };
    const svc = new TicketService(
      {} as any,
      ticketRepo as any,
      messageRepo as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      statusLogRepo as any,
      {} as any,
      {} as any,
      { getReopenWindowDays: jest.fn().mockResolvedValue(7) } as any,
      {} as any,
      sla as any,
      realtime as any,
      {} as any,
      { decryptEntities: (x: unknown) => x } as any,
      { find: jest.fn().mockResolvedValue([]) } as any, // resolutionRepo
    );
    return { svc, ticket, ticketRepo, statusLogRepo, sla, realtime };
  }

  it('mở lại trong hạn → IN_PROGRESS, xoá closedAt/resolvedAt và cờ vi phạm', async () => {
    const { svc, ticket, sla } = makeService();
    await svc.reopenByUser(CUST_USER, 'tk1', 'Vấn đề vẫn chưa được xử lý xong');
    expect(ticket.status).toBe('IN_PROGRESS');
    expect(ticket.closedAt).toBeNull();
    expect(ticket.resolvedAt).toBeNull();
    // Hạn SLA tính lại từ bây giờ nên cờ vi phạm cũ không còn đúng.
    expect(ticket.slaBreached).toBe(false);
    expect(sla.cancelAutoClose).toHaveBeenCalledWith('tk1');
    expect(sla.scheduleBreach).toHaveBeenCalled();
  });

  it('quá hạn mở lại → 422', async () => {
    const { svc } = makeService({
      closedAt: new Date(Date.now() - 30 * 86400000),
    });
    await expect(
      svc.reopenByUser(CUST_USER, 'tk1', 'Muốn mở lại sau rất lâu'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('counterparty KHÔNG được mở lại khiếu nại của người khác → 422', async () => {
    const { svc, ticketRepo } = makeService();
    await expect(
      svc.reopenByUser(TASK_USER, 'tk1', 'Tôi muốn mở lại ticket này'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(ticketRepo.save).not.toHaveBeenCalled();
  });

  it('ticket chưa đóng → 409', async () => {
    const { svc } = makeService({ status: 'IN_PROGRESS', closedAt: null });
    await expect(
      svc.reopenByUser(CUST_USER, 'tk1', 'Mở lại khi chưa đóng'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ghi status log kèm lý do + đánh động admin', async () => {
    const { svc, statusLogRepo, realtime } = makeService();
    await svc.reopenByUser(CUST_USER, 'tk1', 'Thợ chưa quay lại làm');
    expect(statusLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        oldStatus: 'CLOSED',
        newStatus: 'IN_PROGRESS',
        note: 'Người gửi mở lại: Thợ chưa quay lại làm',
      }),
    );
    expect(realtime.emitUnreadToAdmins).toHaveBeenCalledWith('tk1');
  });
});

// ─── Audience / thread (TC-U-CHAT) ────────────────────────────────────────────
describe('TicketService chat — audience & thread (TC-U-CHAT)', () => {
  const REPORTER = { id: CUST_USER, role: 'CUSTOMER' };
  const COUNTERPARTY = { id: TASK_USER, role: 'TASKER' };

  function makeService(over: any = {}) {
    const ticketRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tk1',
        status: 'IN_PROGRESS',
        reporter: REPORTER,
        counterparty: COUNTERPARTY,
        ...over.ticket,
      }),
      save: jest.fn(),
    };
    // Query builder chainable cho loadMessagePage (phân trang cursor).
    const qb: any = {
      leftJoinAndSelect: jest.fn(() => qb),
      where: jest.fn(() => qb),
      andWhere: jest.fn(() => qb),
      orderBy: jest.fn(() => qb),
      addOrderBy: jest.fn(() => qb),
      take: jest.fn(() => qb),
      limit: jest.fn(() => qb),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const messageRepo = {
      create: (x: any) => x,
      save: jest
        .fn()
        .mockImplementation((x: any) =>
          Promise.resolve({ id: 'msg1', createdAt: new Date(), ...x }),
        ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(() => qb),
      qb,
    };
    // QB chainable cho attachToMessage: update().set().whereInIds().andWhere()*3
    const attachQb: any = {
      update: jest.fn(() => attachQb),
      set: jest.fn(() => attachQb),
      whereInIds: jest.fn(() => attachQb),
      andWhere: jest.fn(() => attachQb),
      execute: jest.fn().mockResolvedValue({}),
    };
    const attachmentRepo = {
      createQueryBuilder: jest.fn(() => attachQb),
      // Mặc định: mọi ảnh yêu cầu đều hợp lệ (đúng ticket, chưa gắn, đúng chủ).
      count: jest.fn().mockImplementation(({ where }: any) => {
        const ids = where?.id?._value ?? [];
        return Promise.resolve(Array.isArray(ids) ? ids.length : 0);
      }),
      find: jest
        .fn()
        .mockResolvedValue([{ id: 'att1', url: 'http://img/1.jpg' }]),
      attachQb,
    };
    const threadReadRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: (x: any) => x,
      save: jest
        .fn()
        .mockImplementation((x: any) =>
          Promise.resolve({ ...x, readAt: new Date() }),
        ),
    };
    const realtime = {
      emitMessage: jest.fn(),
      emitRead: jest.fn(),
      emitUnread: jest.fn(),
      emitUnreadToAdmins: jest.fn(),
    };
    // Cần thật vì nhánh auto-resume (PENDING → IN_PROGRESS) có ghi status log.
    const statusLogRepo = {
      create: (x: any) => x,
      save: jest.fn().mockResolvedValue({}),
    };
    const svc = new TicketService(
      {} as any,
      ticketRepo as any,
      messageRepo as any,
      attachmentRepo as any,
      statusLogRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { onResume: jest.fn() } as any,
      realtime as any,
      threadReadRepo as any,
      {
        encrypt: (x: string) => x,
        decrypt: (x: string) => x,
        decryptEntities: (x: unknown) => x,
      } as any,
      { find: jest.fn().mockResolvedValue([]) } as any, // resolutionRepo
    );
    return {
      svc,
      ticketRepo,
      messageRepo,
      attachmentRepo,
      threadReadRepo,
      statusLogRepo,
      realtime,
    };
  }

  it('reporter gửi → audience REPORTER + senderRole CUSTOMER', async () => {
    const { svc, messageRepo } = makeService();
    const res = await svc.addUserMessage(CUST_USER, 'tk1', {
      body: 'hi',
    } as any);
    expect(messageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'REPORTER', isInternal: false }),
    );
    expect(res.senderRole).toBe('CUSTOMER');
  });

  it('counterparty gửi → audience COUNTERPARTY + senderRole TASKER', async () => {
    const { svc, messageRepo } = makeService();
    const res = await svc.addUserMessage(TASK_USER, 'tk1', {
      body: 'hi',
    } as any);
    expect(messageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'COUNTERPARTY' }),
    );
    expect(res.senderRole).toBe('TASKER');
  });

  it('ảnh-only (không body) → OK, trả attachments', async () => {
    const { svc } = makeService();
    const res = await svc.addUserMessage(CUST_USER, 'tk1', {
      attachmentIds: ['att1'],
    } as any);
    expect(res.attachments).toEqual([{ id: 'att1', url: 'http://img/1.jpg' }]);
  });

  it('ảnh của ticket khác / không phải mình upload → 422, KHÔNG tạo message', async () => {
    const { svc, attachmentRepo, messageRepo } = makeService();
    // Không có dòng nào thoả (ticket_id, message_id IS NULL, uploaded_by) → 0.
    attachmentRepo.count.mockResolvedValue(0);
    await expect(
      svc.addUserMessage(CUST_USER, 'tk1', {
        attachmentIds: ['att-cua-ticket-khac'],
      } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(messageRepo.save).not.toHaveBeenCalled();
  });

  it('gắn ảnh: UPDATE phải kèm ràng buộc ticket + message NULL + chủ sở hữu', async () => {
    const { svc, attachmentRepo } = makeService();
    await svc.addUserMessage(CUST_USER, 'tk1', {
      attachmentIds: ['att1'],
    } as any);
    const clauses = attachmentRepo.attachQb.andWhere.mock.calls.map(
      (c: any[]) => c[0],
    );
    expect(clauses).toEqual(
      expect.arrayContaining([
        'ticket_id = :tid',
        'message_id IS NULL',
        'uploaded_by_user_id = :uid',
      ]),
    );
    // Không còn set lại ticket_id (đường cũ cho phép re-parent ảnh sang ticket khác).
    expect(attachmentRepo.attachQb.set).toHaveBeenCalledWith({
      message: { id: 'msg1' },
    });
  });

  it('attachmentIds trùng lặp → chỉ đếm 1 lần (không sai gate số lượng)', async () => {
    const { svc, attachmentRepo } = makeService();
    attachmentRepo.count.mockResolvedValue(1);
    await expect(
      svc.addUserMessage(CUST_USER, 'tk1', {
        attachmentIds: ['att1', 'att1'],
      } as any),
    ).resolves.toBeDefined();
  });

  it('không body & không ảnh → 422', async () => {
    const { svc } = makeService();
    await expect(
      svc.addUserMessage(CUST_USER, 'tk1', {} as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('findOneForUser (reporter) → chỉ lấy message luồng REPORTER', async () => {
    const { svc, messageRepo } = makeService();
    await svc.findOneForUser(CUST_USER, 'tk1');
    expect(messageRepo.qb.andWhere).toHaveBeenCalledWith('m.audience = :aud', {
      aud: 'REPORTER',
    });
  });

  it('findOneForUser (counterparty) → chỉ lấy message luồng COUNTERPARTY', async () => {
    const { svc, messageRepo } = makeService();
    await svc.findOneForUser(TASK_USER, 'tk1');
    expect(messageRepo.qb.andWhere).toHaveBeenCalledWith('m.audience = :aud', {
      aud: 'COUNTERPARTY',
    });
  });

  it('awaitingMe khớp ĐÚNG bên được auto-resume (nhãn không lệch hành vi)', async () => {
    // PENDING/WAIT_CUSTOMER: chờ reporter → chỉ reporter thấy "chờ bạn", và
    // cũng chính reporter là người nhắn thì ticket tự mở lại IN_PROGRESS.
    const waitCustomer = {
      ticket: { status: 'PENDING', pendingReason: 'WAIT_CUSTOMER' },
    };
    const a = makeService(waitCustomer);
    await expect(a.svc.findOneForUser(CUST_USER, 'tk1')).resolves.toMatchObject(
      { awaitingMe: true },
    );
    const b = makeService(waitCustomer);
    await expect(b.svc.findOneForUser(TASK_USER, 'tk1')).resolves.toMatchObject(
      { awaitingMe: false },
    );

    // Cùng dữ liệu → reporter nhắn thì auto-resume; counterparty nhắn thì không.
    const c = makeService(waitCustomer);
    await c.svc.addUserMessage(CUST_USER, 'tk1', { body: 'hi' } as any);
    expect(c.ticketRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'IN_PROGRESS', pendingReason: null }),
    );
    const d = makeService(waitCustomer);
    await d.svc.addUserMessage(TASK_USER, 'tk1', { body: 'hi' } as any);
    expect(d.ticketRepo.save).not.toHaveBeenCalled();
  });

  it('không PENDING → awaitingMe = false dù pendingReason còn sót', async () => {
    const { svc } = makeService({
      ticket: { status: 'IN_PROGRESS', pendingReason: 'WAIT_CUSTOMER' },
    });
    await expect(svc.findOneForUser(CUST_USER, 'tk1')).resolves.toMatchObject({
      awaitingMe: false,
    });
  });

  it('findOneForUser trả myRole theo người xem (tôi gửi vs về tôi)', async () => {
    const { svc } = makeService();
    await expect(svc.findOneForUser(CUST_USER, 'tk1')).resolves.toMatchObject({
      myRole: 'REPORTER',
    });
    await expect(svc.findOneForUser(TASK_USER, 'tk1')).resolves.toMatchObject({
      myRole: 'COUNTERPARTY',
    });
  });

  it('user gửi + ticket có admin phụ trách → ping badge unread cho admin', async () => {
    const { svc, realtime } = makeService({
      ticket: { assignedAdmin: { id: 'admin-1' } },
    });
    await svc.addUserMessage(CUST_USER, 'tk1', { body: 'hi' } as any);
    expect(realtime.emitUnread).toHaveBeenCalledWith('admin-1', 'tk1');
  });

  it('user gửi + ticket CHƯA gán admin → broadcast badge tới mọi admin', async () => {
    const { svc, realtime } = makeService();
    await svc.addUserMessage(CUST_USER, 'tk1', { body: 'hi' } as any);
    expect(realtime.emitUnreadToAdmins).toHaveBeenCalledWith('tk1');
    expect(realtime.emitUnread).not.toHaveBeenCalled();
  });
});
