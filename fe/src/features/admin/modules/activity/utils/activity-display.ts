import type { AdminActivityItem } from "../types/activity.types";

export type ActivityChangeRow = {
  label: string;
  before: string;
  after: string;
};

export type ActivityBusinessRow = {
  /** Tên trường gốc — giữ lại để đối chiếu khi cần tra cứu kỹ thuật. */
  key: string;
  label: string;
  value: string;
};

const FIELD_LABELS: Record<string, string> = {
  action: "Hành động",
  adminNote: "Ghi chú quản trị",
  amount: "Số tiền",
  balance: "Số dư",
  basePrice: "Giá cơ bản",
  category: "Danh mục",
  code: "Mã",
  content: "Nội dung",
  description: "Mô tả",
  discountAmount: "Số tiền giảm",
  durationMinutes: "Thời lượng",
  effectiveFrom: "Hiệu lực từ",
  endDate: "Ngày kết thúc",
  isActive: "Trạng thái hoạt động",
  isDefault: "Đặt làm mặc định",
  isHidden: "Trạng thái hiển thị",
  isVerified: "Trạng thái xác minh",
  name: "Tên",
  note: "Ghi chú",
  notes: "Ghi chú",
  password: "Mật khẩu",
  paymentMethod: "Phương thức thanh toán",
  paymentStatus: "Trạng thái thanh toán",
  phone: "Số điện thoại",
  percentage: "Tỷ lệ",
  penaltyPercent: "Phần trăm phí hủy",
  hoursBeforeStart: "Số giờ trước ca",
  openBeforeMinutes: "Mở check-in sớm",
  autoApproveRadiusMeters: "Bán kính tự duyệt",
  minAdvanceMinutes: "Đặt trước tối thiểu",
  maxAdvanceDays: "Đặt xa tối đa",
  version: "Phiên bản policy",
  price: "Giá",
  priority: "Mức ưu tiên",
  reason: "Lý do",
  recordState: "Trạng thái dữ liệu",
  role: "Vai trò",
  scheduledAt: "Thời gian thực hiện",
  sortOrder: "Thứ tự hiển thị",
  startDate: "Ngày bắt đầu",
  status: "Trạng thái",
  title: "Tiêu đề",
};

/**
 * Nhãn cho khối "Số liệu nghiệp vụ" — các trường do từng nghiệp vụ tự khai trong
 * `businessData`, không đi qua diff theo-field nên không có tên nào sẵn.
 *
 * Đây là chỗ người đọc log dừng lại lâu nhất khi truy một khoản tiền: để nguyên
 * `uncoveredLiability` thì chỉ người viết code đọc được, mà log kiểm toán sinh ra là để
 * cho kế toán và người rà soát đọc.
 */
