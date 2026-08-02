export const SUPPORT_TICKET_QUEUE = 'supportTicketQueue';
export const ST_JOB_SLA_BREACH = 'sla-breach';
/** Quá hạn PHẢN HỒI LẦN ĐẦU (khác với quá hạn xử lý ở trên). */
export const ST_JOB_FIRST_RESPONSE_BREACH = 'first-response-breach';
export const ST_JOB_AUTO_CLOSE = 'auto-close';
export const ST_JOB_CSAT_INVITE = 'csat-invite';

export const ST_CONFIG_KEYS = {
  SLA_MATRIX: 'TICKET_SLA_MATRIX',
  CATEGORY_PRIORITY: 'TICKET_CATEGORY_PRIORITY',
  AUTOCLOSE_HOURS: 'TICKET_AUTOCLOSE_HOURS',
  COMPLAINT_WINDOW_DAYS: 'TICKET_COMPLAINT_WINDOW_DAYS',
  SLA_PAUSE_ON_WAIT_TASKER: 'TICKET_SLA_PAUSE_ON_WAIT_TASKER',
  REOPEN_WINDOW_DAYS: 'TICKET_REOPEN_WINDOW_DAYS',
} as const;

/** Số tin nhắn mỗi trang (cursor pagination) — chống tải toàn bộ ticket dài. */
export const MESSAGE_PAGE_SIZE = 30;

export const ST_DEFAULTS = {
  AUTOCLOSE_HOURS: 48,
  COMPLAINT_WINDOW_DAYS: 7,
  /** Số ngày sau khi ĐÓNG mà ticket còn mở lại được (tính từ `closedAt`). */
  REOPEN_WINDOW_DAYS: 7,
};

export function stJobId(kind: string, ticketId: string): string {
  return `${kind}-${ticketId}`;
}
