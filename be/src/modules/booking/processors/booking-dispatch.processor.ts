import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { NotificationRefType } from 'src/common/enums/notification-ref-type.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationGateway } from 'src/modules/notification/notification.gateway';
import { BookingEntity } from '../entity/booking.entity';
import {
  BOOKING_DISPATCH_JOB,
  BookingDispatchService,
  DISPATCH_FAVORITE_RADIUS_FACTOR,
  DISPATCH_FAVORITE_RING,
  DISPATCH_MAX_RING,
  DISPATCH_RADIUS_FACTOR,
  DISPATCH_RING_TIMEOUT_MS,
  DispatchJobData,
  NearestTaskerRow,
} from '../services/booking-dispatch.service';
import { BookingServiceTier } from 'src/common/enums/booking-service-tier.enum';

@Processor('bookingQueue')
export class BookingDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingDispatchProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly bookingDispatchService: BookingDispatchService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== BOOKING_DISPATCH_JOB) return;
    const data = job.data as DispatchJobData;
    const token = await this.bookingDispatchService.acquireDispatchLock(
      data.bookingId,
    );

    if (!token) {
      this.logger.log(
        `Dispatch skipped — lock already held for booking=${data.bookingId}`,
      );
      return;
    }

    try {
      await this.handleDispatch(data);
    } finally {
      await this.bookingDispatchService.releaseDispatchLock(
        data.bookingId,
        token,
      );
    }
  }

  private async handleDispatch(data: DispatchJobData): Promise<void> {
    const {
      bookingId,
      customerUserId,
      lat,
      lng,
      ring,
      radiusMeters,
      excludedTaskerIds,
    } = data;

    // 1. Kiểm tra booking còn POSTED không
    const booking = await this.dataSource.getRepository(BookingEntity).findOne({
      where: { id: bookingId },
      select: [
        'id',
        'bookingCode',
        'status',
        'scheduledStartDate',
        'scheduledStartTime',
        'scheduledEndDate',
        'scheduledEndTime',
      ],
    });

    if (!booking || booking.status !== BookingStatus.POSTED) {
      this.logger.log(
        `Dispatch skipped — booking=${bookingId} status=${booking?.status ?? 'NOT_FOUND'}`,
      );
      await this.bookingDispatchService.clearDispatchState(bookingId);
      return;
    }

    await this.bookingDispatchService.persistDispatchState(data);

    // 1b. Ring 0 — mời riêng thợ yêu thích khách chỉ định.
    if (ring === DISPATCH_FAVORITE_RING) {
      await this.handleFavoriteRing(booking, data);
      return;
    }

    // 2. Tìm tasker gần nhất bằng PostGIS
    const taskers = await this.bookingDispatchService.findNearestTaskers(
      lat,
      lng,
      radiusMeters,
      excludedTaskerIds,
      { serviceTier: data.serviceTier, customerId: data.customerId },
    );

    this.logger.log(
      `Dispatch ring=${ring} radius=${radiusMeters}m booking=${bookingId}: found ${taskers.length} tasker(s)`,
    );

    if (taskers.length === 0) {
      await this.handleNoTaskersFound(data);
      return;
    }

    // 3. Gửi thông báo cho từng tasker tìm được
    await this.notifyTaskers(booking, taskers, ring);
    const invitedTaskerIds = taskers.map((t) => t.tasker_id);
    const expiresAt = new Date(Date.now() + DISPATCH_RING_TIMEOUT_MS);

    // 4. Emit trạng thái tìm kiếm đến customer (ring > 1 = mở rộng bán kính)
    if (ring > 1) {
      this.notificationGateway.emitToUser(
        customerUserId,
        'booking:still_searching',
        {
          bookingId,
          ring,
          radiusKm: (radiusMeters / 1000).toFixed(1),
          taskersFound: taskers.length,
        },
      );
    }

    // 5. Lên lịch ring tiếp theo nếu chưa đạt giới hạn
    if (ring < DISPATCH_MAX_RING) {
      const nextData: DispatchJobData = {
        ...data,
        excludedTaskerIds: [...excludedTaskerIds, ...invitedTaskerIds],
      };
      const nextJobId =
        await this.bookingDispatchService.enqueueNextRing(nextData);
      await this.bookingDispatchService.persistDispatchState(
        data,
        nextJobId,
        invitedTaskerIds,
        expiresAt,
      );
    } else {
      this.logger.log(`Dispatch completed all rings for booking=${bookingId}`);
      await this.bookingDispatchService.persistDispatchState(
        data,
        undefined,
        invitedTaskerIds,
        expiresAt,
      );
      // Không còn ring nào — customer FE đã có countdown, không thay đổi trạng thái
    }
  }

  /**
   * Ring 0 của đơn PREMIUM: giữ đơn riêng cho thợ yêu thích trong
   * `PREMIUM_FAVORITE_WAIT_SECONDS`. Thợ không sẵn sàng thì chuyển ngay sang
   * ring 1 chứ không chờ hết cửa sổ — chờ mù là mất trắng thời gian của khách.
   */
  private async handleFavoriteRing(
    booking: Pick<
      BookingEntity,
      | 'id'
      | 'bookingCode'
      | 'scheduledStartDate'
      | 'scheduledStartTime'
      | 'scheduledEndDate'
      | 'scheduledEndTime'
    >,
    data: DispatchJobData,
  ): Promise<void> {
    const { bookingId, customerUserId, lat, lng, radiusMeters } = data;
    const premiumConfig =
      await this.bookingDispatchService.getPremiumDispatchConfig();

    const requestedSchedule =
      booking.scheduledStartDate &&
      booking.scheduledStartTime &&
      booking.scheduledEndDate &&
      booking.scheduledEndTime
        ? {
            scheduledStartDate: booking.scheduledStartDate,
            scheduledStartTime: booking.scheduledStartTime,
            scheduledEndDate: booking.scheduledEndDate,
            scheduledEndTime: booking.scheduledEndTime,
          }
        : null;
    const candidate =
      data.preferredTaskerId && requestedSchedule
        ? await this.bookingDispatchService.findFavoriteTaskerCandidate(
            data.preferredTaskerId,
            lat,
            lng,
            radiusMeters * DISPATCH_FAVORITE_RADIUS_FACTOR,
            requestedSchedule,
          )
        : null;

    if (!candidate) {
      this.logger.log(
        `Favorite tasker unavailable for booking=${bookingId} — falling through to ring 1`,
      );
      this.notificationGateway.emitToUser(
        customerUserId,
        'booking:favorite_unavailable',
        { bookingId },
      );
      await this.handleDispatch({ ...data, ring: 1 });
      return;
    }

    await this.notifyTaskers(booking, [candidate], DISPATCH_FAVORITE_RING);

    const expiresAt = new Date(Date.now() + premiumConfig.favoriteWaitMs);
    this.notificationGateway.emitToUser(
      customerUserId,
      'booking:favorite_invited',
      {
        bookingId,
        taskerId: candidate.tasker_id,
        expiresAt: expiresAt.toISOString(),
      },
    );

    // Ring 1 chạy sau khi cửa sổ độc quyền hết hạn. Thợ yêu thích vẫn nằm
    // trong pool ring sau (không exclude) — họ chỉ mất tính độc quyền.
    const nextJobId = await this.bookingDispatchService.enqueueNextRing(
      data,
      premiumConfig.favoriteWaitMs,
    );
    await this.bookingDispatchService.persistDispatchState(
      data,
      nextJobId,
      [candidate.tasker_id],
      expiresAt,
    );
  }

  private async handleNoTaskersFound(data: DispatchJobData): Promise<void> {
    const { bookingId, customerUserId, ring, radiusMeters } = data;

    if (ring < DISPATCH_MAX_RING) {
      // Không tìm thấy trong bán kính này → mở rộng và thử ngay (không delay)
      const nextData: DispatchJobData = {
        ...data,
        ring: data.ring + 1,
        radiusMeters: Math.round(radiusMeters * DISPATCH_RADIUS_FACTOR),
      };

      // Chạy ngay ring tiếp theo (không delay) bằng cách đệ quy handleDispatch
      this.logger.log(
        `No taskers in ring=${ring} radius=${radiusMeters}m — expanding immediately for booking=${bookingId}`,
      );
      await this.handleDispatch(nextData);
    } else {
      // Hết ring — vẫn giữ POSTED, thông báo customer đang tiếp tục tìm
      this.logger.warn(
        `No taskers found after ${DISPATCH_MAX_RING} rings for booking=${bookingId}`,
      );
      this.notificationGateway.emitToUser(
        customerUserId,
        'booking:still_searching',
        {
          bookingId,
          ring,
          radiusKm: (radiusMeters / 1000).toFixed(1),
          taskersFound: 0,
          exhausted: true,
        },
      );

      // Đơn PREMIUM cạn pool: KHÔNG tự hạ cấp xuống thợ thường — đổi cam kết
      // chất lượng là quyết định của khách, không phải của hệ thống. Báo riêng
      // để FE hỏi khách chờ tiếp / hạ hạng (hoàn premiumFee) / huỷ miễn phí.
      if (data.serviceTier === BookingServiceTier.PREMIUM) {
        this.notificationGateway.emitToUser(
          customerUserId,
          'booking:premium_exhausted',
          { bookingId, radiusKm: (radiusMeters / 1000).toFixed(1) },
        );
      }

      await this.bookingDispatchService.persistDispatchState(data);
    }
  }

  private async notifyTaskers(
    booking: Pick<BookingEntity, 'id' | 'bookingCode'>,
    taskers: NearestTaskerRow[],
    ring: number,
  ): Promise<void> {
    const distKm = (taskers[0]?.dist_meters / 1000).toFixed(1);
    const isFavoriteRing = ring === DISPATCH_FAVORITE_RING;

    // Mỗi tasker cần dedupeKey riêng để tránh conflict unique index trong notifications table
    await Promise.all(
      taskers.map((t) =>
        this.notificationService.notify({
          userId: t.user_id,
          type: NotificationType.BOOKING_NEW_AVAILABLE,
          title: isFavoriteRing
            ? 'Khách hàng quen chỉ định bạn!'
            : 'Có đơn mới gần bạn!',
          content: isFavoriteRing
            ? `Đơn premium ${booking.bookingCode} được khách chỉ định riêng cho bạn và đã được thêm vào danh sách đơn có thể nhận.`
            : `Đơn ${booking.bookingCode} cách bạn ~${distKm}km đã được thêm vào danh sách đơn có thể nhận.`,
          referenceType: NotificationRefType.BOOKING,
          referenceId: booking.id,
          dedupeKey: `booking:${booking.id}:dispatch:${t.tasker_id}:ring:${ring}`,
        }),
      ),
    );

    this.logger.log(
      `Notified ${taskers.length} tasker(s) for booking=${booking.id} ring=${ring}`,
    );
  }
}
