const REDACTED = '[REDACTED]';

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
