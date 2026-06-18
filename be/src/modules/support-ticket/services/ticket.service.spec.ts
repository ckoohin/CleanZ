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
