import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { SYSTEM_CONFIG_KEYS } from 'src/modules/system-config/system-config.keys';
import {
  VN_NOW_SQL,
  vietnamWeekStartSqlExpr,
} from 'src/common/helpers/vietnam-time.helper';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';
import {
  loadPremiumDispatchConfig,
  premiumEligibilitySql,
  PremiumDispatchConfig,
} from '../helpers/premium-eligibility.helper';
import { TaskerScheduleWindow } from '../helpers/tasker-schedule-availability.helper';
import { TaskerScheduleAvailabilityService } from './tasker-schedule-availability.service';

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
 * Cửa sổ mời riêng mặc định của đơn STANDARD. Đơn PREMIUM dùng cấu hình
 * `PREMIUM_FAVORITE_WAIT_SECONDS` (mặc định 15 phút) trước khi mở công khai.
 */
export const POSTED_LIST_OPEN_TO_ALL_AFTER_MS = 60_000;
/** Stale threshold: chỉ tính tasker cập nhật vị trí trong vòng 5 phút */
const LOCATION_STALE_MINUTES = 5;
// Phải dài hơn cửa sổ mời riêng Premium tối đa (1 giờ) để job ring 0 đang chờ
// không mất trạng thái dispatch giữa chừng.
const DISPATCH_STATE_TTL_SECONDS = 2 * 60 * 60;
const DISPATCH_LOCK_TTL_SECONDS = 20;

/**
 * Ring 0 = mời riêng tasker yêu thích của khách (chỉ đơn PREMIUM có chỉ định).
 * Ring 1..DISPATCH_MAX_RING = các đợt mời mở cho pool tasker phù hợp.
 */
export const DISPATCH_FAVORITE_RING = 0;
/**
 * Khách chủ động chỉ định thợ nên khoảng cách là tiêu chí thứ yếu — nới bán
 * kính ở ring 0 để không loại oan thợ quen ở hơi xa.
 */
export const DISPATCH_FAVORITE_RADIUS_FACTOR = 2;

export interface DispatchJobData {
  bookingId: string;
  customerUserId: string;
  /** customers.id — dùng để xếp tasker yêu thích lên đầu ở các ring PREMIUM. */
  customerId: string | null;
  lat: number;
  lng: number;
  ring: number;
  radiusMeters: number;
  excludedTaskerIds: string[];
  serviceTier: BookingServiceTier;
  /** Tasker yêu thích khách chỉ định — chỉ có ý nghĩa với đơn PREMIUM. */
  preferredTaskerId: string | null;
}

