import { IncidentStatus } from 'src/common/enums/incident-status.enum';

/** Hành động khả dụng trên một sự cố. Bốn hành động của Admin + một của Tasker. */
export type IncidentDecisionAction =
  | 'ACCEPT'
  | 'SAVE_DECISION'
  | 'SEND_TO_TASKER'
  | 'FINALIZE'
  /** Gỡ dấu "đã chốt" khi chưa chi trả, để soạn/chốt lại. */
  | 'WITHDRAW_DECISION'
  | 'COMPENSATE'
  | 'REVERSE'
  | 'RESPOND';

export interface IncidentDecisionStateInput {
  status: IncidentStatus;
  decisionVersion: number;
  /** Đã soạn quyết định nào chưa (`decisionOutcome != null`). */
  hasDecision?: boolean;
  /** Phần Tasker phải chịu ở bản quyết định hiện tại. > 0 ⟹ bắt buộc cho phản biện. */
  taskerBorneAmount?: number;
  /** Mốc `taskerBorne` của bản ĐÃ GỬI Tasker. Bản hiện tại lớn hơn ⟹ phải gửi lại. */
  sentTaskerBorneAmount?: number | null;
  taskerResponseDeadline?: Date | null;
  /** Tasker đã phản hồi ở version hiện tại chưa. */
  hasTaskerResponse?: boolean;

  // ── Điều kiện đảo bồi thường (chỉ có nghĩa khi đã COMPENSATED) ──────────────
  /** Thời điểm chi trả — mốc tính cửa sổ đảo. */
  resolvedAt?: Date | null;
  /** Đã chi bằng chuyển khoản ngoài ví ⟹ không có bút toán để đảo tự động. */
  paidExternally?: boolean;
  /** Đã thu hồi được một phần nợ ⟹ đảo tự động sẽ làm lệch sổ. */
  debtRecoveryStarted?: boolean;
}

/** Cửa sổ cho phép đảo bồi thường đã chi (giờ) — dùng chung giữa cổng và bộ thực thi. */
export const REVERSAL_WINDOW_HOURS = 72;

export interface IncidentDecisionActionView {
  allowedActions: IncidentDecisionAction[];
  blockedReasons: string[];
}
