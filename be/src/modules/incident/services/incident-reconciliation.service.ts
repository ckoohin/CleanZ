import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toNumber } from 'src/common/helpers/number.helper';
import { SIGNED_AMOUNT_SQL } from 'src/modules/wallet/entity/wallet-transaction.entity';
import { vietnamNow } from 'src/common/helpers/vietnam-time.helper';

const EPS = 0.01;

/**
 * Ân hạn trước khi kêu một khoản chi ngoài là "chưa đối chiếu sao kê".
 *
 * Sao kê không về theo thời gian thực: kêu ngay lúc vừa chi thì mọi khoản chi thủ công đều
 * đỏ trong vài ngày đầu, và cảnh báo nào cũng đỏ thì chẳng ai nhìn nữa.
 */
export const BANK_VERIFY_GRACE_HOURS = 72;

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
  /**
   * Tổng chi bồi thường của nền tảng, tách theo hai sổ. Cộng lại mới ra tiền thật đã ra
   * khỏi công ty — ví SYSTEM một mình không phản ánh phần chuyển khoản ngoài.
   */
  platformOutlay: {
    /** Quỹ SYSTEM đã chi qua ví (platformBorne + phần ứng nợ Tasker). */
    viaWallet: number;
    /**
     * Chuyển khoản ngân hàng ngoài ví (luồng chi trả thủ công), gồm cả phần đã chuyển
     * nhầm không đến tay khách — đây là tiền đã rời ngân hàng, không phải tiền khách nhận.
     */
    external: number;
    /** Phần Tasker còn nợ mà Admin đã xoá — nền tảng chịu mất. */
    writtenOff: number;
  };
  /**
   * Mức độ khoản chi thủ công đã được SAO KÊ NGÂN HÀNG xác nhận. Tách khỏi
   * `discrepancies` vì đây là chỉ số bao phủ, không phải lỗi: một khoản vừa chi hôm nay
   * chưa đối chiếu là bình thường, chưa đối chiếu sau nhiều ngày mới là vấn đề.
   */
  bankVerification: {
    /** Số sự cố chi trả bằng chuyển khoản ngoài. */
    manualCount: number;
    /** Trong đó, số khoản có tổng dòng sao kê khớp đúng số đã khai. */
    verifiedCount: number;
    unverifiedCount: number;
  };
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
  uncovered_written_off: string | null;
  external_payout: string | null;
  external_payout_loss: string | null;
  external_payout_at: Date | null;
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
      SELECT incidents.id, incident_code, decision_version,
             approved_compensation_amount  AS approved,
             tasker_borne_amount           AS tasker_borne,
             platform_borne_amount         AS platform_borne,
             recoverable_from_deposit_amount AS recoverable,
             uncovered_liability_amount    AS uncovered,
             external_payout_amount        AS external_payout,
             external_payout_loss_amount   AS external_payout_loss,
             external_payout_at            AS external_payout_at,
             COALESCE(d.recovered_amount, 0)   AS uncovered_recovered,
             COALESCE(d.written_off_amount, 0) AS uncovered_written_off
        FROM incidents
        LEFT JOIN tasker_debts d
          ON d.source = 'INCIDENT_COMPENSATION' AND d.source_ref_id = incidents.id
       WHERE incidents.status IN ('COMPENSATED', 'CLOSED')
         AND incidents.resolved_at IS NOT NULL
         AND incidents.approved_compensation_amount IS NOT NULL
    `);

    const discrepancies: ReconciliationDiscrepancy[] = [];
    const now = vietnamNow().getTime();
    let manualCount = 0;
    let verifiedCount = 0;
    const totals: ReconciliationReport['platformOutlay'] = {
      viaWallet: 0,
      external: 0,
      writtenOff: 0,
    };
    if (incidents.length === 0) {
      return this.report(0, discrepancies);
    }

    const ids = incidents.map((i) => i.id);

    // Bút toán settlement theo version (gộp theo ví + loại), kèm số lượng để bắt trùng.
    const txRows: TxRow[] = await this.dataSource.query(
      // Cột `amount` của ví luôn DƯƠNG; dấu nằm ở thay đổi số dư — xem `SIGNED_AMOUNT_SQL`.
      `SELECT wt.reference_id, wt.reference_type, wt.type,
              w.owner_type,
              SUM(${SIGNED_AMOUNT_SQL('wt')}) AS amount,
              COUNT(*) AS cnt
         FROM wallet_transactions wt
         JOIN wallets w ON w.id = wt.wallet_id
        WHERE wt.reference_id = ANY($1)
          AND wt.reference_type LIKE 'INCIDENT_COMPENSATION:v%'
        GROUP BY wt.reference_id, wt.reference_type, wt.type, w.owner_type`,
      [ids],
    );

    // Sao kê ngân hàng đã đối chiếu — nguồn ĐỘC LẬP duy nhất cho khoản tiền rời ngân hàng.
    // Một sự cố có thể có nhiều dòng (chuyển nhầm rồi chuyển bù là hai lần chuyển thật),
    // nên đối chiếu theo TỔNG chứ không theo từng dòng.
    const bankRows: { matched_incident_id: string; total: string }[] =
      await this.dataSource.query(
        `SELECT matched_incident_id, SUM(amount) AS total
           FROM bank_statement_entries
          WHERE matched_incident_id = ANY($1)
            AND status = 'MATCHED'
            AND direction = 'DEBIT'
          GROUP BY matched_incident_id`,
        [ids],
      );
    const bankMatchedBy = new Map(
      bankRows.map((r) => [r.matched_incident_id, toNumber(r.total)]),
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
      const uncoveredWrittenOff = toNumber(inc.uncovered_written_off);
      const externalPayout = toNumber(inc.external_payout);
      const externalPayoutLoss = toNumber(inc.external_payout_loss);

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
      // Thu hồi + xoá nợ không được vượt tổng nợ, nếu không sổ nợ đã bị ghi sai ở đâu đó.
      if (uncoveredRecovered + uncoveredWrittenOff > uncovered + EPS) {
        add(
          'RECOVERED_OVERFLOW',
          'WARNING',
          uncovered,
          uncoveredRecovered + uncoveredWrittenOff,
          'uncoveredRecovered + uncoveredWrittenOff > uncovered',
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
      }

      if (mode === 'DIGITAL') {
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

      // MANUAL: khoản trả khách đi từ tài khoản ngân hàng công ty, KHÔNG qua ví SYSTEM
      // (luồng này chạy chính vì ví SYSTEM cạn). Ví SYSTEM chỉ nhận phần thu từ Tasker.
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
        // Sổ chi ngoài là bản ghi DUY NHẤT cho khoản tiền rời ngân hàng công ty — thiếu
        // hoặc lệch nghĩa là tổng chi thật của nền tảng đang bị báo cáo sai.
        if (Math.abs(externalPayout - approved) > EPS) {
          add(
            'EXTERNAL_PAYOUT_MISMATCH',
            'CRITICAL',
            approved,
            externalPayout,
            externalPayout < approved
              ? `Khách còn thiếu ${approved - externalPayout} VND so với số đã duyệt — phải chuyển bù rồi điều chỉnh lại sổ chi ngoài`
              : 'Sổ chi ngoài ≠ số đã duyệt (chi trả thủ công phải ghi đủ khoản chuyển khoản)',
          );
        }
        // Tiền đã bay mà khách không nhận: không phải lỗi sổ (admin đã khai đúng), nhưng
        // là khoản lỗ thật, phải nổi lên báo cáo chứ không nằm im trong một cột.
        if (externalPayoutLoss > EPS) {
          add(
            'EXTERNAL_PAYOUT_LOSS',
            'WARNING',
            0,
            externalPayoutLoss,
            'Có khoản chuyển khoản không đến tay khách (chuyển nhầm/thừa) — nền tảng chịu mất',
          );
        }

        // ── Đối chiếu với SAO KÊ NGÂN HÀNG ────────────────────────────────
        // Mọi con số ở trên đều do chính người chi tiền khai; sao kê là nguồn duy nhất
        // không đến từ thao tác của họ. Không có nó thì "đã chi 1 triệu" và "ảnh chụp màn
        // hình 1 triệu" chỉ là cùng một lời khai được viết hai lần.
        const outflow = externalPayout + externalPayoutLoss;
        const bankMatched = bankMatchedBy.get(inc.id) ?? 0;
        manualCount += 1;

        if (bankMatched > EPS) {
          if (Math.abs(bankMatched - outflow) > EPS) {
            add(
              'EXTERNAL_PAYOUT_BANK_MISMATCH',
              'CRITICAL',
              outflow,
              bankMatched,
              'Tổng dòng sao kê đã đối chiếu ≠ tổng tiền khai đã rời ngân hàng',
            );
          } else {
            verifiedCount += 1;
          }
        } else if (
          inc.external_payout_at != null &&
          now - new Date(inc.external_payout_at).getTime() >
            BANK_VERIFY_GRACE_HOURS * 3_600_000
        ) {
          // Chưa đối chiếu KHÔNG có nghĩa là sai — sao kê thường về sau vài ngày. Chỉ khi
          // quá hạn ân hạn mà vẫn trắng thì mới là dấu hiệu không ai kiểm khoản này.
          add(
            'EXTERNAL_PAYOUT_UNVERIFIED',
            'WARNING',
            outflow,
            0,
            `Chưa có dòng sao kê nào đối chiếu sau ${BANK_VERIFY_GRACE_HOURS}h — khoản chi này mới chỉ có lời khai của admin`,
          );
        }
      }

      // Ngược lại: luồng digital đã hoàn qua ví thì không được có thêm sổ chi ngoài,
      // nếu không nền tảng bị tính chi hai lần.
      if (mode === 'DIGITAL' && externalPayout > EPS) {
        add(
          'EXTERNAL_PAYOUT_UNEXPECTED',
          'CRITICAL',
          0,
          externalPayout,
          'Đã hoàn qua ví nhưng vẫn ghi sổ chi ngoài — nguy cơ tính chi hai lần',
        );
      }

      totals.viaWallet += mode === 'DIGITAL' ? platformBorne + uncovered : 0;
      // `external` = tiền đã RỜI tài khoản ngân hàng công ty vì luồng thủ công, gồm cả
      // phần chuyển nhầm không đến khách: chỉ cộng phần khách nhận thì tổng chi báo cáo
      // ra nhỏ hơn số tiền thật sự đã mất.
      totals.external += externalPayout + externalPayoutLoss;
      totals.writtenOff += uncoveredWrittenOff;

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

    return this.report(incidents.length, discrepancies, totals, {
      manualCount,
      verifiedCount,
      unverifiedCount: manualCount - verifiedCount,
    });
  }

  private report(
    checkedCount: number,
    discrepancies: ReconciliationDiscrepancy[],
    platformOutlay: ReconciliationReport['platformOutlay'] = {
      viaWallet: 0,
      external: 0,
      writtenOff: 0,
    },
    bankVerification: ReconciliationReport['bankVerification'] = {
      manualCount: 0,
      verifiedCount: 0,
      unverifiedCount: 0,
    },
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
      platformOutlay,
      bankVerification,
    };
  }
}
