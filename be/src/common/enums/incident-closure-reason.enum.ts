export enum IncidentClosureReason {
  COMPENSATED = 'COMPENSATED',
  REJECTED = 'REJECTED',
  // P2 — sự cố có thật, đã xử lý nhưng quyết định không bồi thường (khác REJECTED = báo cáo sai).
  NO_COMPENSATION = 'NO_COMPENSATION',
  WITHDRAWN = 'WITHDRAWN',
  DUPLICATE = 'DUPLICATE',
  INVALID_BOOKING = 'INVALID_BOOKING',
  EXPIRED = 'EXPIRED',
}
