/**
 * Incident — View & DTO types (single source of truth).
 *
 * Khớp CHÍNH XÁC `incident-response.dto.ts` của BE (không theo bản idealized của spec).
 * Tách 3 view để cô lập tài chính: Customer (ẩn cọc Tasker), Tasker (chỉ cọc của mình), Admin (đầy đủ).
 */
import type {
  ClosureReason,
  CompensationSource,
  CompensationStatus,
  Decision,
  DecisionResponseType,
  IncidentStatus,
  IncidentDecisionStatus,
  ResponseReviewResult,
  ResponseWindowStatus,
  ResponsibilityParty,
  SecondApprovalAction,
  Severity,
} from './incident.enums';

// Re-export các type dùng lại ở tầng component (import gọn từ incident.types).
export type { ResponsibilityParty, ResponseReviewResult };

// ─── Pagination (chuẩn dự án) ────────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Sub-shapes (khớp *View của BE) ──────────────────────────────────────────
export interface Evidence {
  id: string;
  url: string;
  fileType?: string | null;
  purpose?: string | null;
  decisionVersion?: number | null;
}
export type DamageItemVerificationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "NEED_MORE_EVIDENCE";
export interface DamageItem {
  id: string;
  description: string;
  claimedAmount: number;
  verifiedAmount: number | null;
  approvedAmount: number | null;
  verificationStatus: DamageItemVerificationStatus;
  evidences: Evidence[];
}
export interface Statement {
  id: string;
  submittedByUserId: string | null;
  submittedByName: string | null;
  submittedByRole: string | null;
  body: string;
  createdAt: string;
}
export interface PartyRef {
  id: string;
  fullName?: string | null;
}

// ─── Summary (list) ──────────────────────────────────────────────────────────
export interface IncidentSummary {
  id: string;
  incidentCode: string | null;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  compensationStatus: CompensationStatus;
  decisionStatus: IncidentDecisionStatus;
  decisionVersion: number;
  closureReason: ClosureReason | null;
  claimedAmount: number | null;
  approvedAmount: number | null;
  reportedAt: string;
  updatedAt: string;
}

// ─── Customer view (ẩn tài chính Tasker) ─────────────────────────────────────
export interface IncidentCustomerView extends IncidentSummary {
  description: string;
  damageItems: DamageItem[];
  resolvedAt: string | null;
}

// ─── Tasker view (chỉ cọc của chính mình) ────────────────────────────────────
export interface IncidentTaskerView extends IncidentSummary {
  description: string;
  damageItems: DamageItem[];
  statements: Statement[];
  statementDueAt: string | null;
  responseWindowStatus: ResponseWindowStatus;
  taskerResponseDeadline: string | null;
  canSubmitStatement: boolean;
  canRespondToDecision: boolean;
  /** Phần Tasker chịu đã ghi nhận (record-only); null khi quyết định chưa gửi cho Tasker. */
  myBorneAmount: number | null;
  myDepositHold: number | null;
  myDepositDeducted: number | null;
}

// NOTE: các hằng phải khớp chính xác chuỗi BE emit trong
// getIncidentDecisionActionView (incident-decision.helpers.ts).
export type IncidentDecisionAction =
  | 'SAVE_DRAFT'
  | 'SUBMIT_DRAFT'
  | 'RESPOND'
  | 'REVIEW_RESPONSE'
  | 'REVISE_DECISION'
  | 'EXTEND_RESPONSE'
  | 'FINALIZE'
  | 'SECOND_APPROVE'
  | 'REQUEST_CHANGES'
  | 'COMPENSATE';

export interface IncidentDecisionView {
  status: IncidentDecisionStatus;
  version: number;
  responseWindowStatus: ResponseWindowStatus;
  taskerResponseDeadline: string | null;
  taskerResponseReviewedAt: string | null;
  responsibilityParty: ResponsibilityParty | null;
  responsibilityReason: string | null;
  internalDecisionNote: string | null;
  taskerDecisionReason: string | null;
  customerDecisionSummary: string | null;
  depositBalanceSnapshot: number | null;
  recoverableFromDepositAmount: number | null;
  uncoveredLiabilityAmount: number | null;
  secondApprovalNote: string | null;
  secondApprovalRequestedAt: string | null;
  secondApprovalDueAt: string | null;
  secondApprovedAt: string | null;
  finalizedAt: string | null;
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
}

export interface DecisionResponseView {
  id: string;
  incidentId: string | null;
  decisionVersion: number;
  responseType: DecisionResponseType;
  content: string | null;
  responseRevision: number;
  submittedAt: string;
  updatedAt: string;
  reviewResult: ResponseReviewResult | null;
  reviewedAt: string | null;
  evidences: Evidence[];
  canEdit: boolean;
}

