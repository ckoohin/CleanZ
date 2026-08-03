import { ConflictException } from '@nestjs/common';
import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentStateService } from './incident-state.service';

describe('IncidentStateService — một trục trạng thái', () => {
  const service = new IncidentStateService();

  const ok = (from: IncidentStatus, to: IncidentStatus) =>
    expect(() => service.assertStatusTransition(from, to)).not.toThrow();
  const blocked = (from: IncidentStatus, to: IncidentStatus) =>
    expect(() => service.assertStatusTransition(from, to)).toThrow(
      ConflictException,
    );

  it('REPORTED → REVIEWING (tiếp nhận) hợp lệ', () => {
    ok(IncidentStatus.REPORTED, IncidentStatus.REVIEWING);
  });

  it('REPORTED không nhảy thẳng sang chờ chi trả', () => {
    blocked(IncidentStatus.REPORTED, IncidentStatus.AWAITING_PAYOUT);
  });

  it('REVIEWING → gửi Tasker / chốt / bác bỏ / đóng đều hợp lệ', () => {
    for (const to of [
      IncidentStatus.AWAITING_RESPONSE,
      IncidentStatus.AWAITING_PAYOUT,
      IncidentStatus.REJECTED,
      IncidentStatus.CLOSED,
    ]) {
      ok(IncidentStatus.REVIEWING, to);
    }
  });

  it('AWAITING_RESPONSE → REVIEWING (admin sửa lại quyết định) hợp lệ', () => {
    ok(IncidentStatus.AWAITING_RESPONSE, IncidentStatus.REVIEWING);
  });

  it('AWAITING_PAYOUT chỉ đi tới COMPENSATED hoặc quay về REVIEWING', () => {
    ok(IncidentStatus.AWAITING_PAYOUT, IncidentStatus.COMPENSATED);
    ok(IncidentStatus.AWAITING_PAYOUT, IncidentStatus.REVIEWING);
    blocked(IncidentStatus.AWAITING_PAYOUT, IncidentStatus.REJECTED);
  });

  it('COMPENSATED → REVIEWING hợp lệ — đảo bồi thường được KHAI BÁO trong bảng, không bypass', () => {
    ok(IncidentStatus.COMPENSATED, IncidentStatus.REVIEWING);
  });

  it('CLOSED là terminal', () => {
    for (const to of Object.values(IncidentStatus)) {
      if (to === IncidentStatus.CLOSED) continue;
      blocked(IncidentStatus.CLOSED, to);
    }
  });

  it('chuyển sang chính nó là no-op, không ném', () => {
    ok(IncidentStatus.REVIEWING, IncidentStatus.REVIEWING);
  });
});
