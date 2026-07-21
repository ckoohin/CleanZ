import { toNumber } from 'src/common/helpers/number.helper';

/**
 * Ngưỡng (phút) để tính giờ phát sinh / gắn cờ checkout sớm bất thường.
 * - Làm > thời lượng đặt quá 30 phút → tính phí phát sinh (toàn bộ phần vượt).
 * - Làm ít hơn thời lượng đặt quá 30 phút → checkout sớm bất thường (admin kiểm tra).
 */
export const WORK_OVERTIME_THRESHOLD_MINUTES = 30;
export const EARLY_CHECKOUT_ABNORMAL_MINUTES = 30;
/** Đơn vị làm tròn phần giờ phát sinh (block 30 phút, làm tròn lên). */
export const OVERTIME_ROUNDING_MINUTES = 30;

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
  /** Số phút phát sinh được tính tiền (đã làm tròn block 30p; 0 nếu vượt ≤ 30p). */
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
 * Hàm thuần, không phụ thuộc DB — mọi quy tắc nghiệp vụ về ngưỡng/đơn giá tập
 * trung tại đây để dễ kiểm thử và tái sử dụng.
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

  // Chỉ tính tiền khi vượt > 30 phút, và khi đã vượt thì tính TOÀN BỘ phần vượt,
  // làm tròn lên theo block 30 phút.
  const billableOvertimeMinutes =
    overtimeMinutes > WORK_OVERTIME_THRESHOLD_MINUTES
      ? Math.ceil(overtimeMinutes / OVERTIME_ROUNDING_MINUTES) *
        OVERTIME_ROUNDING_MINUTES
      : 0;

  const hourlyRate = durationHours > 0 ? basePrice / durationHours : 0;
  const overtimeFee = Math.round((hourlyRate * billableOvertimeMinutes) / 60);

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
