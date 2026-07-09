import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { IncidentResponseWindowStatus } from 'src/common/enums/incident-response-window-status.enum';
import {
  IncidentDecisionAction,
  IncidentDecisionActionView,
  IncidentDecisionStateInput,
} from './incident-decision-domain.types';

export function isExpectedDecisionVersion(
  currentVersion: number,
  expectedVersion: number,
): boolean {
  return currentVersion === expectedVersion;
}

export function isResponseWindowExpired(
  state: Pick<
    IncidentDecisionStateInput,
    'responseWindowStatus' | 'taskerResponseDeadline'
  >,
  now: Date,
): boolean {
  return (
    state.responseWindowStatus === IncidentResponseWindowStatus.OPEN &&
    state.taskerResponseDeadline != null &&
    state.taskerResponseDeadline.getTime() <= now.getTime()
  );
}

export function getIncidentDecisionActionView(
  state: IncidentDecisionStateInput,
  now: Date,
): IncidentDecisionActionView {
  const allowedActions: IncidentDecisionAction[] = [];
  const blockedReasons: string[] = [];

  switch (state.decisionStatus) {
    case IncidentDecisionStatus.NONE:
      allowedActions.push('SAVE_DRAFT', 'SUBMIT_DRAFT');
      break;
    case IncidentDecisionStatus.DRAFT:
      allowedActions.push('SAVE_DRAFT');
      if (state.isAdverseDraft) {
        // Draft bất lợi: phải gửi Tasker phản hồi trước khi finalize.
        allowedActions.push('SUBMIT_DRAFT');
      } else {
        // Draft không bất lợi (từ chối / nền tảng chịu): finalize thẳng.
        allowedActions.push('SUBMIT_DRAFT', 'FINALIZE');
      }
      break;
    case IncidentDecisionStatus.PENDING_TASKER_RESPONSE:
      allowedActions.push('REVISE_DECISION');
      if (
        state.responseWindowStatus === IncidentResponseWindowStatus.REVIEWED
      ) {
        // Admin đã review phản hồi Tasker → sẵn sàng chốt.
        allowedActions.push('FINALIZE');
      } else if (isResponseWindowExpired(state, now)) {
        if (state.isAdverseDraft && !state.taskerResponseExtended) {
          // C6 — Hết hạn lần đầu với draft bất lợi mà Tasker chưa phản hồi:
          // BẮT BUỘC gia hạn + nhắc Tasker (công bằng) trước khi được chốt.
          allowedActions.push('EXTEND_RESPONSE');
          blockedReasons.push('TASKER_RESPONSE_EXTENSION_REQUIRED');
        } else {
          // Đã gia hạn (hoặc không bất lợi) mà vẫn hết hạn → cho finalize.
          allowedActions.push('FINALIZE');
          blockedReasons.push('TASKER_RESPONSE_WINDOW_EXPIRED');
        }
      } else {
        allowedActions.push('RESPOND');
        blockedReasons.push('WAITING_FOR_TASKER_RESPONSE');
      }
      break;
    case IncidentDecisionStatus.PENDING_ADMIN_APPROVAL:
      allowedActions.push('REVIEW_RESPONSE', 'REVISE_DECISION');
      if (state.hasUnreviewedResponse) {
        blockedReasons.push('TASKER_RESPONSE_NOT_REVIEWED');
      } else if (state.requiresSecondApproval) {
        allowedActions.push('SECOND_APPROVE', 'REQUEST_CHANGES');
      } else {
        allowedActions.push('FINALIZE');
      }
      break;
    case IncidentDecisionStatus.FINAL:
      allowedActions.push('COMPENSATE');
      break;
  }

  return { allowedActions, blockedReasons };
}
