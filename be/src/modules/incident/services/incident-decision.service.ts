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
import { IncidentResponseWindowStatus } from 'src/common/enums/incident-response-window-status.enum';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentDamageItemVerificationStatus } from 'src/common/enums/incident-damage-item-verification-status.enum';
import { NotificationOutboxStatus } from 'src/common/enums/notification-outbox-status.enum';
import { IncidentDecisionResponseReviewResult } from 'src/common/enums/incident-decision-response-review-result.enum';
import {
  IncidentCompensationSource,
  IncidentEntity,
} from '../entity/incident.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import {
  IncidentDecisionDraftDecision,
  SaveIncidentDecisionDraftDto,
} from '../dto/save-incident-decision-draft.dto';
import { SubmitIncidentDecisionDraftDto } from '../dto/submit-incident-decision-draft.dto';
import { ReviewIncidentDecisionResponseDto } from '../dto/review-incident-decision-response.dto';
import { ReviseIncidentDecisionDto } from '../dto/revise-incident-decision.dto';
import { FinalizeIncidentDecisionDto } from '../dto/finalize-incident-decision.dto';
import {
  SecondApprovalDecisionAction,
  SecondApprovalIncidentDecisionDto,
} from '../dto/second-approval-incident-decision.dto';
import { IncidentAdminView } from '../dto/incident-response.dto';
import { isExpectedDecisionVersion } from '../domain/incident-decision.helpers';
import { NotificationOutboxEntity } from '../entity/notification-outbox.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { IncidentStateService } from './incident-state.service';
import { IncidentConfigService } from './incident-config.service';
import { IncidentAdminService } from './incident-admin.service';
import { IncidentDepositHoldService } from './incident-deposit-hold.service';
import { FraudStrikeService } from './fraud-strike.service';

interface DecisionDraftPolicy {
  policyCap: number;
  dualApprovalThreshold: number;
}

interface SubmitDraftPolicySnapshot extends DecisionDraftPolicy {
  policyVersion: string;
  responseWindowHours: number;
  severityRuleSnapshot: Record<string, unknown>;
}

interface NormalizedDecisionDraft {
  decision: IncidentDecisionDraftDecision;
  itemApprovals: Map<string, number>;
  totalApprovedAmount: number;
  taskerBorneAmount: number;
  platformBorneAmount: number;
  responsibilityParty: IncidentResponsibilityParty | null;
  responsibilityReason: string | null;
  allocationReason: string | null;
  internalDecisionNote: string | null;
  taskerDecisionReason: string | null;
  customerDecisionSummary: string;
  compensationSource: IncidentCompensationSource | null;
  isAdverseToTasker: boolean;
  requiresSecondAdmin: boolean;
}

interface DecisionAdversitySnapshot {
  responsibilityParty: IncidentResponsibilityParty | null;
  taskerBorneAmount: number;
  taskerDecisionReason: string | null;
}

