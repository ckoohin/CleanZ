import { vietnamNow, vietnamNowMinus } from './vietnam-time.helper';

/**
 * `vietnamNow()` tồn tại vì driver `pg` tuần tự hoá `Date` theo múi giờ TIẾN TRÌNH, trong
 * khi mọi cột `timestamp` của dự án lưu giờ VN. Bất biến cần khoá: giờ-theo-tiến-trình của
 * kết quả LUÔN bằng giờ VN thật, bất kể tiến trình chạy ở múi nào.
 */
describe('vietnamNow', () => {
  /** Giờ VN thật của một mốc, đọc độc lập với múi giờ tiến trình. */
  function vnWallClock(at: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(at);
  }

  /** Giờ mà `pg` sẽ ghi xuống: wall clock theo múi giờ tiến trình. */
  function processWallClock(at: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(at);
  }

  it('giờ ghi xuống DB đúng bằng giờ VN thật của thời điểm gọi', () => {
    const at = new Date('2026-08-30T18:30:00Z'); // 01:30 ngày 31 giờ VN

    expect(processWallClock(vietnamNow(at))).toBe(vnWallClock(at));
  });

  it('giữ nguyên mốc khi tiến trình đã chạy ở giờ VN (phép cộng 0)', () => {
    const at = new Date('2026-08-30T18:30:00Z');
    const processOffsetMinutes = -at.getTimezoneOffset();

    if (processOffsetMinutes === 7 * 60) {
      expect(vietnamNow(at).getTime()).toBe(at.getTime());
    } else {
      // Môi trường không phải giờ VN: phải dịch đúng bằng độ lệch, không hơn không kém.
      expect(vietnamNow(at).getTime() - at.getTime()).toBe(
        (7 * 60 - processOffsetMinutes) * 60_000,
      );
    }
  });

  it('không phá quan hệ thứ tự — chỉ tịnh tiến, không bóp méo trục thời gian', () => {
    const a = new Date('2026-08-30T10:00:00Z');
    const b = new Date('2026-08-30T12:00:00Z');

    expect(vietnamNow(b).getTime() - vietnamNow(a).getTime()).toBe(
      b.getTime() - a.getTime(),
    );
  });

  it('vietnamNowMinus lùi đúng số mili giây yêu cầu', () => {
    const before = vietnamNow().getTime();
    const cutoff = vietnamNowMinus(3_600_000).getTime();

    expect(before - cutoff).toBeGreaterThanOrEqual(3_600_000);
    expect(before - cutoff).toBeLessThan(3_600_000 + 5_000);
  });
});
