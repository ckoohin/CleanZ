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
} from "./incident.enums";

export type Tone =
  "neutral" | "info" | "warning" | "success" | "muted" | "danger";

/**
 * Ai đang đọc nhãn. Cùng một trạng thái nhưng ba người có ba mối bận tâm khác nhau:
 * Admin cần biết việc của mình, Khách cần biết tiền của mình, Tasker cần biết mình
 * phải làm gì. Dùng chung một chuỗi thì hai trong ba người luôn đọc ngôn ngữ nội bộ
 * của người còn lại.
 */
export type IncidentAudience = "admin" | "customer" | "tasker";

export const STATUS_LABEL_BY_AUDIENCE: Record<
  IncidentAudience,
  Record<IncidentStatus, string>
> = {
  // Admin là người vận hành: nhãn nói rõ việc đang nằm ở bước nào của quy trình.
  admin: {
    REPORTED: "Chờ tiếp nhận",
    REVIEWING: "Đang thẩm định",
    AWAITING_RESPONSE: "Chờ Tasker phản hồi",
    AWAITING_PAYOUT: "Chờ chi trả",
    COMPENSATED: "Đã bồi thường",
    REJECTED: "Đã bác bỏ",
    CLOSED: "Đã đóng",
  },
  // Khách chỉ quan tâm: báo cáo tới đâu rồi, bao giờ có tiền. Không nhắc "thẩm
  // định", "phản hồi của Tasker" — đó là chuyện nội bộ, khách không hành động gì.
  customer: {
    REPORTED: "Đã gửi, chờ tiếp nhận",
    REVIEWING: "CleanZ đang xem xét",
    AWAITING_RESPONSE: "Đang xác minh với Tasker",
    AWAITING_PAYOUT: "Chờ hoàn tiền cho bạn",
    COMPENSATED: "Đã hoàn tiền",
    REJECTED: "Không được chấp nhận",
    CLOSED: "Đã đóng",
  },
  // Tasker cần phân biệt "tới lượt tôi" với "đang chờ CleanZ" — đây là người có
  // thể bị trừ tiền, nên nhãn phải nói thẳng khi nào họ phải hành động.
  tasker: {
    REPORTED: "Chờ CleanZ tiếp nhận",
    REVIEWING: "CleanZ đang xem xét",
    AWAITING_RESPONSE: "Chờ bạn phản hồi",
    AWAITING_PAYOUT: "Chờ CleanZ chi trả",
    COMPENSATED: "Đã xử lý xong",
    REJECTED: "Báo cáo bị bác bỏ",
    CLOSED: "Đã đóng",
  },
};

/** Mặc định = giọng Admin. Màn hình Khách/Tasker phải truyền audience tương ứng. */
export const STATUS_LABEL = STATUS_LABEL_BY_AUDIENCE.admin;

export const STATUS_TONE: Record<IncidentStatus, Tone> = {
  REPORTED: "neutral",
  REVIEWING: "info",
  AWAITING_RESPONSE: "warning",
  AWAITING_PAYOUT: "warning",
  COMPENSATED: "success",
  REJECTED: "danger",
  CLOSED: "muted",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: "Nghiêm trọng",
  MAJOR: "Lớn",
  MINOR: "Nhỏ",
};
export const SEVERITY_TONE: Record<Severity, Tone> = {
  CRITICAL: "danger",
  MAJOR: "warning",
  MINOR: "muted",
};

/** Lý do đóng hồ sơ — chỉ hiện cho Khách, nên viết ở giọng nói với khách. */
export const CLOSURE_LABEL: Record<ClosureReason, string> = {
  COMPENSATED: "Đã hoàn tiền",
  REJECTED: "Không được chấp nhận",
  NO_COMPENSATION: "Không có khoản hoàn tiền",
  WITHDRAWN: "Bạn đã rút báo cáo",
  DUPLICATE: "Trùng với báo cáo khác",
  INVALID_BOOKING: "Đơn không hợp lệ",
  EXPIRED: "Quá hạn xử lý",
};

