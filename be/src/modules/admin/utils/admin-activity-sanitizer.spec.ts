import {
  maskFreeTextSearch,
  sanitizeAuditValue,
} from './admin-activity-sanitizer';

describe('maskFreeTextSearch', () => {
  /**
   * Đây là chốt chặn DUY NHẤT cho ô tìm kiếm tự do. `sanitizeAuditValue` nhận
   * diện dữ liệu nhạy cảm qua TÊN khoá, nên `keyword`/`search` luôn lọt qua nó —
   * mà đó lại đúng là chỗ admin dán số điện thoại, email hay số căn cước của
   * khách vào để tra cứu.
   */
  it.each([
    ['0912345678', 'số điện thoại'],
    ['khach@gmail.com', 'email'],
    ['001203000123', 'số căn cước'],
  ])('không để lộ %s (%s)', (input) => {
    const masked = maskFreeTextSearch(input);

    expect(masked).not.toContain(input);
    expect(masked).toBe(`[đã ẩn, ${input.length} ký tự]`);
  });

  // Giữ độ dài để vẫn phân biệt được "tra cứu có chủ đích" với "để trống".
  it('giữ lại độ dài để phân biệt có tra cứu hay không', () => {
    expect(maskFreeTextSearch('abc')).toBe('[đã ẩn, 3 ký tự]');
  });

  it.each<[unknown, string]>([
    [undefined, 'không truyền'],
    [null, 'null'],
    ['', 'chuỗi rỗng'],
    ['   ', 'toàn khoảng trắng'],
    [12345, 'không phải chuỗi'],
  ])('trả null khi %s (%s)', (input) => {
    expect(maskFreeTextSearch(input)).toBeNull();
  });

  // Độ dài tính trên chuỗi ĐÃ cắt khoảng trắng, để hai lần tra cùng một số điện
  // thoại không cho ra hai giá trị khác nhau chỉ vì thừa dấu cách.
  it('tính độ dài sau khi cắt khoảng trắng thừa', () => {
    expect(maskFreeTextSearch('  0912345678  ')).toBe('[đã ẩn, 10 ký tự]');
  });
});

describe('sanitizeAuditValue', () => {
  /**
   * Lỗ rò thật đã gặp: `extract` của endpoint đọc che `keyword` rất cẩn thận,
   * nhưng interceptor lại đổ NGUYÊN `request.query` vào cột `changes` — nên số
   * điện thoại admin gõ vào ô tìm kiếm vẫn nằm nguyên văn trong nhật ký. Che ở
   * từng điểm gọi là không đủ; phải chặn ngay trong bộ lọc dùng chung.
   */
  it.each(['keyword', 'search', 'q', 'searchTerm'])(
    'che ô tìm kiếm tự do dưới khoá %s',
    (key) => {
      const sanitized = sanitizeAuditValue({
        [key]: '0912345678',
      }) as Record<string, unknown>;

      expect(sanitized[key]).toBe('[đã ẩn, 10 ký tự]');
    },
  );

  it('che cả khi ô tìm kiếm nằm lồng trong query', () => {
    const sanitized = sanitizeAuditValue({
      query: { keyword: 'khach@gmail.com', page: 1 },
    }) as { query: Record<string, unknown> };

    expect(sanitized.query.keyword).toBe('[đã ẩn, 15 ký tự]');
    // Các tham số phân trang vẫn giữ nguyên — chúng là phạm vi, không phải nội dung.
    expect(sanitized.query.page).toBe(1);
  });

  it('che khoá có tên nhạy cảm bằng REDACTED', () => {
    const sanitized = sanitizeAuditValue({ phone: '0912345678' }) as Record<
      string,
      unknown
    >;

    expect(sanitized.phone).toBe('[REDACTED]');
  });
});
