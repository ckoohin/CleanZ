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
import { IncidentCompensationStatus } from 'src/common/enums/incident-compensation-status.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentLogDimension } from 'src/common/enums/incident-log-dimension.enum';
import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { NotificationOutboxStatus } from 'src/common/enums/notification-outbox-status.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { NotificationOutboxEntity } from '../entity/notification-outbox.entity';
import { IncidentAdminView } from '../dto/incident-response.dto';
import { IncidentStateService } from './incident-state.service';
import { IncidentAdminService } from './incident-admin.service';
import { WalletService } from '../../wallet/wallet.service';
import { WalletEntity } from '../../wallet/entity/wallet.entity';
import { WalletTransactionType } from 'src/common/enums/wallet-transaction-type.enum';
import { TaskerEntity } from 'src/modules/tasker/entity/tasker.entity';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';

const INCIDENT_COMPENSATION_REF = 'INCIDENT_COMPENSATION';

@Injectable()
export class CompensationExecutorService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly state: IncidentStateService,
    private readonly adminService: IncidentAdminService,
    private readonly walletService: WalletService,
    private readonly depositHold: IncidentDepositHoldService,
  ) {}

  async execute(
    adminUserId: string,
    incidentId: string,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);

        if (
          incident.compensationStatus === IncidentCompensationStatus.RECORDED
        ) {
          await this.ensureRecordedNotificationOutbox(manager, incident);
          return;
        }

        this.assertCompensationPreconditions(incident);
        await this.assertNoUnreviewedCurrentResponse(manager, incident);
        this.assertSecondApprovalSatisfiedIfRequired(incident);
        this.assertCompensationInvariant(incident);

        const repo = manager.getRepository(IncidentEntity);
        const dbNow = await this.getDatabaseNow(manager);
        const fromComp = incident.compensationStatus;

        this.state.assertCompensationTransition(
          fromComp,
          IncidentCompensationStatus.PROCESSING,
        );
        incident.compensationStatus = IncidentCompensationStatus.PROCESSING;
        await repo.save(incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          fromComp,
          IncidentCompensationStatus.PROCESSING,
          adminUserId,
          null,
        );

        this.state.assertCompensationTransition(
          IncidentCompensationStatus.PROCESSING,
          IncidentCompensationStatus.RECORDED,
        );
        incident.compensationStatus = IncidentCompensationStatus.RECORDED;
        incident.resolvedAt = dbNow;

        // P0.2 — giải phóng phần đã HOLD lúc accept, trả về balance để trừ bồi thường.
        await this.depositHold.release(manager, incident, incident.tasker);

        // C2 — chốt snapshot khả năng thu hồi. Nguồn tiền Tasker THẬT = số dư ví
        // (nạp qua PayPal) + cọc gốc `currentDepositBalance` (khớp TaskerDepositService).
        const taskerWallet = incident.tasker
          ? await this.walletService.getOrCreateTaskerWallet(
              manager,
              incident.tasker,
            )
          : null;
        const availableDeposit =
          toNumber(taskerWallet?.balance) +
          toNumber(incident.tasker?.currentDepositBalance);
        this.applyDepositRecoverySnapshot(incident, availableDeposit);

        // P2.1 — CHUYỂN TIỀN THẬT qua ví: trừ Tasker (ví→cọc), chi quỹ SYSTEM, hoàn ví Customer.
        await this.settleCompensation(manager, incident, taskerWallet);

        this.state.assertStatusTransition(
          incident.status,
          IncidentStatus.COMPENSATED,
        );
        incident.status = IncidentStatus.COMPENSATED;
        incident.closureReason = IncidentClosureReason.COMPENSATED;
        await repo.save(incident);

        await this.ensureRecordedNotificationOutbox(manager, incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          IncidentCompensationStatus.PROCESSING,
          IncidentCompensationStatus.RECORDED,
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
          IncidentStatus.APPROVED,
          IncidentStatus.COMPENSATED,
          adminUserId,
          null,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Loi khi ghi nhan boi thuong');
  }

  /**
   * P0.4 — Chi trả THỦ CÔNG khi quỹ SYSTEM không đủ: admin chuyển khoản NGOÀI cho khách
   * toàn bộ `approved` (QR trên UI) và upload ảnh minh chứng. Hệ thống:
   *  - trừ Tasker phần recoverable (ví→cọc) và chuyển vào ví SYSTEM (bù khoản công ty đã chi ngoài),
   *  - KHÔNG credit ví Khách, KHÔNG debit SYSTEM (tiền chi là tiền ngoài, minh chứng = proof),
   *  - uncovered vẫn ghi nợ + soft-block như luồng digital.
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
        if (
          incident.compensationStatus === IncidentCompensationStatus.RECORDED
        ) {
          return; // idempotent
        }
        this.assertCompensationPreconditions(incident);
        await this.assertNoUnreviewedCurrentResponse(manager, incident);
        this.assertSecondApprovalSatisfiedIfRequired(incident);
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
        const fromComp = incident.compensationStatus;
        this.state.assertCompensationTransition(
          fromComp,
          IncidentCompensationStatus.PROCESSING,
        );
        incident.compensationStatus = IncidentCompensationStatus.PROCESSING;
        await repo.save(incident);

        incident.compensationStatus = IncidentCompensationStatus.RECORDED;
        incident.resolvedAt = dbNow;
        await this.depositHold.release(manager, incident, incident.tasker);

        const taskerWallet = incident.tasker
          ? await this.walletService.getOrCreateTaskerWallet(
              manager,
              incident.tasker,
            )
          : null;
        const availableDeposit =
          toNumber(taskerWallet?.balance) +
          toNumber(incident.tasker?.currentDepositBalance);
        this.applyDepositRecoverySnapshot(incident, availableDeposit);

        await this.settleManual(manager, incident, taskerWallet);

        this.state.assertStatusTransition(
          incident.status,
          IncidentStatus.COMPENSATED,
        );
        incident.status = IncidentStatus.COMPENSATED;
        incident.closureReason = IncidentClosureReason.COMPENSATED;
        await repo.save(incident);

        await this.ensureRecordedNotificationOutbox(manager, incident, true);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          IncidentCompensationStatus.PROCESSING,
          IncidentCompensationStatus.RECORDED,
          adminUserId,
          `Settled MANUAL (bank transfer) — customer paid externally=${toNumber(
            incident.approvedCompensationAmount,
          )} VND, tasker_recovered_to_system=${toNumber(
            incident.recoverableFromDepositAmount,
          )}, uncovered=${toNumber(
            incident.uncoveredLiabilityAmount,
          )}, proof=${proofEvidenceId}${note ? `, note=${note}` : ''}`,
        );
      });
      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi chi trả thủ công');
  }

  /** Bút toán cho chi trả thủ công: thu hồi từ Tasker → ví SYSTEM; nợ + soft-block như digital. */
  private async settleManual(
    manager: EntityManager,
    incident: IncidentEntity,
    taskerWallet: WalletEntity | null,
  ): Promise<void> {
    const refId = incident.id;
    const refType = `${INCIDENT_COMPENSATION_REF}:v${incident.decisionVersion}`;
    const code = incident.incidentCode ?? incident.id;
    const recoverable = toNumber(incident.recoverableFromDepositAmount);
    const uncovered = toNumber(incident.uncoveredLiabilityAmount);

    if (recoverable > 0 && taskerWallet && incident.tasker) {
      // Nguyên hóa VND: floor số dư ví để phần trừ luôn nguyên & không vượt số dư thật.
      const walletBalance = Math.floor(toNumber(taskerWallet.balance));
      const walletDeduction = Math.min(walletBalance, recoverable);
      if (walletDeduction > 0) {
        await this.walletService.debitWallet(manager, {
          wallet: taskerWallet,
          amount: walletDeduction,
          type: WalletTransactionType.DEPOSIT_DEDUCT,
          referenceId: refId,
          referenceType: refType,
          description: `Trừ ví Tasker (chi trả thủ công) sự cố ${code}`,
        });
      }
      const depositDeduction = recoverable - walletDeduction;
      if (depositDeduction > 0) {
        const newDeposit =
          toNumber(incident.tasker.currentDepositBalance) - depositDeduction;
        await manager
          .getRepository(TaskerEntity)
          .update(
            { id: incident.tasker.id },
            { currentDepositBalance: newDeposit },
          );
      }
      // Phần thu từ Tasker chảy về ví SYSTEM — bù khoản công ty đã chuyển ngoài cho khách.
      const systemWallet =
        await this.walletService.getOrCreateSystemWallet(manager);
      await this.walletService.creditWallet(manager, {
        wallet: systemWallet,
        amount: recoverable,
        type: WalletTransactionType.ADJUSTMENT,
        referenceId: refId,
        referenceType: refType,
        description: `Thu hồi từ Tasker bù chi ngoài (thủ công) sự cố ${code}`,
      });
    }

    if (uncovered > 0 && incident.tasker) {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      await manager
        .getRepository(TaskerEntity)
        .update({ id: incident.tasker.id }, { depositTopupDue: due });
    }
  }

  /**
   * P1.1 — Thu hồi/đảo một bồi thường đã chi trả (sửa sai). Bắt buộc Admin #2 (khác người finalize).
   * Đảo toàn bộ bút toán: đòi lại ví Khách, trả ví Tasker, trả quỹ SYSTEM (ref RIÊNG, không đụng
   * unique index). Reopen sự cố ở version mới (INVESTIGATING/DRAFT/NONE) để soạn lại + chốt + chi lại.
   * Chỉ cho reverse khi CHƯA thu hồi nợ (uncoveredRecovered=0) và ví Khách còn đủ để đòi lại.
   */
  async reverse(
    adminUserId: string,
    incidentId: string,
    reason: string,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncident(manager, incidentId);

        if (
          incident.compensationStatus !== IncidentCompensationStatus.RECORDED ||
          incident.status !== IncidentStatus.COMPENSATED
        ) {
          throw new ConflictException({
            code: 'COMPENSATION_NOT_REVERSIBLE',
            message: 'Chỉ thu hồi bồi thường đã chi trả (COMPENSATED/RECORDED)',
          });
        }
        if (toNumber(incident.uncoveredRecoveredAmount) > 0) {
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
        if (incident.finalizedByAdmin?.id === adminUserId) {
          throw new ConflictException({
            code: 'REVERSAL_REQUIRES_DIFFERENT_ADMIN',
            message: 'Thu hồi bồi thường phải do một Admin khác thực hiện',
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

        // Gỡ soft-block nếu sau khi xoá nợ sự cố này, Tasker không còn nợ nào khác.
        const hadUncovered = toNumber(incident.uncoveredLiabilityAmount) > 0;

        // Xoá số liệu tiền + reopen ở version mới để soạn lại quyết định.
        incident.recoverableFromDepositAmount = null;
        incident.uncoveredLiabilityAmount = null;
        incident.uncoveredRecoveredAmount = 0;
        incident.depositBalanceSnapshot = null;
        incident.taskerWalletHoldAmount = null;
        incident.compensationStatus = IncidentCompensationStatus.NONE;
        incident.status = IncidentStatus.INVESTIGATING;
        incident.decisionStatus = IncidentDecisionStatus.DRAFT;
        incident.decisionVersion = incident.decisionVersion + 1;
        incident.closureReason = null;
        incident.resolvedAt = null;
        incident.finalizedAt = null;
        incident.finalizedByAdmin = null;
        incident.secondApprovedAt = null;
        incident.secondApprovedByAdmin = null;
        incident.secondApprovalRequestedAt = null;
        await manager.getRepository(IncidentEntity).save(incident);

        if (hadUncovered && incident.tasker) {
          const stillOwing: Array<{ n: number }> = await manager.query(
            `SELECT count(*)::int n FROM incidents WHERE tasker_id=$1
               AND COALESCE(uncovered_liability_amount,0) > COALESCE(uncovered_recovered_amount,0)`,
            [incident.tasker.id],
          );
          if (stillOwing[0]?.n === 0) {
            await manager
              .getRepository(TaskerEntity)
              .update({ id: incident.tasker.id }, { depositTopupDue: null });
          }
        }

        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.COMPENSATION,
          IncidentCompensationStatus.RECORDED,
          IncidentCompensationStatus.NONE,
          adminUserId,
          `Reversed compensation (Admin #2) — reason: ${reason.trim()}`,
        );
      });
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
      .leftJoinAndSelect('i.secondApprovedByAdmin', 'secondApprovedByAdmin')
      .leftJoinAndSelect('i.finalizedByAdmin', 'finalizedByAdmin')
      .setLock('pessimistic_write', undefined, ['i'])
      .where('i.id = :id', { id: incidentId })
      .getOne();

    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Khong tim thay su co',
      });
    }

    return incident;
  }

  private assertCompensationPreconditions(incident: IncidentEntity): void {
    if (incident.compensationStatus === IncidentCompensationStatus.PROCESSING) {
      throw new ConflictException({
        code: 'COMPENSATION_IN_PROGRESS',
        message: 'Compensation dang duoc xu ly',
      });
    }

    if (incident.decisionStatus !== IncidentDecisionStatus.FINAL) {
      throw new ConflictException({
        code: 'DECISION_NOT_FINAL',
        message: 'Chi ghi nhan boi thuong sau khi decision FINAL',
      });
    }

    if (incident.status !== IncidentStatus.APPROVED) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_APPROVED',
        message: 'Chi ghi nhan boi thuong khi incident APPROVED',
      });
    }

    if (
      ![
        IncidentCompensationStatus.PENDING,
        IncidentCompensationStatus.FAILED,
      ].includes(incident.compensationStatus)
    ) {
      throw new ConflictException({
        code: 'COMPENSATION_NOT_PENDING',
        message: 'Compensation status khong cho ghi nhan',
      });
    }
  }

  private async assertNoUnreviewedCurrentResponse(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    const count = await manager
      .getRepository(IncidentDecisionResponseEntity)
      .createQueryBuilder('response')
      .leftJoin('response.incident', 'incident')
      .where('incident.id = :incidentId', { incidentId: incident.id })
      .andWhere('response.decisionVersion = :decisionVersion', {
        decisionVersion: incident.decisionVersion,
      })
      .andWhere('response.reviewedAt IS NULL')
      .getCount();

    if (count > 0) {
      throw new ConflictException({
        code: 'TASKER_RESPONSE_NOT_REVIEWED',
        message: 'Con response Tasker chua duoc review',
      });
    }
  }

  private assertSecondApprovalSatisfiedIfRequired(
    incident: IncidentEntity,
  ): void {
    if (
      incident.secondApprovalRequestedAt &&
      (!incident.secondApprovedByAdmin || !incident.secondApprovedAt)
    ) {
      throw new ConflictException({
        code: 'SECOND_APPROVAL_REQUIRED',
        message: 'Decision can Admin #2 approve truoc khi compensate',
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
        message: 'Phan bo boi thuong khong hop le',
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
      status: IncidentCompensationStatus.RECORDED,
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
      status: IncidentCompensationStatus.RECORDED,
      approvedAmount: toNumber(incident.approvedCompensationAmount),
      taskerBorneAmount: toNumber(incident.taskerBorneAmount),
      message: 'Phần ghi nhận trách nhiệm của Tasker đã được lưu',
    };
  }

  /**
   * C2 — ghi nhận số liệu thu hồi từ cọc tại thời điểm RECORDED (record-only, không chuyển tiền):
   *  - `recoverable` = phần Tasker chịu có thể trừ ngay từ cọc = clamp(min(taskerBorne, deposit), ≥0)
   *  - `uncovered`   = nghĩa vụ còn nợ = taskerBorne − recoverable
   * Phase 2 dùng snapshot này để trừ cọc thật + đặt deposit_topup_due + thu hồi phần nợ.
   */
  /**
   * P2.1 — Chuyển tiền thật cho bồi thường (trong transaction đã lock incident).
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

    // 1) Trừ Tasker phần thu hồi được: ví trước, cọc gốc sau.
    if (recoverable > 0 && taskerWallet && incident.tasker) {
      // Nguyên hóa VND: floor số dư ví để phần trừ luôn nguyên & không vượt số dư thật.
      const walletBalance = Math.floor(toNumber(taskerWallet.balance));
      const walletDeduction = Math.min(walletBalance, recoverable);
      if (walletDeduction > 0) {
        await this.walletService.debitWallet(manager, {
          wallet: taskerWallet,
          amount: walletDeduction,
          type: WalletTransactionType.DEPOSIT_DEDUCT,
          referenceId: refId,
          referenceType: refType,
          description: `Trừ ví Tasker cho bồi thường sự cố ${code}`,
        });
      }
      const depositDeduction = recoverable - walletDeduction;
      if (depositDeduction > 0) {
        const newDeposit =
          toNumber(incident.tasker.currentDepositBalance) - depositDeduction;
        await manager
          .getRepository(TaskerEntity)
          .update(
            { id: incident.tasker.id },
            { currentDepositBalance: newDeposit },
          );
      }
    }

    // P0.3 — còn nợ (quỹ SYSTEM ứng) → soft-block Tasker nhận đơn mới tới khi nạp bù (grace 7 ngày).
    if (uncovered > 0 && incident.tasker) {
      const due = new Date();
      due.setDate(due.getDate() + 7);
      await manager
        .getRepository(TaskerEntity)
        .update({ id: incident.tasker.id }, { depositTopupDue: due });
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