export const COMP_SOURCE_LABEL: Record<CompensationSource, string> = {
  TASKER_DEPOSIT: "Ví Tasker",
  PLATFORM_FUND: "Quỹ nền tảng",
  MIXED: "Cả hai nguồn",
};

export const VERIFICATION_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ xem xét",
  VERIFIED: "Đã xác minh",
  REJECTED: "Không chấp nhận",
  NEED_MORE_EVIDENCE: "Cần thêm bằng chứng",
};

export const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  COMPENSATE: "Bồi thường",
  NO_COMPENSATION: "Có sự cố nhưng không bồi thường",
  REJECT: "Bác bỏ (báo cáo sai sự thật)",
};

/** Nhãn nút cho hành động BE cho phép — FE không tự suy ra bước tiếp theo. */
export const ACTION_LABEL: Record<DecisionAction, string> = {
  ACCEPT: "Tiếp nhận xử lý",
  SAVE_DECISION: "Lưu quyết định",
  SEND_TO_TASKER: "Gửi Tasker phản hồi",
  FINALIZE: "Chốt quyết định",
  WITHDRAW_DECISION: "Thu hồi quyết định",
  COMPENSATE: "Chi trả bồi thường",
  REVERSE: "Hoàn tác chi trả",
  RESPOND: "Gửi phản hồi",
};

/** Giải thích vì sao chưa chốt/chi được — mirror `blockedReasons` từ BE. */
export const BLOCKED_REASON_LABEL: Record<string, string> = {
  DECISION_REQUIRED: "Chưa soạn quyết định nào cho sự cố này.",
  TASKER_RESPONSE_REQUIRED:
    "Quyết định bắt Tasker chịu tiền — phải gửi Tasker phản hồi trước khi chốt.",
  WAITING_FOR_TASKER_RESPONSE:
    "Đang trong thời hạn Tasker phản hồi. Chốt được khi Tasker trả lời hoặc hết hạn.",
  TASKER_RESPONSE_WINDOW_EXPIRED:
    "Đã hết hạn phản hồi, Tasker không trả lời — bạn có thể chốt quyết định.",
  REVERSAL_WINDOW_EXPIRED:
    "Đã quá 72 giờ kể từ lúc chi trả — không hoàn tác tự động được nữa, phải xử lý thủ công.",
  REVERSAL_MANUAL_PAYOUT:
    "Khoản này chi bằng chuyển khoản ngoài ví nên không có giao dịch trong ví để hoàn tác — phải thu hồi thủ công.",
  REVERSAL_DEBT_RECOVERY_STARTED:
    "Đã bắt đầu thu hồi nợ từ ví Tasker — hoàn tác tự động sẽ làm lệch sổ, cần xử lý thủ công.",
};

export const RESPONSIBILITY_LABEL: Record<ResponsibilityParty, string> = {
  TASKER: "Tasker chịu",
  PLATFORM: "Nền tảng chịu",
  SHARED: "Chia trách nhiệm",
  UNDETERMINED: "Chưa xác định (CleanZ chịu)",
};

/**
 * Cùng dữ liệu, khác người đọc. `RESPONSIBILITY_LABEL` viết cho Admin nhìn hồ sơ của
 * người khác ("Tasker chịu"); Tasker đọc chính hồ sơ của mình nên phải là ngôi thứ hai,
 * nếu không họ mất một nhịp để nhận ra "Tasker" ở đây là mình.
 */
export const RESPONSIBILITY_LABEL_FOR_TASKER: Record<
  ResponsibilityParty,
  string
> = {
  TASKER: "Bạn chịu trách nhiệm",
  PLATFORM: "CleanZ chịu trách nhiệm",
  SHARED: "Bạn và CleanZ cùng chịu trách nhiệm",
  UNDETERMINED: "Chưa xác định được trách nhiệm (CleanZ chịu)",
};

