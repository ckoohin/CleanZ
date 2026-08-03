/**
 * Incident — nhãn tiếng Việt + tone badge (single source of truth). Dùng chung 3 actor.
 */
import {
  SEVERITY,
  type ClosureReason,
  type CompensationSource,
  type DecisionAction,
  type DecisionOutcome,
  type DecisionResponseType,
  type IncidentStatus,
  type ResponsibilityParty,
  type Severity,
} from './incident.enums';

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'muted' | 'danger';

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  REPORTED: 'Chờ tiếp nhận',
  REVIEWING: 'Đang thẩm định',
  AWAITING_RESPONSE: 'Chờ Tasker phản biện',
  AWAITING_PAYOUT: 'Chờ chi trả',
  COMPENSATED: 'Đã bồi thường',
  REJECTED: 'Đã bác bỏ',
  CLOSED: 'Đã đóng',
};
export const STATUS_TONE: Record<IncidentStatus, Tone> = {
  REPORTED: 'neutral',
  REVIEWING: 'info',
  AWAITING_RESPONSE: 'warning',
  AWAITING_PAYOUT: 'warning',
  COMPENSATED: 'success',
  REJECTED: 'danger',
  CLOSED: 'muted',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: 'Nghiêm trọng',
  MAJOR: 'Lớn',
  MINOR: 'Nhỏ',
};
export const SEVERITY_TONE: Record<Severity, Tone> = {
  CRITICAL: 'danger',
  MAJOR: 'warning',
  MINOR: 'muted',
};

export const CLOSURE_LABEL: Record<ClosureReason, string> = {
  COMPENSATED: 'Đã bồi thường',
  REJECTED: 'Bị từ chối',
  NO_COMPENSATION: 'Không bồi thường',
  WITHDRAWN: 'Khách đã rút',
  DUPLICATE: 'Trùng lặp',
  INVALID_BOOKING: 'Đơn không hợp lệ',
  EXPIRED: 'Hết hạn',
};

export const COMP_SOURCE_LABEL: Record<CompensationSource, string> = {
  TASKER_DEPOSIT: 'Ví Tasker',
  PLATFORM_FUND: 'Quỹ nền tảng',
  MIXED: 'Kết hợp',
};

export const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ thẩm định',
  VERIFIED: 'Đã xác minh',
  REJECTED: 'Từ chối',
  NEED_MORE_EVIDENCE: 'Cần thêm bằng chứng',
};

export const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  COMPENSATE: 'Bồi thường',
  NO_COMPENSATION: 'Công nhận, không bồi thường',
  REJECT: 'Bác bỏ (báo cáo sai)',
};

/** Nhãn nút cho hành động BE cho phép — FE không tự suy ra bước tiếp theo. */
export const ACTION_LABEL: Record<DecisionAction, string> = {
  ACCEPT: 'Tiếp nhận thẩm định',
  SAVE_DECISION: 'Lưu quyết định',
  SEND_TO_TASKER: 'Gửi Tasker phản biện',
  FINALIZE: 'Chốt quyết định',
  WITHDRAW_DECISION: 'Thu hồi quyết định',
  COMPENSATE: 'Chi trả bồi thường',
  REVERSE: 'Thu hồi bồi thường',
  RESPOND: 'Gửi phản biện',
};

/** Giải thích vì sao chưa chốt/chi được — mirror `blockedReasons` từ BE. */
export const BLOCKED_REASON_LABEL: Record<string, string> = {
  DECISION_REQUIRED: 'Chưa soạn quyết định nào cho sự cố này.',
  TASKER_RESPONSE_REQUIRED:
    'Quyết định bắt Tasker chịu tiền — phải gửi Tasker phản biện trước khi chốt.',
  WAITING_FOR_TASKER_RESPONSE:
    'Đang trong thời hạn Tasker phản biện. Chốt được khi Tasker trả lời hoặc hết hạn.',
  TASKER_RESPONSE_WINDOW_EXPIRED:
    'Đã hết hạn phản biện, Tasker không trả lời — bạn có thể chốt quyết định.',
  REVERSAL_WINDOW_EXPIRED:
    'Đã quá 72 giờ kể từ lúc chi trả — không đảo tự động được nữa, phải xử lý thủ công.',
  REVERSAL_MANUAL_PAYOUT:
    'Khoản này chi bằng chuyển khoản ngoài ví nên không có bút toán để đảo — phải thu hồi thủ công.',
  REVERSAL_DEBT_RECOVERY_STARTED:
    'Đã bắt đầu thu hồi nợ từ ví Tasker — đảo tự động sẽ làm lệch sổ, cần xử lý thủ công.',
};

