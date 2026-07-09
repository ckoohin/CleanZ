import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toNumber } from 'src/common/helpers/number.helper';

const EPS = 0.01;

export type ReconciliationSeverity = 'CRITICAL' | 'WARNING';

export interface ReconciliationDiscrepancy {
  incidentId: string;
  incidentCode: string | null;
  decisionVersion: number;
  settlementMode: 'DIGITAL' | 'MANUAL' | 'UNKNOWN';
  kind: string;
  severity: ReconciliationSeverity;
  expected: number | null;
  actual: number | null;
  detail: string;
}

export interface ReconciliationReport {
  checkedAt: string;
  checkedCount: number;
  discrepancyCount: number;
  criticalCount: number;
  discrepancies: ReconciliationDiscrepancy[];
}

interface IncidentRow {
  id: string;
  incident_code: string | null;
  decision_version: number;
  approved: string | null;
  tasker_borne: string | null;
  platform_borne: string | null;
  recoverable: string | null;
  uncovered: string | null;
  uncovered_recovered: string | null;
}

interface TxRow {
  reference_id: string;
  reference_type: string;
  type: string;
  owner_type: string;
  amount: string;
  cnt: string;
}

/**
 * P2 — Đối soát allocation ↔ bút toán ví cho các sự cố ĐÃ CHI TRẢ (COMPENSATED/RECORDED).
 * Dùng versioned ref `INCIDENT_COMPENSATION:v{n}` để đối soát đúng version hiện tại
 * (bỏ qua các version cũ đã bị đảo). Chỉ đọc — không sửa dữ liệu. Cờ chênh lệch để audit.
 */
@Injectable()
export class IncidentReconciliationService {
  private readonly logger = new Logger(IncidentReconciliationService.name);

  constructor(private readonly dataSource: DataSource) {}