@Injectable()
export class IncidentDecisionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly state: IncidentStateService,
    private readonly config: IncidentConfigService,
    private readonly adminService: IncidentAdminService,
    private readonly fraudStrike: FraudStrikeService,
    private readonly depositHold: IncidentDepositHoldService,
  ) {}

  async saveDraft(
    adminUserId: string,
    incidentId: string,
    dto: SaveIncidentDecisionDraftDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      let computedDraftFlags:
        | (Pick<
            NormalizedDecisionDraft,
            'isAdverseToTasker' | 'requiresSecondAdmin'
          > & { requiresTaskerResponse?: boolean })
        | null = null;

      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncidentForDecision(
          manager,
          incidentId,
        );
        this.assertDraftEditable(incident);
        this.assertExpectedDecisionVersion(
          incident.decisionVersion,
          dto.expectedDecisionVersion,
        );

        const items = await this.lockDamageItems(manager, incident.id);
        const policy = await this.loadDecisionDraftPolicy();
        const draft = this.normalizeDecisionDraft(dto, items, policy);
        computedDraftFlags = {
          isAdverseToTasker: draft.isAdverseToTasker,
          requiresSecondAdmin: draft.requiresSecondAdmin,
        };

        this.validateDecisionDraft(items, draft, policy);

        const changed = this.hasMaterialDraftChange(incident, items, draft);
        if (
          !changed &&
          incident.decisionStatus === IncidentDecisionStatus.DRAFT
        ) {
          return;
        }

        this.applyDecisionDraft(incident, items, draft, adminUserId);
        await manager.getRepository(IncidentDamageItemEntity).save(items);
        await manager.getRepository(IncidentEntity).save(incident);

        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          incident.status,
          incident.status,
          adminUserId,
          `Saved decision draft v${incident.decisionVersion}`,
        );
      });

      const view = await this.adminService.findOne(incidentId);
      return this.withDraftComputedDecisionFlags(view, computedDraftFlags);
    }, 'Lá»—i khi lÆ°u draft quyáº¿t Ä‘á»‹nh sá»± cá»‘');
  }

  async submitDraftForTaskerResponse(
    adminUserId: string,
    incidentId: string,
    dto: SubmitIncidentDecisionDraftDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncidentForDecision(
          manager,
          incidentId,
        );
        this.assertExpectedDecisionVersion(
          incident.decisionVersion,
          dto.expectedDecisionVersion,
        );

        if (
          incident.decisionStatus ===
          IncidentDecisionStatus.PENDING_TASKER_RESPONSE
        ) {
          await this.ensureTaskerDraftSubmittedOutbox(manager, incident);
          return;
        }

        this.assertCanSubmitDraftForTaskerResponse(incident);

        if (!this.isAdverseIncidentDraft(incident)) {
          throw new ConflictException({
            code: 'TASKER_RESPONSE_NOT_REQUIRED',
            message: 'Draft không bất lợi cho Tasker',
          });
        }

        const policy = await this.loadSubmitDraftPolicySnapshot();
        const dbNow = await this.getDatabaseNow(manager);
        const deadline = new Date(
          dbNow.getTime() + policy.responseWindowHours * 3_600_000,
        );

        incident.decisionStatus =
          IncidentDecisionStatus.PENDING_TASKER_RESPONSE;
        incident.responseWindowStatus = IncidentResponseWindowStatus.OPEN;
        incident.taskerResponseDeadline = deadline;
        incident.taskerResponseReviewedAt = null;
        incident.policyVersion = policy.policyVersion;
        incident.policyCapSnapshot = policy.policyCap;
        incident.dualApprovalThresholdSnapshot = policy.dualApprovalThreshold;
        incident.responseWindowHoursSnapshot = policy.responseWindowHours;
        incident.severityRuleSnapshot = policy.severityRuleSnapshot;

        await manager.getRepository(IncidentEntity).save(incident);
        await this.ensureTaskerDraftSubmittedOutbox(manager, incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          IncidentDecisionStatus.DRAFT,
          IncidentDecisionStatus.PENDING_TASKER_RESPONSE,
          adminUserId,
          `Submitted decision draft v${incident.decisionVersion} for Tasker response`,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi submit draft quyết định cho Tasker phản hồi');
  }

  async reviewDecisionResponse(
    adminUserId: string,
    incidentId: string,
    dto: ReviewIncidentDecisionResponseDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncidentForDecision(
          manager,
          incidentId,
        );
        this.assertExpectedDecisionVersion(
          incident.decisionVersion,
          dto.expectedDecisionVersion,
        );

        const response = await this.lockDecisionResponseForReview(
          manager,
          dto.responseId,
        );
        this.assertResponseBelongsToCurrentIncidentVersion(response, incident);

        const normalizedNote = this.normalizeAdminReviewNote(
          dto.adminReviewNote,
        );

        if (response.reviewedAt) {
          if (this.isSameReview(response, dto.result, normalizedNote)) {
            return;
          }
          throw new ConflictException({
            code: 'TASKER_RESPONSE_ALREADY_REVIEWED',
            message: 'Phản hồi đã được review với nội dung khác',
          });
        }

        this.assertCanReviewDecisionResponse(incident);

        const dbNow = await this.getDatabaseNow(manager);
        response.reviewResult = dto.result;
        response.adminReviewNote = normalizedNote;
        response.reviewedByAdmin = { id: adminUserId } as never;
        response.reviewedAt = dbNow;

        incident.taskerResponseReviewedAt = dbNow;
        incident.responseWindowStatus = IncidentResponseWindowStatus.REVIEWED;

        if (
          dto.result === IncidentDecisionResponseReviewResult.REVISE_DECISION
        ) {
          incident.decisionStatus = IncidentDecisionStatus.DRAFT;
          incident.taskerResponseDeadline = null;
        }

        await manager
          .getRepository(IncidentDecisionResponseEntity)
          .save(response);
        await manager.getRepository(IncidentEntity).save(incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          IncidentResponseWindowStatus.RESPONDED,
          IncidentResponseWindowStatus.REVIEWED,
          adminUserId,
          `Reviewed Tasker decision response ${response.id} with ${dto.result}`,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi review phản hồi quyết định của Tasker');
  }

  /**
   * C6 — Gia hạn bắt buộc cho Tasker phản hồi draft bất lợi (một lần). Mở lại cửa sổ phản hồi
   * = now + responseWindowHours và nhắc Tasker. Chỉ khi đã gia hạn mà vẫn hết hạn mới cho finalize.
   */
  async extendTaskerResponse(
    adminUserId: string,
    incidentId: string,
    dto: { expectedDecisionVersion: number },
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncidentForDecision(
          manager,
          incidentId,
        );
        this.assertExpectedDecisionVersion(
          incident.decisionVersion,
          dto.expectedDecisionVersion,
        );
        if (
          incident.decisionStatus !==
          IncidentDecisionStatus.PENDING_TASKER_RESPONSE
        ) {
          throw new ConflictException({
            code: 'INCIDENT_NOT_EDITABLE',
            message: 'Chỉ gia hạn khi đang chờ Tasker phản hồi',
          });
        }
        if (!this.isAdverseIncidentDraft(incident)) {
          throw new ConflictException({
            code: 'DECISION_NOT_ADVERSE',
            message: 'Chỉ gia hạn cho draft bất lợi với Tasker',
          });
        }
        if (incident.taskerResponseExtendedAt != null) {
          throw new ConflictException({
            code: 'TASKER_RESPONSE_ALREADY_EXTENDED',
            message: 'Đã gia hạn phản hồi cho Tasker một lần',
          });
        }

        const dbNow = await this.getDatabaseNow(manager);
        const hours =
          incident.responseWindowHoursSnapshot ??
          (await this.config.getResponseWindowHours());
        const from = incident.responseWindowStatus;
        incident.taskerResponseDeadline = new Date(
          dbNow.getTime() + hours * 3_600_000,
        );
        incident.responseWindowStatus = IncidentResponseWindowStatus.OPEN;
        incident.taskerResponseExtendedAt = dbNow;
        await manager.getRepository(IncidentEntity).save(incident);

        await this.ensureTaskerResponseExtendedOutbox(manager, incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          from,
          IncidentResponseWindowStatus.OPEN,
          adminUserId,
          `Gia hạn phản hồi Tasker tới ${incident.taskerResponseDeadline.toISOString()} (C6)`,
        );
      });
      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi gia hạn phản hồi Tasker');
  }

  private async ensureTaskerResponseExtendedOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    const taskerUserId = incident.tasker?.user?.id;
    if (!taskerUserId) return;
    await manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values({
        eventType: 'INCIDENT_DECISION_DRAFT_SUBMITTED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: taskerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: this.buildTaskerSafeDecisionDraftPayload(incident) as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:tasker-response-extended:${taskerUserId}`,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      })
      .orIgnore()
      .execute();
  }

  async reviseDecision(
    adminUserId: string,
    incidentId: string,
    dto: ReviseIncidentDecisionDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      let computedDraftFlags:
        | (Pick<
            NormalizedDecisionDraft,
            'isAdverseToTasker' | 'requiresSecondAdmin'
          > & { requiresTaskerResponse?: boolean })
        | null = null;

      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncidentForDecision(
          manager,
          incidentId,
        );
        this.assertExpectedDecisionVersion(
          incident.decisionVersion,
          dto.expectedDecisionVersion,
        );
        this.assertCanReviseDecision(incident);
        await this.assertNoUnreviewedCurrentResponse(manager, incident);

        const previousDecision = this.buildDecisionAdversitySnapshot(incident);
        const items = await this.lockDamageItems(manager, incident.id);
        const policy = await this.loadDecisionDraftPolicy();
        const draft = this.normalizeDecisionDraft(dto, items, policy);
        computedDraftFlags = {
          isAdverseToTasker: draft.isAdverseToTasker,
          requiresSecondAdmin: draft.requiresSecondAdmin,
          requiresTaskerResponse: this.shouldReopenTaskerResponse(
            previousDecision,
            draft,
          ),
        };

        this.validateDecisionDraft(items, draft, policy);

        const changed = this.hasMaterialDraftChange(incident, items, draft);
        if (
          !changed &&
          incident.decisionStatus === IncidentDecisionStatus.DRAFT
        ) {
          return;
        }

        this.applyDecisionDraft(incident, items, draft, adminUserId);
        incident.policyVersion = null;
        incident.policyCapSnapshot = null;
        incident.dualApprovalThresholdSnapshot = null;
        incident.responseWindowHoursSnapshot = null;
        incident.severityRuleSnapshot = null;

        await manager.getRepository(IncidentDamageItemEntity).save(items);
        await manager.getRepository(IncidentEntity).save(incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          String(dto.expectedDecisionVersion),
          String(incident.decisionVersion),
          adminUserId,
          `Revised decision from v${dto.expectedDecisionVersion} to v${incident.decisionVersion}`,
        );
      });

      const view = await this.adminService.findOne(incidentId);
      return this.withDraftComputedDecisionFlags(view, computedDraftFlags);
    }, 'Lỗi khi revise quyết định sự cố');
  }

  async finalizeDecision(
    adminUserId: string,
    incidentId: string,
    dto: FinalizeIncidentDecisionDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncidentForDecision(
          manager,
          incidentId,
        );
        this.assertExpectedDecisionVersion(
          incident.decisionVersion,
          dto.expectedDecisionVersion,
        );

        if (
          incident.decisionStatus === IncidentDecisionStatus.FINAL ||
          incident.decisionStatus ===
            IncidentDecisionStatus.PENDING_ADMIN_APPROVAL
        ) {
          return;
        }

        this.assertCanFinalizeDecision(incident);
        const dbNow = await this.getDatabaseNow(manager);
        await this.handleResponseWindowForFinalize(manager, incident, dbNow);
        await this.assertNoUnreviewedCurrentResponse(manager, incident);

        // C6 — Draft bất lợi mà Tasker hết hạn phản hồi lần đầu (chưa gia hạn):
        // bắt buộc gia hạn + nhắc Tasker trước khi được chốt (công bằng cho Tasker).
        if (
          incident.decisionStatus ===
            IncidentDecisionStatus.PENDING_TASKER_RESPONSE &&
          incident.responseWindowStatus ===
            IncidentResponseWindowStatus.EXPIRED &&
          this.isAdverseIncidentDraft(incident) &&
          incident.taskerResponseExtendedAt == null
        ) {
          throw new ConflictException({
            code: 'TASKER_RESPONSE_EXTENSION_REQUIRED',
            message:
              'Tasker chưa phản hồi và chưa được gia hạn — cần gia hạn + nhắc Tasker trước khi chốt',
          });
        }

        if (
          incident.decisionStatus === IncidentDecisionStatus.DRAFT &&
          this.isAdverseIncidentDraft(incident)
        ) {
          throw new ConflictException({
            code: 'TASKER_RESPONSE_REQUIRED',
            message: 'Draft bất lợi cần gửi cho Tasker phản hồi trước final',
          });
        }

        const items = await this.lockDamageItems(manager, incident.id);
        const policy = await this.ensureFinalizePolicySnapshot(incident);
        this.validateFinalDecision(incident, items, policy);

        const needsSecondAdmin = this.requiresSecondAdminApproval(
          incident,
          policy,
        );
        incident.finalizedByAdmin = { id: adminUserId } as never;
        incident.finalizedAt = dbNow;

        if (needsSecondAdmin) {
          incident.decisionStatus =
            IncidentDecisionStatus.PENDING_ADMIN_APPROVAL;
          incident.secondApprovalRequestedAt = dbNow;
          incident.secondApprovalDueAt = new Date(
            dbNow.getTime() + 24 * 3_600_000,
          );
          await manager.getRepository(IncidentEntity).save(incident);
          await this.state.log(
            manager,
            incident.id,
            IncidentLogDimension.STATUS,
            IncidentDecisionStatus.DRAFT,
            IncidentDecisionStatus.PENDING_ADMIN_APPROVAL,
            adminUserId,
            `Decision v${incident.decisionVersion} pending second approval`,
          );
          return;
        }

        incident.decisionStatus = IncidentDecisionStatus.FINAL;
        let rejectedAsFraud = false;
        if (toNumber(incident.approvedCompensationAmount) > 0) {
          incident.status = IncidentStatus.APPROVED;
          incident.compensationStatus = IncidentCompensationStatus.PENDING;
        } else if (
          incident.decisionOutcome ===
          IncidentDecisionDraftDecision.APPROVE_NO_COMPENSATION
        ) {
          // P2 — công nhận sự cố nhưng không bồi thường: đóng, không tiền, không phạt khách.
          incident.status = IncidentStatus.CLOSED;
          incident.compensationStatus = IncidentCompensationStatus.NONE;
          incident.closureReason = IncidentClosureReason.NO_COMPENSATION;
          await this.depositHold.release(manager, incident, incident.tasker);
        } else {
          incident.status = IncidentStatus.REJECTED;
          incident.compensationStatus = IncidentCompensationStatus.NONE;
          incident.closureReason = IncidentClosureReason.REJECTED;
          rejectedAsFraud =
            dto.rejectAsFraud === true && !!incident.customer?.id;
          // P0.2 — từ chối bồi thường → giải phóng phần ví đã HOLD.
          await this.depositHold.release(manager, incident, incident.tasker);
        }

        await manager.getRepository(IncidentEntity).save(incident);
        // Báo cáo sai sự thật → cộng strike gian lận cho Customer (thay luồng legacy decide).
        if (rejectedAsFraud) {
          await this.fraudStrike.addStrike(
            manager,
            incident.customer.id,
            incident.id,
            `Từ chối sự cố v${incident.decisionVersion} — báo cáo sai sự thật`,
          );
        }
        await this.ensureFinalDecisionOutbox(manager, incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          IncidentStatus.INVESTIGATING,
          incident.status,
          adminUserId,
          `Finalized decision v${incident.decisionVersion}`,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi finalize quyết định sự cố');
  }

  async secondApproval(
    adminUserId: string,
    incidentId: string,
    dto: SecondApprovalIncidentDecisionDto,
  ): Promise<IncidentAdminView> {
    return asyncHandleOperation(async () => {
      await this.dataSource.transaction(async (manager) => {
        const incident = await this.lockIncidentForDecision(
          manager,
          incidentId,
        );
        this.assertExpectedDecisionVersion(
          incident.decisionVersion,
          dto.expectedDecisionVersion,
        );

        if (incident.decisionStatus === IncidentDecisionStatus.FINAL) {
          return;
        }

        this.assertSecondApprovalPending(incident);
        this.assertDifferentSecondApprovalAdmin(incident, adminUserId);
        await this.assertNoUnreviewedCurrentResponse(manager, incident);

        const dbNow = await this.getDatabaseNow(manager);

        if (dto.action === SecondApprovalDecisionAction.REQUEST_CHANGES) {
          const note = this.normalizeSecondApprovalNote(dto.note);
          if (
            incident.decisionStatus === IncidentDecisionStatus.DRAFT &&
            this.trimRequired(incident.secondApprovalNote) === note
          ) {
            return;
          }

          incident.decisionStatus = IncidentDecisionStatus.DRAFT;
          incident.status = IncidentStatus.INVESTIGATING;
          incident.compensationStatus = IncidentCompensationStatus.NONE;
          incident.secondApprovalNote = note;
          incident.secondApprovedByAdmin = null;
          incident.secondApprovedAt = null;
          incident.finalizedAt = null;

          await manager.getRepository(IncidentEntity).save(incident);
          await this.ensureSecondApprovalRequestChangesOutbox(
            manager,
            incident,
          );
          await this.state.log(
            manager,
            incident.id,
            IncidentLogDimension.STATUS,
            IncidentDecisionStatus.PENDING_ADMIN_APPROVAL,
            IncidentDecisionStatus.DRAFT,
            adminUserId,
            `Second approval requested changes for decision v${incident.decisionVersion}`,
          );
          return;
        }

        const items = await this.lockDamageItems(manager, incident.id);
        const policy = await this.ensureFinalizePolicySnapshot(incident);
        this.validateFinalDecision(incident, items, policy);

        incident.secondApprovedByAdmin = { id: adminUserId } as never;
        incident.secondApprovedAt = dbNow;
        incident.decisionStatus = IncidentDecisionStatus.FINAL;

        if (toNumber(incident.approvedCompensationAmount) > 0) {
          incident.status = IncidentStatus.APPROVED;
          incident.compensationStatus = IncidentCompensationStatus.PENDING;
        } else if (
          incident.decisionOutcome ===
          IncidentDecisionDraftDecision.APPROVE_NO_COMPENSATION
        ) {
          // P2 — công nhận nhưng không bồi thường (duyệt cấp 2): đóng, không tiền.
          incident.status = IncidentStatus.CLOSED;
          incident.compensationStatus = IncidentCompensationStatus.NONE;
          incident.closureReason = IncidentClosureReason.NO_COMPENSATION;
          await this.depositHold.release(manager, incident, incident.tasker);
        } else {
          incident.status = IncidentStatus.REJECTED;
          incident.compensationStatus = IncidentCompensationStatus.NONE;
          incident.closureReason = IncidentClosureReason.REJECTED;
          // P0.2 — từ chối bồi thường (duyệt cấp 2) → giải phóng phần ví đã HOLD.
          await this.depositHold.release(manager, incident, incident.tasker);
        }

        await manager.getRepository(IncidentEntity).save(incident);
        await this.ensureFinalDecisionOutbox(manager, incident);
        await this.state.log(
          manager,
          incident.id,
          IncidentLogDimension.STATUS,
          IncidentDecisionStatus.PENDING_ADMIN_APPROVAL,
          IncidentDecisionStatus.FINAL,
          adminUserId,
          `Second approval approved decision v${incident.decisionVersion}`,
        );
      });

      return this.adminService.findOne(incidentId);
    }, 'Lỗi khi xử lý second approval');
  }

  private async lockIncidentForDecision(
    manager: EntityManager,
    incidentId: string,
  ): Promise<IncidentEntity> {
    const incident = await manager
      .getRepository(IncidentEntity)
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.tasker', 'tasker')
      .leftJoinAndSelect('tasker.user', 'taskerUser')
      .leftJoinAndSelect('i.customer', 'customer')
      .leftJoinAndSelect('customer.user', 'customerUser')
      .leftJoinAndSelect('i.finalizedByAdmin', 'finalizedByAdmin')
      .leftJoinAndSelect('i.secondApprovedByAdmin', 'secondApprovedByAdmin')
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

  private lockDamageItems(
    manager: EntityManager,
    incidentId: string,
  ): Promise<IncidentDamageItemEntity[]> {
    return manager
      .getRepository(IncidentDamageItemEntity)
      .createQueryBuilder('item')
      .leftJoin('item.incident', 'incident')
      .setLock('pessimistic_write')
      .where('incident.id = :incidentId', { incidentId })
      .getMany();
  }

  private assertDraftEditable(incident: IncidentEntity): void {
    if (
      [
        IncidentStatus.APPROVED,
        IncidentStatus.REJECTED,
        IncidentStatus.COMPENSATED,
        IncidentStatus.CLOSED,
      ].includes(incident.status)
    ) {
      throw new ConflictException({
        code: 'INCIDENT_ALREADY_FINALIZED',
        message: 'Sự cố đã có quyết định cuối',
      });
    }

    if (incident.status !== IncidentStatus.INVESTIGATING) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: 'Chỉ lưu draft khi sự cố đang thẩm định',
      });
    }

    if (
      ![IncidentDecisionStatus.NONE, IncidentDecisionStatus.DRAFT].includes(
        incident.decisionStatus,
      )
    ) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: 'Trạng thái decision hiện tại không cho lưu draft',
      });
    }

    if (
      ![
        IncidentCompensationStatus.NONE,
        IncidentCompensationStatus.FAILED,
      ].includes(incident.compensationStatus)
    ) {
      throw new ConflictException({
        code: 'COMPENSATION_LOCKED',
        message: 'Sự cố đã bắt đầu xử lý bồi thường',
      });
    }
  }

  private assertExpectedDecisionVersion(
    currentVersion: number,
    expectedVersion: number,
  ): void {
    if (!isExpectedDecisionVersion(currentVersion, expectedVersion)) {
      throw new ConflictException({
        code: 'DECISION_VERSION_CONFLICT',
        message: 'Decision version đã thay đổi',
        details: {
          expectedDecisionVersion: expectedVersion,
          currentDecisionVersion: currentVersion,
        },
      });
    }
  }

  private async loadDecisionDraftPolicy(): Promise<DecisionDraftPolicy> {
    const [policyCap, dualApprovalThreshold] = await Promise.all([
      this.config.getCompensationPolicyCap(),
      this.config.getDualApprovalThreshold(),
    ]);
    return { policyCap, dualApprovalThreshold };
  }

  private assertCanSubmitDraftForTaskerResponse(
    incident: IncidentEntity,
  ): void {
    if (incident.status !== IncidentStatus.INVESTIGATING) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: 'Chỉ submit draft khi sự cố đang thẩm định',
      });
    }

    if (incident.decisionStatus !== IncidentDecisionStatus.DRAFT) {
      throw new ConflictException({
        code:
          incident.decisionStatus === IncidentDecisionStatus.NONE
            ? 'DECISION_DRAFT_REQUIRED'
            : 'INCIDENT_NOT_EDITABLE',
        message: 'Trạng thái decision hiện tại không cho submit draft',
      });
    }

    if (incident.decisionVersion <= 0) {
      throw new ConflictException({
        code: 'DECISION_DRAFT_REQUIRED',
        message: 'Chưa có draft hợp lệ để submit',
      });
    }

    if (
      [
        IncidentCompensationStatus.PROCESSING,
        IncidentCompensationStatus.RECORDED,
      ].includes(incident.compensationStatus)
    ) {
      throw new ConflictException({
        code: 'COMPENSATION_LOCKED',
        message: 'Sự cố đã bắt đầu xử lý bồi thường',
      });
    }
  }

  private async loadSubmitDraftPolicySnapshot(): Promise<SubmitDraftPolicySnapshot> {
    const [
      policyCap,
      dualApprovalThreshold,
      responseWindowHours,
      severeCriteria,
    ] = await Promise.all([
      this.config.getCompensationPolicyCap(),
      this.config.getDualApprovalThreshold(),
      this.config.getResponseWindowHours(),
      this.config.getSevereCriteria(),
    ]);

    return {
      policyVersion: `incident-policy-${new Date().toISOString().slice(0, 10)}`,
      policyCap,
      dualApprovalThreshold,
      responseWindowHours,
      severityRuleSnapshot: severeCriteria,
    };
  }

  private async getDatabaseNow(manager: EntityManager): Promise<Date> {
    const rows = await manager.query('SELECT now() AS now');
    return new Date(rows[0].now);
  }

  private async lockDecisionResponseForReview(
    manager: EntityManager,
    responseId: string,
  ): Promise<IncidentDecisionResponseEntity> {
    const response = await manager
      .getRepository(IncidentDecisionResponseEntity)
      .createQueryBuilder('response')
      .leftJoinAndSelect('response.incident', 'incident')
      .leftJoinAndSelect('response.tasker', 'tasker')
      // Postgres cấm FOR UPDATE trên nhánh nullable của outer join → chỉ khóa
      // bảng response, tránh lỗi "FOR UPDATE cannot be applied to the nullable
      // side of an outer join".
      .setLock('pessimistic_write', undefined, ['response'])
      .where('response.id = :responseId', { responseId })
      .getOne();

    if (!response) {
      throw new NotFoundException({
        code: 'DECISION_RESPONSE_NOT_FOUND',
        message: 'Không tìm thấy phản hồi quyết định',
      });
    }

    return response;
  }

  private assertResponseBelongsToCurrentIncidentVersion(
    response: IncidentDecisionResponseEntity,
    incident: IncidentEntity,
  ): void {
    if (response.incident?.id !== incident.id) {
      throw new NotFoundException({
        code: 'DECISION_RESPONSE_NOT_FOUND',
        message: 'Phản hồi không thuộc sự cố',
      });
    }

    if (response.decisionVersion !== incident.decisionVersion) {
      throw new ConflictException({
        code: 'DECISION_RESPONSE_VERSION_MISMATCH',
        message: 'Phản hồi không thuộc decision version hiện tại',
      });
    }

    if (response.tasker?.id !== incident.tasker?.user?.id) {
      throw new ConflictException({
        code: 'DECISION_RESPONSE_VERSION_MISMATCH',
        message: 'Phản hồi không thuộc Tasker hiện tại của sự cố',
      });
    }
  }

  private assertCanReviewDecisionResponse(incident: IncidentEntity): void {
    if (
      incident.status !== IncidentStatus.INVESTIGATING ||
      incident.decisionStatus !==
        IncidentDecisionStatus.PENDING_TASKER_RESPONSE ||
      ![
        IncidentResponseWindowStatus.OPEN,
        IncidentResponseWindowStatus.RESPONDED,
      ].includes(incident.responseWindowStatus)
    ) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: 'Trạng thái sự cố không cho review phản hồi',
      });
    }
  }

  private normalizeAdminReviewNote(note?: string | null): string {
    const normalized = note?.trim() ?? '';
    if (normalized.length < 10) {
      throw new UnprocessableEntityException({
        code: 'ADMIN_REVIEW_NOTE_REQUIRED',
        message: 'adminReviewNote phải có ít nhất 10 ký tự',
      });
    }
    return normalized;
  }

  private isSameReview(
    response: IncidentDecisionResponseEntity,
    result: IncidentDecisionResponseReviewResult,
    normalizedNote: string,
  ): boolean {
    return (
      response.reviewResult === result &&
      this.trimRequired(response.adminReviewNote) === normalizedNote
    );
  }

  private assertCanReviseDecision(incident: IncidentEntity): void {
    if (incident.status !== IncidentStatus.INVESTIGATING) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: 'Chỉ revise khi sự cố đang thẩm định',
      });
    }

    if (incident.decisionStatus === IncidentDecisionStatus.FINAL) {
      throw new ConflictException({
        code: 'DECISION_ALREADY_FINAL',
        message: 'Decision đã final',
      });
    }

    if (
      ![
        IncidentDecisionStatus.DRAFT,
        IncidentDecisionStatus.PENDING_ADMIN_APPROVAL,
        IncidentDecisionStatus.PENDING_TASKER_RESPONSE,
      ].includes(incident.decisionStatus)
    ) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: 'Trạng thái decision không cho revise',
      });
    }

    if (
      [
        IncidentCompensationStatus.PROCESSING,
        IncidentCompensationStatus.RECORDED,
      ].includes(incident.compensationStatus)
    ) {
      throw new ConflictException({
        code: 'COMPENSATION_LOCKED',
        message: 'Sự cố đã bắt đầu xử lý bồi thường',
      });
    }
  }

  private async assertNoUnreviewedCurrentResponse(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    const unreviewedCount = await manager
      .getRepository(IncidentDecisionResponseEntity)
      .createQueryBuilder('response')
      .leftJoin('response.incident', 'incident')
      .where('incident.id = :incidentId', { incidentId: incident.id })
      .andWhere('response.decisionVersion = :decisionVersion', {
        decisionVersion: incident.decisionVersion,
      })
      .andWhere('response.reviewedAt IS NULL')
      .getCount();

    if (unreviewedCount > 0) {
      throw new ConflictException({
        code: 'TASKER_RESPONSE_NOT_REVIEWED',
        message: 'Còn phản hồi Tasker chưa được review',
      });
    }
  }

  private assertCanFinalizeDecision(incident: IncidentEntity): void {
    if (
      [
        IncidentStatus.APPROVED,
        IncidentStatus.REJECTED,
        IncidentStatus.COMPENSATED,
        IncidentStatus.CLOSED,
      ].includes(incident.status)
    ) {
      throw new ConflictException({
        code: 'INCIDENT_ALREADY_FINALIZED',
        message: 'Sự cố đã có trạng thái final',
      });
    }

    if (incident.status !== IncidentStatus.INVESTIGATING) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: 'Chỉ finalize khi sự cố đang thẩm định',
      });
    }

    if (
      ![
        IncidentDecisionStatus.DRAFT,
        IncidentDecisionStatus.PENDING_TASKER_RESPONSE,
      ].includes(incident.decisionStatus)
    ) {
      throw new ConflictException({
        code:
          incident.decisionStatus === IncidentDecisionStatus.FINAL
            ? 'DECISION_ALREADY_FINAL'
            : 'INCIDENT_NOT_EDITABLE',
        message: 'Trạng thái decision không cho finalize',
      });
    }

    if (
      [
        IncidentCompensationStatus.PROCESSING,
        IncidentCompensationStatus.RECORDED,
      ].includes(incident.compensationStatus)
    ) {
      throw new ConflictException({
        code: 'COMPENSATION_LOCKED',
        message: 'Sự cố đã bắt đầu xử lý bồi thường',
      });
    }
  }

  private assertSecondApprovalPending(incident: IncidentEntity): void {
    if (
      [
        IncidentStatus.APPROVED,
        IncidentStatus.REJECTED,
        IncidentStatus.COMPENSATED,
        IncidentStatus.CLOSED,
      ].includes(incident.status)
    ) {
      throw new ConflictException({
        code: 'INCIDENT_NOT_EDITABLE',
        message: 'Sự cố không còn chờ second approval',
      });
    }

    if (
      incident.decisionStatus !== IncidentDecisionStatus.PENDING_ADMIN_APPROVAL
    ) {
      throw new ConflictException({
        code: 'SECOND_APPROVAL_NOT_PENDING',
        message: 'Decision không ở trạng thái chờ Admin #2',
      });
    }

    if (
      [
        IncidentCompensationStatus.PROCESSING,
        IncidentCompensationStatus.RECORDED,
      ].includes(incident.compensationStatus)
    ) {
      throw new ConflictException({
        code: 'COMPENSATION_LOCKED',
        message: 'Sự cố đã bắt đầu xử lý bồi thường',
      });
    }
  }

  private assertDifferentSecondApprovalAdmin(
    incident: IncidentEntity,
    adminUserId: string,
  ): void {
    if (!incident.finalizedByAdmin?.id) {
      throw new ConflictException({
        code: 'SECOND_APPROVAL_NOT_PENDING',
        message: 'Thiếu Admin #1 đã finalize pending approval',
      });
    }

    if (incident.finalizedByAdmin.id === adminUserId) {
      throw new ConflictException({
        code: 'SECOND_APPROVAL_REQUIRES_DIFFERENT_ADMIN',
        message: 'Admin #2 phải khác Admin #1',
      });
    }
  }

  private normalizeSecondApprovalNote(note?: string | null): string {
    const normalized = note?.trim() ?? '';
    if (normalized.length < 10) {
      throw new UnprocessableEntityException({
        code: 'SECOND_APPROVAL_NOTE_REQUIRED',
        message: 'REQUEST_CHANGES phải có note ít nhất 10 ký tự',
      });
    }
    return normalized;
  }

  private async ensureSecondApprovalRequestChangesOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    const adminOneId = incident.finalizedByAdmin?.id;
    if (!adminOneId) return;

    await manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values({
        eventType: 'INCIDENT_SECOND_APPROVAL_REQUESTED_CHANGES',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: adminOneId } as never,
        decisionVersion: incident.decisionVersion,
        payload: {
          incidentId: incident.id,
          incidentCode: incident.incidentCode ?? null,
          decisionVersion: incident.decisionVersion,
          note: incident.secondApprovalNote ?? null,
        } as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:second-request-changes:${adminOneId}`,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      })
      .orIgnore()
      .execute();
  }

  private async handleResponseWindowForFinalize(
    manager: EntityManager,
    incident: IncidentEntity,
    dbNow: Date,
  ): Promise<void> {
    if (
      incident.decisionStatus !== IncidentDecisionStatus.PENDING_TASKER_RESPONSE
    ) {
      return;
    }

    const currentResponse = await manager
      .getRepository(IncidentDecisionResponseEntity)
      .createQueryBuilder('response')
      .leftJoin('response.incident', 'incident')
      .where('incident.id = :incidentId', { incidentId: incident.id })
      .andWhere('response.decisionVersion = :decisionVersion', {
        decisionVersion: incident.decisionVersion,
      })
      .getOne();

    if (currentResponse) {
      if (!currentResponse.reviewedAt) {
        throw new ConflictException({
          code: 'TASKER_RESPONSE_NOT_REVIEWED',
          message: 'Phản hồi Tasker chưa được review',
        });
      }
      if (
        currentResponse.reviewResult ===
        IncidentDecisionResponseReviewResult.REVISE_DECISION
      ) {
        throw new ConflictException({
          code: 'INCIDENT_NOT_EDITABLE',
          message: 'Response đã yêu cầu revise',
        });
      }
      return;
    }

    if (
      incident.taskerResponseDeadline &&
      dbNow.getTime() <= incident.taskerResponseDeadline.getTime()
    ) {
      throw new ConflictException({
        code: 'TASKER_RESPONSE_WAITING',
        message: 'Đang chờ Tasker phản hồi trong response window',
      });
    }

    incident.responseWindowStatus = IncidentResponseWindowStatus.EXPIRED;
    await manager.getRepository(IncidentEntity).save(incident);
    await this.state.log(
      manager,
      incident.id,
      IncidentLogDimension.STATUS,
      IncidentResponseWindowStatus.OPEN,
      IncidentResponseWindowStatus.EXPIRED,
      null,
      `Tasker response expired for decision v${incident.decisionVersion}`,
    );
  }

  private async ensureFinalizePolicySnapshot(
    incident: IncidentEntity,
  ): Promise<SubmitDraftPolicySnapshot> {
    if (
      incident.policyCapSnapshot != null &&
      incident.dualApprovalThresholdSnapshot != null &&
      incident.responseWindowHoursSnapshot != null
    ) {
      return {
        policyVersion: incident.policyVersion ?? 'incident-policy-existing',
        policyCap: toNumber(incident.policyCapSnapshot),
        dualApprovalThreshold: toNumber(incident.dualApprovalThresholdSnapshot),
        responseWindowHours: incident.responseWindowHoursSnapshot,
        severityRuleSnapshot: incident.severityRuleSnapshot ?? {},
      };
    }

    const policy = await this.loadSubmitDraftPolicySnapshot();
    incident.policyVersion = policy.policyVersion;
    incident.policyCapSnapshot = policy.policyCap;
    incident.dualApprovalThresholdSnapshot = policy.dualApprovalThreshold;
    incident.responseWindowHoursSnapshot = policy.responseWindowHours;
    incident.severityRuleSnapshot = policy.severityRuleSnapshot;
    return policy;
  }

  private validateFinalDecision(
    incident: IncidentEntity,
    items: IncidentDamageItemEntity[],
    policy: DecisionDraftPolicy,
  ): void {
    const approvedTotal = toNumber(incident.approvedCompensationAmount);
    const taskerBorne = toNumber(incident.taskerBorneAmount);
    const platformBorne = toNumber(incident.platformBorneAmount);

    if (approvedTotal > policy.policyCap) {
      throw new UnprocessableEntityException({
        code: 'POLICY_CAP_EXCEEDED',
        message: `Tổng bồi thường vượt trần chính sách (${policy.policyCap} VND)`,
      });
    }

    if (approvedTotal > 0) {
      if (!incident.responsibilityParty) {
        throw new UnprocessableEntityException({
          code: 'INVALID_FINAL_DECISION',
          message: 'APPROVE phải có responsibilityParty',
        });
      }
      if (taskerBorne + platformBorne !== approvedTotal) {
        throw new UnprocessableEntityException({
          code: 'INVALID_ALLOCATION_TOTAL',
          message:
            'taskerBorneAmount + platformBorneAmount phải bằng tổng approved',
        });
      }
    } else if (taskerBorne > 0 || platformBorne > 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_FINAL_DECISION',
        message: 'REJECT không được có allocation amount',
      });
    }

    for (const item of items) {
      const approvedAmount = toNumber(item.approvedAmount);
      // Không finalize APPROVE khi còn hạng mục chưa thẩm định xong.
      if (
        approvedTotal > 0 &&
        (item.verificationStatus ===
          IncidentDamageItemVerificationStatus.PENDING ||
          item.verificationStatus ===
            IncidentDamageItemVerificationStatus.NEED_MORE_EVIDENCE)
      ) {
        throw new UnprocessableEntityException({
          code: 'DAMAGE_ITEMS_NOT_FINALIZABLE',
          message:
            'Còn hạng mục chưa thẩm định xong (PENDING/NEED_MORE_EVIDENCE)',
        });
      }
      // Hạng mục bị từ chối không được duyệt tiền.
      if (
        item.verificationStatus ===
          IncidentDamageItemVerificationStatus.REJECTED &&
        approvedAmount > 0
      ) {
        throw new UnprocessableEntityException({
          code: 'DAMAGE_ITEMS_NOT_FINALIZABLE',
          message: 'Hạng mục bị từ chối không được duyệt tiền',
        });
      }
      if (approvedAmount > 0 && item.verifiedAmount == null) {
        throw new UnprocessableEntityException({
          code: 'DAMAGE_ITEMS_NOT_FINALIZABLE',
          message: 'Có damage item chưa được xác minh',
        });
      }
      if (
        item.verifiedAmount != null &&
        approvedAmount > toNumber(item.verifiedAmount)
      ) {
        throw new UnprocessableEntityException({
          code: 'DAMAGE_ITEMS_NOT_FINALIZABLE',
          message: 'Approved amount vượt verified amount',
        });
      }
    }
  }

  private requiresSecondAdminApproval(
    incident: IncidentEntity,
    policy: DecisionDraftPolicy,
  ): boolean {
    return (
      toNumber(incident.approvedCompensationAmount) >=
        policy.dualApprovalThreshold ||
      this.hasResponsibilityAllocationException(
        incident.responsibilityParty ?? null,
        toNumber(incident.taskerBorneAmount),
        toNumber(incident.platformBorneAmount),
      )
    );
  }

  private async ensureFinalDecisionOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    const customerUserId = incident.customer?.user?.id;
    const taskerUserId = incident.tasker?.user?.id;
    const rows: Array<Partial<NotificationOutboxEntity>> = [];

    if (customerUserId) {
      rows.push({
        eventType: 'INCIDENT_DECISION_FINALIZED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: customerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: this.buildCustomerFinalDecisionPayload(incident) as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:final:customer:${customerUserId}`,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      });
    }

    if (taskerUserId) {
      rows.push({
        eventType: 'INCIDENT_DECISION_FINALIZED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: taskerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: this.buildTaskerFinalDecisionPayload(incident) as never,
        dedupeKey: `incident:${incident.id}:decision:${incident.decisionVersion}:final:tasker:${taskerUserId}`,
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

  private buildCustomerFinalDecisionPayload(
    incident: IncidentEntity,
  ): Record<string, unknown> {
    return {
      incidentId: incident.id,
      incidentCode: incident.incidentCode ?? null,
      decisionVersion: incident.decisionVersion,
      status: incident.status,
      approvedAmount: toNumber(incident.approvedCompensationAmount),
      customerDecisionSummary: incident.customerDecisionSummary ?? null,
    };
  }

  private buildTaskerFinalDecisionPayload(
    incident: IncidentEntity,
  ): Record<string, unknown> {
    return {
      incidentId: incident.id,
      incidentCode: incident.incidentCode ?? null,
      decisionVersion: incident.decisionVersion,
      status: incident.status,
      responsibilityParty: incident.responsibilityParty ?? null,
      taskerDecisionReason: incident.taskerDecisionReason ?? null,
      approvedAmount: toNumber(incident.approvedCompensationAmount),
      taskerBorneAmount: toNumber(incident.taskerBorneAmount),
    };
  }

  private isAdverseIncidentDraft(incident: IncidentEntity): boolean {
    return this.isAdverseToTasker(
      incident.responsibilityParty ?? null,
      toNumber(incident.taskerBorneAmount),
    );
  }

  private async ensureTaskerDraftSubmittedOutbox(
    manager: EntityManager,
    incident: IncidentEntity,
  ): Promise<void> {
    const taskerUserId = incident.tasker?.user?.id;
    if (!taskerUserId) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION_DRAFT',
        message: 'Không tìm thấy tài khoản Tasker nhận notification',
      });
    }

    const dedupeKey = this.buildTaskerDraftSubmittedDedupeKey(
      incident.id,
      incident.decisionVersion,
      taskerUserId,
    );

    await manager
      .getRepository(NotificationOutboxEntity)
      .createQueryBuilder()
      .insert()
      .values({
        eventType: 'INCIDENT_DECISION_DRAFT_SUBMITTED',
        refType: 'INCIDENT',
        refId: incident.id,
        recipient: { id: taskerUserId } as never,
        decisionVersion: incident.decisionVersion,
        payload: this.buildTaskerSafeDecisionDraftPayload(incident) as never,
        dedupeKey,
        status: NotificationOutboxStatus.PENDING,
        retryCount: 0,
      })
      .orIgnore()
      .execute();
  }

  private buildTaskerDraftSubmittedDedupeKey(
    incidentId: string,
    decisionVersion: number,
    taskerUserId: string,
  ): string {
    return `incident:${incidentId}:decision:${decisionVersion}:tasker-draft-submitted:${taskerUserId}`;
  }

  private buildTaskerSafeDecisionDraftPayload(
    incident: IncidentEntity,
  ): Record<string, unknown> {
    return {
      incidentId: incident.id,
      incidentCode: incident.incidentCode ?? null,
      decisionVersion: incident.decisionVersion,
      responsibilityParty: incident.responsibilityParty ?? null,
      taskerDecisionReason: incident.taskerDecisionReason ?? null,
      approvedAmount: toNumber(incident.approvedCompensationAmount),
      taskerBorneAmount: toNumber(incident.taskerBorneAmount),
      taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
    };
  }

  private normalizeDecisionDraft(
    dto: SaveIncidentDecisionDraftDto,
    items: IncidentDamageItemEntity[],
    policy: DecisionDraftPolicy,
  ): NormalizedDecisionDraft {
    const customerDecisionSummary = this.trimRequired(
      dto.customerDecisionSummary,
    );
    const internalDecisionNote = this.trimOptional(dto.internalDecisionNote);
    const taskerDecisionReason = this.trimOptional(dto.taskerDecisionReason);

    // REJECT (báo cáo sai) và APPROVE_NO_COMPENSATION (công nhận nhưng không bồi thường)
    // đều là quyết định KHÔNG chuyển tiền: approved=0, không allocation, không adverse.
    if (
      dto.decision === IncidentDecisionDraftDecision.REJECT ||
      dto.decision === IncidentDecisionDraftDecision.APPROVE_NO_COMPENSATION
    ) {
      const hasRejectedAmountPayload =
        (dto.taskerBorneAmount ?? 0) > 0 ||
        (dto.platformBorneAmount ?? 0) > 0 ||
        (dto.items ?? []).some((item) => item.approvedAmount > 0);

      if (hasRejectedAmountPayload) {
        throw new UnprocessableEntityException({
          code: 'INVALID_DECISION_DRAFT',
          message:
            'Quyết định không bồi thường không được có approved/allocation amount',
        });
      }

      return {
        decision: dto.decision,
        itemApprovals: new Map(items.map((item) => [item.id, 0])),
        totalApprovedAmount: 0,
        taskerBorneAmount: 0,
        platformBorneAmount: 0,
        responsibilityParty: null,
        responsibilityReason: null,
        allocationReason: null,
        internalDecisionNote,
        taskerDecisionReason,
        customerDecisionSummary,
        compensationSource: null,
        isAdverseToTasker: false,
        requiresSecondAdmin: false,
      };
    }

    const itemApprovals = new Map(items.map((item) => [item.id, 0]));
    const seenItemIds = new Set<string>();
    let totalApprovedAmount = 0;

    for (const input of dto.items ?? []) {
      if (seenItemIds.has(input.damageItemId)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_DECISION_DRAFT',
          message: 'Damage item bị trùng trong request',
        });
      }
      seenItemIds.add(input.damageItemId);

      if (!itemApprovals.has(input.damageItemId)) {
        throw new UnprocessableEntityException({
          code: 'INVALID_DECISION_DRAFT',
          message: 'Damage item không thuộc sự cố',
        });
      }

      itemApprovals.set(input.damageItemId, input.approvedAmount);
      totalApprovedAmount += input.approvedAmount;
    }

    const taskerBorneAmount = dto.taskerBorneAmount ?? 0;
    const platformBorneAmount = dto.platformBorneAmount ?? 0;
    const responsibilityParty = dto.responsibilityParty ?? null;
    const responsibilityReason = this.trimOptional(dto.responsibilityReason);
    const allocationReason = this.trimOptional(dto.allocationReason);
    const compensationSource = this.deriveCompensationSource(
      taskerBorneAmount,
      platformBorneAmount,
    );
    const isAdverseToTasker = this.isAdverseToTasker(
      responsibilityParty,
      taskerBorneAmount,
    );
    const requiresSecondAdmin =
      totalApprovedAmount >= policy.dualApprovalThreshold ||
      this.hasResponsibilityAllocationException(
        responsibilityParty,
        taskerBorneAmount,
        platformBorneAmount,
      );

    return {
      decision: dto.decision,
      itemApprovals,
      totalApprovedAmount,
      taskerBorneAmount,
      platformBorneAmount,
      responsibilityParty,
      responsibilityReason,
      allocationReason,
      internalDecisionNote,
      taskerDecisionReason,
      customerDecisionSummary,
      compensationSource,
      isAdverseToTasker,
      requiresSecondAdmin,
    };
  }

  private validateDecisionDraft(
    items: IncidentDamageItemEntity[],
    draft: NormalizedDecisionDraft,
    policy: DecisionDraftPolicy,
  ): void {
    if (draft.customerDecisionSummary.length < 10) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION_DRAFT',
        message: 'customerDecisionSummary phải có ít nhất 10 ký tự',
      });
    }

    for (const item of items) {
      const approvedAmount = draft.itemApprovals.get(item.id) ?? 0;
      if (approvedAmount > 0 && item.verifiedAmount == null) {
        throw new UnprocessableEntityException({
          code: 'INVALID_APPROVED_AMOUNT',
          message: 'Phải xác minh thiệt hại trước khi duyệt tiền',
        });
      }

      if (
        item.verifiedAmount != null &&
        approvedAmount > toNumber(item.verifiedAmount)
      ) {
        throw new UnprocessableEntityException({
          code: 'INVALID_APPROVED_AMOUNT',
          message: 'Số tiền duyệt không được vượt giá trị xác minh',
        });
      }
    }

    // REJECT và APPROVE_NO_COMPENSATION: approved=0 hợp lệ, không cần allocation/party/cap.
    if (
      draft.decision === IncidentDecisionDraftDecision.REJECT ||
      draft.decision === IncidentDecisionDraftDecision.APPROVE_NO_COMPENSATION
    ) {
      return;
    }

    if (draft.totalApprovedAmount <= 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION_DRAFT',
        message: 'Tổng tiền duyệt phải lớn hơn 0',
      });
    }

    if (draft.totalApprovedAmount > policy.policyCap) {
      throw new UnprocessableEntityException({
        code: 'POLICY_CAP_EXCEEDED',
        message: `Tổng bồi thường vượt trần chính sách (${policy.policyCap} VND)`,
      });
    }

    if (!draft.responsibilityParty) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION_DRAFT',
        message: 'APPROVE phải có responsibilityParty',
      });
    }

    if (!draft.responsibilityReason || draft.responsibilityReason.length < 10) {
      throw new UnprocessableEntityException({
        code: 'INVALID_DECISION_DRAFT',
        message: 'responsibilityReason phải có ít nhất 10 ký tự',
      });
    }

    if (
      draft.taskerBorneAmount + draft.platformBorneAmount !==
      draft.totalApprovedAmount
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_TOTAL',
        message:
          'taskerBorneAmount + platformBorneAmount phải bằng tổng approvedAmount',
      });
    }

    if (
      draft.responsibilityParty === IncidentResponsibilityParty.PLATFORM &&
      draft.taskerBorneAmount > 0
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_FOR_RESPONSIBILITY',
        message: 'PLATFORM không được phân bổ phần Tasker chịu',
      });
    }

    if (
      draft.responsibilityParty === IncidentResponsibilityParty.UNDETERMINED &&
      (draft.taskerBorneAmount > 0 ||
        draft.platformBorneAmount !== draft.totalApprovedAmount ||
        !draft.allocationReason)
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_FOR_RESPONSIBILITY',
        message:
          'UNDETERMINED chỉ hợp lệ khi CleanZ chịu toàn bộ và có allocationReason',
      });
    }

    if (
      draft.responsibilityParty === IncidentResponsibilityParty.SHARED &&
      (draft.taskerBorneAmount === 0 || draft.platformBorneAmount === 0) &&
      !draft.allocationReason
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_FOR_RESPONSIBILITY',
        message: 'SHARED một phía chịu 0 cần allocationReason',
      });
    }

    if (
      draft.responsibilityParty === IncidentResponsibilityParty.TASKER &&
      draft.taskerBorneAmount === 0 &&
      !draft.allocationReason
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_ALLOCATION_FOR_RESPONSIBILITY',
        message: 'TASKER nhưng Tasker chịu 0 cần allocationReason',
      });
    }
  }

  private hasMaterialDraftChange(
    incident: IncidentEntity,
    items: IncidentDamageItemEntity[],
    draft: NormalizedDecisionDraft,
  ): boolean {
    const currentDecision =
      toNumber(incident.approvedCompensationAmount) > 0
        ? IncidentDecisionDraftDecision.APPROVE
        : IncidentDecisionDraftDecision.REJECT;

    if (currentDecision !== draft.decision) return true;
    if (
      toNumber(incident.approvedCompensationAmount) !==
      draft.totalApprovedAmount
    ) {
      return true;
    }
    if (toNumber(incident.taskerBorneAmount) !== draft.taskerBorneAmount) {
      return true;
    }
    if (toNumber(incident.platformBorneAmount) !== draft.platformBorneAmount) {
      return true;
    }
    if ((incident.compensationSource ?? null) !== draft.compensationSource) {
      return true;
    }
    if ((incident.responsibilityParty ?? null) !== draft.responsibilityParty) {
      return true;
    }
    if (
      this.trimOptional(incident.responsibilityReason) !==
      draft.responsibilityReason
    ) {
      return true;
    }
    if (
      this.trimOptional(incident.allocationReason) !== draft.allocationReason
    ) {
      return true;
    }
    if (
      this.trimOptional(incident.internalDecisionNote) !==
      draft.internalDecisionNote
    ) {
      return true;
    }
    if (
      this.trimOptional(incident.taskerDecisionReason) !==
      draft.taskerDecisionReason
    ) {
      return true;
    }
    if (
      this.trimRequired(incident.customerDecisionSummary) !==
      draft.customerDecisionSummary
    ) {
      return true;
    }

    return items.some(
      (item) =>
        toNumber(item.approvedAmount) !==
        (draft.itemApprovals.get(item.id) ?? 0),
    );
  }

  private applyDecisionDraft(
    incident: IncidentEntity,
    items: IncidentDamageItemEntity[],
    draft: NormalizedDecisionDraft,
    adminUserId: string,
  ): void {
    const nextVersion =
      incident.decisionStatus === IncidentDecisionStatus.NONE
        ? 1
        : incident.decisionVersion + 1;

    for (const item of items) {
      item.approvedAmount = draft.itemApprovals.get(item.id) ?? 0;
    }

    incident.status = IncidentStatus.INVESTIGATING;
    incident.decisionStatus = IncidentDecisionStatus.DRAFT;
    incident.decisionVersion = nextVersion;
    incident.responseWindowStatus = IncidentResponseWindowStatus.NONE;
    incident.taskerResponseDeadline = null;
    incident.taskerResponseReviewedAt = null;

    incident.decisionOutcome = draft.decision;
    incident.approvedCompensationAmount = draft.totalApprovedAmount;
    incident.taskerBorneAmount = draft.taskerBorneAmount;
    incident.platformBorneAmount = draft.platformBorneAmount;
    incident.allocationReason = draft.allocationReason;
    incident.compensationSource = draft.compensationSource;

    incident.responsibilityParty = draft.responsibilityParty;
    incident.responsibilityReason = draft.responsibilityReason;
    incident.responsibilityDecidedByAdmin = { id: adminUserId } as never;
    incident.responsibilityDecidedAt = new Date();

    incident.internalDecisionNote = draft.internalDecisionNote;
    incident.taskerDecisionReason = draft.taskerDecisionReason;
    incident.customerDecisionSummary = draft.customerDecisionSummary;
    incident.decidedByAdmin = { id: adminUserId } as never;

    incident.secondApprovalNote = null;
    incident.secondApprovalRequestedAt = null;
    incident.secondApprovalDueAt = null;
    incident.secondApprovedByAdmin = null;
    incident.secondApprovedAt = null;
    incident.finalizedByAdmin = null;
    incident.finalizedAt = null;
  }

  private withDraftComputedDecisionFlags(
    view: IncidentAdminView,
    computedDraftFlags:
      | (Pick<
          NormalizedDecisionDraft,
          'isAdverseToTasker' | 'requiresSecondAdmin'
        > & { requiresTaskerResponse?: boolean })
      | null,
  ): IncidentAdminView {
    if (computedDraftFlags) {
      view.decision.isAdverseToTasker = computedDraftFlags.isAdverseToTasker;
      view.decision.requiresSecondAdmin =
        computedDraftFlags.requiresSecondAdmin;
      view.decision.requiresTaskerResponse =
        computedDraftFlags.requiresTaskerResponse ??
        computedDraftFlags.isAdverseToTasker;
      return view;
    }

    const responsibilityParty = view.decision
      .responsibilityParty as IncidentResponsibilityParty | null;
    const taskerBorneAmount = view.taskerBorneAmount ?? 0;
    const platformBorneAmount = view.platformBorneAmount ?? 0;
    view.decision.isAdverseToTasker = this.isAdverseToTasker(
      responsibilityParty,
      taskerBorneAmount,
    );
    view.decision.requiresSecondAdmin =
      view.decision.secondApprovalRequestedAt != null ||
      this.hasResponsibilityAllocationException(
        responsibilityParty,
        taskerBorneAmount,
        platformBorneAmount,
      );
    view.decision.requiresTaskerResponse = this.isAdverseToTasker(
      responsibilityParty,
      taskerBorneAmount,
    );
    return view;
  }

  private deriveCompensationSource(
    taskerBorneAmount: number,
    platformBorneAmount: number,
  ): IncidentCompensationSource | null {
    if (taskerBorneAmount > 0 && platformBorneAmount > 0) return 'MIXED';
    if (taskerBorneAmount > 0) return 'TASKER_DEPOSIT';
    if (platformBorneAmount > 0) return 'PLATFORM_FUND';
    return null;
  }

  private isAdverseToTasker(
    responsibilityParty: IncidentResponsibilityParty | null,
    taskerBorneAmount: number,
  ): boolean {
    return (
      taskerBorneAmount > 0 ||
      responsibilityParty === IncidentResponsibilityParty.TASKER ||
      responsibilityParty === IncidentResponsibilityParty.SHARED
    );
  }

  private buildDecisionAdversitySnapshot(
    incident: IncidentEntity,
  ): DecisionAdversitySnapshot {
    return {
      responsibilityParty: incident.responsibilityParty ?? null,
      taskerBorneAmount: toNumber(incident.taskerBorneAmount),
      taskerDecisionReason: this.trimOptional(incident.taskerDecisionReason),
    };
  }

  private shouldReopenTaskerResponse(
    previous: DecisionAdversitySnapshot,
    revised: NormalizedDecisionDraft,
  ): boolean {
    const previousAdverse = this.isAdverseToTasker(
      previous.responsibilityParty,
      previous.taskerBorneAmount,
    );
    const revisedAdverse = this.isAdverseToTasker(
      revised.responsibilityParty,
      revised.taskerBorneAmount,
    );

    if (!previousAdverse && revisedAdverse) return true;
    if (revised.taskerBorneAmount > previous.taskerBorneAmount) return true;

    const previousReason = previous.taskerDecisionReason ?? '';
    const revisedReason = revised.taskerDecisionReason ?? '';
    return (
      revisedAdverse &&
      revisedReason.length > 0 &&
      revisedReason !== previousReason
    );
  }

  private hasResponsibilityAllocationException(
    responsibilityParty: IncidentResponsibilityParty | null,
    taskerBorneAmount: number,
    platformBorneAmount: number,
  ): boolean {
    return (
      (responsibilityParty === IncidentResponsibilityParty.SHARED &&
        (taskerBorneAmount === 0 || platformBorneAmount === 0)) ||
      (responsibilityParty === IncidentResponsibilityParty.TASKER &&
        taskerBorneAmount === 0)
    );
  }

  private trimOptional(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private trimRequired(value?: string | null): string {
    return value?.trim() ?? '';
  }
}