/** Phản hồi quyết định của Tasker theo góc nhìn Admin (kèm ghi chú review). */
export interface AdminDecisionResponse {
  id: string;
  decisionVersion: number;
  responseType: DecisionResponseType;
  content: string | null;
  responseRevision: number;
  submittedByName: string | null;
  submittedAt: string;
  reviewResult: ResponseReviewResult | null;
  reviewedAt: string | null;
  adminReviewNote: string | null;
  evidences: Evidence[];
}

// ─── Admin view (đầy đủ) ─────────────────────────────────────────────────────
export interface IncidentAdminView extends IncidentSummary {
  description: string;
  customer: PartyRef;
  tasker: PartyRef & {
    currentDepositBalance: number;
    availableDeposit: number;
    depositTopupDue: string | null;
  };
  damageItems: DamageItem[];
  statements: Statement[];
  /** Ảnh Tasker đính kèm khi giải trình (không thuộc hạng mục nào). */
  statementEvidences: Evidence[];
  /** P0.4 — ảnh minh chứng chuyển khoản thủ công (chỉ admin thấy). */
  transferProofEvidences: Evidence[];
  decisionResponses: AdminDecisionResponse[];
  taskerWalletHoldAmount: number | null;
  uncoveredRecoveredAmount: number;
  taskerBorneAmount: number | null;
  platformBorneAmount: number | null;
  allocationReason: string | null;
  compensationSource: CompensationSource | null;
  decision: IncidentDecisionView;
  coolingUntil: string | null;
  receivedDueAt: string | null;
  statementDueAt: string | null;
  decisionDueAt: string | null;
  reportWindowUntil: string | null;
  resolvedAt: string | null;
}

// ─── Request DTOs (khớp body BE) ─────────────────────────────────────────────
export interface DamageItemInput {
  description: string;
  claimedAmount: number;
  evidenceIds: string[];
}
export interface CreateIncidentInput {
  bookingId: string;
  title: string;
  description: string;
  damageItems: DamageItemInput[];
}
export interface WithdrawInput {
  reason?: string;
}
export interface SubmitStatementInput {
  body: string;
  evidenceIds?: string[];
}
export interface AcceptInput {
  severity: Severity;
}
export interface VerifyItemsInput {
  items: {
    itemId: string;
    verifiedAmount: number;
    status?: Exclude<DamageItemVerificationStatus, "PENDING">;
  }[];
}
export interface DecisionDraftItemInput {
  // BE DTO (SaveIncidentDecisionDraftDto) dùng `damageItemId`, khác với verify/decide (`itemId`).
  damageItemId: string;
  approvedAmount: number;
}
export interface DecisionDraftInput {
  expectedDecisionVersion: number;
  decision: Decision;
  items?: DecisionDraftItemInput[];
  responsibilityParty?: ResponsibilityParty | null;
  responsibilityReason?: string | null;
  taskerBorneAmount?: number;
  platformBorneAmount?: number;
  allocationReason?: string | null;
  internalDecisionNote?: string | null;
  taskerDecisionReason?: string | null;
  customerDecisionSummary?: string | null;
}
export interface SubmitDecisionDraftInput {
  expectedDecisionVersion: number;
}
export interface ReviewDecisionResponseInput {
  expectedDecisionVersion: number;
  responseId: string;
  result: ResponseReviewResult;
  adminReviewNote: string;
}
export type ReviseDecisionInput = DecisionDraftInput;
export interface FinalizeDecisionInput {
  expectedDecisionVersion: number;
  /** Chỉ khi finalize draft REJECT: đánh dấu báo cáo sai → cộng strike gian lận. */
  rejectAsFraud?: boolean;
}
export interface SecondApprovalInput {
  expectedDecisionVersion: number;
  action: SecondApprovalAction;
  note?: string;
}
export interface UpsertDecisionResponseInput {
  decisionVersion: number;
  responseType: DecisionResponseType;
  content?: string | null;
  evidenceIds?: string[];
}
/** from-ticket: damage item KHÔNG kèm evidence (kế thừa bằng chứng từ ticket). */
export interface FromTicketDamageItem {
  description: string;
  claimedAmount: number;
}
export interface FromTicketInput {
  title: string;
  description: string;
  damageItems: FromTicketDamageItem[];
}

/** Config = key→value phẳng (BE trả Record<string,string|null>). */
export type IncidentConfigMap = Record<string, string | null>;

// ─── Query params ─────────────────────────────────────────────────────────────
export interface MyIncidentQuery {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
  compensationStatus?: CompensationStatus;
}
export interface AdminIncidentQuery {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
  compensationStatus?: CompensationStatus;
  severity?: Severity;
  taskerId?: string;
  customerId?: string;
  overdue?: boolean;
  sort?: 'severity' | 'reportedAt' | 'decisionDueAt';
}

// ─── Config (đối chiếu khi làm ConfigForm) ───────────────────────────────────
export interface IncidentConfig {
  reportWindowHours?: number;
  reportWindowSevereHours?: number;
  claimMax?: number;
  policyCap?: number;
  dualApprovalThreshold?: number;
  coolingHours?: number;
  autoCloseDays?: number;
  [key: string]: unknown;
}
