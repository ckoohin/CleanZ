import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DataSource, In, QueryFailedError } from 'typeorm';
import { BookingStatus } from 'src/common/enums/booking-status.enum';
import { EarningsReportDeliveryStatus } from 'src/common/enums/earnings-report-delivery-status.enum';
import { EarningsReportRunStatus } from 'src/common/enums/earnings-report-run-status.enum';
import { EarningsReportTriggerSource } from 'src/common/enums/earnings-report-trigger-source.enum';
import type {
  EarningsReportPeriod,
  EarningsReportWindow,
} from 'src/common/helpers/earnings-period.helper';
import { BookingEntity } from 'src/modules/booking/entity/booking.entity';
import {
  EARNINGS_REPORT_JOB_OPTS,
  EARNINGS_REPORT_JOB_SEND,
  EARNINGS_REPORT_QUEUE,
  PERIOD_TO_TYPE,
  toEarningsReportJobId,
  type EarningsReportJobData,
} from '../earnings-report.constants';
import { EarningsReportDeliveryEntity } from '../entity/earnings-report-delivery.entity';
import { EarningsReportRunEntity } from '../entity/earnings-report-run.entity';

/** Mã lỗi Postgres cho vi phạm unique constraint. */
const PG_UNIQUE_VIOLATION = '23505';

interface EligibleTasker {
  taskerId: string;
  email: string;
}

