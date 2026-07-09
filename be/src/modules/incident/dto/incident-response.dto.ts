import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { IncidentStatementEntity } from '../entity/incident-statement.entity';
import { toNumber } from 'src/common/helpers/number.helper';
import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { getIncidentDecisionActionView } from '../domain/incident-decision.helpers';
import {
  IncidentDecisionAction,
  IncidentDecisionActionView,
} from '../domain/incident-decision-domain.types';

export interface EvidenceView {
  id: string;
  url: string;
  fileType?: string | null;
  purpose?: string | null;
  decisionVersion?: number | null;
}

export interface IncidentDecisionResponseView {
  id: string;
  incidentId: string | null;
  decisionVersion: number;
  responseType: string;
  content: string | null;
  responseRevision: number;
  submittedAt: Date;
  updatedAt: Date;
  reviewResult: string | null;
  reviewedAt: Date | null;
  evidences: EvidenceView[];
  canEdit: boolean;
}

export interface DamageItemView {
  id: string;
  description: string;
  claimedAmount: number;
  verifiedAmount: number | null;
  approvedAmount: number | null;
  verificationStatus: string;
  evidences: EvidenceView[];
}

export interface IncidentSummary {
  id: string;
  incidentCode: string | null;
  title: string;
  severity: string;
  status: string;
  compensationStatus: string;
  decisionStatus: string;
  decisionVersion: number;
  closureReason: string | null;
  claimedAmount: number | null;
  approvedAmount: number | null;
  reportedAt: Date;
  updatedAt: Date;
}

export interface IncidentCustomerView extends IncidentSummary {
  description: string;
  damageItems: DamageItemView[];
  resolvedAt: Date | null;
}

export interface StatementView {
  id: string;
  submittedByUserId: string | null;
  submittedByName: string | null;
  submittedByRole: string | null;
  body: string;
  createdAt: Date;
}

/** Phản hồi quyết định của Tasker theo góc nhìn Admin — kèm ghi chú review nội bộ. */
export interface AdminDecisionResponseView {
  id: string;
  decisionVersion: number;
  responseType: string;
  content: string | null;
  responseRevision: number;
  submittedByName: string | null;
  submittedAt: Date;
  reviewResult: string | null;
  reviewedAt: Date | null;
  adminReviewNote: string | null;
  evidences: EvidenceView[];
}

export interface IncidentAdminView extends IncidentSummary {
  description: string;
  customer: { id: string; fullName?: string | null };
  tasker: {
    id: string;
    fullName?: string | null;
    currentDepositBalance: number;
    availableDeposit: number;
    /** null = không bị khóa; có giá trị = đang soft-block nhận đơn tới hạn nạp bù (P0.3). */
    depositTopupDue: string | null;
  };
  damageItems: DamageItemView[];
  statements: StatementView[];
  /** Ảnh Tasker đính kèm khi giải trình (purpose=TASKER_STATEMENT, incident-level). */
  statementEvidences: EvidenceView[];
  /** P0.4 — ảnh minh chứng chuyển khoản thủ công (ADMIN_ONLY). */
  transferProofEvidences: EvidenceView[];
  decisionResponses: AdminDecisionResponseView[];
  /** P0.2 — số tiền ví Tasker đang tạm giữ cho sự cố này. */
  taskerWalletHoldAmount: number | null;
  /** P0.3 — phần nợ uncovered đã thu hồi (outstanding = uncoveredLiability - cột này). */
  uncoveredRecoveredAmount: number;
  taskerBorneAmount: number | null;
  platformBorneAmount: number | null;
  allocationReason: string | null;
  compensationSource: string | null;
  decision: {
    status: string;
    version: number;
    responseWindowStatus: string;
    taskerResponseDeadline: Date | null;
    taskerResponseReviewedAt: Date | null;
    responsibilityParty: string | null;
    responsibilityReason: string | null;
    internalDecisionNote: string | null;
    taskerDecisionReason: string | null;
    customerDecisionSummary: string | null;
    depositBalanceSnapshot: number | null;
    recoverableFromDepositAmount: number | null;
    uncoveredLiabilityAmount: number | null;
    secondApprovalNote: string | null;
    secondApprovalRequestedAt: Date | null;
    secondApprovalDueAt: Date | null;
    secondApprovedAt: Date | null;
    finalizedAt: Date | null;
    policyVersion: string | null;
    dualApprovalThresholdSnapshot: number | null;
    policyCapSnapshot: number | null;
    responseWindowHoursSnapshot: number | null;
    severityRuleSnapshot: Record<string, unknown> | null;
    isAdverseToTasker: boolean;
    requiresSecondAdmin: boolean;
    requiresTaskerResponse: boolean;
    allowedActions: IncidentDecisionAction[];
    blockedReasons: string[];
  };
  coolingUntil: Date | null;
  receivedDueAt: Date | null;
  statementDueAt: Date | null;
  decisionDueAt: Date | null;
  reportWindowUntil: Date | null;
  resolvedAt: Date | null;
}

