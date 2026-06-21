import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { FindOptionsWhere, Repository } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { UserRole } from 'src/common/enums/user-role.enum';
import { NotificationEntity } from './entity/notification.entity';
import { QueryNotificationDto } from './dto/query-notification.dto';
import {
  BroadcastNotificationDto,
  BroadcastSegment,
} from './dto/broadcast-notification.dto';
import { AdminQueryNotificationDto } from './dto/admin-query-notification.dto';
import { NotifyInput } from './types/notify-input.interface';
import {
  NotificationResponse,
  PaginatedNotifications,
  toNotificationResponse,
} from './dto/notification-response.dto';
import {
  NOTIFICATION_JOB_DISPATCH,
  NOTIFICATION_JOB_OPTS,
  NOTIFICATION_QUEUE,
  toJobId,
} from './notification.constants';
import { NotificationGateway } from './notification.gateway';

// Kết quả persist in-app: `created=false` khi job retry/enqueue trùng (ON CONFLICT) →
// caller KHÔNG emit lại 'notification:new' để tránh nhân đôi badge (SA §7.1).
export interface CreateInAppResult {
  notification: NotificationEntity;
  created: boolean;
}

const BROADCAST_CHUNK_SIZE = 500;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly notificationQueue: Queue,
    private readonly gateway: NotificationGateway,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    await this.notificationQueue.add(NOTIFICATION_JOB_DISPATCH, input, {
      ...NOTIFICATION_JOB_OPTS,
      jobId: toJobId(input.dedupeKey),
    });
  }

  async notifyMany(
    userIds: string[],
    base: Omit<NotifyInput, 'userId'>,
  ): Promise<void> {
    if (userIds.length === 0) return;
    const jobs = userIds.map((userId) => ({
      name: NOTIFICATION_JOB_DISPATCH,
      data: { ...base, userId },
      opts: {
        ...NOTIFICATION_JOB_OPTS,
        jobId: toJobId(
          base.dedupeKey ? `${base.dedupeKey}:${userId}` : undefined,
        ),
      },
    }));
    await this.notificationQueue.addBulk(jobs);
  }

  // Admin broadcast (PROMOTION/SYSTEM). Resolve người nhận → fan-out theo lô 500.
  // campaignId chống gửi trùng: dedupeKey=broadcast:<campaignId>:<userId> (L1 jobId + L2 unique index).
  async broadcast(
    dto: BroadcastNotificationDto,
  ): Promise<{ campaignId: string; enqueued: number; chunks: number }> {
    return asyncHandleOperation(async () => {
      const userIds = dto.userIds ?? (await this.resolveSegment(dto.segment!));
      const campaignId = randomUUID();

      let chunks = 0;
      for (let i = 0; i < userIds.length; i += BROADCAST_CHUNK_SIZE) {
        const slice = userIds.slice(i, i + BROADCAST_CHUNK_SIZE);
        await this.notifyMany(slice, {
          type: dto.type,
          title: dto.title,
          content: dto.content,
          dedupeKey: `broadcast:${campaignId}`,
        });
        chunks += 1;
      }

      this.logger.log(
        `Broadcast ${campaignId}: type=${dto.type} enqueued=${userIds.length} chunks=${chunks}`,
      );
      return { campaignId, enqueued: userIds.length, chunks };
    }, 'Lỗi khi broadcast thông báo');
  }

  // Lấy danh sách user active theo segment (chỉ select id để nhẹ bộ nhớ).
  private async resolveSegment(segment: BroadcastSegment): Promise<string[]> {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.is_active = :active', { active: true });
    if (segment !== BroadcastSegment.ALL) {
      const role =
        segment === BroadcastSegment.CUSTOMER
          ? UserRole.CUSTOMER
          : UserRole.TASKER;
      qb.andWhere('user.role = :role', { role });
    }
    const rows = await qb.getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  // Idempotency L2 (ON CONFLICT DO NOTHING). Trả kèm cờ `created`: false khi job retry/enqueue
  // trùng → caller bỏ qua emit 'notification:new' để tránh nhân đôi badge (SA §7.1).
  async createInApp(input: NotifyInput): Promise<CreateInAppResult> {
    return asyncHandleOperation(async () => {
      const values = {
        user: { id: input.userId },
        type: input.type,
        title: input.title,
        content: input.content ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        dedupeKey: input.dedupeKey ?? null,
      };

      if (!input.dedupeKey) {
        const notification = await this.notificationRepo.save(
          this.notificationRepo.create(values),
        );
        return { notification, created: true };
      }

      const result = await this.notificationRepo
        .createQueryBuilder()
        .insert()
        .into(NotificationEntity)
        .values(values)
        .orIgnore()
        .execute();

      const insertedId = result.identifiers[0]?.id as string | undefined;
      if (insertedId) {
        const notification = await this.notificationRepo.findOneByOrFail({
          id: insertedId,
        });
        return { notification, created: true };
      }
      const notification = await this.notificationRepo.findOneByOrFail({
        dedupeKey: input.dedupeKey,
      });
      return { notification, created: false };
    }, 'Lỗi khi tạo thông báo');
  }

  async emitUnreadCount(userId: string): Promise<void> {
    const { count } = await this.unreadCount(userId);
    this.gateway.emitUnreadCount(userId, count);
  }

  // Notification HISTORY cho admin (P1-7: chỉ chứng minh in-app đã tạo, KHÔNG phải delivery audit).
  async adminHistory(
    query: AdminQueryNotificationDto,
  ): Promise<PaginatedNotifications> {
    return asyncHandleOperation(async () => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const qb = this.notificationRepo
        .createQueryBuilder('n')
        .orderBy('n.created_at', 'DESC')
        .skip((page - 1) * limit)
        .take(limit);
      if (query.userId)
        qb.andWhere('n.user_id = :userId', { userId: query.userId });
      if (query.type) qb.andWhere('n.type = :type', { type: query.type });
      if (query.from)
        qb.andWhere('n.created_at >= :from', { from: query.from });
      if (query.to) qb.andWhere('n.created_at <= :to', { to: query.to });

      const [rows, total] = await qb.getManyAndCount();
      return {
        data: rows.map(toNotificationResponse),
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }, 'Lỗi khi tra cứu lịch sử thông báo');
  }

  async list(
    userId: string,
    query: QueryNotificationDto,
  ): Promise<PaginatedNotifications> {
    return asyncHandleOperation(async () => {
      const page = query.page ?? 1;
      const limit = query.limit ?? 10;

      const where: FindOptionsWhere<NotificationEntity> = {
        user: { id: userId },
      };
      if (query.type !== undefined) where.type = query.type;
      if (query.isRead !== undefined) where.isRead = query.isRead;

      const [rows, total] = await this.notificationRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data: rows.map(toNotificationResponse),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }, 'Lỗi khi lấy danh sách thông báo');
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    return asyncHandleOperation(async () => {
      const count = await this.notificationRepo.count({
        where: { user: { id: userId }, isRead: false },
      });
      return { count };
    }, 'Lỗi khi đếm thông báo chưa đọc');
  }

  async markRead(userId: string, id: string): Promise<NotificationResponse> {
    return asyncHandleOperation(async () => {
      const noti = await this.notificationRepo.findOne({
        where: { id, user: { id: userId } },
      });
      if (!noti) {
        throw new NotFoundException('Không tìm thấy thông báo');
      }
      if (!noti.isRead) {
        noti.isRead = true;
        await this.notificationRepo.save(noti);
        await this.emitUnreadCount(userId); // badge giảm realtime
      }
      return toNotificationResponse(noti);
    }, 'Lỗi khi đánh dấu đã đọc');
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    return asyncHandleOperation(async () => {
      const res = await this.notificationRepo
        .createQueryBuilder()
        .update(NotificationEntity)
        .set({ isRead: true })
        .where('user_id = :userId', { userId })
        .andWhere('is_read = false')
        .execute();
      const updated = res.affected ?? 0;
      if (updated > 0) {
        await this.emitUnreadCount(userId);
      }
      return { updated };
    }, 'Lỗi khi đánh dấu tất cả đã đọc');
  }
}
