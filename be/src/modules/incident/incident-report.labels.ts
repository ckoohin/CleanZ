import { IncidentStatus } from 'src/common/enums/incident-status.enum';
import { IncidentSeverity } from 'src/common/enums/incident-severity.enum';
import { IncidentType } from 'src/common/enums/incident-type.enum';
import { IncidentSource } from 'src/common/enums/incident-source.enum';
import { IncidentClosureReason } from 'src/common/enums/incident-closure-reason.enum';
import { IncidentResponsibilityParty } from 'src/common/enums/incident-responsibility-party.enum';
import { IncidentDecisionOutcome } from 'src/common/enums/incident-decision-outcome.enum';

/**
 * Nhãn tiếng Việt của các enum sự cố — dùng cho file Excel xuất ra.
 *
 * Bản sao của `fe/src/features/incident/shared/incident.labels.ts`. Backend
 * trước nay không cần nhãn nên mọi thứ nó sinh ra sẽ lòi enum thô kiểu
 * `AWAITING_PAYOUT` cho người đọc. Đổi chữ ở một bên PHẢI đổi cả hai, nếu không
 * file tải về gọi tên khác với màn hình admin vừa nhìn.
 *
 * `IncidentType` và `IncidentSource` chưa có nhãn ở frontend (queue không hiện
 * hai cột đó) — nhãn dưới đây là bản đầu tiên, đặt tên theo đúng ngữ cảnh
 * nghiệp vụ mà enum mô tả.
 */

export const INC_STATUS_LABEL_VI: Record<IncidentStatus, string> = {
  [IncidentStatus.REPORTED]: 'Chờ tiếp nhận',
  [IncidentStatus.REVIEWING]: 'Đang thẩm định',
  [IncidentStatus.AWAITING_RESPONSE]: 'Chờ Tasker phản biện',
  [IncidentStatus.AWAITING_PAYOUT]: 'Chờ chi trả',
  [IncidentStatus.COMPENSATED]: 'Đã bồi thường',
  [IncidentStatus.REJECTED]: 'Đã bác bỏ',
  [IncidentStatus.CLOSED]: 'Đã đóng',
};

export const INC_SEVERITY_LABEL_VI: Record<IncidentSeverity, string> = {
  [IncidentSeverity.CRITICAL]: 'Nghiêm trọng',
  [IncidentSeverity.MAJOR]: 'Lớn',
  [IncidentSeverity.MINOR]: 'Nhỏ',
};

export const INC_TYPE_LABEL_VI: Record<IncidentType, string> = {
  [IncidentType.PROPERTY_DAMAGE]: 'Hư hỏng tài sản',
  [IncidentType.CHECKIN_VIOLATION]: 'Vi phạm check-in',
  [IncidentType.NO_SHOW]: 'Không đến làm',
};

export const INC_SOURCE_LABEL_VI: Record<IncidentSource, string> = {
  [IncidentSource.CUSTOMER_REPORT]: 'Khách tự báo cáo',
  [IncidentSource.SUPPORT_TICKET]: 'Nâng cấp từ phiếu hỗ trợ',
  [IncidentSource.CHECKIN_REVIEW]: 'Admin duyệt check-in',
  [IncidentSource.NO_SHOW_REVIEW]: 'Admin duyệt vắng mặt',
};

export const INC_CLOSURE_LABEL_VI: Record<IncidentClosureReason, string> = {
  [IncidentClosureReason.COMPENSATED]: 'Đã bồi thường',
  [IncidentClosureReason.REJECTED]: 'Bị từ chối',
  [IncidentClosureReason.NO_COMPENSATION]: 'Không bồi thường',
  [IncidentClosureReason.WITHDRAWN]: 'Khách đã rút',
  [IncidentClosureReason.DUPLICATE]: 'Trùng lặp',
  [IncidentClosureReason.INVALID_BOOKING]: 'Đơn không hợp lệ',
  [IncidentClosureReason.EXPIRED]: 'Hết hạn',
};

export const INC_RESPONSIBILITY_LABEL_VI: Record<
  IncidentResponsibilityParty,
  string
> = {
  [IncidentResponsibilityParty.TASKER]: 'Tasker chịu',
  [IncidentResponsibilityParty.PLATFORM]: 'Nền tảng chịu',
  [IncidentResponsibilityParty.SHARED]: 'Chia sẻ',
  [IncidentResponsibilityParty.UNDETERMINED]: 'Chưa xác định (CleanZ chịu)',
};

export const INC_OUTCOME_LABEL_VI: Record<IncidentDecisionOutcome, string> = {
  [IncidentDecisionOutcome.COMPENSATE]: 'Bồi thường',
  [IncidentDecisionOutcome.NO_COMPENSATION]: 'Công nhận, không bồi thường',
  [IncidentDecisionOutcome.REJECT]: 'Bác bỏ (báo cáo sai)',
};

export const INC_COMP_SOURCE_LABEL_VI: Record<string, string> = {
  TASKER_DEPOSIT: 'Ví Tasker',
  PLATFORM_FUND: 'Quỹ nền tảng',
  MIXED: 'Kết hợp',
};

/** Tra nhãn an toàn: enum lạ (dữ liệu cũ) trả về giá trị thô thay vì ô trống. */
export function incLabel(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = '—',
): string {
  if (!value) return fallback;
  return map[value] ?? value;
}