@Injectable()
export class EarningsReportDispatchService {
  private readonly logger = new Logger(EarningsReportDispatchService.name);
  private readonly batchSize: number;

  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue(EARNINGS_REPORT_QUEUE)
    private readonly queue: Queue,
    configService: ConfigService,
  ) {
    this.batchSize = Number(
      configService.get<string>('EARNINGS_REPORT_BATCH_SIZE') ?? 200,
    );
  }

  /**
   * Giành quyền chạy một kỳ cho scheduler.
   *
   * Partial unique index `(period_type, period_start_key) WHERE trigger_source='SCHEDULER'`
   * là trọng tài: nhiều instance cùng tick thì chỉ một INSERT đi qua, các instance
   * còn lại nhận lỗi 23505 và nhận `null` — không cần khoá phân tán.
   */
  async claimSchedulerRun(
    period: EarningsReportPeriod,
    window: EarningsReportWindow,
  ): Promise<EarningsReportRunEntity | null> {
    try {
      return await this.dataSource.getRepository(EarningsReportRunEntity).save(
        this.dataSource.getRepository(EarningsReportRunEntity).create({
          periodType: PERIOD_TO_TYPE[period],
          periodStartKey: window.periodStartKey,
          periodStart: window.periodStart,
          periodEnd: window.periodEnd,
          triggerSource: EarningsReportTriggerSource.SCHEDULER,
          triggeredByUserId: null,
          status: EarningsReportRunStatus.PENDING,
        }),
      );
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        this.logger.debug(
          `Kỳ ${period}/${window.periodStartKey} đã có instance khác nhận — bỏ qua.`,
        );
        return null;
      }
      throw err;
    }
  }

  /** Lượt gửi do admin bấm tay — không vướng unique index nên lặp lại được. */
  async createAdminRun(
    period: EarningsReportPeriod,
    window: EarningsReportWindow,
    adminUserId: string,
  ): Promise<EarningsReportRunEntity> {
    const repo = this.dataSource.getRepository(EarningsReportRunEntity);
    return repo.save(
      repo.create({
        periodType: PERIOD_TO_TYPE[period],
        periodStartKey: window.periodStartKey,
        periodStart: window.periodStart,
        periodEnd: window.periodEnd,
        triggerSource: EarningsReportTriggerSource.ADMIN,
        triggeredByUserId: adminUserId,
        status: EarningsReportRunStatus.PENDING,
      }),
    );
  }

  /**
   * Tạo bản ghi delivery và đẩy job cho từng Tasker đủ điều kiện.
   *
   * `jobId` cố định theo (kỳ, tasker) nên BullMQ tự loại job trùng — chặn gửi hai
   * lần khi scheduler chạy nhiều instance hoặc admin bấm gửi lại cùng tham số.
   */
  async enqueueForRun(
    run: EarningsReportRunEntity,
    period: EarningsReportPeriod,
    window: EarningsReportWindow,
    taskerIds?: string[],
  ): Promise<number> {
    const runRepo = this.dataSource.getRepository(EarningsReportRunEntity);
    const deliveryRepo = this.dataSource.getRepository(
      EarningsReportDeliveryEntity,
    );

    let total = 0;
    let offset = 0;

    for (;;) {
      const batch = await this.findEligibleTaskers(window, taskerIds, offset);
      if (batch.length === 0) break;

      // Bỏ qua bản ghi đã có (unique run_id + tasker_id) để chạy lại an toàn.
      await deliveryRepo
        .createQueryBuilder()
        .insert()
        .values(
          batch.map((item) => ({
            runId: run.id,
            taskerId: item.taskerId,
            email: item.email,
            status: EarningsReportDeliveryStatus.PENDING,
          })),
        )
        .orIgnore()
        .execute();

      await this.queue.addBulk(
        batch.map((item) => ({
          name: EARNINGS_REPORT_JOB_SEND,
          data: {
            runId: run.id,
            taskerId: item.taskerId,
            period,
            periodStartKey: window.periodStartKey,
          } satisfies EarningsReportJobData,
          opts: {
            ...EARNINGS_REPORT_JOB_OPTS,
            jobId: toEarningsReportJobId(
              period,
              window.periodStartKey,
              item.taskerId,
            ),
          },
        })),
      );

      total += batch.length;
      offset += batch.length;
      if (batch.length < this.batchSize) break;
    }

    await runRepo.update(run.id, {
      totalTaskers: total,
      status:
        total === 0
          ? EarningsReportRunStatus.COMPLETED
          : EarningsReportRunStatus.RUNNING,
    });

    this.logger.log(
      `Lượt gửi ${run.id} (${period}/${window.periodStartKey}): đã xếp hàng ${total} Tasker.`,
    );
    return total;
  }

  /**
   * Tasker nhận bản kê: có ít nhất một đơn `COMPLETED` hoàn thành trong kỳ và
   * tài khoản còn email. Lấy theo lô để không nạp toàn bộ Tasker vào RAM.
   */
  private async findEligibleTaskers(
    window: EarningsReportWindow,
    taskerIds: string[] | undefined,
    offset: number,
  ): Promise<EligibleTasker[]> {
    const query = this.dataSource
      .getRepository(BookingEntity)
      .createQueryBuilder('b')
      .innerJoin('b.tasker', 't')
      .innerJoin('t.user', 'u')
      .select('t.id', 'taskerId')
      .addSelect('u.email', 'email')
      .where('b.status = :status', { status: BookingStatus.COMPLETED })
      .andWhere('b.completed_at >= :from AND b.completed_at < :to', {
        from: window.startAt,
        to: window.endAt,
      })
      .andWhere('u.email IS NOT NULL')
      .andWhere('u.deleted_at IS NULL')
      .groupBy('t.id')
      .addGroupBy('u.email')
      .orderBy('t.id', 'ASC')
      .offset(offset)
      .limit(this.batchSize);

    if (taskerIds && taskerIds.length > 0) {
      query.andWhere('t.id IN (:...taskerIds)', { taskerIds });
    }

    return query.getRawMany<EligibleTasker>();
  }

  /** Cập nhật số đếm của lượt sau khi một delivery kết thúc. */
  async refreshRunProgress(runId: string): Promise<void> {
    const deliveryRepo = this.dataSource.getRepository(
      EarningsReportDeliveryEntity,
    );
    const [sentCount, failedCount, pendingCount] = await Promise.all([
      deliveryRepo.countBy({
        runId,
        status: EarningsReportDeliveryStatus.SENT,
      }),
      deliveryRepo.countBy({
        runId,
        status: EarningsReportDeliveryStatus.FAILED,
      }),
      deliveryRepo.countBy({
        runId,
        status: In([EarningsReportDeliveryStatus.PENDING]),
      }),
    ]);

    await this.dataSource.getRepository(EarningsReportRunEntity).update(runId, {
      sentCount,
      failedCount,
      status:
        pendingCount === 0
          ? failedCount > 0
            ? EarningsReportRunStatus.FAILED
            : EarningsReportRunStatus.COMPLETED
          : EarningsReportRunStatus.RUNNING,
    });
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    );
  }
}