const BUSINESS_DATA_LABELS: Record<string, string> = {
  // ─── Bồi thường sự cố ───
  incidentId: "Sự cố",
  incidentCode: "Mã sự cố",
  approvedAmount: "Số tiền duyệt bồi thường",
  claimedAmount: "Số tiền khách yêu cầu",
  taskerBorneAmount: "Phần Tasker chịu",
  platformBorneAmount: "Phần nền tảng chịu",
  compensationSource: "Nguồn chi bồi thường",
  responsibilityParty: "Bên chịu trách nhiệm",
  allocationReason: "Lý do phân bổ",
  recoveredToSystem: "Thu hồi từ Tasker về quỹ",
  uncoveredLiability: "Phần Tasker chưa trả nổi (quỹ ứng)",
  writtenOffAmount: "Số nợ đã xoá",
  reversedAmount: "Số tiền đã đảo",
  newDecisionVersion: "Phiên bản quyết định mới",
  expectedDecisionVersion: "Phiên bản quyết định đang thao tác",
  openIncident: "Sự cố đang mở",
  reportId: "Báo cáo",
  reporterUserId: "Người báo cáo",
  resolutionType: "Hướng xử lý",

  // ─── Chi trả thủ công & sổ chi ngoài ───
  proofEvidenceId: "Ảnh minh chứng chuyển khoản",
  hasTransferProof: "Có ảnh minh chứng chuyển khoản",
  deliveredAmount: "Khách thực nhận",
  previousDelivered: "Khách thực nhận (trước điều chỉnh)",
  lossAmount: "Thất thoát (không đến tay khách)",
  previousLoss: "Thất thoát (trước điều chỉnh)",
  shortfall: "Còn thiếu phải chuyển bù",

  // ─── Sao kê ngân hàng ───
  entryId: "Dòng sao kê",
  csv: "Nội dung file sao kê",
  bankRef: "Mã giao dịch ngân hàng",
  txnAt: "Thời điểm giao dịch",
  direction: "Chiều tiền",
  parsed: "Số dòng đọc được",
  inserted: "Số dòng thêm mới",
  duplicated: "Số dòng đã có sẵn",

  // ─── Ví, giao dịch, rút tiền ───
  walletId: "Ví",
  transactionId: "Giao dịch",
  transactionType: "Loại giao dịch",
  balanceBefore: "Số dư trước",
  balanceAfter: "Số dư sau",
  withdrawalId: "Yêu cầu rút tiền",
  requestedAmount: "Số tiền yêu cầu",
  bankName: "Ngân hàng",
  decision: "Quyết định duyệt",
  sourceCode: "Mã nghiệp vụ nguồn",

  // ─── Người dùng, đơn hàng, vận hành ───
  userId: "Người dùng",
  customerId: "Khách hàng",
  taskerId: "Tasker",
  bookingId: "Đơn đặt",
  recleanBookingId: "Đơn dọn lại",
  ticketId: "Phiếu hỗ trợ",
  reviewId: "Đánh giá",
  voucherId: "Mã giảm giá",
  campaignId: "Chiến dịch",
  evidenceId: "Bằng chứng",
  assignedAdminId: "Admin được giao",
  assignToSelf: "Tự nhận xử lý",
  assigned: "Đã giao xử lý",
  banType: "Hình thức khoá",
  durationDays: "Thời hạn (ngày)",
  isRoleChange: "Có đổi vai trò",
  roleRequested: "Vai trò yêu cầu",
  finalStatus: "Trạng thái sau xử lý",
  newStatus: "Trạng thái mới",
  pendingReason: "Lý do còn treo",
  targetAudience: "Đối tượng nhận",
  segment: "Nhóm người nhận",
  enqueued: "Số bản ghi đã xếp hàng gửi",
  skipped: "Số bản ghi bỏ qua",
  message: "Nội dung",
  key: "Khoá định danh",
};

/** Giá trị enum chỉ xuất hiện trong `businessData`, không nằm ở diff theo-field. */
const BUSINESS_VALUE_LABELS: Record<string, string> = {
  TASKER_DEPOSIT: "Tasker chịu (trừ ví Tasker)",
  PLATFORM_FUND: "Quỹ nền tảng chi",
  MIXED: "Cả Tasker và quỹ nền tảng",
  TASKER: "Tasker",
  CUSTOMER: "Khách hàng",
  BOTH: "Cả hai bên",
  NONE: "Không bên nào",
  UNDETERMINED: "Chưa xác định",
};

/**
 * Trường tiền trong `businessData`. Rộng hơn `MONEY_FIELD_PATTERN` vì các nghiệp vụ tiền
 * đặt tên theo nghĩa nghiệp vụ (`shortfall`, `uncoveredLiability`) chứ không kèm "amount".
 */
const BUSINESS_MONEY_PATTERN =
  /(amount|price|balance|fee|cost|total|shortfall|liability|borne|payout|delivered|loss|recovered|reversed|claimed|requested)/i;

const SYSTEM_CONFIG_LABELS: Record<string, string> = {
  TASKER_MIN_ACCEPT_BALANCE_VND: "Số dư ví tối thiểu để nhận đơn",
  TOPUP_MAX_VND: "Số tiền nạp tối đa",
  TOPUP_MIN_VND: "Số tiền nạp tối thiểu",
  TOPUP_VND_PER_USD: "Tỷ giá quy đổi",
  WITHDRAWAL_MAX_PER_WEEK: "Số lần rút tối đa mỗi tuần",
  WITHDRAWAL_MAX_VND: "Số tiền rút tối đa",
  WITHDRAWAL_MIN_VND: "Số tiền rút tối thiểu",
};

const VALUE_LABELS: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  ADMIN: "Quản trị viên",
  APPROVED: "Đã phê duyệt",
  CANCELLED: "Đã hủy",
  CASH: "Tiền mặt",
  COMPLETED: "Hoàn thành",
  CUSTOMER: "Khách hàng",
  DANGER: "Thất bại",
  FAILED: "Thất bại",
  INACTIVE: "Tạm ngưng",
  PENDING: "Chờ xử lý",
  PROCESSED: "Đã xử lý",
  REJECTED: "Đã từ chối",
  SUCCESS: "Thành công",
  TASKER: "Tasker",
  WARNING: "Cảnh báo",
  WALLET: "Ví CleanZ",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY_FIELD_PATTERN = /(amount|price|balance|fee|cost|total)/i;
