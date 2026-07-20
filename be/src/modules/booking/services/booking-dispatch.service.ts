import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';
import { vietnamWeekStartSqlExpr } from 'src/common/helpers/vietnam-time.helper';

export const BOOKING_DISPATCH_JOB = 'DISPATCH_NEAREST';
export const DISPATCH_RING_TIMEOUT_MS = 15_000;
export const DISPATCH_MAX_RING = 5;
/**
 * Chỉ còn dùng khi 1 ring tìm ra 0 tasker (an toàn cho khu vực thưa tasker) —
 * bán kính khởi tạo (ring 1) giờ tính theo độ khẩn cấp của giờ hẹn qua
 * `resolveDispatchRadiusMeters`, không còn cố định + tăng dần mỗi ring nữa.
 */
export const DISPATCH_RADIUS_FACTOR = 1.5;
export const DISPATCH_RING_SIZE = 3;
/**
 * Booking mới POSTED chỉ hiển thị trong danh sách "Nhận đơn" (browse chủ động)
 * cho MỌI tasker sau khoảng thời gian này kể từ lúc tạo — trong khoảng thời
 * gian này, đơn chỉ được gửi riêng cho các tasker nằm trong ring dispatch hiện
 * tại (qua notification), tránh tasker khác thấy đơn trong danh sách nhưng bấm
 * "Nhận" lại bị 403 vì chưa được mời.
 */
export const POSTED_LIST_OPEN_TO_ALL_AFTER_MS = 60_000;
/** Stale threshold: chỉ tính tasker cập nhật vị trí trong vòng 5 phút */
const LOCATION_STALE_MINUTES = 5;
const DISPATCH_STATE_TTL_SECONDS = 10 * 60;
const DISPATCH_LOCK_TTL_SECONDS = 20;

export interface DispatchJobData {
  bookingId: string;
  customerUserId: string;
  lat: number;
  lng: number;
  ring: number;
  radiusMeters: number;
  excludedTaskerIds: string[];
}

export interface NearestTaskerRow {
  tasker_id: string;
  user_id: string;
  dist_meters: number;
}

export interface DispatchInvitationState {
  bookingId: string;
  ring: number;
  invitedTaskerIds: string[];
  /** Tasker đã được mời ở các ring trước ring hiện tại (bán kính không đổi giữa các ring — vẫn còn hợp lệ để nhận). */
  previouslyInvitedTaskerIds: string[];
  expiresAt: Date | null;
}

interface RedisLike {
  set(
    key: string,
    value: string,
    mode: 'EX',
    seconds: number,
    condition: 'NX',
  ): Promise<'OK' | null>;
  get(key: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  hset(key: string, values: Record<string, string>): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  expire(key: string, seconds: number): Promise<number>;
}

function dispatchJobId(bookingId: string, ring: number): string {
  return `dispatch-${bookingId}-ring-${ring}`;
}

function dispatchStateKey(bookingId: string): string {
  return `booking:dispatch:${bookingId}`;
}

function dispatchLockKey(bookingId: string): string {
  return `booking:dispatch:lock:${bookingId}`;
}

/**
 * Bán kính tìm tasker cho ring 1, tính theo độ khẩn cấp của giờ hẹn — còn ít
 * thời gian thì thu hẹp bán kính (đảm bảo tasker kịp tới), còn nhiều thời
 * gian thì mở rộng (nhiều lựa chọn tasker hơn). Tách hàm thuần để test độc
 * lập không cần DB/queue.
 */
export function resolveDispatchRadiusMeters(
  scheduledStart: Date,
  thresholdMinutes: number,
  urgentRadiusMeters: number,
  normalRadiusMeters: number,
  now: Date = new Date(),
): number {
  const minutesUntilStart = (scheduledStart.getTime() - now.getTime()) / 60_000;
  return minutesUntilStart <= thresholdMinutes
    ? urgentRadiusMeters
    : normalRadiusMeters;
}

@Injectable()
export class BookingDispatchService {
  private readonly logger = new Logger(BookingDispatchService.name);

  constructor(
    @InjectQueue('bookingQueue') private readonly bookingQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly systemConfig: SystemConfigService,
  ) {}

  private async redis(): Promise<RedisLike> {
    return this.bookingQueue.client as Promise<RedisLike>;
  }

