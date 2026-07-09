import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { IncidentResponseWindowStatus } from 'src/common/enums/incident-response-window-status.enum';

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

export interface IncidentDecisionStateInput {
  decisionStatus: IncidentDecisionStatus;
  decisionVersion: number;
  responseWindowStatus: IncidentResponseWindowStatus;
  taskerResponseDeadline?: Date | null;
  hasUnreviewedResponse?: boolean;
  requiresSecondApproval?: boolean;
  /**
   * Draft có bất lợi cho Tasker không (taskerBorne > 0 hoặc trách nhiệm
   * TASKER/SHARED). Draft KHÔNG bất lợi (từ chối / nền tảng chịu) được finalize
   * thẳng từ DRAFT; draft bất lợi phải gửi Tasker phản hồi trước.
   */
  isAdverseDraft?: boolean;
  /**
   * C6 — Đã cấp lần gia hạn bắt buộc cho Tasker phản hồi chưa. Khi window bất lợi
   * hết hạn lần đầu và CHƯA gia hạn → phải EXTEND_RESPONSE (nhắc Tasker) trước, chưa
   * cho FINALIZE. Sau khi đã gia hạn mà vẫn hết hạn → cho FINALIZE.
   */
  taskerResponseExtended?: boolean;
}

export interface IncidentDecisionActionView {
  allowedActions: IncidentDecisionAction[];
  blockedReasons: string[];
}
