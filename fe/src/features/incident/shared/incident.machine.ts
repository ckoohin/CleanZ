/**
 * Incident — state machine 2 chiều + gate nghiệp vụ (mirror backend `incident-state.service`).
 *
 * Chiều A: IncidentStatus (vòng đời). Chiều B: CompensationStatus (dòng tiền).
 * Dùng để FE chặn trước & hiển thị lý do; BE là chốt chặn cuối (409/422).
 */
import {
  DUAL_APPROVAL_THRESHOLD,
  type CompensationStatus,
  type IncidentStatus,
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
export function canWithdraw(
  status: IncidentStatus,
  comp: CompensationStatus,
): boolean {
  return (
    (status === 'REPORTED' || status === 'INVESTIGATING') && comp === 'NONE'
  );
}

// ─── Cooling ─────────────────────────────────────────────────────────────────
export function coolingPassed(coolingUntil: string | null | undefined): boolean {
  if (!coolingUntil) return true;
  return new Date(coolingUntil).getTime() <= Date.now();
}

// ─── Admin — gate hành động theo (status, comp, claim, cooling) ───────────────
export interface IncidentActionGate {
  canAccept: boolean;
  canVerify: boolean;
  canDecide: boolean;
  canApproveCompensation: boolean;
  canCompensate: boolean;
  /** Lý do chặn compensate (nếu có) để hiển thị. */
  compensateReason?: string;
  /** Claim ≥ ngưỡng ⇒ cần maker-checker. */
  needsDualApproval: boolean;
}

export function adminActions(i: {
  status: IncidentStatus;
  compensationStatus: CompensationStatus;
  claimedAmount: number | null;
  coolingUntil: string | null;
}): IncidentActionGate {
  const claim = i.claimedAmount ?? 0;
  const needsDualApproval = claim >= DUAL_APPROVAL_THRESHOLD;
  const cooled = coolingPassed(i.coolingUntil);

  let compensateReason: string | undefined;
  const compEligibleStatus =
    i.status === 'APPROVED' &&
    (i.compensationStatus === 'PENDING' || i.compensationStatus === 'FAILED');
  if (!compEligibleStatus)
    compensateReason = 'Chỉ bồi thường khi đã duyệt và đang chờ/thất bại';
  else if (!cooled) compensateReason = 'Chưa tới hạn cooling';

  return {
    canAccept: i.status === 'REPORTED',
    canVerify: i.status === 'INVESTIGATING',
    canDecide: i.status === 'INVESTIGATING',
    canApproveCompensation:
      i.status === 'APPROVED' &&
      i.compensationStatus === 'PENDING' &&
      needsDualApproval,
    canCompensate: compEligibleStatus && cooled,
    compensateReason,
    needsDualApproval,
  };
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
