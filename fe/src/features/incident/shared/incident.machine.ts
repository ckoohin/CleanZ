/**
 * Incident — state machine MỘT trục (mirror backend `incident-state.service.ts`).
 *
 * FE chỉ chặn trước & giải thích; BE là chốt chặn cuối (409/422). Các hành động khả dụng
 * KHÔNG suy ra ở đây — chúng đến từ `decision.allowedActions` do BE tính, để hai bên
 * không thể lệch nhau.
 */
import type { IncidentStatus } from './incident.enums';

export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['REVIEWING', 'CLOSED'],
  REVIEWING: ['AWAITING_RESPONSE', 'AWAITING_PAYOUT', 'REJECTED', 'CLOSED'],
  AWAITING_RESPONSE: ['REVIEWING', 'AWAITING_PAYOUT', 'REJECTED', 'CLOSED'],
  AWAITING_PAYOUT: ['COMPENSATED', 'REVIEWING'],
  COMPENSATED: ['CLOSED', 'REVIEWING'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};

/**
 * Khách tự rút báo cáo: chỉ khi quyết định CHƯA được gửi cho Tasker và chưa chốt.
 * Một điều kiện duy nhất thay cho bộ ba status/decisionStatus/compensationStatus cũ.
 */
export function canWithdraw(status: IncidentStatus): boolean {
  return status === 'REPORTED' || status === 'REVIEWING';
}

// ─── Bất biến phân bổ tiền (dùng cho DecisionPanel) ──────────────────────────
export interface AllocationCheck {
  ok: boolean;
  reason?: string;
}

/** taskerBorne + platformBorne PHẢI bằng Σ approved. */
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

/**
 * Quy tắc due process DUY NHẤT (mirror `assertDueProcessSatisfied` ở BE):
 * bắt Tasker chịu tiền ⟹ phải cho họ phản biện trước khi chốt.
 */
export function requiresTaskerResponse(taskerBorne: number): boolean {
  return taskerBorne > 0;
}
