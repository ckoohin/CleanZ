import {
  TICKET_CATEGORY,
  TICKET_PRIORITY,
  type PendingReason,
  type ResolutionType,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from './ticket.enums';

export const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: 'Mới',
  IN_PROGRESS: 'Đang xử lý',
  PENDING: 'Tạm chờ',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng',
};

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'muted';
export const STATUS_TONE: Record<TicketStatus, Tone> = {
  NEW: 'neutral',
  IN_PROGRESS: 'info',
  PENDING: 'warning',
  RESOLVED: 'success',
  CLOSED: 'muted',
};

/** Class badge theo tone — token semantic (frontend-rules 07). Dùng chung table/drawer. */
export const TONE_BADGE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted text-foreground border-border',
  info: 'bg-primary/10 text-primary border-primary/20',
  warning:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  success:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  muted: 'bg-muted text-muted-foreground border-border/50',
};

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  SERVICE_QUALITY: 'Chất lượng dịch vụ',
  TASKER_BEHAVIOR: 'Hành vi Tasker',
  SCHEDULING: 'Lịch hẹn',
  PROPERTY_DAMAGE: 'Hư hỏng tài sản',
  PAYMENT_BILLING: 'Thanh toán',
  ACCOUNT_TECHNICAL: 'Tài khoản / Kỹ thuật',
  APPEAL: 'Kháng cáo khóa tài khoản',
  OTHER: 'Khác',
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  URGENT: 'Khẩn cấp',
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};
export const PRIORITY_TONE: Record<TicketPriority, Tone> = {
  URGENT: 'warning',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'muted',
};

export const PENDING_REASON_LABEL: Record<PendingReason, string> = {
  WAIT_CUSTOMER: 'Chờ khách hàng',
  WAIT_TASKER: 'Chờ Tasker',
  WAIT_INTERNAL: 'Chờ nội bộ',
};

export const RESOLUTION_LABEL: Record<ResolutionType, string> = {
  EXPLANATION: 'Giải thích',
  RECLEAN: 'Làm lại',
  VOUCHER: 'Voucher',
  REFUND: 'Hoàn tiền',
  COMPENSATION: 'Bồi thường',
  TASKER_PENALTY: 'Phạt Tasker',
};

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const CATEGORY_OPTIONS: Option<TicketCategory>[] = TICKET_CATEGORY.map(
  (value) => ({ value, label: CATEGORY_LABEL[value] }),
);

export const PRIORITY_OPTIONS: Option<TicketPriority>[] = TICKET_PRIORITY.map(
  (value) => ({ value, label: PRIORITY_LABEL[value] }),
);
