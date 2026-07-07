import { IncidentDecisionStatus } from 'src/common/enums/incident-decision-status.enum';
import { IncidentResponseWindowStatus } from 'src/common/enums/incident-response-window-status.enum';
import { getIncidentDecisionActionView } from './incident-decision.helpers';
import { IncidentDecisionStateInput } from './incident-decision-domain.types';

const NOW = new Date('2026-07-05T00:00:00.000Z');

function view(partial: Partial<IncidentDecisionStateInput>) {
  return getIncidentDecisionActionView(
    {
      decisionStatus: IncidentDecisionStatus.DRAFT,
      decisionVersion: 1,
      responseWindowStatus: IncidentResponseWindowStatus.NONE,
      taskerResponseDeadline: null,
      ...partial,
    },
    NOW,
  );
}

describe('getIncidentDecisionActionView — gating FINALIZE/SUBMIT', () => {
  it('NONE: chỉ SAVE_DRAFT + SUBMIT_DRAFT, chưa FINALIZE', () => {
    const { allowedActions } = view({
      decisionStatus: IncidentDecisionStatus.NONE,
    });
    expect(allowedActions).toEqual(['SAVE_DRAFT', 'SUBMIT_DRAFT']);
    expect(allowedActions).not.toContain('FINALIZE');
  });

  it('DRAFT bất lợi: SUBMIT_DRAFT, KHÔNG có FINALIZE (phải gửi Tasker trước)', () => {
    const { allowedActions } = view({
      decisionStatus: IncidentDecisionStatus.DRAFT,
      isAdverseDraft: true,
    });
    expect(allowedActions).toContain('SUBMIT_DRAFT');
    expect(allowedActions).not.toContain('FINALIZE');
  });

  it('DRAFT không bất lợi (từ chối / nền tảng chịu): có FINALIZE', () => {
    const { allowedActions } = view({
      decisionStatus: IncidentDecisionStatus.DRAFT,
      isAdverseDraft: false,
    });
    expect(allowedActions).toContain('FINALIZE');
  });

  it('PENDING_TASKER_RESPONSE + REVIEWED (đã review Giữ nguyên): có FINALIZE, không RESPOND', () => {
    const { allowedActions } = view({
      decisionStatus: IncidentDecisionStatus.PENDING_TASKER_RESPONSE,
      responseWindowStatus: IncidentResponseWindowStatus.REVIEWED,
    });
    expect(allowedActions).toContain('FINALIZE');
    expect(allowedActions).toContain('REVISE_DECISION');
    expect(allowedActions).not.toContain('RESPOND');
  });

  it('PENDING_TASKER_RESPONSE + OPEN chưa quá hạn: RESPOND, chưa FINALIZE', () => {
    const { allowedActions } = view({
      decisionStatus: IncidentDecisionStatus.PENDING_TASKER_RESPONSE,
      responseWindowStatus: IncidentResponseWindowStatus.OPEN,
      taskerResponseDeadline: new Date(NOW.getTime() + 3_600_000),
    });
    expect(allowedActions).toContain('RESPOND');
    expect(allowedActions).not.toContain('FINALIZE');
  });

  it('C6: PENDING_TASKER_RESPONSE quá hạn, bất lợi, CHƯA gia hạn → EXTEND_RESPONSE (chưa FINALIZE)', () => {
    const { allowedActions, blockedReasons } = view({
      decisionStatus: IncidentDecisionStatus.PENDING_TASKER_RESPONSE,
      responseWindowStatus: IncidentResponseWindowStatus.OPEN,
      taskerResponseDeadline: new Date(NOW.getTime() - 3_600_000),
      isAdverseDraft: true,
      taskerResponseExtended: false,
    });
    expect(allowedActions).toContain('EXTEND_RESPONSE');
    expect(allowedActions).not.toContain('FINALIZE');
    expect(blockedReasons).toContain('TASKER_RESPONSE_EXTENSION_REQUIRED');
  });

  it('C6: PENDING_TASKER_RESPONSE quá hạn, bất lợi, ĐÃ gia hạn → có FINALIZE', () => {
    const { allowedActions, blockedReasons } = view({
      decisionStatus: IncidentDecisionStatus.PENDING_TASKER_RESPONSE,
      responseWindowStatus: IncidentResponseWindowStatus.OPEN,
      taskerResponseDeadline: new Date(NOW.getTime() - 3_600_000),
      isAdverseDraft: true,
      taskerResponseExtended: true,
    });
    expect(allowedActions).toContain('FINALIZE');
    expect(allowedActions).not.toContain('EXTEND_RESPONSE');
    expect(blockedReasons).toContain('TASKER_RESPONSE_WINDOW_EXPIRED');
  });

  it('FINAL: chỉ COMPENSATE', () => {
    const { allowedActions } = view({
      decisionStatus: IncidentDecisionStatus.FINAL,
    });
    expect(allowedActions).toEqual(['COMPENSATE']);
  });
});
