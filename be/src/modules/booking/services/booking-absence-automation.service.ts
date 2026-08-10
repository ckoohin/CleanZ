import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, LessThan } from 'typeorm';
import { BookingAbsenceReportStatus } from 'src/common/enums/booking-absence-report-status.enum';
import { NotificationType } from 'src/common/enums/notification-type.enum';
import { UserRole } from 'src/common/enums/user-role.enum';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { NotificationService } from 'src/modules/notification/notification.service';
import { SystemConfigService } from 'src/modules/system-config/system-config.service';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { CustomerDebtService } from 'src/modules/wallet/customer-debt.service';
import {
  CustomerDebtEntity,
  CustomerDebtSource,
  CustomerDebtStatus,
} from 'src/modules/wallet/entity/customer-debt.entity';
import { BookingAbsenceReportEntity } from '../entity/booking-absence-report.entity';
import { BookingAbsenceService } from './booking-absence.service';

export interface AbsenceHousekeepingResult {
  expiredCount: number;
  debtRecovered: number;
  debtWrittenOff: number;
  exposureWarned: number;
}

@Injectable()
export class BookingAbsenceAutomationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BookingAbsenceAutomationService.name);
  private readonly intervalMs: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly absenceService: BookingAbsenceService,
    private readonly customerDebtService: CustomerDebtService,
    private readonly systemConfigService: SystemConfigService,
    private readonly notificationService: NotificationService,
    configService: ConfigService,
  ) {
    const configured = Number(
      configService.get<string>('BOOKING_ABSENCE_AUTOMATION_INTERVAL_MS') ??
        60_000,
    );
    this.intervalMs =
      configured === 0
        ? 0
        : Number.isFinite(configured) && configured >= 10_000
          ? Math.floor(configured)
          : 60_000;
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) return;
    this.interval = setInterval(() => void this.runSilently(), this.intervalMs);
    this.interval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  runHousekeeping(): Promise<AbsenceHousekeepingResult> {
    return asyncHandleOperation(async () => {
      const empty: AbsenceHousekeepingResult = {
        expiredCount: 0,
        debtRecovered: 0,
        debtWrittenOff: 0,
        exposureWarned: 0,
      };
      if (this.isRunning) return empty;
      this.isRunning = true;
      try {
        return {
          expiredCount: await this.sweepSlaOverdue(),
          debtRecovered: await this.sweepDebtRecovery(),
          debtWrittenOff: await this.sweepDebtWriteOff(),
          exposureWarned: await this.sweepDebtExposure(),
        };
      } finally {
        this.isRunning = false;
      }
    }, 'Không thể chạy housekeeping báo cáo khách vắng');
  }

  private async runSilently(): Promise<void> {
    try {
      const result = await this.runHousekeeping();
      if (
        result.expiredCount ||
        result.debtRecovered ||
        result.debtWrittenOff ||
        result.exposureWarned
      ) {
        this.logger.log(
          `Housekeeping khách vắng: expired=${result.expiredCount} recovered=${result.debtRecovered} writtenOff=${result.debtWrittenOff} exposureWarned=${result.exposureWarned}`,
        );
      }
    } catch (error: unknown) {
      this.logger.error(`Housekeeping khách vắng lỗi: ${String(error)}`);
    }
  }

  private async sweepSlaOverdue(): Promise<number> {
    const reports = await this.dataSource
      .getRepository(BookingAbsenceReportEntity)
      .find({
        where: {
          status: BookingAbsenceReportStatus.PENDING_REVIEW,
          reviewDueAt: LessThan(new Date()),
        },
        order: { reviewDueAt: 'ASC' },
        take: 100,
      });
    let expired = 0;
    for (const report of reports) {
      try {
        if (await this.absenceService.expire(report.id)) expired += 1;
      } catch (error: unknown) {
        this.logger.warn(
          `Không thể expire báo cáo ${report.id}: ${String(error)}`,
        );
      }
    }
    return expired;
  }

  private async sweepDebtRecovery(): Promise<number> {
    const rows: Array<{ customer_id: string }> = await this.dataSource.query(
      `SELECT DISTINCT d.customer_id
         FROM customer_debts d
         JOIN wallets w
           ON w.customer_id = d.customer_id AND w.owner_type = 'CUSTOMER'
        WHERE d.status = 'OUTSTANDING'
          AND d.source = 'ABSENCE_COMPENSATION'
          AND w.balance > 0
        LIMIT 100`,
    );
    let total = 0;
    for (const row of rows) {
      try {
        total += await this.dataSource.transaction((manager) =>
          this.customerDebtService.recoverForCustomer(manager, row.customer_id),
        );
      } catch (error: unknown) {
        this.logger.warn(
          `Thu hồi nợ customer ${row.customer_id} thất bại: ${String(error)}`,
        );
      }
    }
    return total;
  }

  private async sweepDebtWriteOff(): Promise<number> {
    const policy = await this.systemConfigService.getCustomerAbsencePolicy(
      this.dataSource.manager,
    );
    const cutoff = new Date(Date.now() - policy.debtWriteOffDays * 86_400_000);
    const debts = await this.dataSource.getRepository(CustomerDebtEntity).find({
      where: {
        source: CustomerDebtSource.ABSENCE_COMPENSATION,
        status: CustomerDebtStatus.OUTSTANDING,
        createdAt: LessThan(cutoff),
      },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    let writtenOff = 0;
    for (const debt of debts) {
      try {
        const result = await this.dataSource.transaction((manager) =>
          this.customerDebtService.writeOff(
            manager,
            debt.id,
            null,
            'SLA_EXPIRED_AUTO',
            policy.debtWriteOffDays,
          ),
        );
        if (result.writtenOff > 0) writtenOff += 1;
      } catch (error: unknown) {
        this.logger.warn(`Write-off nợ ${debt.id} thất bại: ${String(error)}`);
      }
    }
    return writtenOff;
  }

  private async sweepDebtExposure(): Promise<number> {
    const policy = await this.systemConfigService.getCustomerAbsencePolicy(
      this.dataSource.manager,
    );
    const [row]: Array<{ exposure: string }> = await this.dataSource.query(
      `SELECT COALESCE(SUM(original_amount - recovered_amount - written_off_amount), 0) AS exposure
         FROM customer_debts
        WHERE status = 'OUTSTANDING'
          AND source = 'ABSENCE_COMPENSATION'`,
    );
    const exposure = Math.max(0, Number(row?.exposure ?? 0));
    if (
      policy.debtExposureAlertVnd <= 0 ||
      exposure <= policy.debtExposureAlertVnd
    ) {
      return 0;
    }

    const admins = await this.dataSource.getRepository(UserEntity).find({
      where: { role: UserRole.ADMIN, isActive: true },
      select: { id: true },
    });
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());
    this.logger.warn(
      `Dư nợ khách vắng ${exposure}đ vượt ngưỡng ${policy.debtExposureAlertVnd}đ`,
    );
    await this.notificationService.notifyMany(
      admins.map((admin) => admin.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Dư nợ khách vắng vượt ngưỡng',
        content:
          `Tổng dư nợ đang là ${exposure.toLocaleString('vi-VN')}đ, ` +
          `vượt ngưỡng ${policy.debtExposureAlertVnd.toLocaleString('vi-VN')}đ.`,
        dedupeKey: `absence-debt-exposure:${day}`,
      },
    );
    return admins.length > 0 ? 1 : 0;
  }
}
