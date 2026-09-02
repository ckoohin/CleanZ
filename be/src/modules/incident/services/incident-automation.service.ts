import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, LessThan } from 'typeorm';
import { INCIDENT_HOUSEKEEPING_INTERVAL_MS } from '../incident.constants';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentStatusLogEntity } from '../entity/incident-status-log.entity';
import { IncidentConfigService } from './incident-config.service';
import { IncidentStateService } from './incident-state.service';
import { IncidentEvidenceLifecycleService } from './incident-evidence-lifecycle.service';
import { IncidentNotifier } from './incident-notifier.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import { TaskerDebtService } from 'src/modules/wallet/tasker-debt.service';
import {
  TaskerDebtSource,
  TaskerDebtStatus,
} from 'src/modules/wallet/entity/tasker-debt.entity';
import { IncidentReconciliationService } from './incident-reconciliation.service';
import { IncidentAlertService } from './incident-alert.service';
import {
  vietnamNow,
  vietnamNowMinus,
} from 'src/common/helpers/vietnam-time.helper';

export interface HousekeepingResult {
  expiredCount: number;
  autoClosedCount: number;
  slaOverdueWarned: number;
  payoutOverdueWarned: number;
  debtRecovered: number;
  systemWalletLowWarned: number;
  reconCritical: number;
  /** Ảnh upload dở dang đã được dọn (bản ghi + file trên storage). */
  abandonedEvidencePurged: number;
  /**
   * Lượt này KHÔNG chạy vì một tiến trình khác đang giữ khoá (instance khác, hoặc lượt
   * định kỳ đang dở). Mọi số ở trên là 0 vì chưa quét, không phải vì không có việc.
   */
  skipped: boolean;
}

/**
 * Khoá chạy housekeeping ở phạm vi CỤM — `pg_try_advisory_lock(class, id)`.
 *
 * `isRunning` chỉ là biến trong RAM của một tiến trình: deploy 2 replica là 2 vòng quét
 * chạy song song. Các sweep không sai tiền (thu hồi nợ khoá `FOR UPDATE`, notify dedupe
 * theo key), nhưng chúng giẫm chân nhau, nhân đôi tải DB và làm log nói dối về số lượt
 * thực sự có việc. Advisory lock gắn với SESSION nên tiến trình chết là khoá tự nhả —
 * không có kịch bản kẹt vĩnh viễn cần dọn tay.
 */
const HOUSEKEEPING_LOCK_CLASS = 4711;
const HOUSEKEEPING_LOCK_ID = 1;

