import {
  CalendarClock,
  CircleEllipsis,
  CreditCard,
  Gavel,
  UserRoundX,
  Hammer,
  Sparkles,
  UserX,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { TicketCategory } from './ticket.enums';

/**
 * Icon + mô tả ngắn cho từng loại vấn đề, dùng ở lưới chọn loại khi người dùng
 * tạo yêu cầu hỗ trợ.
 *
 * Tách riêng khỏi `ticket.labels.ts` để phần nhãn (dùng chung với Admin, chạy
 * cả ở nơi không cần icon) không kéo theo `lucide-react`.
 */
export const CATEGORY_ICON: Record<TicketCategory, LucideIcon> = {
  SERVICE_QUALITY: Sparkles,
  TASKER_BEHAVIOR: UserX,
  SCHEDULING: CalendarClock,
  PROPERTY_DAMAGE: Hammer,
  PAYMENT_BILLING: CreditCard,
  CUSTOMER_ABSENCE_DISPUTE: UserRoundX,
  ACCOUNT_TECHNICAL: Wrench,
  APPEAL: Gavel,
  OTHER: CircleEllipsis,
};

/**
 * Câu mô tả phụ dưới nhãn — giúp người dùng chọn đúng loại ngay lần đầu thay vì
 * đoán từ 2-3 chữ. Chỉ những loại dễ nhầm mới cần.
 */
const CATEGORY_HINT: Partial<Record<TicketCategory, string>> = {
  SERVICE_QUALITY: 'Dọn chưa sạch, thiếu hạng mục',
  TASKER_BEHAVIOR: 'Thái độ, ứng xử của Tasker',
  SCHEDULING: 'Trễ giờ, đổi lịch, huỷ đơn',
  PROPERTY_DAMAGE: 'Làm hỏng, mất đồ trong nhà',
  PAYMENT_BILLING: 'Sai tiền, hoàn tiền, hoá đơn',
  CUSTOMER_ABSENCE_DISPUTE: 'Yêu cầu kiểm tra lại báo cáo khách vắng',
  ACCOUNT_TECHNICAL: 'Đăng nhập, lỗi ứng dụng',
  APPEAL: 'Xin mở lại tài khoản bị khoá',
};

const TASKER_CATEGORY_HINT: Partial<Record<TicketCategory, string>> = {
  SCHEDULING: 'Khách đổi lịch, huỷ đơn phút chót',
  PROPERTY_DAMAGE: 'Tranh chấp hư hỏng tài sản',
  PAYMENT_BILLING: 'Thu nhập, đối soát, rút tiền',
};

export function categoryHintFor(
  category: TicketCategory,
  role: 'CUSTOMER' | 'TASKER' | undefined,
): string | undefined {
  if (role === 'TASKER') {
    return TASKER_CATEGORY_HINT[category] ?? CATEGORY_HINT[category];
  }
  return CATEGORY_HINT[category];
}

/** Mô tả cho ô "Khác" — ô này tách riêng nên câu chữ dài hơn các loại còn lại. */
export const OTHER_CATEGORY_HINT =
  'Vấn đề không thuộc các loại trên — cứ mô tả, chúng tôi sẽ phân loại giúp bạn.';
