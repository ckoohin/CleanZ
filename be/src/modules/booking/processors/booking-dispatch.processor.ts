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
  DISPATCH_MAX_RING,
  DispatchJobData,
  NearestTaskerRow,
} from '../services/booking-dispatch.service';

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
      select: ['id', 'bookingCode', 'status'],
    });

    if (!booking || booking.status !== BookingStatus.POSTED) {
      this.logger.log(
        `Dispatch skipped — booking=${bookingId} status=${booking?.status ?? 'NOT_FOUND'}`,
      );
      await this.bookingDispatchService.clearDispatchState(bookingId);
      return;
    }

    await this.bookingDispatchService.persistDispatchState(data);

    // 2. Tìm tasker gần nhất bằng PostGIS
    const taskers = await this.bookingDispatchService.findNearestTaskers(
      lat,
      lng,
      radiusMeters,
      excludedTaskerIds,
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
        excludedTaskerIds: [
          ...excludedTaskerIds,
          ...taskers.map((t) => t.tasker_id),
        ],
      };
      const nextJobId =
        await this.bookingDispatchService.enqueueNextRing(nextData);
      const scheduledData: DispatchJobData = {
        ...nextData,
        ring: ring + 1,
        radiusMeters: Math.round(radiusMeters * 1.5),
      };
      await this.bookingDispatchService.persistDispatchState(
        scheduledData,
        nextJobId,
      );
    } else {
      this.logger.log(`Dispatch completed all rings for booking=${bookingId}`);
      // Không còn ring nào — customer FE đã có countdown, không thay đổi trạng thái
    }
  }

  private async handleNoTaskersFound(data: DispatchJobData): Promise<void> {
    const { bookingId, customerUserId, ring, radiusMeters } = data;

    if (ring < DISPATCH_MAX_RING) {
      // Không tìm thấy trong bán kính này → mở rộng và thử ngay (không delay)
      const nextData: DispatchJobData = {
        ...data,
        ring: data.ring + 1,
        radiusMeters: Math.round(radiusMeters * 1.5),
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
      await this.bookingDispatchService.persistDispatchState(data);
    }
  }

  private async notifyTaskers(
    booking: Pick<BookingEntity, 'id' | 'bookingCode'>,
    taskers: NearestTaskerRow[],
    ring: number,
  ): Promise<void> {
    const distKm = (taskers[0]?.dist_meters / 1000).toFixed(1);

    // Mỗi tasker cần dedupeKey riêng để tránh conflict unique index trong notifications table
    await Promise.all(
      taskers.map((t) =>
        this.notificationService.notify({
          userId: t.user_id,
          type: NotificationType.BOOKING_NEW_AVAILABLE,
          title: 'Có đơn mới gần bạn!',
          content: `Đơn ${booking.bookingCode} cách bạn ~${distKm}km — Nhấn để xem và nhận`,
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