export type PaginatedIncidents = PaginatedResponseDto<IncidentSummary>;

export function toIncidentSummary(incident: IncidentEntity): IncidentSummary {
  return {
    id: incident.id,
    incidentCode: incident.incidentCode ?? null,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    compensationStatus: incident.compensationStatus,
    decisionStatus: incident.decisionStatus,
    decisionVersion: incident.decisionVersion,
    closureReason: incident.closureReason ?? null,
    claimedAmount:
      incident.claimedAmount != null ? toNumber(incident.claimedAmount) : null,
    approvedAmount:
      incident.approvedCompensationAmount != null
        ? toNumber(incident.approvedCompensationAmount)
        : null,
    reportedAt: incident.reportedAt,
    updatedAt: incident.updatedAt,
  };
}

function toEvidenceView(e: IncidentEvidenceEntity): EvidenceView {
  return {
    id: e.id,
    url: e.fileUrl,
    fileType: e.fileType ?? null,
    purpose: e.purpose ?? null,
    decisionVersion: e.decisionVersion ?? null,
  };
}

export function toDecisionResponseView(
  response: IncidentDecisionResponseEntity,
  evidences: IncidentEvidenceEntity[],
  canEdit: boolean,
): IncidentDecisionResponseView {
  return {
    id: response.id,
    incidentId: response.incident?.id ?? null,
    decisionVersion: response.decisionVersion,
    responseType: response.responseType,
    content: response.content ?? null,
    responseRevision: response.responseRevision,
    submittedAt: response.submittedAt,
    updatedAt: response.updatedAt,
    reviewResult: response.reviewResult ?? null,
    reviewedAt: response.reviewedAt ?? null,
    evidences: evidences.map(toEvidenceView),
    canEdit,
  };
}

export function toAdminDecisionResponseView(
  response: IncidentDecisionResponseEntity,
): AdminDecisionResponseView {
  return {
    id: response.id,
    decisionVersion: response.decisionVersion,
    responseType: response.responseType,
    content: response.content ?? null,
    responseRevision: response.responseRevision,
    submittedByName: response.tasker?.fullName ?? null,
    submittedAt: response.submittedAt,
    reviewResult: response.reviewResult ?? null,
    reviewedAt: response.reviewedAt ?? null,
    adminReviewNote: response.adminReviewNote ?? null,
    evidences: (response.evidences ?? [])
      .filter((e) => !e.isSoftDeleted && e.isActiveForResponse)
      .map(toEvidenceView),
  };
}

function toDamageItemViews(
  items: IncidentDamageItemEntity[],
  evidencesByItem: Map<string, IncidentEvidenceEntity[]>,
): DamageItemView[] {
  return items.map((item) => ({
    id: item.id,
    description: item.description,
    claimedAmount: toNumber(item.claimedAmount),
    verifiedAmount:
      item.verifiedAmount != null ? toNumber(item.verifiedAmount) : null,
    approvedAmount:
      item.approvedAmount != null ? toNumber(item.approvedAmount) : null,
    verificationStatus: item.verificationStatus,
    evidences: (evidencesByItem.get(item.id) ?? []).map(toEvidenceView),
  }));
}

export function toCustomerView(
  incident: IncidentEntity,
  items: IncidentDamageItemEntity[],
  evidencesByItem: Map<string, IncidentEvidenceEntity[]>,
): IncidentCustomerView {
  return {
    ...toIncidentSummary(incident),
    description: incident.description,
    resolvedAt: incident.resolvedAt ?? null,
    damageItems: toDamageItemViews(items, evidencesByItem),
  };
}