export interface NearestTaskerRow {
  tasker_id: string;
  user_id: string;
  dist_meters: number;
  /** Tasker này có nằm trong danh sách yêu thích của khách không. */
  is_favorite: boolean;
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
    private readonly taskerScheduleAvailabilityService: TaskerScheduleAvailabilityService,
  ) {}

  private async redis(): Promise<RedisLike> {
    return this.bookingQueue.client as Promise<RedisLike>;
  }

  /** Cấu hình thời gian mời riêng thợ yêu thích của đơn Premium. */
  async getPremiumDispatchConfig(): Promise<PremiumDispatchConfig> {
    return loadPremiumDispatchConfig(
      this.dataSource.manager,
      this.systemConfig,
    );
  }

  async enqueueDispatch(
    bookingId: string,
    customerUserId: string,
    lat: number,
    lng: number,
    scheduledStart: Date,
    options: {
      customerId?: string | null;
      serviceTier?: BookingServiceTier;
      preferredTaskerId?: string | null;
    } = {},
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

    const serviceTier = options.serviceTier ?? BookingServiceTier.STANDARD;
    const preferredTaskerId =
      serviceTier === BookingServiceTier.PREMIUM
        ? (options.preferredTaskerId ?? null)
        : null;
    // Chỉ đơn PREMIUM có chỉ định thợ mới đi qua ring 0; các đơn còn lại vào
    // thẳng ring 1 như trước để không làm chậm luồng ghép đơn hiện tại.
    const startRing = preferredTaskerId ? DISPATCH_FAVORITE_RING : 1;

    const data: DispatchJobData = {
      bookingId,
      customerUserId,
      customerId: options.customerId ?? null,
      lat,
      lng,
      ring: startRing,
      radiusMeters,
      excludedTaskerIds: [],
      serviceTier,
      preferredTaskerId,
    };

    await this.bookingQueue.add(BOOKING_DISPATCH_JOB, data, {
      jobId: dispatchJobId(bookingId, startRing),
      // Không có delay — chạy ngay
      attempts: 2,
      backoff: { type: 'exponential', delay: 3_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });

    this.logger.log(
      `Enqueued dispatch ring=${startRing} tier=${serviceTier} radius=${radiusMeters}m for booking=${bookingId}`,
    );
  }

  async enqueueNextRing(
    data: DispatchJobData,
    delayMs: number = DISPATCH_RING_TIMEOUT_MS,
  ): Promise<string> {
    const nextRing = data.ring + 1;
    const jobId = dispatchJobId(data.bookingId, nextRing);

    const nextData: DispatchJobData = {
      ...data,
      ring: nextRing,
    };

    await this.bookingQueue.add(BOOKING_DISPATCH_JOB, nextData, {
      jobId,
      delay: delayMs,
      attempts: 2,
      backoff: { type: 'exponential', delay: 3_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });

    this.logger.log(
      `Scheduled dispatch ring=${nextRing} radius=${data.radiusMeters}m delay=${delayMs}ms for booking=${data.bookingId}`,
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

    // Bắt đầu từ ring 0 — đơn PREMIUM có thợ yêu thích được mời ở ring này,
    // bỏ sót sẽ để lại job mồ côi bắn thông báo cho đơn đã bị huỷ.
    for (
      let ring = DISPATCH_FAVORITE_RING;
      ring <= DISPATCH_MAX_RING + 1;
      ring++
    ) {
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
    options: {
      serviceTier?: BookingServiceTier;
      customerId?: string | null;
    } = {},
  ): Promise<NearestTaskerRow[]> {
    const serviceTier = options.serviceTier ?? BookingServiceTier.STANDARD;
    const isPremium = serviceTier === BookingServiceTier.PREMIUM;

    const params: (number | string)[] = [lng, lat, radiusMeters];
    const nextParam = (value: number | string): string => {
      params.push(value);
      return `$${params.length}`;
    };

    const exclusionClause =
      excludedTaskerIds.length > 0
        ? `AND t.id NOT IN (${excludedTaskerIds.map((id) => nextParam(id)).join(', ')})`
        : '';

    // Đơn PREMIUM: vòng mời chủ động chỉ chọn tasker có bộ dụng cụ đã được
    // admin duyệt. Danh sách POSTED vẫn hiển thị đơn cho mọi tasker và trả cờ
    // canAccept để UI khóa thao tác khi chưa được duyệt.
    let premiumClause = '';
    if (isPremium) {
      premiumClause = `AND ${premiumEligibilitySql('t')}`;
    }

    // Tasker nằm trong danh sách yêu thích của chính khách này được xếp lên đầu.
    const favoriteSelect =
      isPremium && options.customerId
        ? `EXISTS (
             SELECT 1 FROM customer_favorite_taskers cft
             WHERE cft.tasker_id = t.id AND cft.customer_id = ${nextParam(options.customerId)}
           )`
        : 'false';

    /*
     * Thứ tự ưu tiên khác nhau theo hạng, có chủ đích:
     * - STANDARD: thu nhập tuần thấp trước — cơ chế chia đều việc cho tasker.
     * - PREMIUM: khách trả thêm tiền để mua CHẤT LƯỢNG, nên thợ yêu thích và
     *   rating cao phải đứng trước; chia đều thu nhập tụt xuống tiêu chí cuối.
     */
    const orderBy = isPremium
      ? `is_favorite DESC,
         t.rating_avg DESC,
         dist_meters ASC,
         COALESCE(wi.weekly_income, 0) ASC`
      : `COALESCE(wi.weekly_income, 0) ASC,
         t.rating_avg DESC,
         dist_meters ASC`;

    return this.dataSource.query<NearestTaskerRow[]>(
      `
        SELECT
          t.id                                            AS tasker_id,
          t.user_id,
          ${favoriteSelect}                               AS is_favorite,
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
            OR t.cancel_suspended_until < ${VN_NOW_SQL}
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
          ${premiumClause}
        ORDER BY
          ${orderBy}
        LIMIT ${DISPATCH_RING_SIZE}
        `,
      params,
    );
  }

  /**
   * Ring 0: kiểm tra tasker yêu thích khách chỉ định có thực sự nhận được đơn
   * không (online, rảnh, không bị treo, đủ điều kiện PREMIUM).
   *
   * Trả về null thay vì chờ mù — không được giữ đơn cả phút rồi mới phát hiện
   * thợ đang offline, vì như vậy khách mất trắng khoảng thời gian đó.
   */
  async findFavoriteTaskerCandidate(
    taskerId: string,
    lat: number,
    lng: number,
    radiusMeters: number,
    requestedSchedule: TaskerScheduleWindow,
  ): Promise<NearestTaskerRow | null> {
    const rows = await this.dataSource.query<NearestTaskerRow[]>(
      `
        SELECT
          t.id       AS tasker_id,
          t.user_id,
          true       AS is_favorite,
          ST_Distance(
            t.current_location,
            ST_SetSRID(ST_Point($2, $3), 4326)::geography
          )          AS dist_meters
        FROM taskers t
        WHERE
          t.id = $1
          AND t.presence_status = 'ONLINE'
          AND t.status = 'ACTIVE'
          AND (
            t.cancel_suspended_until IS NULL
            OR t.cancel_suspended_until < ${VN_NOW_SQL}
          )
          AND t.current_location IS NOT NULL
          AND t.location_updated_at > NOW() - INTERVAL '${LOCATION_STALE_MINUTES} minutes'
          AND ST_DWithin(
            t.current_location,
            ST_SetSRID(ST_Point($2, $3), 4326)::geography,
            $4
          )
          AND ${premiumEligibilitySql('t')}
        LIMIT 1
      `,
      [taskerId, lng, lat, radiusMeters],
    );

    const candidate = rows[0];
    if (!candidate) return null;

    const availability =
      await this.taskerScheduleAvailabilityService.getForTasker(
        this.dataSource.manager,
        candidate.tasker_id,
        requestedSchedule,
      );

    return availability.isAvailable ? candidate : null;
  }
}
