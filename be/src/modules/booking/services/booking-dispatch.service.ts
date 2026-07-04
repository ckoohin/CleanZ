import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';

export const BOOKING_DISPATCH_JOB = 'DISPATCH_NEAREST';
export const DISPATCH_RING_TIMEOUT_MS = 15_000;
export const DISPATCH_MAX_RING = 5;
export const DISPATCH_INITIAL_RADIUS_METERS = 2_000;
export const DISPATCH_RADIUS_FACTOR = 1.5;
export const DISPATCH_RING_SIZE = 3;
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

@Injectable()
export class BookingDispatchService {
  private readonly logger = new Logger(BookingDispatchService.name);

  constructor(
    @InjectQueue('bookingQueue') private readonly bookingQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  private async redis(): Promise<RedisLike> {
    return this.bookingQueue.client as Promise<RedisLike>;
  }

  async enqueueDispatch(
    bookingId: string,
    customerUserId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    const data: DispatchJobData = {
      bookingId,
      customerUserId,
      lat,
      lng,
      ring: 1,
      radiusMeters: DISPATCH_INITIAL_RADIUS_METERS,
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

    this.logger.log(`Enqueued dispatch ring=1 for booking=${bookingId}`);
  }

  async enqueueNextRing(data: DispatchJobData): Promise<string> {
    const nextRing = data.ring + 1;
    const nextRadius = Math.round(data.radiusMeters * DISPATCH_RADIUS_FACTOR);
    const jobId = dispatchJobId(data.bookingId, nextRing);

    const nextData: DispatchJobData = {
      ...data,
      ring: nextRing,
      radiusMeters: nextRadius,
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
      `Scheduled dispatch ring=${nextRing} radius=${nextRadius}m delay=${DISPATCH_RING_TIMEOUT_MS}ms for booking=${data.bookingId}`,
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
          ${exclusionClause}
        ORDER BY dist_meters ASC
        LIMIT ${DISPATCH_RING_SIZE}
        `,
      params,
    );
  }
}
