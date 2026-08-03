/**
 * Incident — enum hợp đồng (single source of truth).
 *
 * Phản chiếu CHÍNH XÁC enum backend (`CleanZ/be/src/common/enums/incident-*`) và API spec
 * (override: severity server tự suy, upload chỉ IMAGE). Mọi module (customer/tasker/admin)
 * PHẢI import enum từ đây — không định nghĩa lại.
 */

/**
 * MỘT trục trạng thái duy nhất (mirror `be/src/common/enums/incident-status.enum.ts`).
 * Đã gỡ `COMPENSATION_STATUS` / `INCIDENT_DECISION_STATUS` / `RESPONSE_WINDOW_STATUS`:
 * cả ba đều lưu lại cùng một sự thật mà trục này đã mô tả.
 */
export const INCIDENT_STATUS = [
  'REPORTED',
  'REVIEWING',
  'AWAITING_RESPONSE',
  'AWAITING_PAYOUT',
  'COMPENSATED',
  'REJECTED',
  'CLOSED',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[number];

export const CLOSURE_REASON = [
  'COMPENSATED',
  'REJECTED',
  'NO_COMPENSATION',
  'WITHDRAWN',
  'DUPLICATE',
  'INVALID_BOOKING',
  'EXPIRED',
] as const;
export type ClosureReason = (typeof CLOSURE_REASON)[number];

export const SEVERITY = ['CRITICAL', 'MAJOR', 'MINOR'] as const;
export type Severity = (typeof SEVERITY)[number];

export const COMPENSATION_SOURCE = [
  'TASKER_DEPOSIT',
  'PLATFORM_FUND',
  'MIXED',
] as const;
export type CompensationSource = (typeof COMPENSATION_SOURCE)[number];

/** Upload chỉ IMAGE (override spec — từ chối video → 422). */
export const EVIDENCE_TYPE = ['IMAGE'] as const;
export type EvidenceType = (typeof EVIDENCE_TYPE)[number];

/** Ba kết cục quyết định. Chỉ COMPENSATE mới chuyển tiền. */
export const DECISION_OUTCOME = [
  'COMPENSATE',
  'NO_COMPENSATION',
  'REJECT',
] as const;
export type DecisionOutcome = (typeof DECISION_OUTCOME)[number];

/** Hành động khả dụng do BE tính, FE chỉ hiển thị (mirror `incident-decision.helpers.ts`). */
export const DECISION_ACTION = [
  'ACCEPT',
  'SAVE_DECISION',
  'SEND_TO_TASKER',
  'FINALIZE',
  /** Gỡ dấu "đã chốt" khi CHƯA chi trả, để soạn/chốt lại. */
  'WITHDRAW_DECISION',
  'COMPENSATE',
  'REVERSE',
  'RESPOND',
] as const;
export type DecisionAction = (typeof DECISION_ACTION)[number];

export const RESPONSIBILITY_PARTY = [
  'TASKER',
  'PLATFORM',
  'SHARED',
  'UNDETERMINED',
] as const;
export type ResponsibilityParty = (typeof RESPONSIBILITY_PARTY)[number];

export const DECISION_RESPONSE_TYPE = ['AGREE', 'DISAGREE'] as const;
export type DecisionResponseType = (typeof DECISION_RESPONSE_TYPE)[number];

/**
 * Kết quả review phản hồi Tasker — chỉ còn là DỮ LIỆU LỊCH SỬ trên các bản ghi cũ.
 * Luồng review riêng đã gỡ: sau khi đọc phản hồi, Admin hoặc chốt luôn, hoặc sửa quyết định.
 */
export const RESPONSE_REVIEW_RESULT = [
  'KEEP_DECISION',
  'REVISE_DECISION',
] as const;
export type ResponseReviewResult = (typeof RESPONSE_REVIEW_RESULT)[number];

export const DAMAGE_ITEM_STATUS = [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'NEED_MORE_EVIDENCE',
] as const;
export type DamageItemStatus = (typeof DAMAGE_ITEM_STATUS)[number];

// ─── Hằng số tiền (VND, số nguyên) ───────────────────────────────────────────
/** Trần cho TỔNG số tiền khách yêu cầu trong một sự cố (không phải từng hạng mục). */
export const CLAIM_MAX = 20_000_000;
/** Trần tổng approved (POLICY_CAP) — cảnh báo/validate khi quyết định. */
export const POLICY_CAP = 10_000_000;
