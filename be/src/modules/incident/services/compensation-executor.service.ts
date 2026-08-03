import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { asyncHandleOperation } from 'src/common/utils/async-handle.utils';
import { toNumber } from 'src/common/helpers/number.helper';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { NotificationOutboxStatus } from 'src/common/enums/notification-outbox-status.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { NotificationOutboxEntity } from '../entity/notification-outbox.entity';
import { IncidentAdminView } from '../dto/incident-response.dto';
import { IncidentStateService } from './incident-state.service';
import { IncidentAdminService } from './incident-admin.service';
import { WalletService } from '../../wallet/wallet.service';
import { WalletEntity } from '../../wallet/entity/wallet.entity';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import { IncidentAlertService } from './incident-alert.service';
import { TaskerDebtService } from 'src/modules/wallet/tasker-debt.service';
import { TaskerDebtSource } from 'src/modules/wallet/entity/tasker-debt.entity';
import { REVERSAL_WINDOW_HOURS } from '../domain/incident-decision-domain.types';
import { isExpectedDecisionVersion } from '../domain/incident-decision.helpers';

const INCIDENT_COMPENSATION_REF = 'INCIDENT_COMPENSATION';

/**
 * Cửa sổ cho phép tự động đảo một bồi thường đã chi. Thay cho chốt chặn "Admin #2 duyệt
 * trước": sai sót phải được phát hiện và sửa sớm, quá hạn thì buộc xử lý thủ công có kiểm soát.
 *
 * Lấy từ domain chứ không khai lại: cổng `allowedActions` dùng chính con số này để nói trước
 * "hết hạn đảo rồi", nên hai nơi lệch nhau là UI hứa một đằng, BE từ chối một nẻo.
 */
export { REVERSAL_WINDOW_HOURS };