export function toAdminView(
  incident: IncidentEntity,
  items: IncidentDamageItemEntity[],
  evidencesByItem: Map<string, IncidentEvidenceEntity[]>,
  statements: IncidentStatementEntity[],
  decisionResponses: IncidentDecisionResponseEntity[] = [],
  statementEvidences: IncidentEvidenceEntity[] = [],
  taskerWalletBalance = 0,
  transferProofEvidences: IncidentEvidenceEntity[] = [],
): IncidentAdminView {
  const currentDeposit = toNumber(incident.tasker?.currentDepositBalance);
  // Quỹ Tasker khả dụng THẬT = số dư ví (nạp PayPal) + cọc gốc.
  const availableDeposit = toNumber(taskerWalletBalance) + currentDeposit;
  const isAdverse =
    (incident.taskerBorneAmount != null &&
      toNumber(incident.taskerBorneAmount) > 0) ||
    incident.responsibilityParty === 'TASKER' ||
    incident.responsibilityParty === 'SHARED';
  const actionView: IncidentDecisionActionView = getIncidentDecisionActionView(
    {
      decisionStatus: incident.decisionStatus,
      decisionVersion: incident.decisionVersion,
      responseWindowStatus: incident.responseWindowStatus,
      taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
      hasUnreviewedResponse: false,
      requiresSecondApproval: false,
      isAdverseDraft: isAdverse,
      taskerResponseExtended: incident.taskerResponseExtendedAt != null,
    },
    new Date(),
  );

  return {
    ...toIncidentSummary(incident),
    description: incident.description,
    customer: {
      id: incident.customer?.id,
      fullName: incident.customer?.user?.fullName ?? null,
    },
    tasker: {
      id: incident.tasker?.id,
      fullName: incident.tasker?.user?.fullName ?? null,
      currentDepositBalance: currentDeposit,
      availableDeposit,
      depositTopupDue: incident.tasker?.depositTopupDue
        ? new Date(incident.tasker.depositTopupDue).toISOString()
        : null,
    },
    damageItems: toDamageItemViews(items, evidencesByItem),
    statements: statements.map((s) => ({
      id: s.id,
      submittedByUserId: s.submittedBy?.id ?? null,
      submittedByName: s.submittedBy?.fullName ?? null,
      submittedByRole: s.submittedBy?.role ?? null,
      body: s.body,
      createdAt: s.createdAt,
    })),
    statementEvidences: statementEvidences.map(toEvidenceView),
    transferProofEvidences: transferProofEvidences.map(toEvidenceView),
    decisionResponses: decisionResponses.map(toAdminDecisionResponseView),
    taskerWalletHoldAmount:
      incident.taskerWalletHoldAmount != null
        ? toNumber(incident.taskerWalletHoldAmount)
        : null,
    uncoveredRecoveredAmount: toNumber(incident.uncoveredRecoveredAmount),
    taskerBorneAmount:
      incident.taskerBorneAmount != null
        ? toNumber(incident.taskerBorneAmount)
        : null,
    platformBorneAmount:
      incident.platformBorneAmount != null
        ? toNumber(incident.platformBorneAmount)
        : null,
    allocationReason: incident.allocationReason ?? null,
    compensationSource: incident.compensationSource ?? null,
    decision: {
      status: incident.decisionStatus,
      version: incident.decisionVersion,
      responseWindowStatus: incident.responseWindowStatus,
      taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
      taskerResponseReviewedAt: incident.taskerResponseReviewedAt ?? null,
      responsibilityParty: incident.responsibilityParty ?? null,
      responsibilityReason: incident.responsibilityReason ?? null,
      internalDecisionNote: incident.internalDecisionNote ?? null,
      taskerDecisionReason: incident.taskerDecisionReason ?? null,
      customerDecisionSummary: incident.customerDecisionSummary ?? null,
      depositBalanceSnapshot:
        incident.depositBalanceSnapshot != null
          ? toNumber(incident.depositBalanceSnapshot)
          : null,
      recoverableFromDepositAmount:
        incident.recoverableFromDepositAmount != null
          ? toNumber(incident.recoverableFromDepositAmount)
          : null,
      uncoveredLiabilityAmount:
        incident.uncoveredLiabilityAmount != null
          ? toNumber(incident.uncoveredLiabilityAmount)
          : null,
      secondApprovalNote: incident.secondApprovalNote ?? null,
      secondApprovalRequestedAt: incident.secondApprovalRequestedAt ?? null,
      secondApprovalDueAt: incident.secondApprovalDueAt ?? null,
      secondApprovedAt: incident.secondApprovedAt ?? null,
      finalizedAt: incident.finalizedAt ?? null,
      policyVersion: incident.policyVersion ?? null,
      dualApprovalThresholdSnapshot:
        incident.dualApprovalThresholdSnapshot != null
          ? toNumber(incident.dualApprovalThresholdSnapshot)
          : null,
      policyCapSnapshot:
        incident.policyCapSnapshot != null
          ? toNumber(incident.policyCapSnapshot)
          : null,
      responseWindowHoursSnapshot: incident.responseWindowHoursSnapshot ?? null,
      severityRuleSnapshot: incident.severityRuleSnapshot ?? null,
      isAdverseToTasker: isAdverse,
      requiresSecondAdmin: incident.secondApprovalRequestedAt != null,
      requiresTaskerResponse: incident.decisionStatus === 'DRAFT' && isAdverse,
      allowedActions: actionView.allowedActions,
      blockedReasons: actionView.blockedReasons,
    },
    coolingUntil: incident.coolingUntil ?? null,
    receivedDueAt: incident.receivedDueAt ?? null,
    statementDueAt: incident.statementDueAt ?? null,
    decisionDueAt: incident.decisionDueAt ?? null,
    reportWindowUntil: incident.reportWindowUntil ?? null,
    resolvedAt: incident.resolvedAt ?? null,
  };
}