export const RESPONSIBILITY_LABEL: Record<ResponsibilityParty, string> = {
  TASKER: 'Tasker chịu',
  PLATFORM: 'Nền tảng chịu',
  SHARED: 'Chia sẻ',
  UNDETERMINED: 'Chưa xác định (CleanZ chịu)',
};

export const RESPONSE_TYPE_LABEL: Record<DecisionResponseType, string> = {
  AGREE: 'Đồng ý',
  DISAGREE: 'Không đồng ý',
};

/** Class badge theo tone — token semantic (frontend-rules 07). Dùng chung table/drawer. */
export const TONE_BADGE_CLASS: Record<Tone, string> = {
  neutral: 'bg-muted text-foreground border-border',
  info: 'bg-primary/10 text-primary border-primary/20',
  warning:
    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  success:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  muted: 'bg-muted text-muted-foreground border-border/50',
};

export interface Option<T extends string> {
  value: T;
  label: string;
}
export const SEVERITY_OPTIONS: Option<Severity>[] = SEVERITY.map((value) => ({
  value,
  label: SEVERITY_LABEL[value],
}));

/** Định dạng tiền VND (số nguyên). */
export function formatVnd(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('vi-VN')}đ`;
}

// ─── Nhãn cấu hình incident (key BE → tiếng Việt) ────────────────────────────
export interface ConfigFieldMeta {
  label: string;
  hint?: string;
  unit?: string;
  /** json → dùng textarea; còn lại input thường. */
  type?: 'number' | 'text' | 'json';
}

export const INCIDENT_CONFIG_META: Record<string, ConfigFieldMeta> = {
  INCIDENT_REPORT_WINDOW_HOURS: {
    label: 'Cửa sổ báo cáo (thường)',
    hint: 'Số giờ cho phép báo cáo sau khi đơn hoàn thành',
    unit: 'giờ',
    type: 'number',
  },
  INCIDENT_REPORT_WINDOW_SEVERE_HOURS: {
    label: 'Cửa sổ báo cáo (nghiêm trọng)',
    hint: 'Áp dụng cho sự cố mức nghiêm trọng',
    unit: 'giờ',
    type: 'number',
  },
  INCIDENT_SEVERE_CRITERIA: {
    label: 'Tiêu chí xác định nghiêm trọng',
    hint: 'Cấu hình JSON (category + ngưỡng tiền) để hệ thống tự suy mức độ',
    type: 'json',
  },
  INCIDENT_CLAIM_MAX_AMOUNT: {
    label: 'Trần tổng yêu cầu mỗi sự cố',
    hint: 'Tổng số tiền tối đa khách được yêu cầu (cộng tất cả hạng mục)',
    unit: 'VND',
    type: 'number',
  },
  INCIDENT_COMPENSATION_POLICY_CAP: {
    label: 'Trần tổng bồi thường',
    hint: 'Tổng số tiền duyệt bồi thường tối đa cho một sự cố',
    unit: 'VND',
    type: 'number',
  },
  INCIDENT_RESPONSE_WINDOW_HOURS: {
    label: 'Thời hạn Tasker phản biện',
    hint: 'Khi quyết định bắt Tasker chịu tiền, Tasker có ngần này giờ để phản biện trước khi Admin được chốt',
    unit: 'giờ',
    type: 'number',
  },
  INCIDENT_SYSTEM_WALLET_MIN_BALANCE: {
    label: 'Ngưỡng cảnh báo quỹ nền tảng',
    hint: 'Số dư ví hệ thống thấp hơn mức này sẽ bắn cảnh báo cho Admin',
    unit: 'VND',
    type: 'number',
  },
  INCIDENT_AUTOCLOSE_HOURS: {
    label: 'Tự đóng sau khi bồi thường',
    hint: 'Tự đóng hồ sơ sau khi đã bồi thường',
    unit: 'giờ',
    type: 'number',
  },
  INCIDENT_REPORTED_EXPIRY_DAYS: {
    label: 'Hết hạn hồ sơ chờ tiếp nhận',
    hint: "Tự đóng hồ sơ kẹt ở 'Đã báo cáo' quá số ngày này",
    unit: 'ngày',
    type: 'number',
  },
  INCIDENT_SLA_MATRIX: {
    label: 'Ma trận SLA theo mức độ',
    hint: 'Cấu hình JSON: thời hạn tiếp nhận/giải trình/quyết định/thực thi theo mức độ',
    type: 'json',
  },
  INCIDENT_FALSE_REPORT_STRIKES: {
    label: 'Ngưỡng khóa do khai gian',
    hint: 'Số lần khai gian bị từ chối trước khi khóa quyền báo cáo',
    unit: 'lần',
    type: 'number',
  },
};
