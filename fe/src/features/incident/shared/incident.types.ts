/**
 * Incident — View & DTO types (single source of truth).
 *
 * Khớp CHÍNH XÁC `incident-response.dto.ts` của BE (không theo bản idealized của spec).
 * Tách 3 view để cô lập tài chính: Customer (ẩn cọc Tasker), Tasker (chỉ cọc của mình), Admin (đầy đủ).
 */
import type {
  ClosureReason,
  CompensationSource,
  DamageItemStatus,
  DecisionAction,
  DecisionOutcome,
  DecisionResponseType,
  IncidentStatus,
  ResponseReviewResult,
  ResponsibilityParty,
  Severity,
} from "./incident.enums";

// Re-export các type dùng lại ở tầng component (import gọn từ incident.types).
export type {
  ResponsibilityParty,
  ResponseReviewResult,
  DecisionOutcome,
  DecisionAction,
};

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
  "PENDING" | "VERIFIED" | "REJECTED" | "NEED_MORE_EVIDENCE";
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
  type: "PROPERTY_DAMAGE" | "CHECKIN_VIOLATION";
  source: "CUSTOMER_REPORT" | "SUPPORT_TICKET" | "CHECKIN_REVIEW";
  severity: Severity;
  status: IncidentStatus;
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
  /** Tiền đã đi đường nào: hoàn vào ví hay chuyển khoản. null = chưa chi trả. */
  payoutChannel: 'WALLET' | 'BANK_TRANSFER' | null;
  /** Nội dung quyết định CleanZ gửi khách. */
  decisionSummary: string | null;
}

// ─── Tasker view (chỉ cọc của chính mình) ────────────────────────────────────
export interface IncidentTaskerView extends IncidentSummary {
  description: string;
  damageItems: DamageItem[];
  statements: Statement[];
  statementDueAt: string | null;
  taskerResponseDeadline: string | null;
  canSubmitStatement: boolean;
  canRespondToDecision: boolean;
  /** Phần Tasker chịu; null khi quyết định chưa được gửi cho Tasker. */
  myBorneAmount: number | null;
  /** Số tiền ví đang bị tạm giữ cho sự cố này. */
  myWalletHold: number | null;
  /** Đã trừ thật từ ví khi chi trả. */
  myWalletDeducted: number | null;
  /** Còn nợ nền tảng (quỹ đã ứng thay), sẽ trừ dần từ thu nhập. */
  myOutstandingDebt: number | null;
}

/** Alias giữ tên cũ cho các component đang import. */
export type IncidentDecisionAction = DecisionAction;

export interface IncidentDecisionView {
  outcome: DecisionOutcome | null;
  version: number;
  taskerResponseDeadline: string | null;
  /** Mốc `taskerBorne` của bản đã gửi Tasker — bản hiện tại lớn hơn ⟹ phải gửi lại. */
  sentTaskerBorneAmount: number | null;
  responsibilityParty: ResponsibilityParty | null;
  responsibilityReason: string | null;
  internalDecisionNote: string | null;
  taskerDecisionReason: string | null;
  customerDecisionSummary: string | null;
  depositBalanceSnapshot: number | null;
  recoverableFromDepositAmount: number | null;
  uncoveredLiabilityAmount: number | null;
  finalizedAt: string | null;
  policyVersion: string | null;
  policyCapSnapshot: number | null;
  responseWindowHoursSnapshot: number | null;
  severityRuleSnapshot: Record<string, unknown> | null;
  requiresTaskerResponse: boolean;
  allowedActions: DecisionAction[];
  blockedReasons: string[];
}

/**
 * Xem trước dòng tiền TRƯỚC khi bấm chi trả. BE tính bằng đúng công thức lúc ghi sổ
 * (floor về VND nguyên) — dùng số này trên nút xác nhận, không tự suy từ taskerBorne.
 */
