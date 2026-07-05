import { PaginatedResponseDto } from 'src/common/dto/paginated-response.dto';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDamageItemEntity } from '../entity/incident-damage-item.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { IncidentStatementEntity } from '../entity/incident-statement.entity';
import { toNumber } from 'src/common/helpers/number.helper';

export interface EvidenceView {
  id: string;
  url: string;
  fileType?: string | null;
}

export interface DamageItemView {
  id: string;
  description: string;
  claimedAmount: number;
  verifiedAmount: number | null;
  approvedAmount: number | null;
  evidences: EvidenceView[];
}

export interface IncidentSummary {
  id: string;
  incidentCode: string | null;
  title: string;
  severity: string;
  status: string;
  compensationStatus: string;
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
  body: string;
  createdAt: Date;
}

export interface IncidentAdminView extends IncidentSummary {
  description: string;
  customer: { id: string; fullName?: string | null };
  tasker: {
    id: string;
    fullName?: string | null;
    walletBalance: number;
    availableFunds: number;
  };
  damageItems: DamageItemView[];
  statements: StatementView[];
  taskerBorneAmount: number | null;
  platformBorneAmount: number | null;
  allocationReason: string | null;
  compensationSource: string | null;
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
  return { id: e.id, url: e.fileUrl, fileType: e.fileType ?? null };
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
  taskerWalletBalance = 0,
): IncidentAdminView {
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
      walletBalance: taskerWalletBalance,
      availableFunds: taskerWalletBalance,
    },
    damageItems: toDamageItemViews(items, evidencesByItem),
    statements: statements.map((s) => ({
      id: s.id,
      submittedByUserId: s.submittedBy?.id ?? null,
      body: s.body,
      createdAt: s.createdAt,
    })),
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
  canSubmitStatement: boolean;
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
      body: s.body,
      createdAt: s.createdAt,
    })),
    statementDueAt: incident.statementDueAt ?? null,
    canSubmitStatement,
    myDepositHold: null,
    myDepositDeducted: null,
  };
}