const DATE_FIELD_PATTERN = /(date|at|time|deadline)$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function capitalize(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function fieldLabel(key: string): string {
  const leafKey = key.split(".").at(-1) ?? key;
  if (SYSTEM_CONFIG_LABELS[leafKey]) return SYSTEM_CONFIG_LABELS[leafKey];
  if (FIELD_LABELS[leafKey]) return FIELD_LABELS[leafKey];
  // Từ điển nghiệp vụ dùng chung cho cả diff: cùng một trường thì phải cùng một tên ở
  // mọi khối, nếu không người đọc tưởng đó là hai số liệu khác nhau.
  if (BUSINESS_DATA_LABELS[leafKey]) return BUSINESS_DATA_LABELS[leafKey];
  if (/id$/i.test(leafKey)) {
    const withoutId = leafKey.replace(/id$/i, "");
    return `${fieldLabel(withoutId)} được chọn`;
  }

  return capitalize(
    leafKey
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim(),
  );
}

function formatBoolean(key: string, value: boolean): string {
  if (key === "isActive") return value ? "Đang hoạt động" : "Tạm ngưng";
  if (key === "isHidden") return value ? "Đã ẩn" : "Đang hiển thị";
  if (key === "isVerified") return value ? "Đã xác minh" : "Chưa xác minh";
  if (key === "isDefault") return value ? "Có" : "Không";
  return value ? "Có" : "Không";
}

function formatDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("vi-VN");
}

function isEncodedStructuredValue(value: string): boolean {
  const trimmed = value.trim();
  if (!(
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  )) {
    return false;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed !== null && typeof parsed === "object";
  } catch {
    return false;
  }
}

function formatValue(key: string, value: unknown): string {
  if (value === "[REDACTED]") return "Đã được ẩn để bảo mật";
  if (value === "[CHANGED]") return "Đã thay đổi (nội dung được bảo mật)";
  if (value === "[REFERENCE]") return "Đã chọn";
  if (value === "[REFERENCE_BEFORE]") return "Lựa chọn trước đó";
  if (value === "[REFERENCE_AFTER]") return "Lựa chọn mới";
  if (value === "[NOT_AVAILABLE]") return "Chưa có dữ liệu";
  if (value === "[EXISTS]") return "Đang tồn tại";
  if (value === "[DELETED]") return "Đã xóa";
  if (value === "[MAX_DEPTH]") return "Đã cập nhật";
  if (value === null) return "Đã xoá giá trị";
  if (typeof value === "boolean") return formatBoolean(key, value);
  if (typeof value === "number") {
    if (MONEY_FIELD_PATTERN.test(key)) {
      return `${value.toLocaleString("vi-VN")} ₫`;
    }
    if (/percentage|percent|rate/i.test(key)) {
      return `${value.toLocaleString("vi-VN")}%`;
    }
    return value.toLocaleString("vi-VN");
  }
  if (typeof value === "string") {
    if (UUID_PATTERN.test(value)) return "Đã chọn";
    if (VALUE_LABELS[value]) return VALUE_LABELS[value];
    if (isEncodedStructuredValue(value)) {
      return "Đã cập nhật thông tin chi tiết";
    }
    if (DATE_FIELD_PATTERN.test(key)) {
      return formatDate(value) ?? value;
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "Không có mục nào";
    const safeValues = value.filter(
      (item): item is string | number =>
        (typeof item === "string" && !UUID_PATTERN.test(item)) ||
        typeof item === "number",
    );
    return safeValues.length === value.length
      ? safeValues.map(String).join(", ")
      : `Đã chọn ${value.length} mục`;
  }
  return "Đã cập nhật";
}

function collectRows(
  record: Record<string, unknown>,
  rows: ActivityChangeRow[],
  depth = 0,
): void {
  for (const [key, value] of Object.entries(record)) {
    if (rows.length >= 12) return;
    const nested = asRecord(value);
    if (nested && depth < 2) {
      collectRows(nested, rows, depth + 1);
      continue;
    }
    rows.push({
      label: fieldLabel(key),
      before: "Không ghi nhận được",
      after: formatValue(key, value),
    });
  }
}

/**
 * Định dạng một giá trị trong khối "Số liệu nghiệp vụ".
 *
 * Tách khỏi `formatValue` của phần diff vì hai khối trả lời hai câu hỏi khác nhau: diff nói
 * "đã đổi từ gì sang gì" nên che tối đa, còn khối này là số liệu để đối chiếu sổ sách nên
 * phải hiện đúng con số — chỉ những gì backend đã ẩn (`[REFERENCE]`) mới nói là đã ẩn.
 */
function formatBusinessValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value === "[REFERENCE]") return "Mã nội bộ (đã ẩn)";
  if (value === "[REDACTED]") return "Đã được ẩn để bảo mật";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") {
    return BUSINESS_MONEY_PATTERN.test(key)
      ? `${value.toLocaleString("vi-VN")} ₫`
      : value.toLocaleString("vi-VN");
  }
  if (typeof value === "string") {
    if (BUSINESS_VALUE_LABELS[value]) return BUSINESS_VALUE_LABELS[value];
    if (VALUE_LABELS[value]) return VALUE_LABELS[value];
    // Cột `numeric` của Postgres về đây là CHUỖI — không ép số thì một khoản tiền hiện
    // ra dạng "1200000.00" ngay cạnh một khoản đã định dạng đẹp.
    if (BUSINESS_MONEY_PATTERN.test(key) && /^-?\d+(\.\d+)?$/.test(value)) {
      return `${Number(value).toLocaleString("vi-VN")} ₫`;
    }
    if (DATE_FIELD_PATTERN.test(key)) return formatDate(value) ?? value;
    return value;
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "Không có mục nào" : `${value.length} mục`;
  }
  return JSON.stringify(value);
}