export type PaginatedAdminIncidents = PaginatedResponseDto<IncidentSummary>;

export interface IncidentTaskerView extends IncidentSummary {
  description: string;
  damageItems: DamageItemView[];
  statements: StatementView[];
  statementDueAt: Date | null;
  responseWindowStatus: string;
  taskerResponseDeadline: Date | null;
  canSubmitStatement: boolean;
  canRespondToDecision: boolean;
  /**
   * Phần Tasker chịu đã GHI NHẬN (record-only Phase 1) — chỉ lộ khi quyết định đã
   * externalize cho Tasker (submit trở đi). Ẩn khi còn NONE/DRAFT để giữ cô lập draft.
   */
  myBorneAmount: number | null;
  myDepositHold: number | null;
  myDepositDeducted: number | null;
}

export function toTaskerView(
  incident: IncidentEntity,
  items: IncidentDamageItemEntity[],
  evidencesByItem: Map<string, IncidentEvidenceEntity[]>,
  statements: IncidentStatementEntity[],
  canSubmitStatement: boolean,
): IncidentTaskerView {
  return {
    ...toIncidentSummary(incident),
    description: incident.description,
    damageItems: toDamageItemViews(items, evidencesByItem),
    statements: statements.map((s) => ({
      id: s.id,
      submittedByUserId: s.submittedBy?.id ?? null,
      submittedByName: s.submittedBy?.fullName ?? null,
      submittedByRole: s.submittedBy?.role ?? null,
      body: s.body,
      createdAt: s.createdAt,
    })),
    statementDueAt: incident.statementDueAt ?? null,
    responseWindowStatus: incident.responseWindowStatus,
    taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
    canSubmitStatement,
    canRespondToDecision: getIncidentDecisionActionView(
      {
        decisionStatus: incident.decisionStatus,
        decisionVersion: incident.decisionVersion,
        responseWindowStatus: incident.responseWindowStatus,
        taskerResponseDeadline: incident.taskerResponseDeadline ?? null,
      },
      new Date(),
    ).allowedActions.includes('RESPOND'),
    myBorneAmount: [
      IncidentDecisionStatus.PENDING_TASKER_RESPONSE,
      IncidentDecisionStatus.PENDING_ADMIN_APPROVAL,
      IncidentDecisionStatus.FINAL,
    ].includes(incident.decisionStatus)
      ? toNumber(incident.taskerBorneAmount)
      : null,
    myDepositHold: null,
    myDepositDeducted: null,
  };
}