  async reconcile(): Promise<ReconciliationReport> {
    const incidents: IncidentRow[] = await this.dataSource.query(`
      SELECT id, incident_code, decision_version,
             approved_compensation_amount  AS approved,
             tasker_borne_amount           AS tasker_borne,
             platform_borne_amount         AS platform_borne,
             recoverable_from_deposit_amount AS recoverable,
             uncovered_liability_amount    AS uncovered,
             uncovered_recovered_amount    AS uncovered_recovered
        FROM incidents
       WHERE status = 'COMPENSATED' AND compensation_status = 'RECORDED'
    `);

    const discrepancies: ReconciliationDiscrepancy[] = [];
    if (incidents.length === 0) {
      return this.report(0, discrepancies);
    }

    const ids = incidents.map((i) => i.id);

    // Bút toán settlement theo version (gộp theo ví + loại), kèm số lượng để bắt trùng.
    const txRows: TxRow[] = await this.dataSource.query(
      // Dấu tác động thực = balance_after − balance_before (cột `amount` của ví luôn
      // lưu giá trị DƯƠNG; dấu nằm ở thay đổi số dư). Đây mới là net signed effect.
      `SELECT wt.reference_id, wt.reference_type, wt.type,
              w.owner_type,
              SUM(wt.balance_after - wt.balance_before) AS amount,
              COUNT(*) AS cnt
         FROM wallet_transactions wt
         JOIN wallets w ON w.id = wt.wallet_id
        WHERE wt.reference_id = ANY($1)
          AND wt.reference_type LIKE 'INCIDENT_COMPENSATION:v%'
        GROUP BY wt.reference_id, wt.reference_type, wt.type, w.owner_type`,
      [ids],
    );

    const proofRows: { incident_id: string }[] = await this.dataSource.query(
      `SELECT DISTINCT incident_id
         FROM incident_evidences
        WHERE incident_id = ANY($1)
          AND purpose = 'COMPENSATION_TRANSFER_PROOF'
          AND is_soft_deleted = false`,
      [ids],
    );
    const hasProof = new Set(proofRows.map((r) => r.incident_id));

    for (const inc of incidents) {
      const refType = `INCIDENT_COMPENSATION:v${inc.decision_version}`;
      const rows = txRows.filter(
        (r) => r.reference_id === inc.id && r.reference_type === refType,
      );
      const pick = (owner: string, type: string) =>
        rows.find((r) => r.owner_type === owner && r.type === type);

      const approved = toNumber(inc.approved);
      const taskerBorne = toNumber(inc.tasker_borne);
      const platformBorne = toNumber(inc.platform_borne);
      const recoverable = toNumber(inc.recoverable);
      const uncovered = toNumber(inc.uncovered);
      const uncoveredRecovered = toNumber(inc.uncovered_recovered);

      const refund = pick('CUSTOMER', 'REFUND');
      const refundAmt = toNumber(refund?.amount);
      const refundCnt = Number(refund?.cnt ?? 0);
      const systemAdjust = toNumber(pick('SYSTEM', 'ADJUSTMENT')?.amount);
      const taskerDeduct = toNumber(pick('TASKER', 'DEPOSIT_DEDUCT')?.amount);

      const mode: ReconciliationDiscrepancy['settlementMode'] =
        refundAmt > EPS
          ? 'DIGITAL'
          : hasProof.has(inc.id)
            ? 'MANUAL'
            : 'UNKNOWN';

      const add = (
        kind: string,
        severity: ReconciliationSeverity,
        expected: number | null,
        actual: number | null,
        detail: string,
      ) =>
        discrepancies.push({
          incidentId: inc.id,
          incidentCode: inc.incident_code,
          decisionVersion: inc.decision_version,
          settlementMode: mode,
          kind,
          severity,
          expected,
          actual,
          detail,
        });

      // ── Bất biến allocation nội tại ──────────────────────────────────────
      if (Math.abs(taskerBorne + platformBorne - approved) > EPS) {
        add(
          'ALLOCATION_MISMATCH',
          'CRITICAL',
          approved,
          taskerBorne + platformBorne,
          'taskerBorne + platformBorne ≠ approved',
        );
      }
      if (Math.abs(recoverable + uncovered - taskerBorne) > EPS) {
        add(
          'RECOVERABLE_MISMATCH',
          'CRITICAL',
          taskerBorne,
          recoverable + uncovered,
          'recoverable + uncovered ≠ taskerBorne',
        );
      }
      if (uncoveredRecovered > uncovered + EPS) {
        add(
          'RECOVERED_OVERFLOW',
          'WARNING',
          uncovered,
          uncoveredRecovered,
          'uncoveredRecovered > uncovered',
        );
      }

      // ── Đối soát ledger ví ────────────────────────────────────────────────
      if (approved > EPS && mode === 'UNKNOWN') {
        add(
          'CUSTOMER_REFUND_MISSING',
          'CRITICAL',
          approved,
          0,
          'Không có REFUND vào ví Khách và cũng không có minh chứng chuyển khoản thủ công',
        );
      }

      if (mode === 'DIGITAL') {
        if (refundCnt > 1) {
          add(
            'DUPLICATE_REFUND',
            'CRITICAL',
            1,
            refundCnt,
            `Có ${refundCnt} bút toán REFUND cho cùng version`,
          );
        }
        if (Math.abs(refundAmt - approved) > EPS) {
          add(
            'CUSTOMER_REFUND_MISMATCH',
            'CRITICAL',
            approved,
            refundAmt,
            'Tổng REFUND ví Khách ≠ approved',
          );
        }
        const expectSystem = -(platformBorne + uncovered);
        if (Math.abs(systemAdjust - expectSystem) > EPS) {
          add(
            'SYSTEM_LEDGER_MISMATCH',
            'WARNING',
            expectSystem,
            systemAdjust,
            'ADJUSTMENT ví SYSTEM ≠ -(platformBorne + uncovered)',
          );
        }
      }

      if (mode === 'MANUAL') {
        if (Math.abs(systemAdjust - recoverable) > EPS) {
          add(
            'SYSTEM_LEDGER_MISMATCH',
            'WARNING',
            recoverable,
            systemAdjust,
            'ADJUSTMENT ví SYSTEM (thu hồi từ Tasker) ≠ recoverable',
          );
        }
      }

      // Phần trừ từ ví Tasker không được vượt recoverable (phần dư là cọc gốc).
      if (Math.abs(taskerDeduct) > recoverable + EPS) {
        add(
          'TASKER_DEDUCT_OVERFLOW',
          'WARNING',
          recoverable,
          Math.abs(taskerDeduct),
          'Trừ ví Tasker vượt recoverable',
        );
      }
    }

    return this.report(incidents.length, discrepancies);
  }

  private report(
    checkedCount: number,
    discrepancies: ReconciliationDiscrepancy[],
  ): ReconciliationReport {
    const criticalCount = discrepancies.filter(
      (d) => d.severity === 'CRITICAL',
    ).length;
    if (discrepancies.length > 0) {
      this.logger.warn(
        `Reconciliation: ${discrepancies.length} chênh lệch (${criticalCount} nghiêm trọng) / ${checkedCount} sự cố`,
      );
    }
    return {
      checkedAt: new Date().toISOString(),
      checkedCount,
      discrepancyCount: discrepancies.length,
      criticalCount,
      discrepancies,
    };
  }
}
