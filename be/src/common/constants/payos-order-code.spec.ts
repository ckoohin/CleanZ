import {
  BOOKING_ORDER_CODE_MIN,
  BOOKING_ORDER_CODE_SIZE,
  TOPUP_ORDER_CODE_MIN,
  TOPUP_ORDER_CODE_SIZE,
  generateBookingPayosOrderCode,
  generateTopupPayosOrderCode,
} from './payos-order-code';

describe('phân dải orderCode PayOS', () => {
  const bookingMax = BOOKING_ORDER_CODE_MIN + BOOKING_ORDER_CODE_SIZE - 1;
  const topupMax = TOPUP_ORDER_CODE_MIN + TOPUP_ORDER_CODE_SIZE - 1;

  it('hai dải không giao nhau', () => {
    // Đây là bất biến sống còn: một webhook duy nhất phục vụ cả hai luồng, phân
    // biệt giao dịch chỉ bằng orderCode. Giao nhau là cộng ví nhầm.
    expect(bookingMax).toBeLessThan(TOPUP_ORDER_CODE_MIN);
  });

  it('mọi mã đều là số nguyên dương tối đa 9 chữ số (PayOS yêu cầu)', () => {
    expect(BOOKING_ORDER_CODE_MIN).toBeGreaterThan(0);
    expect(topupMax).toBeLessThan(1_000_000_000);
  });

  it.each([
    [
      'booking',
      generateBookingPayosOrderCode,
      BOOKING_ORDER_CODE_MIN,
      bookingMax,
    ],
    ['nạp ví', generateTopupPayosOrderCode, TOPUP_ORDER_CODE_MIN, topupMax],
  ])('mã %s luôn nằm trong dải của nó', (_label, generate, min, max) => {
    // Quét cả biên của chu kỳ chứ không chỉ thời điểm hiện tại.
    for (const now of [0, 1, max - min, 1_000_000_000, Date.now()]) {
      jest.spyOn(Date, 'now').mockReturnValue(now);
      const code = generate();
      expect(Number.isInteger(code)).toBe(true);
      expect(code).toBeGreaterThanOrEqual(min);
      expect(code).toBeLessThanOrEqual(max);
    }
    jest.restoreAllMocks();
  });
});
