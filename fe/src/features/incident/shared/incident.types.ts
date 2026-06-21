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
  IncidentStatus,
  Severity,
} from './incident.enums';

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
}
export interface DamageItem {
  id: string;
  description: string;
  claimedAmount: number;
  verifiedAmount: number | null;
  approvedAmount: number | null;
  evidences: Evidence[];
}
export interface Statement {
  id: string;
  submittedByUserId: string | null;
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
  canSubmitStatement: boolean;
  myDepositHold: number | null;
  myDepositDeducted: number | null;
}

// ─── Admin view (đầy đủ) ─────────────────────────────────────────────────────
export interface IncidentAdminView extends IncidentSummary {
  description: string;
  customer: PartyRef;
  tasker: PartyRef & {
    currentDepositBalance: number;
    availableDeposit: number;
  };
  damageItems: DamageItem[];
  statements: Statement[];
  taskerBorneAmount: number | null;
  platformBorneAmount: number | null;
  allocationReason: string | null;
  compensationSource: CompensationSource | null;
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
  items: { itemId: string; verifiedAmount: number }[];
}
export interface DecideInput {
  decision: Decision;
  items?: { itemId: string; approvedAmount: number }[];
  taskerBorneAmount?: number;
  platformBorneAmount?: number;
  allocationReason?: string;
  reason?: string;
  rejectAsFraud?: boolean;
}
export interface ApproveCompensationInput {
  confirm: true;
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
