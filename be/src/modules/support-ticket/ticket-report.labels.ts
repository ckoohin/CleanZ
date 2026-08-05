import { SupportTicketStatus } from 'src/common/enums/support-ticket-status.enum';
import { TicketCategory } from 'src/common/enums/ticket-category.enum';
import { TicketPriority } from 'src/common/enums/ticket-priority.enum';
import { TicketSource } from 'src/common/enums/ticket-source.enum';
import { TicketPendingReason } from 'src/common/enums/ticket-pending-reason.enum';
import { ResolutionType } from 'src/common/enums/resolution-type.enum';

/**
 * Nhãn tiếng Việt của các enum ticket — dùng cho file Excel xuất ra.
 *
 * Đây là BẢN SAO của `fe/src/features/support-tickets/shared/ticket.labels.ts`.
 * Trước đây nhãn chỉ tồn tại ở frontend, nên mọi thứ backend sinh ra (file
 * báo cáo) sẽ lòi enum thô kiểu `SERVICE_QUALITY` ra cho người đọc. Khi đổi
 * chữ ở một bên, PHẢI đổi cả hai — nếu không file tải về sẽ gọi tên khác với
 * màn hình admin vừa nhìn.
 */

export const STATUS_LABEL_VI: Record<SupportTicketStatus, string> = {
  [SupportTicketStatus.NEW]: 'Mới',
  [SupportTicketStatus.IN_PROGRESS]: 'Đang xử lý',
  [SupportTicketStatus.PENDING]: 'Tạm chờ',
  [SupportTicketStatus.RESOLVED]: 'Đã giải quyết',
  [SupportTicketStatus.CLOSED]: 'Đã đóng',
};

export const CATEGORY_LABEL_VI: Record<TicketCategory, string> = {
  [TicketCategory.SERVICE_QUALITY]: 'Chất lượng dịch vụ',
  [TicketCategory.TASKER_BEHAVIOR]: 'Hành vi Tasker',
  [TicketCategory.SCHEDULING]: 'Lịch hẹn',
  [TicketCategory.PROPERTY_DAMAGE]: 'Hư hỏng tài sản',
  [TicketCategory.PAYMENT_BILLING]: 'Thanh toán',
  [TicketCategory.ACCOUNT_TECHNICAL]: 'Tài khoản / Kỹ thuật',
  [TicketCategory.APPEAL]: 'Kháng cáo khóa tài khoản',
  [TicketCategory.OTHER]: 'Khác',
};

export const PRIORITY_LABEL_VI: Record<TicketPriority, string> = {
  [TicketPriority.URGENT]: 'Khẩn cấp',
  [TicketPriority.HIGH]: 'Cao',
  [TicketPriority.MEDIUM]: 'Trung bình',
  [TicketPriority.LOW]: 'Thấp',
};

export const SOURCE_LABEL_VI: Record<TicketSource, string> = {
  [TicketSource.CUSTOMER_APP]: 'Ứng dụng khách hàng',
  [TicketSource.TASKER_APP]: 'Ứng dụng Tasker',
  [TicketSource.TASKER_APPEAL]: 'Kháng cáo từ Tasker',
  [TicketSource.ADMIN]: 'Tổng đài CleanZ',
};

export const PENDING_REASON_LABEL_VI: Record<TicketPendingReason, string> = {
  [TicketPendingReason.WAIT_CUSTOMER]: 'Chờ khách hàng',
  [TicketPendingReason.WAIT_TASKER]: 'Chờ Tasker',
  [TicketPendingReason.WAIT_INTERNAL]: 'Chờ nội bộ',
};

export const RESOLUTION_LABEL_VI: Record<ResolutionType, string> = {
  [ResolutionType.EXPLANATION]: 'Giải thích',
  [ResolutionType.RECLEAN]: 'Làm lại',
  [ResolutionType.VOUCHER]: 'Voucher',
  [ResolutionType.REFUND]: 'Hoàn tiền',
  [ResolutionType.COMPENSATION]: 'Bồi thường',
  [ResolutionType.TASKER_PENALTY]: 'Phạt Tasker',
};

/**
 * Tra nhãn an toàn: enum lạ (dữ liệu cũ, giá trị mới chưa kịp thêm nhãn) trả về
 * chính giá trị thô thay vì `undefined` — thà đọc thấy chữ hoa còn hơn ô trống.
 */
export function labelOf(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = '—',
): string {
  if (!value) return fallback;
  return map[value] ?? value;
}
