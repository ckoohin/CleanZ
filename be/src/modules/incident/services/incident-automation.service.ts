import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, In, LessThan } from 'typeorm';
import { INCIDENT_HOUSEKEEPING_INTERVAL_MS } from '../incident.constants';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentCompensationStatus } from 'src/common/enums/incident-compensation-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentStatusLogEntity } from '../entity/incident-status-log.entity';
import { IncidentConfigService } from './incident-config.service';

export interface HousekeepingResult {
  expiredCount: number;
  autoClosedCount: number;
}

const SAFE_COMP_FOR_CLOSE = [
  IncidentCompensationStatus.NONE,
  IncidentCompensationStatus.RECORDED,
];

@Injectable()
export class IncidentAutomationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(IncidentAutomationService.name);
  private readonly intervalMs: number;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: IncidentConfigService,
    configService: ConfigService,
  ) {
    this.intervalMs = Number(
      configService.get<string>(INCIDENT_HOUSEKEEPING_INTERVAL_MS) ?? 60_000,
    );
  }

  onModuleInit(): void {
    if (this.intervalMs <= 0) return;
    this.interval = setInterval(() => {
      void this.runSilently();
    }, this.intervalMs);
    this.interval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  private async runSilently(): Promise<void> {
    try {
      const r = await this.runHousekeeping();
      if (r.expiredCount || r.autoClosedCount) {
        this.logger.log(
          `Housekeeping: expired=${r.expiredCount} autoClosed=${r.autoClosedCount}`,
        );
      }
    } catch (e) {
      this.logger.error(`Housekeeping lỗi: ${String(e)}`);
    }
  }

  runHousekeeping(): Promise<HousekeepingResult> {
    return asyncHandleOperation(async () => {
      if (this.isRunning) return { expiredCount: 0, autoClosedCount: 0 };
      this.isRunning = true;
      try {
        const expiredCount = await this.sweepReportedExpiry();
        const autoClosedCount = await this.sweepAutoClose();
        return { expiredCount, autoClosedCount };
      } finally {
        this.isRunning = false;
      }
    }, 'Không thể chạy housekeeping sự cố');
  }

  private async sweepReportedExpiry(): Promise<number> {
    const days = await this.config.getReportedExpiryDays();
    if (days <= 0) return 0;
    const cutoff = new Date(Date.now() - days * 86_400_000);
    return this.dataSource.transaction(async (manager) => {
      const incidents = await manager.getRepository(IncidentEntity).find({
        where: {
          status: IncidentStatus.REPORTED,
          reportedAt: LessThan(cutoff),
        },
        take: 100,
      });
      for (const inc of incidents) {
        await this.closeIncident(
          manager,
          inc,
          IncidentClosureReason.EXPIRED,
          'Tự đóng do quá hạn tiếp nhận (housekeeping)',
        );
      }
      return incidents.length;
    });
  }

  private async sweepAutoClose(): Promise<number> {
    const hours = await this.config.getAutoCloseHours();
    const cutoff = new Date(Date.now() - hours * 3_600_000);
    return this.dataSource.transaction(async (manager) => {
      const incidents = await manager.getRepository(IncidentEntity).find({
        where: {
          status: In([IncidentStatus.COMPENSATED, IncidentStatus.REJECTED]),
          compensationStatus: In(SAFE_COMP_FOR_CLOSE),
          updatedAt: LessThan(cutoff),
        },
        take: 100,
      });
      for (const inc of incidents) {
        await this.closeIncident(
          manager,
          inc,
          inc.closureReason ?? IncidentClosureReason.REJECTED,
          'Tự đóng sau thời gian cấu hình (auto-close)',
        );
      }
      return incidents.length;
    });
  }

  private async closeIncident(
    manager: EntityManager,
    incident: IncidentEntity,
    closureReason: IncidentClosureReason,
    note: string,
  ): Promise<void> {
    const from = incident.status;
    incident.status = IncidentStatus.CLOSED;
    incident.closureReason = closureReason;
    await manager.getRepository(IncidentEntity).save(incident);
    const repo = manager.getRepository(IncidentStatusLogEntity);
    await repo.save(
      repo.create({
        incident: { id: incident.id },
        dimension: IncidentLogDimension.STATUS,
        oldValue: from,
        newValue: IncidentStatus.CLOSED,
        changedBy: null,
        reason: note,
      }),
    );
  }
}
