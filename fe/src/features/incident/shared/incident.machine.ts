/**
 * Incident — các quy tắc FE được phép tự kiểm.
 *
 * FE chỉ chặn trước & giải thích; BE là chốt chặn cuối (409/422). Bảng chuyển
 * trạng thái và điều kiện "phải cho Tasker phản biện" KHÔNG nằm ở đây: hành
 * động khả dụng đến từ `decision.allowedActions` và `decision.requiresTaskerResponse`
 * do BE tính. Giữ một bản sao ở FE chỉ tạo nguồn sự thật thứ hai, âm thầm lệch
 * đi khi BE đổi luật mà không ai phát hiện.
 */
import type { IncidentStatus } from './incident.enums';

/**
 * Khách tự rút báo cáo: chỉ khi quyết định CHƯA được gửi cho Tasker và chưa chốt.
 * Một điều kiện duy nhất thay cho bộ ba status/decisionStatus/compensationStatus cũ.
 */
export function canWithdraw(status: IncidentStatus): boolean {
  return status === 'REPORTED' || status === 'REVIEWING';
}

// ─── Bất biến phân bổ tiền (dùng cho DecisionPanel) ──────────────────────────
export interface AllocationCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Tiền trong hệ thống là VND SỐ NGUYÊN: mọi trường tiền của backend đều khai
 * `@IsInt()` (`create-incident`, `create-from-ticket`, `save-incident-decision`).
 *
 * Ô `<input type="number">` chỉ ràng buộc `step` cho nút tăng/giảm, người dùng
 * vẫn gõ tay được phần thập phân — nên form phải tự gác, nếu không giá trị đi
 * hết hành trình rồi mới bị backend trả 422.
 */
export function isIntegerAmount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/**
 * taskerBorne + platformBorne PHẢI bằng Σ approved.
 *
 * So sánh trực tiếp là ĐÚNG ở đây vì cả ba đều là số nguyên theo hợp đồng
 * backend — không có sai số dấu phẩy động để phải né. Đổi lại, phải tự chặn
 * phần thập phân trước, bằng không giá trị lọt qua form rồi mới ăn 422.
 */
export function checkAllocation(
  sumApproved: number,
  taskerBorne: number,
  platformBorne: number,
): AllocationCheck {
  if (taskerBorne < 0 || platformBorne < 0)
    return { ok: false, reason: 'Số tiền không hợp lệ' };
  if (!isIntegerAmount(taskerBorne) || !isIntegerAmount(platformBorne))
    return {
      ok: false,
      reason: 'Số tiền phải là số nguyên VND, không có phần thập phân',
    };
  if (taskerBorne + platformBorne !== sumApproved)
    return {
      ok: false,
      reason: 'Phần Tasker + phần quỹ nền tảng phải bằng tổng được duyệt',
    };
  return { ok: true };
}
