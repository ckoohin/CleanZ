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
  CUSTOMER_ABSENCE_DISPUTE: 'Không liên lạc được với khách hàng',
  ACCOUNT_TECHNICAL: 'Tài khoản / Kỹ thuật',
  APPEAL: 'Kháng cáo khóa tài khoản',
  OTHER: 'Khác',
};

/** Nguồn tạo ticket — trước đây hiển thị enum thô (`CUSTOMER_APP`) cho người dùng. */
export const SOURCE_LABEL: Record<string, string> = {
  CUSTOMER_APP: 'Ứng dụng khách hàng',
  TASKER_APP: 'Ứng dụng Tasker',
  TASKER_APPEAL: 'Kháng cáo từ Tasker',
  ADMIN: 'Tổng đài CleanZ',
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

/** Nhãn cho ADMIN — gọi tên đúng bên đang bị chờ. */
export const PENDING_REASON_LABEL: Record<PendingReason, string> = {
  WAIT_CUSTOMER: 'Chờ khách hàng',
  WAIT_TASKER: 'Chờ Tasker',
  WAIT_INTERNAL: 'Chờ nội bộ',
};

/**
 * Nhãn cho NGƯỜI DÙNG CUỐI (khách/tasker) — diễn đạt theo góc nhìn của họ:
 * bóng đang ở sân ai. Không dùng `PENDING_REASON_LABEL` ở app khách/tasker vì
 * "Chờ khách hàng" đọc từ phía chính khách hàng là vô nghĩa.
 *
 * `awaitingMe` PHẢI lấy từ BE (`TicketService.awaitsParty`), đừng suy lại từ
 * `pendingReason` + vai ở FE — hai nơi sẽ lệch nhau khi quy ước đổi.
 */
export function pendingHintFor(
  pendingReason: PendingReason | null | undefined,
  awaitingMe: boolean | undefined,
): { text: string; urgent: boolean } | null {
  if (awaitingMe) {
    return { text: 'Đang chờ bạn phản hồi', urgent: true };
  }
  switch (pendingReason) {
    case 'WAIT_INTERNAL':
      return { text: 'CleanZ đang xử lý nội bộ', urgent: false };
    case 'WAIT_CUSTOMER':
    case 'WAIT_TASKER':
      return { text: 'Đang chờ bên liên quan phản hồi', urgent: false };
    default:
      return null;
  }
}

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

/**
 * Loại vấn đề mà TỪNG VAI được phép chọn khi tự tạo ticket.
 *
 * Tasker không được chọn `TASKER_BEHAVIOR` (tố hành vi Tasker) và
 * `SERVICE_QUALITY` (chất lượng buổi dọn) — cả hai đều nhắm vào chính công việc
 * của họ, tasker tự khiếu nại mình là vô nghĩa. Ngược lại `APPEAL` (kháng cáo
 * khoá tài khoản) và `PAYMENT_BILLING` (thu nhập) mới là nhu cầu thật của tasker.
 *
 * Admin tạo hộ (hotline) vẫn thấy ĐỦ 8 loại vì họ nhập thay cho bất kỳ ai —
 * dùng `CATEGORY_OPTIONS` cho luồng đó.
 */
export const TASKER_HIDDEN_CATEGORIES: TicketCategory[] = [
  'TASKER_BEHAVIOR',
  'SERVICE_QUALITY',
  'CUSTOMER_ABSENCE_DISPUTE',
];

export function categoryOptionsFor(
  role: 'CUSTOMER' | 'TASKER' | undefined,
): Option<TicketCategory>[] {
  if (role !== 'TASKER') return CATEGORY_OPTIONS;
  return CATEGORY_OPTIONS.filter(
    (o) => !TASKER_HIDDEN_CATEGORIES.includes(o.value),
  );
}

/**
 * Một số nhãn đọc từ góc nhìn khách hàng. Với tasker, cùng một `category` nhưng
 * đối tượng khiếu nại là KHÁCH → đổi nhãn cho khỏi hiểu ngược.
 */
const TASKER_CATEGORY_LABEL: Partial<Record<TicketCategory, string>> = {
  SCHEDULING: 'Lịch hẹn / Khách đổi lịch',
  PROPERTY_DAMAGE: 'Hư hỏng tài sản',
  PAYMENT_BILLING: 'Thanh toán / Thu nhập',
  APPEAL: 'Kháng cáo khóa tài khoản',
};

export function categoryLabelFor(
  category: TicketCategory,
  role: 'CUSTOMER' | 'TASKER' | undefined,
): string {
  if (role === 'TASKER') {
    return TASKER_CATEGORY_LABEL[category] ?? CATEGORY_LABEL[category];
  }
  return CATEGORY_LABEL[category];
}

export const PRIORITY_OPTIONS: Option<TicketPriority>[] = TICKET_PRIORITY.map(
  (value) => ({ value, label: PRIORITY_LABEL[value] }),
);
