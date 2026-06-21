/**
 * Incident — nhãn tiếng Việt + tone badge (single source of truth). Dùng chung 3 actor.
 */
import {
  SEVERITY,
  type ClosureReason,
  type CompensationSource,
  type CompensationStatus,
  type IncidentStatus,
  type Severity,
} from './incident.enums';

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'muted' | 'danger';

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  REPORTED: 'Đã báo cáo',
  INVESTIGATING: 'Đang thẩm định',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  COMPENSATED: 'Đã bồi thường',
  CLOSED: 'Đã đóng',
};
export const STATUS_TONE: Record<IncidentStatus, Tone> = {
  REPORTED: 'neutral',
  INVESTIGATING: 'info',
  APPROVED: 'warning',
  REJECTED: 'danger',
  COMPENSATED: 'success',
  CLOSED: 'muted',
};

export const COMP_STATUS_LABEL: Record<CompensationStatus, string> = {
  NONE: 'Chưa xử lý',
  PENDING: 'Chờ duyệt',
  PROCESSING: 'Đang xử lý',
  RECORDED: 'Đã ghi nhận',
  FAILED: 'Thất bại',
};
export const COMP_STATUS_TONE: Record<CompensationStatus, Tone> = {
  NONE: 'muted',
  PENDING: 'warning',
  PROCESSING: 'info',
  RECORDED: 'success',
  FAILED: 'danger',
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
  WITHDRAWN: 'Khách đã rút',
  DUPLICATE: 'Trùng lặp',
  INVALID_BOOKING: 'Đơn không hợp lệ',
  EXPIRED: 'Hết hạn',
};

export const COMP_SOURCE_LABEL: Record<CompensationSource, string> = {
  TASKER_DEPOSIT: 'Cọc Tasker',
  PLATFORM_FUND: 'Quỹ nền tảng',
  MIXED: 'Kết hợp',
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
    label: 'Trần yêu cầu mỗi hạng mục',
    hint: 'Số tiền tối đa khách được yêu cầu cho 1 hạng mục',
    unit: 'VND',
    type: 'number',
  },
  INCIDENT_EVIDENCE_REQUIRED_THRESHOLD: {
    label: 'Ngưỡng bắt buộc chứng từ',
    hint: 'Tổng yêu cầu vượt mức này thì bắt buộc đính kèm chứng từ',
    unit: 'VND',
    type: 'number',
  },
  INCIDENT_DUAL_APPROVAL_THRESHOLD: {
    label: 'Ngưỡng duyệt 2 cấp (maker-checker)',
    hint: 'Yêu cầu ≥ mức này cần admin thứ hai duyệt',
    unit: 'VND',
    type: 'number',
  },
  INCIDENT_COMPENSATION_POLICY_CAP: {
    label: 'Trần tổng bồi thường',
    hint: 'Tổng số tiền duyệt bồi thường tối đa cho một sự cố',
    unit: 'VND',
    type: 'number',
  },
  INCIDENT_COOLING_PERIOD_HOURS: {
    label: 'Thời gian chờ (cooling)',
    hint: 'Khoảng chờ trước khi được thực thi bồi thường',
    unit: 'giờ',
    type: 'number',
  },
  INCIDENT_DEPOSIT_TOPUP_GRACE_DAYS: {
    label: 'Thời hạn nạp lại cọc',
    hint: 'Số ngày Tasker được nạp lại cọc sau khi bị trừ',
    unit: 'ngày',
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
