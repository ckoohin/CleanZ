import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { getIncidentDecisionActionView } from './incident-decision.helpers';
import { IncidentDecisionStateInput } from './incident-decision-domain.types';

const NOW = new Date('2026-07-05T00:00:00.000Z');

function view(partial: Partial<IncidentDecisionStateInput>) {
  return getIncidentDecisionActionView(
    {
      status: IncidentStatus.REVIEWING,
      decisionVersion: 1,
      hasDecision: true,
      taskerBorneAmount: 0,
      sentTaskerBorneAmount: null,
      taskerResponseDeadline: null,
      ...partial,
    },
    NOW,
  );
}

describe('getIncidentDecisionActionView — cổng chốt quyết định', () => {
  it('REPORTED: chỉ tiếp nhận', () => {
    expect(view({ status: IncidentStatus.REPORTED }).allowedActions).toEqual([
      'ACCEPT',
    ]);
  });

  it('REVIEWING chưa soạn quyết định: chỉ lưu, chưa chốt được', () => {
    const { allowedActions, blockedReasons } = view({ hasDecision: false });
    expect(allowedActions).toEqual(['SAVE_DECISION']);
    expect(blockedReasons).toContain('DECISION_REQUIRED');
  });

  it('Tasker KHÔNG chịu tiền: chốt thẳng, không phải gửi phản biện', () => {
    const { allowedActions } = view({ taskerBorneAmount: 0 });
    expect(allowedActions).toContain('FINALIZE');
    expect(allowedActions).not.toContain('SEND_TO_TASKER');
  });

  it('Tasker CHỊU tiền: bắt buộc gửi phản biện trước, chưa chốt được', () => {
    const { allowedActions, blockedReasons } = view({
      taskerBorneAmount: 500_000,
    });
    expect(allowedActions).toContain('SEND_TO_TASKER');
    expect(allowedActions).not.toContain('FINALIZE');
    expect(blockedReasons).toContain('TASKER_RESPONSE_REQUIRED');
  });

  it('Đang trong hạn phản biện, Tasker chưa trả lời: chưa chốt được', () => {
    const { allowedActions, blockedReasons } = view({
      status: IncidentStatus.AWAITING_RESPONSE,
      taskerBorneAmount: 500_000,
      sentTaskerBorneAmount: 500_000,
      taskerResponseDeadline: new Date(NOW.getTime() + 3_600_000),
    });
    expect(allowedActions).toContain('RESPOND');
    expect(allowedActions).not.toContain('FINALIZE');
    expect(blockedReasons).toContain('WAITING_FOR_TASKER_RESPONSE');
  });

  it('Tasker đã phản hồi: chốt được ngay, không phải chờ hết hạn', () => {
    const { allowedActions } = view({
      status: IncidentStatus.AWAITING_RESPONSE,
      taskerBorneAmount: 500_000,
      sentTaskerBorneAmount: 500_000,
      taskerResponseDeadline: new Date(NOW.getTime() + 3_600_000),
      hasTaskerResponse: true,
    });
    expect(allowedActions).toContain('FINALIZE');
  });

  it('Hết hạn mà Tasker im lặng: chốt được (không còn bước gia hạn bắt buộc)', () => {
    const { allowedActions, blockedReasons } = view({
      status: IncidentStatus.AWAITING_RESPONSE,
      taskerBorneAmount: 500_000,
      sentTaskerBorneAmount: 500_000,
      taskerResponseDeadline: new Date(NOW.getTime() - 3_600_000),
    });
    expect(allowedActions).toContain('FINALIZE');
    expect(blockedReasons).toContain('TASKER_RESPONSE_WINDOW_EXPIRED');
  });

  it('Admin TĂNG phần Tasker chịu sau khi gửi: phải gửi lại, chưa chốt được', () => {
    const { allowedActions, blockedReasons } = view({
      status: IncidentStatus.AWAITING_RESPONSE,
      taskerBorneAmount: 900_000,
      sentTaskerBorneAmount: 500_000,
      taskerResponseDeadline: new Date(NOW.getTime() - 3_600_000),
      hasTaskerResponse: true,
    });
    expect(allowedActions).toContain('SEND_TO_TASKER');
    expect(allowedActions).not.toContain('FINALIZE');
    expect(blockedReasons).toContain('TASKER_RESPONSE_REQUIRED');
  });

  it('Admin GIẢM phần Tasker chịu sau phản hồi: chốt được ngay, không bắt gửi lại', () => {
    const { allowedActions } = view({
      status: IncidentStatus.AWAITING_RESPONSE,
      taskerBorneAmount: 200_000,
      sentTaskerBorneAmount: 500_000,
      taskerResponseDeadline: new Date(NOW.getTime() - 3_600_000),
      hasTaskerResponse: true,
    });
    expect(allowedActions).toContain('FINALIZE');
    expect(allowedActions).not.toContain('SEND_TO_TASKER');
  });

  /**
   * Chưa đồng nào rời ví nên vẫn còn đường lui rẻ. Không có `WITHDRAW_DECISION` thì chốt
   * nhầm chỉ còn cách chi tiền sai đi rồi mới đảo lại được.
   */
  it('AWAITING_PAYOUT: chi trả, hoặc thu hồi quyết định để soạn lại', () => {
    expect(
      view({ status: IncidentStatus.AWAITING_PAYOUT }).allowedActions,
    ).toEqual(['COMPENSATE', 'WITHDRAW_DECISION']);
  });

  it('COMPENSATED: chỉ còn đảo bồi thường', () => {
    expect(view({ status: IncidentStatus.COMPENSATED }).allowedActions).toEqual(
      ['REVERSE'],
    );
  });

  /**
   * Cổng từng bật `REVERSE` cho MỌI hồ sơ đã chi, kể cả ba trường hợp `reverse()` chắc chắn
   * từ chối — Admin gõ xong lý do, bấm, rồi mới ăn 409. Cả ba đều biết được lúc dựng view.
   */
  describe('COMPENSATED: không hứa đảo được khi chắc chắn sẽ bị từ chối', () => {
    /** Mốc chi trả tính LÙI từ `NOW` mà cổng đang dùng, không phải giờ hệ thống. */
    const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

    it('quá cửa sổ 72h → chặn, kèm lý do', () => {
      const out = view({
        status: IncidentStatus.COMPENSATED,
        resolvedAt: hoursAgo(73),
      });
      expect(out.allowedActions).not.toContain('REVERSE');
      expect(out.blockedReasons).toContain('REVERSAL_WINDOW_EXPIRED');
    });

    it('còn trong 72h → vẫn đảo được', () => {
      expect(
        view({ status: IncidentStatus.COMPENSATED, resolvedAt: hoursAgo(71) })
          .allowedActions,
      ).toContain('REVERSE');
    });

    it('đã chi thủ công (chuyển khoản ngoài) → không có bút toán để đảo', () => {
      const out = view({
        status: IncidentStatus.COMPENSATED,
        resolvedAt: hoursAgo(1),
        paidExternally: true,
      });
      expect(out.allowedActions).not.toContain('REVERSE');
      expect(out.blockedReasons).toContain('REVERSAL_MANUAL_PAYOUT');
    });

    it('đã bắt đầu thu hồi nợ → đảo tự động sẽ làm lệch sổ', () => {
      const out = view({
        status: IncidentStatus.COMPENSATED,
        resolvedAt: hoursAgo(1),
        debtRecoveryStarted: true,
      });
      expect(out.allowedActions).not.toContain('REVERSE');
      expect(out.blockedReasons).toContain('REVERSAL_DEBT_RECOVERY_STARTED');
    });

    it('nhiều lý do cùng lúc thì nêu đủ, không chỉ cái đầu tiên', () => {
      const out = view({
        status: IncidentStatus.COMPENSATED,
        resolvedAt: hoursAgo(100),
        paidExternally: true,
        debtRecoveryStarted: true,
      });
      expect(out.blockedReasons).toEqual([
        'REVERSAL_WINDOW_EXPIRED',
        'REVERSAL_DEBT_RECOVERY_STARTED',
        'REVERSAL_MANUAL_PAYOUT',
      ]);
    });
  });

  it('CLOSED / REJECTED: không còn hành động nào', () => {
    expect(view({ status: IncidentStatus.CLOSED }).allowedActions).toEqual([]);
    expect(view({ status: IncidentStatus.REJECTED }).allowedActions).toEqual(
      [],
    );
  });
});
