import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

/**
 * Mã lỗi DUY NHẤT nghĩa là "bản trên server đã đổi, tải lại rồi thử lại".
 *
 * Nhận diện xung đột phiên bản theo MÃ, không theo HTTP status. Module incident trả 409
 * cho rất nhiều tình huống nghiệp vụ khác hẳn:
 *
 *   PLATFORM_FUND_INSUFFICIENT · TASKER_RESPONSE_WAITING · TASKER_RESPONSE_REQUIRED ·
 *   INCIDENT_NOT_AWAITING_PAYOUT · COMPENSATION_ALREADY_PAID · REVERSAL_WINDOW_EXPIRED ·
 *   CUSTOMER_BALANCE_INSUFFICIENT_FOR_REVERSAL · COMPENSATION_DEBT_RECOVERY_STARTED ·
 *   TASKER_RESPONSE_WINDOW_EXPIRED · TASKER_RESPONSE_ALREADY_REVIEWED · …
 *
 * Gộp tất cả vào câu "phiên bản quyết định đã thay đổi" là giấu mất lý do thật, và tệ hơn
 * là gợi ý sai cách xử lý: người dùng nghe "đã tải lại" nên bấm lại — trong khi quỹ vẫn
 * cạn, hoặc hạn phản hồi vẫn đã trôi qua.
 */
export const DECISION_VERSION_CONFLICT = "DECISION_VERSION_CONFLICT";

export const VERSION_CONFLICT_MESSAGE =
  "Phiên bản quyết định đã thay đổi. Dữ liệu đã được tải lại.";

export function getIncidentErrorCode(error: unknown): string | undefined {
  return (error as { response?: { data?: { code?: string } } })?.response?.data
    ?.code;
}

export function isDecisionVersionConflict(error: unknown): boolean {
  return getIncidentErrorCode(error) === DECISION_VERSION_CONFLICT;
}

/**
 * Thông điệp hiển thị cho một lỗi 409 của module incident: câu chuẩn cho xung đột phiên
 * bản, còn lại thì dùng đúng message backend gửi kèm.
 */
export function conflictMessage(error: unknown): string {
  return isDecisionVersionConflict(error)
    ? VERSION_CONFLICT_MESSAGE
    : getErrorMessage(error);
}

export function isConflict(error: unknown): boolean {
  return (
    (error as { response?: { status?: number } })?.response?.status === 409
  );
}
