import { toNumber } from 'src/common/helpers/number.helper';

/**
 * Ngưỡng (phút) để gắn cờ checkout sớm bất thường.
 * Phần làm quá giờ không có ngưỡng: phát sinh bao nhiêu phút tính bấy nhiêu.
 */
export const EARLY_CHECKOUT_ABNORMAL_MINUTES = 30;

/**
 * Quy đổi số phút phát sinh ra tiền theo ĐƠN GIÁ GIỜ GỐC của booking.
 * Dùng chung cho phí chốt theo checkout, dữ liệu duyệt cũ và khoản nền tảng
 * ứng trả để mọi nhánh luôn ra cùng một con số.
 */
export function overtimeFeeForMinutes(
  minutes: number,
  durationHours: number,
  basePrice: number,
): number {
  const hours = toNumber(durationHours);
  if (hours <= 0 || minutes <= 0) return 0;
  const hourlyRate = toNumber(basePrice) / hours;
  return Math.round((hourlyRate * minutes) / 60);
}

export interface WorkTimingInput {
  checkedInAt: Date | null | undefined;
  checkoutAt: Date;
  durationHours: number;
  basePrice: number;
}

export interface WorkTiming {
  /** Thời gian làm việc thực tế (phút) = checkout − checkin. */
  workedMinutes: number;
  /** Thời lượng đặt trước (phút) = durationHours × 60. */
  bookedMinutes: number;
  /** Số phút vượt thô so với thời lượng đặt (chưa xét ngưỡng). */
  overtimeMinutes: number;
  /** Số phút phát sinh được tính tiền, đúng bằng thời gian vượt thực tế. */
  billableOvertimeMinutes: number;
  /** Phí phát sinh theo đơn giá giờ gốc của booking. */
  overtimeFee: number;
  /** Số phút kết thúc sớm so với thời lượng đặt (0 nếu không sớm). */
  earlyMinutes: number;
  /** Có giờ phát sinh cần thu (billable > 0). */
  isOvertime: boolean;
  /** Checkout sớm bất thường (sớm > 30 phút) — gắn cờ cho admin. */
  isEarlyAbnormal: boolean;
}

/**
 * Tính thời gian làm việc thực tế của tasker (từ check-in đến check-out) và
 * phần giờ phát sinh / kết thúc sớm so với thời lượng đặt.
 *
 * Hàm thuần, không phụ thuộc DB — mọi quy tắc nghiệp vụ về thời gian/đơn giá
 * tập trung tại đây để dễ kiểm thử và tái sử dụng.
 */
export function computeWorkTiming(input: WorkTimingInput): WorkTiming {
  const durationHours = toNumber(input.durationHours);
  const basePrice = toNumber(input.basePrice);
  const bookedMinutes = Math.max(0, Math.round(durationHours * 60));

  const checkinMs = input.checkedInAt?.getTime();
  const checkoutMs = input.checkoutAt.getTime();

  // Thiếu mốc check-in hoặc thời gian không hợp lệ → coi như làm đúng thời lượng
  // đặt (không phát sinh, không sớm) để tránh tính nhầm.
  const hasValidWindow =
    checkinMs !== undefined &&
    Number.isFinite(checkinMs) &&
    Number.isFinite(checkoutMs) &&
    checkoutMs >= checkinMs;

  const workedMinutes = hasValidWindow
    ? Math.round((checkoutMs - checkinMs) / 60_000)
    : bookedMinutes;

  const overtimeMinutes = Math.max(0, workedMinutes - bookedMinutes);
  const earlyMinutes = Math.max(0, bookedMinutes - workedMinutes);

  // Tính đúng từng phút phát sinh, không áp ngưỡng và không làm tròn theo block.
  const billableOvertimeMinutes = overtimeMinutes;

  const overtimeFee = overtimeFeeForMinutes(
    billableOvertimeMinutes,
    durationHours,
    basePrice,
  );

  return {
    workedMinutes,
    bookedMinutes,
    overtimeMinutes,
    billableOvertimeMinutes,
    overtimeFee,
    earlyMinutes,
    isOvertime: billableOvertimeMinutes > 0,
    isEarlyAbnormal: earlyMinutes > EARLY_CHECKOUT_ABNORMAL_MINUTES,
  };
}
