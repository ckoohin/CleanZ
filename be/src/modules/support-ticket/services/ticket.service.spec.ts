/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import {
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
      { scheduleBreach: jest.fn(), onResume: jest.fn() } as any,
      { emitMessage: jest.fn(), emitRead: jest.fn() } as any,
      {} as any,
      {
        encrypt: (x: string) => x,
        decrypt: (x: string) => x,
        decryptEntities: (x: unknown) => x,
      } as any,
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
    const attachmentRepo = {
      createQueryBuilder: () => ({
        update: () => ({
          set: () => ({ whereInIds: () => ({ execute: jest.fn() }) }),
        }),
      }),
      find: jest
        .fn()
        .mockResolvedValue([{ id: 'att1', url: 'http://img/1.jpg' }]),
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
    const svc = new TicketService(
      {} as any,
      ticketRepo as any,
      messageRepo as any,
      attachmentRepo as any,
      {} as any,
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
    );
    return { svc, ticketRepo, messageRepo, attachmentRepo, threadReadRepo, realtime };
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