/** Sau ngần này giờ mà sự cố đã chốt vẫn chưa chi trả xong thì nhắc Admin. */
const PAYOUT_OVERDUE_HOURS = 24;

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
    private readonly state: IncidentStateService,
    private readonly evidenceLifecycle: IncidentEvidenceLifecycleService,
    private readonly notifier: IncidentNotifier,
    private readonly depositHold: IncidentDepositHoldService,
    private readonly debtRecovery: TaskerDebtService,
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
        r.payoutOverdueWarned ||
        r.debtRecovered ||
        r.abandonedEvidencePurged
      ) {
        this.logger.log(
          `Housekeeping: expired=${r.expiredCount} autoClosed=${r.autoClosedCount} slaOverdueWarned=${r.slaOverdueWarned} payoutOverdueWarned=${r.payoutOverdueWarned} debtRecovered=${r.debtRecovered} evidencePurged=${r.abandonedEvidencePurged}`,
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
        payoutOverdueWarned: 0,
        debtRecovered: 0,
        systemWalletLowWarned: 0,
        reconCritical: 0,
        abandonedEvidencePurged: 0,
        skipped: true,
      };
      if (this.isRunning) return empty;
      this.isRunning = true;

      // Khoá phải nằm trên MỘT connection giữ suốt lượt quét: advisory lock gắn với
      // session, xin trên connection này rồi nhả trên connection khác của pool là nhả hụt.
      const locker = this.dataSource.createQueryRunner();
      let acquired = false;
      try {
        await locker.connect();
        const [lock] = (await locker.query(
          'SELECT pg_try_advisory_lock($1, $2) AS ok',
          [HOUSEKEEPING_LOCK_CLASS, HOUSEKEEPING_LOCK_ID],
        )) as Array<{ ok: boolean }>;
        acquired = lock?.ok === true;
        if (!acquired) return empty;

        const expiredCount = await this.sweepReportedExpiry();
        const autoClosedCount = await this.sweepAutoClose();
        const slaOverdueWarned = await this.sweepSlaOverdue();
        const payoutOverdueWarned = await this.sweepPayoutOverdue();
        const debtRecovered = await this.sweepDebtRecovery();
        const systemWalletLowWarned = await this.sweepSystemWalletFloat();
        const reconCritical = await this.sweepReconciliation();
        const abandonedEvidencePurged = await this.sweepAbandonedEvidence();
        return {
          expiredCount,
          autoClosedCount,
          slaOverdueWarned,
          payoutOverdueWarned,
          debtRecovered,
          systemWalletLowWarned,
          reconCritical,
          abandonedEvidencePurged,
          skipped: false,
        };
      } finally {
        // Nhả khoá trước khi trả connection về pool. Bỏ qua lỗi: nếu session đã chết thì
        // Postgres nhả hộ rồi, còn ném ở đây sẽ nuốt mất kết quả (hoặc lỗi thật) của lượt quét.
        if (acquired) {
          try {
            await locker.query('SELECT pg_advisory_unlock($1, $2)', [
              HOUSEKEEPING_LOCK_CLASS,
              HOUSEKEEPING_LOCK_ID,
            ]);
          } catch (e) {
            this.logger.warn(`Không nhả được khoá housekeeping: ${String(e)}`);
          }
        }
        await locker.release();
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
    const now = vietnamNow();
    const incidents = await this.dataSource.getRepository(IncidentEntity).find({
      where: [
        { status: IncidentStatus.REVIEWING, decisionDueAt: LessThan(now) },
        {
          status: IncidentStatus.AWAITING_RESPONSE,
          decisionDueAt: LessThan(now),
        },
      ],
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
   * Sự cố đã chốt nhưng kẹt ở `AWAITING_PAYOUT` quá lâu → nhắc Admin đã chốt. Chỉ cảnh
   * báo, KHÔNG tự chi.
   *
   * Thay cho `sweepCompRetry` cũ: nhánh đó quét `compensationStatus=FAILED` — một giá trị
   * KHÔNG nơi nào ghi (chi trả lỗi thì rollback nguyên transaction về trạng thái chờ chi),
   * nên vòng quét đó không bao giờ chạy. Sự cố kẹt ở `AWAITING_PAYOUT` mới là tín hiệu thật.
   */
  private async sweepPayoutOverdue(): Promise<number> {
    const cutoff = vietnamNowMinus(PAYOUT_OVERDUE_HOURS * 3_600_000);
    const incidents = await this.dataSource.getRepository(IncidentEntity).find({
      where: {
        status: IncidentStatus.AWAITING_PAYOUT,
        finalizedAt: LessThan(cutoff),
      },
      relations: { finalizedByAdmin: true },
      take: 100,
    });
    let warned = 0;
    for (const inc of incidents) {
      this.notifier.notify(
        inc.finalizedByAdmin?.id,
        inc.id,
        'Sự cố đã chốt nhưng chưa chi trả',
        `Sự cố ${inc.incidentCode} đã chốt quá ${PAYOUT_OVERDUE_HOURS}h mà chưa chi trả. Kiểm tra quỹ nền tảng hoặc dùng luồng chuyển khoản thủ công.`,
        'payout-overdue',
      );
      warned += 1;
    }
    return warned;
  }

  /**
   * Đóng hồ sơ khách đã gửi mà quá hạn vẫn không ai tiếp nhận.
   *
   * PHẢI báo cho khách. Đây là hồ sơ do chính họ mở, họ đã kê khai thiệt hại và tải ảnh,
   * rồi chờ — đóng im lặng nghĩa là họ tiếp tục chờ một kết quả sẽ không bao giờ tới. Mọi
   * sweep khác đều gửi thông báo; riêng nhánh này thì không, và đúng nhánh này mới là nơi
   * nền tảng có lỗi (không xử lý kịp) chứ không phải người dùng.
   *
   * Gửi SAU transaction: notifier chạy nền và không được phép làm rollback việc đóng hồ sơ.
   */
  private async sweepReportedExpiry(): Promise<number> {
    const days = await this.config.getReportedExpiryDays();
    if (days <= 0) return 0;
    const cutoff = vietnamNowMinus(days * 86_400_000);
    const closed = await this.dataSource.transaction(async (manager) => {
      const incidents = await manager.getRepository(IncidentEntity).find({
        where: {
          status: IncidentStatus.REPORTED,
          reportedAt: LessThan(cutoff),
        },
        // Cần `customer.user` để biết gửi thông báo cho ai.
        relations: { customer: { user: true } },
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
      return incidents;
    });

    for (const inc of closed) {
      this.notifier.notify(
        inc.customer?.user?.id,
        inc.id,
        'Báo cáo sự cố đã được đóng',
        `Sự cố ${inc.incidentCode ?? ''} của bạn đã quá ${days} ngày mà chưa được xử lý nên hệ thống tự đóng hồ sơ. ` +
          `Nếu vấn đề vẫn chưa được giải quyết, vui lòng liên hệ hỗ trợ để CleanZ mở lại.`,
        'reported-expired',
      );
    }
    return closed.length;
  }

  /**
   * Đóng nguội sự cố đã xử lý xong. QUAN TRỌNG: không đóng khi Tasker còn nợ chưa thu hồi
   * — `sweepDebtRecovery` và `reconcile()` đều chỉ quét `status = COMPENSATED`, nên đóng
   * sớm sẽ khiến khoản nợ vĩnh viễn không thu được và cũng rơi khỏi phạm vi đối soát.
   */
  private async sweepAutoClose(): Promise<number> {
    const hours = await this.config.getAutoCloseHours();
    const cutoff = vietnamNowMinus(hours * 3_600_000);
    return this.dataSource.transaction(async (manager) => {
      const incidents = await manager
        .getRepository(IncidentEntity)
        .createQueryBuilder('i')
        .where('i.status IN (:...statuses)', {
          statuses: [IncidentStatus.COMPENSATED, IncidentStatus.REJECTED],
        })
        .andWhere('i.updated_at < :cutoff', { cutoff })
        .andWhere(
          `NOT EXISTS (
             SELECT 1 FROM tasker_debts d
              WHERE d.source = :debtSource
                AND d.source_ref_id = i.id
                AND d.status = :debtOutstanding
           )`,
          {
            debtSource: TaskerDebtSource.INCIDENT_COMPENSATION,
            debtOutstanding: TaskerDebtStatus.OUTSTANDING,
          },
        )
        .take(100)
        .getMany();
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
    // Quét thẳng SỔ NỢ — không còn phải suy ra nợ từ trạng thái sự cố.
    // Lọc thô để loại sớm ví trống; `recoverForTasker` còn chừa lại sàn số dư nhận đơn
    // nên có Tasker lọt qua đây mà vẫn không thu được gì — chấp nhận được.
    const rows: Array<{ tasker_id: string }> = await this.dataSource.query(
      `SELECT DISTINCT d.tasker_id
         FROM tasker_debts d
         JOIN wallets w ON w.tasker_id = d.tasker_id AND w.owner_type = 'TASKER'
        WHERE d.status = 'OUTSTANDING'
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
    const row = await this.dataSource.query(
      `SELECT balance FROM wallets WHERE owner_type='SYSTEM' LIMIT 1`,
    );
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

  /**
   * Dọn ảnh upload rồi bỏ ngang, không bao giờ gắn vào sự cố nào. Lỗi ở đây không được làm
   * hỏng cả lượt housekeeping — dọn rác là việc phụ, không đáng chặn thu hồi nợ hay đối soát.
   */
  private async sweepAbandonedEvidence(): Promise<number> {
    try {
      const hours = await this.config.getEvidenceOrphanAfterHours();
      if (hours <= 0) return 0;
      return await this.evidenceLifecycle.purgeAbandonedUploads(hours);
    } catch (e) {
      this.logger.warn(`Dọn ảnh upload dở dang thất bại: ${String(e)}`);
      return 0;
    }
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
    // Đóng nguội cũng phải đi qua bảng chuyển trạng thái. Trước đây nhánh này gán thẳng
    // `CLOSED`, nên tính đúng đắn phụ thuộc vào câu WHERE của từng sweep thay vì vào bất
    // biến — nới điều kiện quét ở đâu đó là hồ sơ bị đóng sai trong im lặng.
    this.state.assertStatusTransition(from, IncidentStatus.CLOSED);
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
