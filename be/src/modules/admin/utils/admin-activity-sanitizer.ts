const REDACTED = '[REDACTED]';

/**
 * Che nội dung một ô tìm kiếm TỰ DO trước khi đưa vào nhật ký, chỉ giữ lại độ dài.
 *
 * `sanitizeAuditValue` nhận diện dữ liệu nhạy cảm qua TÊN khoá, nên `keyword` hay
 * `search` luôn lọt — trong khi đó chính là chỗ admin dán thẳng số điện thoại,
 * email hay số căn cước của khách vào để tra cứu. Ghi nguyên văn nghĩa là bơm dữ
 * liệu cá nhân vào đúng cái nhật ký lập ra để bảo vệ dữ liệu cá nhân, và nhật ký
 * này thì mọi admin đều đọc được.
 *
 * Giữ độ dài vì nó vẫn phân biệt được "tra cứu có chủ đích" với "để trống", mà
 * không tiết lộ nội dung.
 */
export function maskFreeTextSearch(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `[đã ẩn, ${trimmed.length} ký tự]`;
}

/**
 * Các khoá là ô tìm kiếm TỰ DO. Tách riêng khỏi `SENSITIVE_AUDIT_KEY_PATTERN` vì
 * cách xử lý khác nhau: khoá nhạy cảm bị xoá sạch, còn ô tìm kiếm chỉ giữ độ dài
 * — đủ để biết có tra cứu hay không mà không lộ tra cứu cái gì.
 */
const FREE_TEXT_SEARCH_KEY_PATTERN = /^(keyword|search|q|searchTerm)$/i;

export const SENSITIVE_AUDIT_KEY_PATTERN =
  /(password|passcode|token|secret|authorization|cookie|credential|otp|api.?key|private.?key|signature|cvv|card.?number|account.?number|citizen.?id|email|phone|address|full.?name|bank|identity|document|proof|image|avatar|config.?value|^value$)/i;

export function sanitizeAuditValue(
  value: unknown,
  key = '',
  depth = 0,
): unknown {
  if (key && SENSITIVE_AUDIT_KEY_PATTERN.test(key)) {
    return REDACTED;
  }
  // Phải chặn NGAY TẠI ĐÂY chứ không chỉ ở từng `extract`: interceptor đổ nguyên
  // `request.query` vào cột `changes`, nên một ô tìm kiếm che cẩn thận ở
  // `business_data` vẫn lộ nguyên văn ở `changes` nếu chỉ vá một phía.
  if (key && FREE_TEXT_SEARCH_KEY_PATTERN.test(key)) {
    return maskFreeTextSearch(value);
  }
  if (depth >= 5) {
    return '[MAX_DEPTH]';
  }
  if (value === null || value === undefined || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : String(value);
  }
  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Buffer.isBuffer(value)) {
    return '[BINARY]';
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item) => sanitizeAuditValue(item, key, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([childKey, childValue]) => [
          childKey,
          sanitizeAuditValue(childValue, childKey, depth + 1),
        ]),
    );
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return `[${typeof value}]`;
}
