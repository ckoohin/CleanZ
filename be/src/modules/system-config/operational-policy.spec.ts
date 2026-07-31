import {
  DEFAULT_TASKER_CANCELLATION_POLICY,
  calculateTaskerCancelPenalty,
  normalizeCheckinOperationPolicy,
  normalizeCustomerSchedulingPolicy,
  normalizeTaskerCancelPenaltyRules,
  parseTaskerCancellationPolicy,
} from './operational-policy';

describe('operational policy', () => {
  const scheduledStart = new Date('2026-08-02T10:00:00+07:00');
  const previewAt = (now: string) =>
    calculateTaskerCancelPenalty({
      policy: DEFAULT_TASKER_CANCELLATION_POLICY,
      scheduledStart,
      totalPrice: 1_000_000,
      now: new Date(now),
    });

  it.each([
    ['đúng 24 giờ', '2026-08-01T10:00:00+07:00', 0, 0],
    ['đúng 8 giờ', '2026-08-02T02:00:00+07:00', 50, 500_000],
    ['7 giờ 59 phút', '2026-08-02T02:01:00+07:00', 100, 1_000_000],
  ])('tính phí hủy tại biên %s', (_label, now, percent, amount) => {
    const result = previewAt(now);
    expect(result.penaltyPercent).toBe(percent);
    expect(result.amount).toBe(amount);
  });

  it('yêu cầu mốc 0 giờ và không cho mốc trùng', () => {
    expect(() =>
      normalizeTaskerCancelPenaltyRules([
        { hoursBeforeStart: 24, penaltyPercent: 0 },
      ]),
    ).toThrow('mốc 0 giờ');
    expect(() =>
      normalizeTaskerCancelPenaltyRules([
        { hoursBeforeStart: 0, penaltyPercent: 50 },
        { hoursBeforeStart: 0, penaltyPercent: 100 },
      ]),
    ).toThrow('không được trùng');
  });

  it('không cho mức phạt giảm khi gần giờ làm', () => {
    expect(() =>
      normalizeTaskerCancelPenaltyRules([
        { hoursBeforeStart: 24, penaltyPercent: 50 },
        { hoursBeforeStart: 0, penaltyPercent: 0 },
      ]),
    ).toThrow('không được giảm');
  });

  it('fallback về mặc định khi JSON trong DB hỏng', () => {
    expect(parseTaskerCancellationPolicy('{not-json')).toEqual(
      DEFAULT_TASKER_CANCELLATION_POLICY,
    );
  });

  it('giữ policy schema cũ thay vì âm thầm fallback về mặc định', () => {
    const updatedAt = new Date('2026-07-31T05:55:49+07:00');
    expect(
      parseTaskerCancellationPolicy(
        JSON.stringify([
          { minHoursBeforeStart: 24, penaltyPercent: 0 },
          { minHoursBeforeStart: 10, penaltyPercent: 50 },
          { minHoursBeforeStart: 0, penaltyPercent: 100 },
        ]),
        updatedAt,
      ),
    ).toEqual({
      version: 1,
      effectiveFrom: updatedAt.toISOString(),
      rules: [
        { hoursBeforeStart: 24, penaltyPercent: 0 },
        { hoursBeforeStart: 10, penaltyPercent: 50 },
        { hoursBeforeStart: 0, penaltyPercent: 100 },
      ],
    });
  });

  it('validate biên policy check-in và đặt lịch', () => {
    expect(() =>
      normalizeCheckinOperationPolicy({
        version: 1,
        effectiveFrom: null,
        openBeforeMinutes: 30,
        autoApproveRadiusMeters: 9,
      }),
    ).toThrow('10 đến 1.000 mét');
    expect(() =>
      normalizeCustomerSchedulingPolicy({
        version: 1,
        effectiveFrom: null,
        minAdvanceMinutes: 2 * 24 * 60,
        maxAdvanceDays: 1,
      }),
    ).toThrow('nhỏ hơn giới hạn đặt xa');
  });
});
