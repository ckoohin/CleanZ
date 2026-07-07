/**
 * Incident — state machine 2 chiều + gate nghiệp vụ (mirror backend `incident-state.service`).
 *
 * Chiều A: IncidentStatus (vòng đời). Chiều B: CompensationStatus (dòng tiền).
 * Dùng để FE chặn trước & hiển thị lý do; BE là chốt chặn cuối (409/422).
 */
import type {
  CompensationStatus,
  IncidentStatus,
  IncidentDecisionStatus,
} from './incident.enums';

// ─── Chiều A — chuyển trạng thái hợp lệ ──────────────────────────────────────
export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['INVESTIGATING', 'CLOSED'], // accept | withdraw/close
  INVESTIGATING: ['APPROVED', 'REJECTED', 'CLOSED'], // decide | withdraw/close
  APPROVED: ['COMPENSATED'], // compensate (sau checker + cooling)
  REJECTED: ['CLOSED'],
  COMPENSATED: ['CLOSED'],
  CLOSED: [],
};

// ─── Customer ────────────────────────────────────────────────────────────────
/** Rút báo cáo chỉ khi REPORTED|INVESTIGATING và cọc CHƯA chuyển hold→deduct (comp=NONE). */
/**
 * BR29 — Customer tự rút (WITHDRAWN) chỉ khi REPORTED, hoặc INVESTIGATING với
 * decisionStatus ∈ {NONE, DRAFT} và compensationStatus=NONE. Sau khi quyết định đã
 * submit cho Tasker / chờ duyệt cấp 2 / final → BE trả 409 nên ẩn nút.
 */
export function canWithdraw(
  status: IncidentStatus,
  comp: CompensationStatus,
  decisionStatus?: IncidentDecisionStatus,
): boolean {
  if (comp !== 'NONE') return false;
  if (status === 'REPORTED') return true;
  if (status === 'INVESTIGATING') {
    return (
      decisionStatus === undefined ||
      decisionStatus === 'NONE' ||
      decisionStatus === 'DRAFT'
    );
  }
  return false;
}

// ─── Bất biến phân bổ tiền (dùng cho DecisionPanel + zod) ─────────────────────
export interface AllocationCheck {
  ok: boolean;
  reason?: string;
}
/** taskerBorne + platformBorne PHẢI bằng Σapproved (API spec §3.5). */
export function checkAllocation(
  sumApproved: number,
  taskerBorne: number,
  platformBorne: number,
): AllocationCheck {
  if (taskerBorne < 0 || platformBorne < 0)
    return { ok: false, reason: 'Số tiền không hợp lệ' };
  if (taskerBorne + platformBorne !== sumApproved)
    return {
      ok: false,
      reason: 'Tổng phân bổ (Tasker + Quỹ) phải bằng tổng được duyệt',
    };
  return { ok: true };
}