export interface PayoutPreview {
  customerRefund: number;
  recoverableFromTasker: number;
  uncoveredFromTasker: number;
  platformPayout: number;
  taskerWalletBalance: number;
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
  customer: PartyRef & {
    /** Mốc khoá quyền báo cáo (null = không bị khoá). */
    reportingLockedUntil: string | null;
  };
  tasker: PartyRef & {
    /** Ký quỹ đã bỏ — nguồn thu hồi duy nhất từ Tasker là số dư ví. */
    walletBalance: number;
  };
  damageItems: DamageItem[];
  statements: Statement[];
  /** Ảnh Tasker đính kèm khi giải trình (không thuộc hạng mục nào). */
  statementEvidences: Evidence[];
  /** P0.4 — ảnh minh chứng chuyển khoản thủ công (chỉ admin thấy). */
  transferProofEvidences: Evidence[];
  decisionResponses: AdminDecisionResponse[];
  taskerWalletHoldAmount: number | null;
  /** Tiền THẬT đã thu lại được từ Tasker. */
  uncoveredRecoveredAmount: number;
  /** Phần nợ Admin đã xoá (nền tảng chịu mất) — tách khỏi số thu hồi thật. */
  uncoveredWrittenOffAmount: number;
  /** Nợ còn lại = uncoveredLiability − đã thu − đã xoá. */
  outstandingDebtAmount: number;
  debtWriteOff: {
    at: string;
    reason: string | null;
    byAdminName: string | null;
  } | null;
  /** Đủ điều kiện xoá nợ (còn nợ + đã quá thời hạn chờ thu hồi tự động). */
  canWriteOffDebt: boolean;
  taskerBorneAmount: number | null;
  platformBorneAmount: number | null;
  allocationReason: string | null;
  compensationSource: CompensationSource | null;
  decision: IncidentDecisionView;
  payoutPreview: PayoutPreview | null;
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
  note?: string;
}
export interface DecisionItemInput {
  damageItemId: string;
  approvedAmount: number;
  status?: Exclude<DamageItemStatus, 'PENDING'>;
}
/** Body cho PUT :id/decision — gộp thẩm định hạng mục + duyệt tiền + phân bổ. */
export interface SaveDecisionInput {
  expectedDecisionVersion: number;
  outcome: DecisionOutcome;
  items?: DecisionItemInput[];
  responsibilityParty?: ResponsibilityParty | null;
  responsibilityReason?: string | null;
  taskerBorneAmount?: number;
  platformBorneAmount?: number;
  allocationReason?: string | null;
  internalDecisionNote?: string | null;
  taskerDecisionReason?: string | null;
  customerDecisionSummary?: string | null;
}
export interface SendToTaskerInput {
  expectedDecisionVersion: number;
}
export interface FinalizeDecisionInput {
  expectedDecisionVersion: number;
  rejectAsFraud?: boolean;
}
export interface UpsertDecisionResponseInput {
  decisionVersion: number;
  responseType: DecisionResponseType;
  content?: string | null;
  evidenceIds?: string[];
}
export interface FromTicketDamageItem {
  description: string;
  claimedAmount: number;
}
export interface FromTicketInput {
  title: string;
  description: string;
  damageItems: FromTicketDamageItem[];
}

export type IncidentConfigMap = Record<string, string | null>;

// ─── Query params ─────────────────────────────────────────────────────────────
export interface MyIncidentQuery {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
}
export interface AdminIncidentQuery {
  page?: number;
  limit?: number;
  status?: IncidentStatus;
  severity?: Severity;
  taskerId?: string;
  customerId?: string;
  overdue?: boolean;
  sort?: "severity" | "reportedAt" | "decisionDueAt";
  /** Kỳ lọc theo NGÀY BÁO CÁO (`reportedAt`), dạng 'YYYY-MM-DD' — biên giờ VN ở BE. */
  fromDate?: string;
  toDate?: string;
}

/** Bộ lọc khi xuất danh sách: y hệt hàng đợi nhưng không có phân trang. */
export type AdminIncidentExportQuery = Omit<
  AdminIncidentQuery,
  "page" | "limit"
>;

/** Kỳ lọc dùng chung cho hàng đợi và cả hai file xuất ra. */
export type IncidentDateRangeQuery = Pick<
  AdminIncidentQuery,
  "fromDate" | "toDate"
>;

export interface IncidentConfig {
  reportWindowHours?: number;
  reportWindowSevereHours?: number;
  claimMax?: number;
  policyCap?: number;
  responseWindowHours?: number;
  autoCloseHours?: number;
  [key: string]: unknown;
}