/** Các dòng của khối "Số liệu nghiệp vụ", đã Việt hoá nhãn và định dạng giá trị. */
export function getActivityBusinessRows(
  activity: AdminActivityItem,
): ActivityBusinessRow[] {
  const data = asRecord(activity.businessData);
  if (!data) return [];
  return Object.entries(data).map(([key, value]) => ({
    key,
    label: BUSINESS_DATA_LABELS[key] ?? fieldLabel(key),
    value: formatBusinessValue(key, value),
  }));
}

function activityBody(activity: AdminActivityItem): Record<string, unknown> {
  return asRecord(activity.changes?.body) ?? {};
}

export function getActivityChangeRows(
  activity: AdminActivityItem,
): ActivityChangeRow[] {
  const storedFields = asRecord(activity.changes?.fields);
  if (storedFields) {
    return Object.entries(storedFields)
      .slice(0, 50)
      .flatMap(([key, value]) => {
        const change = asRecord(value);
        if (!change || !("before" in change) || !("after" in change)) {
          return [];
        }
        return [
          {
            label: fieldLabel(key),
            before: formatValue(key, change.before),
            after: formatValue(key, change.after),
          },
        ];
      });
  }

  const rows: ActivityChangeRow[] = [];
  collectRows(activityBody(activity), rows);
  return rows;
}

function activityAfterValues(
  activity: AdminActivityItem,
): Record<string, unknown> {
  const storedFields = asRecord(activity.changes?.fields);
  if (!storedFields) return activityBody(activity);

  return Object.fromEntries(
    Object.entries(storedFields).flatMap(([key, value]) => {
      const change = asRecord(value);
      return change && "after" in change ? [[key, change.after]] : [];
    }),
  );
}

export function getActivityDisplayAction(activity: AdminActivityItem): string {
  const body = activityAfterValues(activity);
  const target = activity.targetLabel ? ` “${activity.targetLabel}”` : "";
  if (typeof body.isActive === "boolean") {
    return `${body.isActive ? "Kích hoạt" : "Tạm ngưng"} ${activity.resource}${target}`;
  }
  if (typeof body.isHidden === "boolean") {
    return `${body.isHidden ? "Ẩn" : "Hiển thị"} ${activity.resource}${target}`;
  }
  if (typeof body.status === "string") {
    return `Cập nhật trạng thái ${activity.resource}`;
  }
  return activity.action;
}

export function getActivitySummary(activity: AdminActivityItem): string {
  const rows = getActivityChangeRows(activity);
  if (rows.length > 0) {
    return rows
      .slice(0, 2)
      .map((row) => `${row.label}: ${row.before} → ${row.after}`)
      .join(" · ");
  }
  if (activity.errorMessage) return activity.errorMessage;
  return activity.status === "SUCCESS"
    ? "Thao tác đã được thực hiện thành công."
    : "Thao tác chưa được thực hiện.";
}

export function getActivityTargetLabel(activity: AdminActivityItem): string {
  const body = activityAfterValues(activity);
  const identifyingValue = [body.name, body.title, body.code].find(
    (value): value is string =>
      typeof value === "string" &&
      value !== "[REDACTED]" &&
      !UUID_PATTERN.test(value),
  );
  const resource = capitalize(activity.resource);
  if (activity.targetLabel) {
    return `${resource}: ${activity.targetLabel}`;
  }
  return identifyingValue ? `${resource}: ${identifyingValue}` : resource;
}
