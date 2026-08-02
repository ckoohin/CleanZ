
import type { TicketCategory, TicketStatus, PendingReason } from './ticket.enums';

export const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['IN_PROGRESS'],
  IN_PROGRESS: ['PENDING', 'RESOLVED'],
  PENDING: ['IN_PROGRESS'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  // Mở lại ticket đã đóng — BE còn kiểm thêm hạn mở lại
  // (TICKET_REOPEN_WINDOW_DAYS, tính từ closedAt) nên có thể trả 422.
  CLOSED: ['IN_PROGRESS'],
};

export function nextStatuses(current: TicketStatus): TicketStatus[] {
  return TICKET_TRANSITIONS[current] ?? [];
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return nextStatuses(from).includes(to);
}

export function requiresPendingReason(to: TicketStatus): boolean {
  return to === 'PENDING';
}

export interface ResolveGate {
  ok: boolean;
  reason?: string;
}

export function canResolve(ticket: {
  category: TicketCategory;
  resolutions: { length: number };
}): ResolveGate {
  if (ticket.category === 'OTHER') {
    return {
      ok: false,
      reason: 'Phải phân loại lại ticket (đang OTHER) trước khi giải quyết',
    };
  }
  if (ticket.resolutions.length === 0) {
    return {
      ok: false,
      reason: 'Cần ít nhất 1 kết luận xử lý trước khi giải quyết',
    };
  }
  return { ok: true };
}

export function isMessagingLocked(status: TicketStatus): boolean {
  return status === 'CLOSED';
}
/**
 * CSAT chỉ dành cho NGƯỜI GỬI ticket. Bên bị khiếu nại (counterparty) không
 * được đánh giá — BE chặn bằng `ticket.reporter?.id !== userId` → 404; nếu FE
 * vẫn hiện form thì tasker bấm gửi sẽ ăn lỗi.
 */
export function canSubmitSurvey(
  status: TicketStatus,
  myRole?: 'REPORTER' | 'COUNTERPARTY',
): boolean {
  if (myRole === 'COUNTERPARTY') return false;
  return status === 'RESOLVED' || status === 'CLOSED';
}

export type { PendingReason };