  async enqueueDispatch(
    bookingId: string,
    customerUserId: string,
    lat: number,
    lng: number,
    scheduledStart: Date,
  ): Promise<void> {
    const manager = this.dataSource.manager;
    const [thresholdMinutes, urgentRadiusMeters, normalRadiusMeters] =
      await Promise.all([
        this.systemConfig.getRegisteredNumber(
          manager,
          SYSTEM_CONFIG_KEYS.DISPATCH_URGENCY_THRESHOLD_MINUTES,
        ),
        this.systemConfig.getRegisteredNumber(
          manager,
          SYSTEM_CONFIG_KEYS.DISPATCH_URGENT_RADIUS_METERS,
        ),
        this.systemConfig.getRegisteredNumber(
          manager,
          SYSTEM_CONFIG_KEYS.DISPATCH_NORMAL_RADIUS_METERS,
        ),
      ]);
    const radiusMeters = resolveDispatchRadiusMeters(
      scheduledStart,
      thresholdMinutes,
      urgentRadiusMeters,
      normalRadiusMeters,
    );

    const data: DispatchJobData = {
      bookingId,
      customerUserId,
      lat,
      lng,
      ring: 1,
      radiusMeters,
      excludedTaskerIds: [],
    };

    await this.bookingQueue.add(BOOKING_DISPATCH_JOB, data, {
      jobId: dispatchJobId(bookingId, 1),
      // Không có delay — chạy ngay
      attempts: 2,
      backoff: { type: 'exponential', delay: 3_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });

    this.logger.log(
      `Enqueued dispatch ring=1 radius=${radiusMeters}m for booking=${bookingId}`,
    );
  }

  async enqueueNextRing(data: DispatchJobData): Promise<string> {
    const nextRing = data.ring + 1;
    const jobId = dispatchJobId(data.bookingId, nextRing);

    const nextData: DispatchJobData = {
      ...data,
      ring: nextRing,
    };

    await this.bookingQueue.add(BOOKING_DISPATCH_JOB, nextData, {
      jobId,
      delay: DISPATCH_RING_TIMEOUT_MS,
      attempts: 2,
      backoff: { type: 'exponential', delay: 3_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });

    this.logger.log(
      `Scheduled dispatch ring=${nextRing} radius=${data.radiusMeters}m delay=${DISPATCH_RING_TIMEOUT_MS}ms for booking=${data.bookingId}`,
    );

    return jobId;
  }

  async acquireDispatchLock(bookingId: string): Promise<string | null> {
    const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const redis = await this.redis();
    const result = await redis.set(
      dispatchLockKey(bookingId),
      token,
      'EX',
      DISPATCH_LOCK_TTL_SECONDS,
      'NX',
    );

    return result === 'OK' ? token : null;
  }

  async releaseDispatchLock(bookingId: string, token: string): Promise<void> {
    const redis = await this.redis();
    const key = dispatchLockKey(bookingId);
    const current = await redis.get(key);
    if (current === token) {
      await redis.del(key);
    }
  }

  async persistDispatchState(
    data: DispatchJobData,
    nextJobId?: string,
    invitedTaskerIds: string[] = [],
    expiresAt?: Date,
  ): Promise<void> {
    const redis = await this.redis();
    const key = dispatchStateKey(data.bookingId);

    await redis.hset(key, {
      ring: String(data.ring),
      radiusMeters: String(data.radiusMeters),
      excludedIds: JSON.stringify(data.excludedTaskerIds),
      invitedTaskerIds: JSON.stringify(invitedTaskerIds),
      expiresAt: expiresAt?.toISOString() ?? '',
      nextJobId: nextJobId ?? '',
      updatedAt: new Date().toISOString(),
    });
    await redis.expire(key, DISPATCH_STATE_TTL_SECONDS);
  }

  async getDispatchInvitationState(
    bookingId: string,
  ): Promise<DispatchInvitationState | null> {
    const redis = await this.redis();
    const state = await redis.hgetall(dispatchStateKey(bookingId));
    if (!state || Object.keys(state).length === 0) {
      return null;
    }

    return {
      bookingId,
      ring: Number(state.ring) || 0,
      invitedTaskerIds: this.parseStringArray(state.invitedTaskerIds),
      previouslyInvitedTaskerIds: this.parseStringArray(state.excludedIds),
      expiresAt: state.expiresAt ? new Date(state.expiresAt) : null,
    };
  }

  async clearDispatchState(bookingId: string): Promise<void> {
    const redis = await this.redis();
    await redis.del(dispatchStateKey(bookingId), dispatchLockKey(bookingId));
  }

  private parseStringArray(value?: string): string[] {
    if (!value) return [];

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      return [];
    }
  }

  async cancelPendingDispatch(bookingId: string): Promise<void> {
    const removals: Promise<void>[] = [];

    for (let ring = 1; ring <= DISPATCH_MAX_RING + 1; ring++) {
      const jobId = dispatchJobId(bookingId, ring);
      removals.push(
        this.bookingQueue
          .getJob(jobId)
          .then((job) => job?.remove())
          .then(() => undefined)
          .catch(() => undefined),
      );
    }

    await Promise.allSettled(removals);
    await this.clearDispatchState(bookingId).catch(() => undefined);
    this.logger.log(`Cancelled pending dispatch jobs for booking=${bookingId}`);
  }

  async findNearestTaskers(
    lat: number,
    lng: number,
    radiusMeters: number,
    excludedTaskerIds: string[],
  ): Promise<NearestTaskerRow[]> {
    const exclusionClause =
      excludedTaskerIds.length > 0
        ? `AND t.id NOT IN (${excludedTaskerIds.map((_, i) => `$${i + 4}`).join(', ')})`
        : '';

    const params: (number | string)[] = [
      lng,
      lat,
      radiusMeters,
      ...excludedTaskerIds,
    ];

    return this.dataSource.query<NearestTaskerRow[]>(
      `
        SELECT
          t.id                                            AS tasker_id,
          t.user_id,
          ST_Distance(
            t.current_location,
            ST_SetSRID(ST_Point($1, $2), 4326)::geography
          )                                               AS dist_meters
        FROM taskers t
        LEFT JOIN wallets w ON w.tasker_id = t.id
        -- Đơn trả ví mới có bút toán TASKER_EARNING; đơn trả tiền mặt chỉ trừ
        -- hoa hồng qua PLATFORM_FEE trên ví tasker, phải suy ngược ra thu nhập
        -- (tổng đơn − chiết khấu). Cùng công thức với getMyTaskerEarningsSummary
        -- (wallet.service.ts) — chỉ tính TASKER_EARNING sẽ coi tasker làm đơn
        -- tiền mặt là thu nhập 0, sai thứ tự ưu tiên ghép đơn.
        LEFT JOIN (
          SELECT
            wt.wallet_id,
            SUM(
              CASE
                WHEN wt.type = 'TASKER_EARNING' THEN wt.amount
                WHEN wt.type = 'PLATFORM_FEE' THEN GREATEST(
                  COALESCE(b.total_price, 0) + COALESCE(b.discount_amount, 0)
                    - wt.amount,
                  0
                )
                ELSE 0
              END
            ) AS weekly_income
          FROM wallet_transactions wt
          LEFT JOIN bookings b ON b.id = wt.booking_id
          WHERE wt.type IN ('TASKER_EARNING', 'PLATFORM_FEE')
            AND wt.created_at >= ${vietnamWeekStartSqlExpr()}
          GROUP BY wt.wallet_id
        ) wi ON wi.wallet_id = w.id
        WHERE
          t.presence_status       = 'ONLINE'
          AND t.status            = 'ACTIVE'
          AND (
            t.cancel_suspended_until IS NULL
            OR t.cancel_suspended_until < NOW()
          )
          AND t.current_location  IS NOT NULL
          AND t.location_updated_at > NOW() - INTERVAL '${LOCATION_STALE_MINUTES} minutes'
          AND ST_DWithin(
            t.current_location,
            ST_SetSRID(ST_Point($1, $2), 4326)::geography,
            $3
          )
          AND NOT EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.tasker_id = t.id
              AND b.status IN (
                'CONFIRMED', 'TASKER_ON_THE_WAY', 'CHECKED_IN', 'IN_PROGRESS'
              )
          )
          ${exclusionClause}
        ORDER BY
          COALESCE(wi.weekly_income, 0) ASC,
          t.rating_avg DESC,
          dist_meters ASC
        LIMIT ${DISPATCH_RING_SIZE}
        `,
      params,
    );
  }
}