export const RESPONSE_TYPE_LABEL: Record<DecisionResponseType, string> = {
  AGREE: "Đồng ý",
  DISAGREE: "Không đồng ý",
};

/** Class badge theo tone — token semantic (frontend-rules 07). Dùng chung table/drawer. */
export const TONE_BADGE_CLASS: Record<Tone, string> = {
  neutral: "bg-muted text-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/20",
  warning:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  success:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  muted: "bg-muted text-muted-foreground border-border/50",
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
  if (amount == null) return "—";
  return `${amount.toLocaleString("vi-VN")}đ`;
}

// ─── Nhãn cấu hình incident (key BE → tiếng Việt) ────────────────────────────
export interface ConfigFieldMeta {
  label: string;
  hint?: string;
  unit?: string;
  /** json → dùng textarea; còn lại input thường. */
  type?: "number" | "text" | "json";
}

export const INCIDENT_CONFIG_META: Record<string, ConfigFieldMeta> = {
  INCIDENT_REPORT_WINDOW_HOURS: {
    label: "Thời hạn báo cáo (thường)",
    hint: "Số giờ cho phép báo cáo sau khi đơn hoàn thành",
    unit: "giờ",
    type: "number",
  },
  INCIDENT_REPORT_WINDOW_SEVERE_HOURS: {
    label: "Thời hạn báo cáo (nghiêm trọng)",
    hint: "Áp dụng cho sự cố mức nghiêm trọng",
    unit: "giờ",
    type: "number",
  },
  INCIDENT_SEVERE_CRITERIA: {
    label: "Tiêu chí xác định nghiêm trọng",
    hint: "Cấu hình JSON (loại sự cố + ngưỡng tiền) để hệ thống tự suy mức độ",
    type: "json",
  },
  INCIDENT_CLAIM_MAX_AMOUNT: {
    label: "Số tiền khách được yêu cầu tối đa",
    hint: "Tổng số tiền tối đa khách được yêu cầu cho một sự cố (cộng tất cả khoản thiệt hại)",
    unit: "VND",
    type: "number",
  },
  INCIDENT_COMPENSATION_POLICY_CAP: {
    label: "Mức bồi thường tối đa",
    hint: "Tổng số tiền duyệt bồi thường tối đa cho một sự cố",
    unit: "VND",
    type: "number",
  },
  INCIDENT_RESPONSE_WINDOW_HOURS: {
    label: "Thời hạn Tasker phản hồi",
    hint: "Khi quyết định bắt Tasker chịu tiền, Tasker có ngần này giờ để phản hồi trước khi Admin được chốt",
    unit: "giờ",
    type: "number",
  },
  INCIDENT_SYSTEM_WALLET_MIN_BALANCE: {
    label: "Ngưỡng cảnh báo quỹ nền tảng",
    hint: "Số dư ví hệ thống thấp hơn mức này sẽ bắn cảnh báo cho Admin",
    unit: "VND",
    type: "number",
  },
  INCIDENT_AUTOCLOSE_HOURS: {
    label: "Tự đóng sau khi bồi thường",
    hint: "Tự đóng hồ sơ sau khi đã bồi thường",
    unit: "giờ",
    type: "number",
  },
  INCIDENT_REPORTED_EXPIRY_DAYS: {
    label: "Tự đóng hồ sơ chưa ai tiếp nhận",
    hint: "Tự đóng hồ sơ kẹt ở 'Chờ tiếp nhận' quá số ngày này",
    unit: "ngày",
    type: "number",
  },
  INCIDENT_SLA_MATRIX: {
    label: "Thời hạn xử lý theo mức độ",
    hint: "Cấu hình JSON: thời hạn tiếp nhận/giải trình/quyết định/chi trả theo mức độ",
    type: "json",
  },
  INCIDENT_FALSE_REPORT_STRIKES: {
    label: "Số lần báo cáo sai thì khoá",
    hint: "Số lần báo cáo sai sự thật bị từ chối trước khi khoá quyền báo cáo của khách",
    unit: "lần",
    type: "number",
  },
};
