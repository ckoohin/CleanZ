/**
 * Incident — enum hợp đồng (single source of truth).
 *
 * Phản chiếu CHÍNH XÁC enum backend (`CleanZ/be/src/common/enums/incident-*`) và API spec
 * (override: severity server tự suy, upload chỉ IMAGE). Mọi module (customer/tasker/admin)
 * PHẢI import enum từ đây — không định nghĩa lại.
 */

export const INCIDENT_STATUS = [
  'REPORTED',
  'INVESTIGATING',
  'APPROVED',
  'REJECTED',
  'COMPENSATED',
  'CLOSED',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUS)[number];

export const COMPENSATION_STATUS = [
  'NONE',
  'PENDING',
  'PROCESSING',
  'RECORDED',
  'FAILED',
] as const;
export type CompensationStatus = (typeof COMPENSATION_STATUS)[number];

export const CLOSURE_REASON = [
  'COMPENSATED',
  'REJECTED',
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

export const DECISION = ['APPROVE', 'REJECT'] as const;
export type Decision = (typeof DECISION)[number];

// ─── Hằng số tiền (VND, số nguyên) ───────────────────────────────────────────
/** Trần claim cho 1 damage item. */
export const CLAIM_MAX = 20_000_000;
/** Trần tổng approved (POLICY_CAP) — cảnh báo/validate khi quyết định. */
export const POLICY_CAP = 10_000_000;
/** Claim ≥ ngưỡng ⇒ bắt buộc maker-checker (2 admin) + cooling. */
export const DUAL_APPROVAL_THRESHOLD = 2_000_000;
