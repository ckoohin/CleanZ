import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import {
  IncidentDecisionAction,
  IncidentDecisionActionView,
  IncidentDecisionStateInput,
  REVERSAL_WINDOW_HOURS,
} from './incident-decision-domain.types';

export function isExpectedDecisionVersion(
  currentVersion: number,
  expectedVersion: number,
): boolean {
  return currentVersion === expectedVersion;
}

/** Cửa sổ phản biện đã đóng chưa — SUY RA từ deadline, không lưu trạng thái riêng. */
export function isResponseWindowExpired(
  state: Pick<IncidentDecisionStateInput, 'status' | 'taskerResponseDeadline'>,
  now: Date,
): boolean {
  return (
    state.status === IncidentStatus.AWAITING_RESPONSE &&
    state.taskerResponseDeadline != null &&
    state.taskerResponseDeadline.getTime() <= now.getTime()
  );
}

/**
 * Vì sao hồ sơ đã chi KHÔNG đảo tự động được. Rỗng = đảo được.
 *
 * Giữ đúng thứ tự kiểm của `CompensationExecutorService.reverse()` để lý do hiển thị trùng
 * với lý do thật sự chặn ở BE — hai bên lệch nhau còn tệ hơn không giải thích gì.
 */
function reversalBlockers(
  state: IncidentDecisionStateInput,
  now: Date,
): string[] {
  const blockers: string[] = [];
  const paidAt = state.resolvedAt?.getTime();
  if (
    paidAt != null &&
    now.getTime() - paidAt > REVERSAL_WINDOW_HOURS * 3_600_000
  ) {
    blockers.push('REVERSAL_WINDOW_EXPIRED');
  }
  if (state.debtRecoveryStarted)
    blockers.push('REVERSAL_DEBT_RECOVERY_STARTED');
  if (state.paidExternally) blockers.push('REVERSAL_MANUAL_PAYOUT');
  return blockers;
}

/**
 * Hành động khả dụng + lý do bị chặn, mirror sang FE để chặn trước và giải thích.
 *
 * Quy tắc due process duy nhất: `taskerBorne > 0` ⟹ phải gửi Tasker và chờ (Tasker phản
 * hồi HOẶC hết hạn) mới được chốt. `taskerBorne = 0` ⟹ chốt thẳng.
 */
export function getIncidentDecisionActionView(
  state: IncidentDecisionStateInput,
  now: Date,
): IncidentDecisionActionView {
  const allowedActions: IncidentDecisionAction[] = [];
  const blockedReasons: string[] = [];

  const taskerBorne = state.taskerBorneAmount ?? 0;
  const needsResponse = taskerBorne > 0;

  switch (state.status) {
    case IncidentStatus.REPORTED:
      allowedActions.push('ACCEPT');
      break;

    case IncidentStatus.REVIEWING:
      allowedActions.push('SAVE_DECISION');
      if (!state.hasDecision) {
        blockedReasons.push('DECISION_REQUIRED');
        break;
      }
      if (needsResponse) {
        // Bắt Tasker chịu tiền thì phải cho phản biện trước khi chốt.
        allowedActions.push('SEND_TO_TASKER');
        blockedReasons.push('TASKER_RESPONSE_REQUIRED');
      } else {
        allowedActions.push('FINALIZE');
      }
      break;

    case IncidentStatus.AWAITING_RESPONSE: {
      allowedActions.push('SAVE_DECISION', 'RESPOND');
      // Admin sửa làm TĂNG phần Tasker chịu so với bản đã gửi → phải gửi lại.
      if (taskerBorne > (state.sentTaskerBorneAmount ?? 0)) {
        allowedActions.push('SEND_TO_TASKER');
        blockedReasons.push('TASKER_RESPONSE_REQUIRED');
        break;
      }
      if (state.hasTaskerResponse) {
        allowedActions.push('FINALIZE');
      } else if (isResponseWindowExpired(state, now)) {
        allowedActions.push('FINALIZE');
        blockedReasons.push('TASKER_RESPONSE_WINDOW_EXPIRED');
      } else {
        blockedReasons.push('WAITING_FOR_TASKER_RESPONSE');
      }
      break;
    }

    case IncidentStatus.AWAITING_PAYOUT:
      // Chưa đồng nào rời ví nên vẫn còn đường lui rẻ: thu hồi quyết định để soạn lại,
      // thay vì phải chi tiền sai đi rồi mới đảo.
      allowedActions.push('COMPENSATE', 'WITHDRAW_DECISION');
      break;

    case IncidentStatus.COMPENSATED: {
      // Ba điều kiện khiến `reverse()` chắc chắn từ chối, và cả ba đều BIẾT ĐƯỢC ngay lúc
      // dựng view. Trước đây vẫn bật nút cho mọi hồ sơ đã chi, nên Admin gõ xong lý do,
      // bấm, rồi mới ăn 409 — trong khi hệ thống thừa dữ liệu để nói trước.
      const blockers = reversalBlockers(state, now);
      if (blockers.length === 0) allowedActions.push('REVERSE');
      else blockedReasons.push(...blockers);
      break;
    }

    case IncidentStatus.REJECTED:
    case IncidentStatus.CLOSED:
      break;
  }

  return { allowedActions, blockedReasons };
}
