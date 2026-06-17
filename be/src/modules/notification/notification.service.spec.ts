/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationEntity } from './entity/notification.entity';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NOTIFICATION_QUEUE } from './notification.constants';
import { NotificationGateway } from './notification.gateway';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BroadcastSegment } from './dto/broadcast-notification.dto';

const baseNoti = (over: Partial<NotificationEntity> = {}): any => ({
  id: 'n1',
  type: NotificationType.SYSTEM,
  title: 't',
  content: null,
  referenceId: null,
  referenceType: null,
  isRead: false,
  createdAt: new Date('2026-06-17T00:00:00Z'),
  ...over,
});

describe('NotificationService', () => {
  let service: NotificationService;
  let repo: any;
  let userRepo: any;
  let queue: any;
  let gateway: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve({ id: 'n1', ...x })),
      findAndCount: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
      findOneByOrFail: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    userRepo = { createQueryBuilder: jest.fn() };
    queue = {
      add: jest.fn().mockResolvedValue({ id: '1' }),
      addBulk: jest.fn().mockResolvedValue([]),
    };
    gateway = {
      emitNewNotification: jest.fn(),
      emitUnreadCount: jest.fn(),
      emitToUser: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationEntity), useValue: repo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getQueueToken(NOTIFICATION_QUEUE), useValue: queue },
        { provide: NotificationGateway, useValue: gateway },
      ],
    }).compile();
    service = moduleRef.get(NotificationService);
  });

  describe('notify / notifyMany (TC-U-NTF)', () => {
    it('enqueues a dispatch job with sanitized jobId (no ":") and retry opts', async () => {
      await service.notify({
        userId: 'u1',
        type: NotificationType.BOOKING_CONFIRMED,
        title: 'x',
        dedupeKey: 'booking:b1:CONFIRMED',
      });
      expect(queue.add).toHaveBeenCalledTimes(1);
      const [name, , opts] = queue.add.mock.calls[0];
      expect(name).toBe('dispatch');
      expect(opts).toEqual(
        expect.objectContaining({
          jobId: 'booking-b1-CONFIRMED',
          attempts: 5,
          removeOnComplete: 1000,
        }),
      );
    });

    it('notifyMany fans out one job per user via addBulk', async () => {
      await service.notifyMany(['u1', 'u2', 'u3'], {
        type: NotificationType.PROMOTION,
        title: 'sale',
      });
      expect(queue.addBulk).toHaveBeenCalledTimes(1);
      expect(queue.addBulk.mock.calls[0][0]).toHaveLength(3);
    });

    it('notifyMany with empty list does nothing', async () => {
      await service.notifyMany([], {
        type: NotificationType.SYSTEM,
        title: 't',
      });
      expect(queue.addBulk).not.toHaveBeenCalled();
    });
  });

  describe('broadcast (TC-U-BC)', () => {
    const mockUsers = (ids: string[]) => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(ids.map((id) => ({ id }))),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('userIds trực tiếp → fan-out, trả {campaignId, enqueued, chunks}', async () => {
      const res = await service.broadcast({
        userIds: ['u1', 'u2'],
        type: NotificationType.PROMOTION,
        title: 'sale',
      });
      expect(res.enqueued).toBe(2);
      expect(res.chunks).toBe(1);
      expect(typeof res.campaignId).toBe('string');
      expect(queue.addBulk).toHaveBeenCalledTimes(1);
      // dedupeKey broadcast:<campaignId>:<userId> → jobId sanitize ':'→'-'
      const jobs = queue.addBulk.mock.calls[0][0];
      expect(jobs[0].opts.jobId).toContain('broadcast-');
    });

    it('segment=ALL → resolve user active, chunk 500', async () => {
      const ids = Array.from({ length: 1200 }, (_, i) => `u${i}`);
      const qb = mockUsers(ids);
      const res = await service.broadcast({
        segment: BroadcastSegment.ALL,
        type: NotificationType.SYSTEM,
        title: 'maintenance',
      });
      expect(res.enqueued).toBe(1200);
      expect(res.chunks).toBe(3); // 500+500+200
      expect(queue.addBulk).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).not.toHaveBeenCalled(); // ALL không lọc role
    });

    it('segment=CUSTOMER → lọc theo role', async () => {
      const qb = mockUsers(['c1']);
      await service.broadcast({
        segment: BroadcastSegment.CUSTOMER,
        type: NotificationType.PROMOTION,
        title: 'sale',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: 'CUSTOMER',
      });
    });
  });

  describe('createInApp idempotency (TC-U-SVC-1, TC-U-IDEMP)', () => {
    // helper: mock insert query builder cho nhánh có dedupeKey
    const mockInsertBuilder = (insertedId: string | undefined) => {
      const qb = {
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
          identifiers: insertedId ? [{ id: insertedId }] : [],
        }),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('without dedupeKey → plain save (INSERT), created=true', async () => {
      const res = await service.createInApp({
        userId: 'u1',
        type: NotificationType.SYSTEM,
        title: 't',
      });
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
      expect(res.created).toBe(true);
    });

    it('with dedupeKey, no conflict → insert + created=true', async () => {
      mockInsertBuilder('n-new');
      repo.findOneByOrFail.mockResolvedValue(baseNoti({ id: 'n-new' }));
      const res = await service.createInApp({
        userId: 'u1',
        type: NotificationType.BOOKING_CONFIRMED,
        title: 't',
        dedupeKey: 'booking:b1:CONFIRMED',
      });
      expect(repo.findOneByOrFail).toHaveBeenCalledWith({ id: 'n-new' });
      expect(res.notification.id).toBe('n-new');
      expect(res.created).toBe(true);
    });

    it('with dedupeKey, CONFLICT (retry) → no new row, created=false (no emit)', async () => {
      mockInsertBuilder(undefined);
      repo.findOneByOrFail.mockResolvedValue(baseNoti({ id: 'n-existing' }));
      const res = await service.createInApp({
        userId: 'u1',
        type: NotificationType.BOOKING_CONFIRMED,
        title: 't',
        dedupeKey: 'booking:b1:CONFIRMED',
      });
      expect(repo.findOneByOrFail).toHaveBeenCalledWith({
        dedupeKey: 'booking:b1:CONFIRMED',
      });
      expect(res.notification.id).toBe('n-existing');
      expect(res.created).toBe(false);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('list (TC-U-SVC-2..5)', () => {
    it('applies type & isRead filters, sorts DESC, returns {data, meta}', async () => {
      repo.findAndCount.mockResolvedValue([[baseNoti()], 1]);
      const res = await service.list('u1', {
        type: NotificationType.SYSTEM,
        isRead: false,
        page: 1,
        limit: 10,
      });
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { id: 'u1' },
            type: NotificationType.SYSTEM,
            isRead: false,
          }),
          order: { createdAt: 'DESC' },
          skip: 0,
          take: 10,
        }),
      );
      expect(res.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
      expect(res.data[0].id).toBe('n1');
    });

    it('computes skip & totalPages for page 2', async () => {
      repo.findAndCount.mockResolvedValue([[], 25]);
      const res = await service.list('u1', { page: 2, limit: 10 });
      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(res.meta.totalPages).toBe(3);
    });
  });

  describe('unreadCount (TC-U-SVC-6)', () => {
    it('counts is_read=false for the user', async () => {
      repo.count.mockResolvedValue(7);
      const res = await service.unreadCount('u1');
      expect(repo.count).toHaveBeenCalledWith({
        where: { user: { id: 'u1' }, isRead: false },
      });
      expect(res).toEqual({ count: 7 });
    });
  });

  describe('markRead (TC-U-SVC-7..9)', () => {
    it('marks own notification as read + emits unread_count', async () => {
      repo.findOne.mockResolvedValue(baseNoti({ isRead: false }));
      repo.count.mockResolvedValue(2);
      const res = await service.markRead('u1', 'n1');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'n1', user: { id: 'u1' } },
      });
      expect(repo.save).toHaveBeenCalled();
      expect(res.isRead).toBe(true);
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith('u1', 2);
    });

    it('throws NotFound for another user notification (IDOR)', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.markRead('u1', 'n-other')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('is idempotent when already read (no save, no emit)', async () => {
      repo.findOne.mockResolvedValue(baseNoti({ isRead: true }));
      const res = await service.markRead('u1', 'n1');
      expect(repo.save).not.toHaveBeenCalled();
      expect(res.isRead).toBe(true);
      expect(gateway.emitUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe('markAllRead (TC-U-SVC-10)', () => {
    it('updates only unread of user and returns affected count', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      repo.count.mockResolvedValue(0);
      const res = await service.markAllRead('u1');
      expect(qb.where).toHaveBeenCalledWith('user_id = :userId', {
        userId: 'u1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('is_read = false');
      expect(res).toEqual({ updated: 5 });
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith('u1', 0);
    });

    it('does not emit when nothing was updated', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      repo.createQueryBuilder.mockReturnValue(qb);
      const res = await service.markAllRead('u1');
      expect(res).toEqual({ updated: 0 });
      expect(gateway.emitUnreadCount).not.toHaveBeenCalled();
    });
  });
});
