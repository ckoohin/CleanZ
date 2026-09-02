import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentEntity } from '../entity/incident.entity';
import { toTaskerView } from './incident-response.dto';

/**
 * Hai bất biến đối nghịch nhau, nên phải test cùng chỗ:
 *
 *  1. Tasker PHẢI đọc được căn cứ quyết định trước khi phản biện — quy trình due process
 *     của `IncidentDecisionService` dựng trên đúng giả định đó.
 *  2. Nhưng chỉ TỪ LÚC ĐÃ GỬI. Bản nháp Admin đang soạn (REVIEWING) mà lộ ra thì Tasker
 *     đọc được con số chưa chốt và phản ứng với một quyết định chưa tồn tại.
 */
function makeIncident(over: Partial<IncidentEntity> = {}): IncidentEntity {
  return {
    id: 'inc-1',
    incidentCode: 'INC-1',
    title: 'Vỡ bình hoa',
    description: 'mô tả',
    type: 'PROPERTY_DAMAGE',
    source: 'CUSTOMER_REPORT',
    severity: 'MAJOR',
    status: IncidentStatus.AWAITING_RESPONSE,
    decisionVersion: 3,
    decisionOutcome: 'COMPENSATE',
    claimedAmount: 2_000_000,
    approvedCompensationAmount: 1_500_000,
    taskerBorneAmount: 900_000,
    platformBorneAmount: 600_000,
    responsibilityParty: IncidentResponsibilityParty.SHARED,
    responsibilityReason: 'Tasker bất cẩn, nhưng kệ đồ cũng không chắc chắn',
    allocationReason: 'Chia 60/40 theo mức độ lỗi',
    taskerDecisionReason: 'Bạn làm rơi bình khi di chuyển kệ',
    internalDecisionNote: 'GHI CHÚ NỘI BỘ KHÔNG ĐƯỢC LỘ',
    reportedAt: new Date('2026-07-01T08:00:00Z'),
    updatedAt: new Date('2026-07-02T08:00:00Z'),
    ...over,
  } as unknown as IncidentEntity;
}

describe('toTaskerView — căn cứ quyết định', () => {
  it('trả đủ căn cứ khi quyết định ĐÃ gửi cho Tasker', () => {
    const view = toTaskerView(makeIncident(), [], new Map(), [], false);

    expect(view.decision).toEqual(
      expect.objectContaining({
        version: 3,
        outcome: 'COMPENSATE',
        reasonForTasker: 'Bạn làm rơi bình khi di chuyển kệ',
        responsibilityParty: IncidentResponsibilityParty.SHARED,
        responsibilityReason:
          'Tasker bất cẩn, nhưng kệ đồ cũng không chắc chắn',
        allocationReason: 'Chia 60/40 theo mức độ lỗi',
        approvedAmount: 1_500_000,
      }),
    );
    expect(view.myBorneAmount).toBe(900_000);
  });

  it('KHÔNG lộ bản nháp khi Admin còn đang thẩm định', () => {
    const view = toTaskerView(
      makeIncident({ status: IncidentStatus.REVIEWING }),
      [],
      new Map(),
      [],
      false,
    );

    expect(view.decision).toBeNull();
    expect(view.myBorneAmount).toBeNull();
  });

  it('không bao giờ mang ghi chú nội bộ của Admin sang phía Tasker', () => {
    const view = toTaskerView(makeIncident(), [], new Map(), [], false);

    expect(JSON.stringify(view)).not.toContain('GHI CHÚ NỘI BỘ');
  });

  it('hồ sơ đóng mà CHƯA từng có quyết định thì không dựng thẻ kết luận rỗng', () => {
    // Khách tự rút → CLOSED, `decisionVersion = 0`, chưa ai soạn gì. `CLOSED` nằm trong
    // danh sách "đã externalize" nên nếu chỉ gác bằng trạng thái, màn hình Tasker sẽ hiện
    // "CleanZ kết luận" với 0đ/0đ và không dòng căn cứ nào — khẳng định một điều không có.
    const view = toTaskerView(
      makeIncident({
        status: IncidentStatus.CLOSED,
        decisionOutcome: null,
        decisionVersion: 0,
        approvedCompensationAmount: null,
        taskerBorneAmount: null,
        responsibilityParty: null,
        taskerDecisionReason: null,
      }),
      [],
      new Map(),
      [],
      false,
    );

    expect(view.decision).toBeNull();
  });

  it('nợ còn lại hiện cả khi hồ sơ đã đóng — ví vẫn đang bị chặn vì khoản đó', () => {
    const view = toTaskerView(
      makeIncident({ status: IncidentStatus.CLOSED }),
      [],
      new Map(),
      [],
      false,
      250_000,
    );

    expect(view.myOutstandingDebt).toBe(250_000);
  });
});
