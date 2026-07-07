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
import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentStatusLogEntity } from '../entity/incident-status-log.entity';
import { IncidentConfigService } from './incident-config.service';
import { IncidentNotifier } from './incident-notifier.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import { IncidentDebtRecoveryService } from './incident-debt-recovery.service';
import { IncidentReconciliationService } from './incident-reconciliation.service';
import { IncidentAlertService } from './incident-alert.service';
import { CompensationExecutorService } from './compensation-executor.service';

export interface HousekeepingResult {
  expiredCount: number;
  autoClosedCount: number;
  slaOverdueWarned: number;
  secondApprovalOverdueWarned: number;
  compRetried: number;
  debtRecovered: number;
  systemWalletLowWarned: number;
  reconCritical: number;
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
  /** Throttle reconciliation: chỉ đối soát mỗi ~15 phút thay vì mỗi lần housekeeping. */
  private lastReconAt = 0;
  private readonly reconIntervalMs = 15 * 60_000;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: IncidentConfigService,
    private readonly notifier: IncidentNotifier,
    private readonly compensationExecutor: CompensationExecutorService,
    private readonly depositHold: IncidentDepositHoldService,
    private readonly debtRecovery: IncidentDebtRecoveryService,
    private readonly reconciliation: IncidentReconciliationService,
    private readonly alert: IncidentAlertService,
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
      if (
        r.expiredCount ||
        r.autoClosedCount ||
        r.slaOverdueWarned ||
        r.secondApprovalOverdueWarned ||
        r.compRetried ||
        r.debtRecovered
      ) {
        this.logger.log(
          `Housekeeping: expired=${r.expiredCount} autoClosed=${r.autoClosedCount} slaOverdueWarned=${r.slaOverdueWarned} secondApprovalOverdueWarned=${r.secondApprovalOverdueWarned} compRetried=${r.compRetried} debtRecovered=${r.debtRecovered}`,
        );
      }
    } catch (e) {
      this.logger.error(`Housekeeping lỗi: ${String(e)}`);
    }
  }

  runHousekeeping(): Promise<HousekeepingResult> {
    return asyncHandleOperation(async () => {
      const empty: HousekeepingResult = {
        expiredCount: 0,
        autoClosedCount: 0,
        slaOverdueWarned: 0,
        secondApprovalOverdueWarned: 0,
        compRetried: 0,
        debtRecovered: 0,
        systemWalletLowWarned: 0,
        reconCritical: 0,
      };
      if (this.isRunning) return empty;
      this.isRunning = true;
      try {
        const expiredCount = await this.sweepReportedExpiry();
        const autoClosedCount = await this.sweepAutoClose();
        const slaOverdueWarned = await this.sweepSlaOverdue();
        const secondApprovalOverdueWarned =
          await this.sweepSecondApprovalOverdue();
        const compRetried = await this.sweepCompRetry();
        const debtRecovered = await this.sweepDebtRecovery();
        const systemWalletLowWarned = await this.sweepSystemWalletFloat();
        const reconCritical = await this.sweepReconciliation();
        return {
          expiredCount,
          autoClosedCount,
          slaOverdueWarned,
          secondApprovalOverdueWarned,
          compRetried,
          debtRecovered,
          systemWalletLowWarned,
          reconCritical,
        };
      } finally {
        this.isRunning = false;
      }
    }, 'Không thể chạy housekeeping sự cố');
  }

  /**
   * SLA overdue — cảnh báo (không đổi quyết định). Incident còn INVESTIGATING mà
   * đã quá `decisionDueAt` thì gửi notification cảnh báo cho Tasker & Customer.
   * Idempotent nhờ dedupe key theo (incident, event) → mỗi bên chỉ nhận 1 lần.
   * "Đánh dấu" đã được thể hiện qua bộ lọc `overdue` ở admin queue (decisionDueAt < now).
   */
  private async sweepSlaOverdue(): Promise<number> {
    const now = new Date();
    const incidents = await this.dataSource.getRepository(IncidentEntity).find({
      where: {
        status: IncidentStatus.INVESTIGATING,
        decisionDueAt: LessThan(now),
      },
      relations: { tasker: { user: true }, customer: { user: true } },
      take: 100,
    });
    let warned = 0;
    for (const inc of incidents) {
      const title = 'Sự cố quá hạn xử lý';
      const content = `Sự cố ${inc.incidentCode} đã quá thời hạn quyết định (SLA). Đội ngũ đang tiếp tục xử lý.`;
      this.notifier.notify(
        inc.tasker?.user?.id,
        inc.id,
        title,
        content,
        'sla-overdue-decision-tasker',
      );
      this.notifier.notify(
        inc.customer?.user?.id,
        inc.id,
        title,
        content,
        'sla-overdue-decision-customer',
      );
      warned += 1;
    }
    return warned;
  }

  /**
   * C7 — Duyệt cấp 2 quá SLA (mặc định 24h, mốc `secondApprovalDueAt` đặt lúc finalize).
   * Incident đang `PENDING_ADMIN_APPROVAL` mà quá hạn → escalate: nhắc Admin #1 (người
   * finalize) đôn đốc một Admin khác duyệt. Chỉ cảnh báo, KHÔNG tự duyệt/từ chối.
   * Idempotent nhờ dedupe key theo (incident, event).
   */
  private async sweepSecondApprovalOverdue(): Promise<number> {
    const now = new Date();
    const incidents = await this.dataSource.getRepository(IncidentEntity).find({
      where: {
        status: IncidentStatus.INVESTIGATING,
        decisionStatus: IncidentDecisionStatus.PENDING_ADMIN_APPROVAL,
        secondApprovalDueAt: LessThan(now),
      },
      relations: { finalizedByAdmin: true },
      take: 100,
    });
    let warned = 0;
    for (const inc of incidents) {
      this.notifier.notify(
        inc.finalizedByAdmin?.id,
        inc.id,
        'Duyệt cấp 2 quá hạn',
        `Sự cố ${inc.incidentCode} đã quá hạn chờ duyệt cấp 2 (SLA). Vui lòng đôn đốc một quản trị viên khác duyệt hoặc yêu cầu chỉnh sửa.`,
        'second-approval-overdue',
      );
      warned += 1;
    }
    return warned;
  }

  /**
   * Comp-retry — tự động thử lại các Incident có `compensationStatus=FAILED`
   * (đã APPROVED + decisionStatus=FINAL). `execute` idempotent (RECORDED → no-op)
   * và có precondition riêng; lỗi từng incident không chặn incident khác.
   */
  private async sweepCompRetry(): Promise<number> {
    const incidents = await this.dataSource.getRepository(IncidentEntity).find({
      where: {
        status: IncidentStatus.APPROVED,
        decisionStatus: IncidentDecisionStatus.FINAL,
        compensationStatus: IncidentCompensationStatus.FAILED,
      },
      relations: { finalizedByAdmin: true },
      take: 50,
    });
    let retried = 0;
    for (const inc of incidents) {
      const actorId = inc.finalizedByAdmin?.id;
      if (!actorId) {
        this.logger.warn(
          `Comp-retry bỏ qua ${inc.incidentCode}: thiếu admin actor để ghi log`,
        );
        continue;
      }
      try {
        await this.compensationExecutor.execute(actorId, inc.id);
        retried += 1;
      } catch (e) {
        this.logger.warn(
          `Comp-retry ${inc.incidentCode} thất bại, sẽ thử lại lần sau: ${String(e)}`,
        );
      }
    }
    return retried;
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

  /**
   * P0.3 — Thu hồi nợ uncovered: mỗi Tasker còn nợ (COMPENSATED, uncovered>recovered) mà có số dư
   * ví → trừ dần chuyển về quỹ SYSTEM (mỗi Tasker 1 transaction lock). Trả tổng đã thu hồi.
   */
  private async sweepDebtRecovery(): Promise<number> {
    const rows: Array<{ tasker_id: string }> = await this.dataSource.query(
      `SELECT DISTINCT i.tasker_id
         FROM incidents i
         JOIN wallets w ON w.tasker_id = i.tasker_id AND w.owner_type = 'TASKER'
        WHERE i.status = 'COMPENSATED'
          AND COALESCE(i.uncovered_liability_amount,0) > COALESCE(i.uncovered_recovered_amount,0)
          AND w.balance > 0
        LIMIT 100`,
    );
    let total = 0;
    for (const r of rows) {
      try {
        const recovered = await this.dataSource.transaction((manager) =>
          this.debtRecovery.recoverForTasker(manager, r.tasker_id),
        );
        total += recovered;
      } catch (e) {
        this.logger.warn(
          `Thu hồi nợ tasker ${r.tasker_id} thất bại: ${String(e)}`,
        );
      }
    }
    return total;
  }

  /**
   * P0.5 — Cảnh báo quỹ nền tảng (ví SYSTEM) thấp: nếu số dư < ngưỡng cấu hình
   * (`INCIDENT_SYSTEM_WALLET_MIN_BALANCE`) → log warn + notify các Admin (dedupe theo ngày,
   * tránh spam). Quỹ SYSTEM ứng bồi thường; thấp → có thể chặn compensate digital.
   */
  private async sweepSystemWalletFloat(): Promise<number> {
    const row = (await this.dataSource.query(
      `SELECT balance FROM wallets WHERE owner_type='SYSTEM' LIMIT 1`,
    )) as Array<{ balance: string }>;
    if (row.length === 0) return 0;
    const balance = Number(row[0].balance);
    const threshold = await this.config.getSystemWalletMinBalance();
    if (balance >= threshold) return 0;

    // Cảnh báo ra kênh thật (webhook nếu cấu hình) + log; throttle theo key.
    await this.alert.send(
      'system-wallet-low',
      `Quỹ nền tảng (ví SYSTEM) thấp: số dư ${balance} < ngưỡng ${threshold} — cần nạp quỹ để bồi thường digital không bị chặn.`,
      'WARNING',
    );
    return 1;
  }

  /** P2 — đối soát định kỳ (throttle 15'); cảnh báo khi có chênh lệch nghiêm trọng. */
  private async sweepReconciliation(): Promise<number> {
    const now = Date.now();
    if (now - this.lastReconAt < this.reconIntervalMs) return 0;
    this.lastReconAt = now;
    const report = await this.reconciliation.reconcile();
    if (report.criticalCount > 0) {
      const codes = report.discrepancies
        .filter((d) => d.severity === 'CRITICAL')
        .map((d) => `${d.incidentCode ?? d.incidentId}:${d.kind}`)
        .slice(0, 20)
        .join(', ');
      await this.alert.send(
        'reconciliation-critical',
        `Đối soát bồi thường phát hiện ${report.criticalCount} chênh lệch NGHIÊM TRỌNG / ${report.checkedCount} sự cố — ${codes}`,
        'CRITICAL',
      );
    }
    return report.criticalCount;
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
    // P0.2 — auto-close khi đang điều tra → giải phóng phần ví đã HOLD.
    await this.depositHold.release(manager, incident);
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