@Injectable()
export class CompensationExecutorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly state: IncidentStateService,
    private readonly adminService: IncidentAdminService,
    private readonly walletService: WalletService,
    private readonly depositHold: IncidentDepositHoldService,
    private readonly alert: IncidentAlertService,
    private readonly taskerDebt: TaskerDebtService,
  ) {}

  /**
   * Phần Tasker chịu mà ví không đủ → quỹ đã ứng thay, ghi thành một khoản nợ trong SỔ NỢ
   * của ví. Sự cố không theo dõi việc thu hồi nữa: đó là việc của ví.
   */
  private async openUncoveredDebt(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    if (!incident.tasker?.id) return;
    await this.taskerDebt.openDebt(manager, {
      taskerId: incident.tasker.id,
      source: TaskerDebtSource.INCIDENT_COMPENSATION,
      sourceRefId: incident.id,
      sourceCode: incident.incidentCode ?? null,
      amount: toNumber(incident.uncoveredLiabilityAmount),
    });
  }

  async execute(
    adminUserId: string,
    incidentId: string,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);

        // Idempotent: đã chi rồi thì chỉ đảm bảo notification tồn tại.
        if (incident.status === IncidentStatus.COMPENSATED) {
          await this.ensureRecordedNotificationOutbox(manager, incident);
          return;
        }

        this.assertCompensationPreconditions(incident);
        this.assertCompensationInvariant(incident);

        const repo = manager.getRepository(IncidentEntity);
        const dbNow = await this.getDatabaseNow(manager);
        this.state.assertStatusTransition(
          incident.status,
          IncidentStatus.COMPENSATED,
        );
        incident.resolvedAt = dbNow;

        // P0.2 — giải phóng phần đã HOLD lúc accept, trả về balance để trừ bồi thường.
        await this.depositHold.release(manager, incident, incident.tasker);

        // C2 — chốt snapshot khả năng thu hồi. Ký quỹ đã bỏ nên nguồn tiền Tasker
        // THẬT = số dư ví (một ví duy nhất).
        const taskerWallet = incident.tasker
          ? await this.walletService.getOrCreateTaskerWallet(
              manager,
              incident.tasker,
            )
          : null;
        this.applyDepositRecoverySnapshot(
          incident,
          toNumber(taskerWallet?.balance),
        );

        // P2.1 — CHUYỂN TIỀN THẬT qua ví: trừ Tasker, chi quỹ SYSTEM, hoàn ví Customer.
        await this.settleCompensation(manager, incident, taskerWallet);
        await this.openUncoveredDebt(manager, incident);

        const from = incident.status;
        incident.status = IncidentStatus.COMPENSATED;
        incident.closureReason = IncidentClosureReason.COMPENSATED;
        await repo.save(incident);

        await this.ensureRecordedNotificationOutbox(manager, incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          from,
          IncidentStatus.COMPENSATED,
          adminUserId,
          // Phase 2: đã chuyển tiền thật qua ví. Hoàn khách = approvedCompensationAmount
          // (bất biến); phần Tasker thu hồi được = recoverable, phần nợ = uncovered.
          `Settled compensation (customer refund=${toNumber(
            incident.approvedCompensationAmount,
          )} VND, tasker_recoverable=${toNumber(
            incident.recoverableFromDepositAmount,
          )}, uncovered=${toNumber(
            incident.uncoveredLiabilityAmount,
          )}, platform_borne=${toNumber(
            incident.platformBorneAmount,
          )}) via wallet`,
        );
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          IncidentStatus.COMPENSATED,
          adminUserId,
          null,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi ghi nhận bồi thường');
  }

  /**
   * P0.4 — Chi trả THỦ CÔNG khi quỹ SYSTEM không đủ: admin chuyển khoản NGOÀI cho khách
   * toàn bộ `approved` (QR trên UI) và upload ảnh minh chứng. Hệ thống:
   *  - trừ Tasker phần recoverable (ví→cọc) và chuyển vào ví SYSTEM (bù khoản công ty đã chi ngoài),
   *  - KHÔNG credit ví Khách, KHÔNG debit SYSTEM (tiền chi là tiền ngoài, minh chứng = proof),
   *  - uncovered vẫn ghi nợ vào sổ nợ như luồng digital.
   */
  async executeManual(
    adminUserId: string,
    incidentId: string,
    proofEvidenceId: string,
    note?: string,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);
        if (incident.status === IncidentStatus.COMPENSATED) {
          return; // idempotent
        }
        this.assertCompensationPreconditions(incident);
        this.assertCompensationInvariant(incident);

        // Proof bắt buộc: do admin upload, đúng purpose, chưa gắn, chưa xoá.
        const proof = await manager.query(
          `SELECT id FROM incident_evidences
            WHERE id=$1 AND purpose='COMPENSATION_TRANSFER_PROOF'
              AND incident_id IS NULL AND is_soft_deleted=false`,
          [proofEvidenceId],
        );
        if (proof.length === 0) {
          throw new UnprocessableEntityException({
            code: 'TRANSFER_PROOF_REQUIRED',
            message:
              'Cần ảnh minh chứng chuyển khoản hợp lệ (đã upload, chưa gắn sự cố khác)',
          });
        }
        await manager.query(
          `UPDATE incident_evidences
              SET incident_id=$2, decision_version=$3, visibility='ADMIN_ONLY'
            WHERE id=$1`,
          [proofEvidenceId, incident.id, incident.decisionVersion],
        );

        const repo = manager.getRepository(IncidentEntity);
        const dbNow = await this.getDatabaseNow(manager);
        this.state.assertStatusTransition(
          incident.status,
          IncidentStatus.COMPENSATED,
        );
        incident.resolvedAt = dbNow;
        await this.depositHold.release(manager, incident, incident.tasker);

        const taskerWallet = incident.tasker
          ? await this.walletService.getOrCreateTaskerWallet(
              manager,
              incident.tasker,
            )
          : null;
        this.applyDepositRecoverySnapshot(
          incident,
          toNumber(taskerWallet?.balance),
        );

        await this.settleManual(manager, incident, taskerWallet);
        await this.openUncoveredDebt(manager, incident);

        // Sổ chi ngoài: tiền rời tài khoản ngân hàng công ty, không qua ví SYSTEM nên
        // không có bút toán ví nào ghi lại. Không lưu ở đây thì tổng chi thật của nền
        // tảng không truy vấn được từ bất kỳ đâu.
        incident.externalPayoutAmount = toNumber(
          incident.approvedCompensationAmount,
        );
        incident.externalPayoutAt = dbNow;
        incident.externalPayoutByAdmin = { id: adminUserId } as never;
        incident.externalPayoutNote = note?.trim() || null;

        const from = incident.status;
        incident.status = IncidentStatus.COMPENSATED;
        incident.closureReason = IncidentClosureReason.COMPENSATED;
        await repo.save(incident);

        await this.ensureRecordedNotificationOutbox(manager, incident, true);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          from,
          IncidentStatus.COMPENSATED,
          adminUserId,
          `Settled MANUAL (bank transfer) — customer paid externally=${toNumber(
            incident.approvedCompensationAmount,
          )} VND, tasker_recovered_to_system=${toNumber(
            incident.recoverableFromDepositAmount,
          )}, uncovered=${toNumber(
            incident.uncoveredLiabilityAmount,
          )}, proof=${proofEvidenceId}${note ? `, note=${note}` : ''}`,
        );
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          IncidentStatus.COMPENSATED,
          adminUserId,
          null,
        );
      });
      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi chi trả thủ công');
  }

  /**
   * Bút toán chi trả THỦ CÔNG — dùng khi ví SYSTEM không đủ để chi tự động.
   *
   * Khoản trả khách đi ra từ TÀI KHOẢN NGÂN HÀNG của công ty, không qua ví SYSTEM, nên
   * KHÔNG ghi debit ví SYSTEM: luồng này tồn tại chính vì ví SYSTEM đang cạn, debit sẽ ném
   * "Số dư ví không đủ" và chặn mất đường lui duy nhất. Bằng chứng cho khoản chi ngoài là
   * ảnh chuyển khoản (`COMPENSATION_TRANSFER_PROOF`) gắn vào sự cố.
   *
   * Phần thu từ Tasker thì có thật trong hệ thống nên chảy về ví SYSTEM để bù lại.
   */
  private async settleManual(
    manager: EntityManager,
    incident: IncidentEntity,
    taskerWallet: WalletEntity | null,
  ): Promise<void> {
    const refId = incident.id;
    const refType = `${INCIDENT_COMPENSATION_REF}:v${incident.decisionVersion}`;
    const code = incident.incidentCode ?? incident.id;
    const recoverable = toNumber(incident.recoverableFromDepositAmount);

    if (recoverable > 0 && taskerWallet && incident.tasker) {
      // `recoverable` đã được snapshot chặn ≤ floor(số dư ví) nên trừ trọn từ ví.
      await this.walletService.debitWallet(manager, {
        wallet: taskerWallet,
        amount: recoverable,
        type: WalletTransactionType.DEPOSIT_DEDUCT,
        referenceId: refId,
        referenceType: refType,
        description: `Trừ ví Tasker (chi trả thủ công) sự cố ${code}`,
      });

      const systemWallet =
        await this.walletService.getOrCreateSystemWallet(manager);
      await this.walletService.creditWallet(manager, {
        wallet: systemWallet,
        amount: recoverable,
        type: WalletTransactionType.ADJUSTMENT,
        referenceId: refId,
        referenceType: refType,
        description: `Thu hồi từ Tasker bù khoản chi ngoài (thủ công) sự cố ${code}`,
      });
    }

    // Phần chưa thu hồi được vẫn là nợ của Tasker với quỹ SYSTEM — thu dần qua
    // IncidentDebtRecoveryService khi Tasker có thu nhập mới.
  }

  /**
   * Thu hồi/đảo một bồi thường đã chi trả (sửa sai).
   *
   * Đây là kiểm soát THAY THẾ cho duyệt cấp 2 đã gỡ: mô hình đổi từ "hai người ký trước khi
   * chi" sang "một người chi, có nút hoàn tác trong cửa sổ giới hạn, mọi lần đều bắn cảnh
   * báo ra ngoài". Vì đội vận hành chỉ có một Admin nên KHÔNG còn ràng buộc admin khác;
   * bù lại có `REVERSAL_WINDOW_HOURS` và lý do bắt buộc.
   *
   * Đảo toàn bộ bút toán (ref RIÊNG, không đụng unique index) rồi mở lại sự cố ở version
   * quyết định mới để soạn lại. Chỉ cho đảo khi CHƯA thu hồi nợ và ví Khách còn đủ để đòi lại.
   */
  async reverse(
    adminUserId: string,
    incidentId: string,
    reason: string,
    expectedDecisionVersion: number,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      let alertPayload: { key: string; message: string } | undefined;
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);

        // Kiểm NGAY sau khi khoá, TRƯỚC mọi kiểm khác: nếu Admin đang thao tác trên một
        // version cũ thì mọi thông báo lỗi phía sau đều nói về một quyết định khác với cái
        // họ đang nhìn, gây hiểu nhầm còn tệ hơn là không nói gì.
        if (
          !isExpectedDecisionVersion(
            incident.decisionVersion,
            expectedDecisionVersion,
          )
        ) {
          throw new ConflictException({
            code: 'DECISION_VERSION_CONFLICT',
            message:
              'Quyết định đã được thay đổi ở nơi khác — tải lại trước khi thu hồi bồi thường',
            currentDecisionVersion: incident.decisionVersion,
          });
        }

        if (incident.status !== IncidentStatus.COMPENSATED) {
          throw new ConflictException({
            code: 'COMPENSATION_NOT_REVERSIBLE',
            message: 'Chỉ thu hồi bồi thường đã chi trả',
          });
        }
        const dbNow = await this.getDatabaseNow(manager);
        const paidAt = incident.resolvedAt?.getTime();
        if (
          paidAt != null &&
          dbNow.getTime() - paidAt > REVERSAL_WINDOW_HOURS * 3_600_000
        ) {
          throw new ConflictException({
            code: 'REVERSAL_WINDOW_EXPIRED',
            message: `Quá hạn tự động thu hồi (${REVERSAL_WINDOW_HOURS}h kể từ lúc chi trả) — cần xử lý thủ công`,
          });
        }
        const debt = await this.taskerDebt.findBySource(
          manager,
          TaskerDebtSource.INCIDENT_COMPENSATION,
          incident.id,
        );
        if (toNumber(debt?.recoveredAmount) > 0) {
          throw new ConflictException({
            code: 'COMPENSATION_DEBT_RECOVERY_STARTED',
            message:
              'Đã bắt đầu thu hồi nợ — không thể tự động đảo; cần xử lý thủ công',
          });
        }
        // P0.4 — chi trả THỦ CÔNG (không có bút toán REFUND vào ví khách) không tự đảo được:
        // tiền đã chuyển ngoài hệ thống, phải thu hồi thủ công.
        const refundTx = await manager.query(
          `SELECT 1 FROM wallet_transactions
            WHERE reference_id=$1 AND reference_type=$2 AND type='REFUND' LIMIT 1`,
          [incident.id, `INCIDENT_COMPENSATION:v${incident.decisionVersion}`],
        );
        if (
          toNumber(incident.approvedCompensationAmount) > 0 &&
          refundTx.length === 0
        ) {
          throw new ConflictException({
            code: 'COMPENSATION_MANUAL_NOT_REVERSIBLE',
            message:
              'Bồi thường được chi trả thủ công (chuyển khoản ngoài) — không thể tự động đảo',
          });
        }
        if (!reason || reason.trim().length < 10) {
          throw new UnprocessableEntityException({
            code: 'REVERSAL_REASON_REQUIRED',
            message: 'Lý do thu hồi phải có ít nhất 10 ký tự',
          });
        }

        const refType = 'INCIDENT_COMPENSATION_REVERSAL';
        const code = incident.incidentCode ?? incident.id;
        const approved = toNumber(incident.approvedCompensationAmount);
        const recoverable = toNumber(incident.recoverableFromDepositAmount);
        const platformPayout =
          toNumber(incident.platformBorneAmount) +
          toNumber(incident.uncoveredLiabilityAmount);

        // 1) Đòi lại tiền đã hoàn từ ví Khách (nếu khách đã tiêu → chặn, xử lý thủ công).
        if (approved > 0 && incident.customer) {
          const customerWallet =
            await this.walletService.getOrCreateCustomerWallet(
              manager,
              incident.customer,
            );
          if (toNumber(customerWallet.balance) < approved) {
            throw new ConflictException({
              code: 'CUSTOMER_BALANCE_INSUFFICIENT_FOR_REVERSAL',
              message:
                'Số dư ví Khách không đủ để đòi lại khoản đã hoàn — cần xử lý thủ công',
            });
          }
          await this.walletService.debitWallet(manager, {
            wallet: customerWallet,
            amount: approved,
            type: WalletTransactionType.ADJUSTMENT,
            referenceId: incident.id,
            referenceType: refType,
            description: `Thu hồi hoàn bồi thường sự cố ${code}`,
          });
        }
        // 2) Trả lại phần đã trừ cho ví Tasker.
        if (recoverable > 0 && incident.tasker) {
          const taskerWallet = await this.walletService.getOrCreateTaskerWallet(
            manager,
            incident.tasker,
          );
          await this.walletService.creditWallet(manager, {
            wallet: taskerWallet,
            amount: recoverable,
            type: WalletTransactionType.ADJUSTMENT,
            referenceId: incident.id,
            referenceType: refType,
            description: `Hoàn lại phần đã trừ (đảo bồi thường) sự cố ${code}`,
          });
        }
        // 3) Trả lại phần quỹ SYSTEM đã chi.
        if (platformPayout > 0) {
          const systemWallet =
            await this.walletService.getOrCreateSystemWallet(manager);
          await this.walletService.creditWallet(manager, {
            wallet: systemWallet,
            amount: platformPayout,
            type: WalletTransactionType.ADJUSTMENT,
            referenceId: incident.id,
            referenceType: refType,
            description: `Hoàn quỹ đã chi (đảo bồi thường) sự cố ${code}`,
          });
        }

        // Xoá số liệu tiền + reopen ở version mới để soạn lại quyết định.
        const from = incident.status;
        this.state.assertStatusTransition(from, IncidentStatus.REVIEWING);
        incident.recoverableFromDepositAmount = null;
        incident.uncoveredLiabilityAmount = null;
        incident.depositBalanceSnapshot = null;
        incident.taskerWalletHoldAmount = null;
        incident.status = IncidentStatus.REVIEWING;
        incident.decisionVersion = incident.decisionVersion + 1;
        incident.taskerResponseDeadline = null;
        incident.sentTaskerBorneAmount = null;
        incident.closureReason = null;
        incident.resolvedAt = null;
        incident.finalizedAt = null;
        incident.finalizedByAdmin = null;
        await manager.getRepository(IncidentEntity).save(incident);
        // Đảo bồi thường thì khoản nợ phát sinh từ nó cũng không còn lý do tồn tại.
        await this.openUncoveredDebt(manager, incident);

        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          from,
          IncidentStatus.REVIEWING,
          adminUserId,
          `Đảo bồi thường — lý do: ${reason.trim()}`,
        );
        alertPayload = {
          key: `incident-reversal:${incident.id}:v${incident.decisionVersion}`,
          message:
            `Đảo bồi thường sự cố ${code} (${approved} VND) bởi admin ${adminUserId} ` +
            `— lý do: ${reason.trim()}`,
        };
      });

      // Không còn duyệt cấp 2 chặn trước, nên mỗi lần đảo tiền phải nhìn thấy được từ bên
      // ngoài. Gửi SAU transaction: webhook là network call, không giữ trong lock.
      if (alertPayload) {
        await this.alert.send(
          alertPayload.key,
          alertPayload.message,
          'WARNING',
        );
      }
      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi thu hồi bồi thường');
  }

  private async lockIncident(
    manager: EntityManager,
    incidentId: string,
  ): Promise<IncidentEntity> {
    const incident = await manager
      .getRepository(IncidentEntity)
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('i.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('i.finalizedByAdmin', 'finalizedByAdmin')
      .setLock('pessimistic_write', undefined, ['i'])
      .where('i.id = :id', { id: incidentId })
      .getOne();

    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Không tìm thấy sự cố',
      });
    }

    return incident;
  }

  /**
   * Chỉ chi trả cho sự cố đã chốt và đang chờ chi. Toàn bộ điều kiện due process
   * (Tasker đã được phản biện, quyết định hợp lệ) đã được `finalizeDecision` kiểm khi
   * chuyển sang `AWAITING_PAYOUT` — trạng thái này chính là bằng chứng chúng đã thoả.
   */
  private assertCompensationPreconditions(incident: IncidentEntity): void {
    if (incident.status !== IncidentStatus.AWAITING_PAYOUT) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_AWAITING_PAYOUT',
        message: 'Chỉ chi trả cho sự cố đã chốt và đang chờ chi trả',
      });
    }
  }

  private assertCompensationInvariant(incident: IncidentEntity): void {
    const approved = toNumber(incident.approvedCompensationAmount);
    const taskerBorne = toNumber(incident.taskerBorneAmount);
    const platformBorne = toNumber(incident.platformBorneAmount);

    if (approved <= 0 || taskerBorne + platformBorne !== approved) {
      throw new UnprocessableEntityException({
        code: 'INVALID_COMPENSATION_ALLOCATION',
        message: 'Phân bổ bồi thường không hợp lệ',
      });
    }
  }

  private async ensureRecordedNotificationOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
    manual = false,
  ): Promise<void> {
    const customerUserId = incident.customer?.user?.id;
    const taskerUserId = incident.tasker?.user?.id;
    const rows: Array<Partial<NotificationOutboxEntity>> = [];

    if (customerUserId) {
      rows.push({
        eventType: 'INCIDENT_COMPENSATION_RECORDED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: customerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: {
          ...this.buildCustomerRecordedPayload(incident),
          manual,
        } as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:compensation-recorded:customer:${customerUserId}`,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      });
    }

    if (taskerUserId) {
      rows.push({
        eventType: 'INCIDENT_COMPENSATION_RECORDED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: taskerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: {
          ...this.buildTaskerRecordedPayload(incident),
          manual,
        } as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:compensation-recorded:tasker:${taskerUserId}`,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      });
    }

    if (!rows.length) return;

    await manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values(rows as never)
      .orIgnore()
      .execute();
  }

  private buildCustomerRecordedPayload(
    incident: IncidentEntity,
  ): Record<string, unknown> {
    return {
      incidentId: incident.id,
      incidentCode: incident.incidentCode ?? null,
      decisionVersion: incident.decisionVersion,
      status: IncidentStatus.COMPENSATED,
      approvedAmount: toNumber(incident.approvedCompensationAmount),
      message: 'Bồi thường đã được ghi nhận',
    };
  }

  private buildTaskerRecordedPayload(
    incident: IncidentEntity,
  ): Record<string, unknown> {
    return {
      incidentId: incident.id,
      incidentCode: incident.incidentCode ?? null,
      decisionVersion: incident.decisionVersion,
      status: IncidentStatus.COMPENSATED,
      approvedAmount: toNumber(incident.approvedCompensationAmount),
      taskerBorneAmount: toNumber(incident.taskerBorneAmount),
      message: 'Phần ghi nhận trách nhiệm của Tasker đã được lưu',
    };
  }

  /**
   * Chuyển tiền thật cho bồi thường (trong transaction đã lock incident).
   * Bảo toàn tổng tiền: hoàn khách = recoverable(Tasker) + platformBorne + uncovered(quỹ ứng).
   *  1) Trừ Tasker phần thu hồi được: ví trước → cọc gốc sau (DEPOSIT_DEDUCT).
   *  2) Hoàn ví Customer toàn bộ approved (REFUND) — khách luôn được làm đầy đủ.
   *  3) Quỹ SYSTEM chi (platformBorne + uncovered) (ADJUSTMENT). Không đủ → 409 để fallback thủ công.
   * Mỗi loại bút toán 1 lần/incident (partial unique index chống trùng).
   */
  private async settleCompensation(
    manager: EntityManager,
    incident: IncidentEntity,
    taskerWallet: WalletEntity | null,
  ): Promise<void> {
    const refId = incident.id;
    // Idempotency theo decisionVersion → sau reverse (bump version) re-compensate không đụng index.
    const refType = `${INCIDENT_COMPENSATION_REF}:v${incident.decisionVersion}`;
    const code = incident.incidentCode ?? incident.id;
    const approved = toNumber(incident.approvedCompensationAmount);
    const recoverable = toNumber(incident.recoverableFromDepositAmount);
    const uncovered = toNumber(incident.uncoveredLiabilityAmount);
    const platformBorne = toNumber(incident.platformBorneAmount);

    // 1) Trừ Tasker phần thu hồi được — chỉ từ ví (ký quỹ đã bỏ). `recoverable` đã
    // được snapshot chặn ≤ floor(số dư ví) nên luôn trừ trọn.
    if (recoverable > 0 && taskerWallet && incident.tasker) {
      await this.walletService.debitWallet(manager, {
        wallet: taskerWallet,
        amount: recoverable,
        type: WalletTransactionType.DEPOSIT_DEDUCT,
        referenceId: refId,
        referenceType: refType,
        description: `Trừ ví Tasker cho bồi thường sự cố ${code}`,
      });
    }

    // 2) Hoàn ví Customer toàn bộ approved.
    if (approved > 0 && incident.customer) {
      const customerWallet = await this.walletService.getOrCreateCustomerWallet(
        manager,
        incident.customer,
      );
      await this.walletService.creditWallet(manager, {
        wallet: customerWallet,
        amount: approved,
        type: WalletTransactionType.REFUND,
        referenceId: refId,
        referenceType: refType,
        description: `Hoàn bồi thường sự cố ${code} vào ví`,
      });
    }

    // 3) Quỹ nền tảng (ví SYSTEM) chi phần platformBorne + phần Tasker chưa thu hồi (ứng nợ).
    const platformPayout = platformBorne + uncovered;
    if (platformPayout > 0) {
      const systemWallet =
        await this.walletService.getOrCreateSystemWallet(manager);
      if (toNumber(systemWallet.balance) < platformPayout) {
        throw new ConflictException({
          code: 'PLATFORM_FUND_INSUFFICIENT',
          message:
            'Quỹ nền tảng không đủ số dư để chi bồi thường — cần nạp quỹ hoặc dùng luồng chuyển khoản thủ công.',
        });
      }
      await this.walletService.debitWallet(manager, {
        wallet: systemWallet,
        amount: platformPayout,
        type: WalletTransactionType.ADJUSTMENT,
        referenceId: refId,
        referenceType: refType,
        description: `Quỹ nền tảng chi bồi thường sự cố ${code} (platform=${platformBorne}, ứng nợ Tasker=${uncovered})`,
      });
    }
  }

  private applyDepositRecoverySnapshot(
    incident: IncidentEntity,
    availableDeposit: number,
  ): void {
    const taskerBorne = toNumber(incident.taskerBorneAmount);
    // Nguyên hóa VND: floor nguồn khả dụng → recoverable/uncovered luôn nguyên,
    // khớp với phần trừ ví (cũng floor) → bảo toàn tổng không lệch xu.
    const available = Math.max(0, Math.floor(availableDeposit));
    const recoverable = Math.max(0, Math.min(taskerBorne, available));
    incident.depositBalanceSnapshot = available;
    incident.recoverableFromDepositAmount = recoverable;
    incident.uncoveredLiabilityAmount = taskerBorne - recoverable;
  }

  private async getDatabaseNow(manager: EntityManager): Promise<Date> {
    const rows = await manager.query('SELECT now() AS now');
    return new Date(rows[0].now);
  }
}
