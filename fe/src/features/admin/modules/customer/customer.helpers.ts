/**
 * Shared formatters and label/style maps for the admin customer module.
 * Kept in one place so the list table and detail page stay in sync.
 */
import type { PaymentMethod } from "./types/customer.types";

/** VND currency, no fractional digits (đồng has no minor unit). */
export const formatVND = (value?: number | null) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

/** Short date: dd/mm/yyyy. */
export const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "N/A";

/** Long date with time, used on the detail page. */
export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";

/** Full date-time down to seconds, dùng cho trường audit "Cập nhật bởi" ở chi tiết. */
export const formatDateTimeFull = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "N/A";

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Tiền mặt",
  MOMO: "MoMo",
  ZALOPAY: "ZaloPay",
  VNPAY: "VNPay",
  VIETQR: "VietQR",
};

/** Ordered options for the customer form's payment-method select. */
export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  "CASH",
  "MOMO",
  "ZALOPAY",
  "VNPAY",
  "VIETQR",
].map((value) => ({
  value: value as PaymentMethod,
  label: PAYMENT_METHOD_LABELS[value],
}));

export const BOOKING_STATUS_STYLES: Record<string, string> = {
  POSTED: "bg-[var(--c-chip)] text-[var(--c-muted)] border-[var(--c-line)]",
  CONFIRMED: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] border-[rgba(37,99,235,0.2)]",
  TASKER_ON_THE_WAY: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] border-[rgba(37,99,235,0.2)]",
  CHECKED_IN: "bg-[rgba(217,119,6,0.14)] text-[#D97706] border-[rgba(217,119,6,0.24)]",
  IN_PROGRESS: "bg-[rgba(217,119,6,0.14)] text-[#D97706] border-[rgba(217,119,6,0.24)]",
  COMPLETED: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] border-[rgba(14,159,110,0.2)]",
  CANCELLED: "bg-[rgba(225,29,72,0.12)] text-[#E11D48] border-[rgba(225,29,72,0.2)]",
  EXPIRED: "bg-[rgba(225,29,72,0.12)] text-[#E11D48] border-[rgba(225,29,72,0.2)]",
};

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  POSTED: "Đăng tải",
  CONFIRMED: "Xác nhận",
  TASKER_ON_THE_WAY: "Đang đến",
  CHECKED_IN: "Đã đến",
  IN_PROGRESS: "Đang làm việc",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

/** Nhãn trạng thái thanh toán của đơn — phủ hết các trạng thái backend trả về. */
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán thất bại",
  REFUNDED: "Đã hoàn tiền",
  PARTIALLY_REFUNDED: "Hoàn tiền một phần",
};

/** Màu chữ tương ứng từng trạng thái thanh toán; mặc định là muted. */
export const PAYMENT_STATUS_TEXT_STYLES: Record<string, string> = {
  PENDING: "text-[#D97706]",
  PAID: "text-[#0E9F6E]",
  FAILED: "text-[#E11D48]",
  REFUNDED: "text-[#2563EB]",
  PARTIALLY_REFUNDED: "text-[#2563EB]",
  CANCELLED: "text-[#E11D48]",
};

export function isCancelledBookingStatus(status?: string | null) {
  return status === "CANCELLED" || status === "EXPIRED";
}

export function getBookingPaymentStatusLabel(
  bookingStatus?: string | null,
  paymentStatus?: string | null,
) {
  if (isCancelledBookingStatus(bookingStatus)) return "Đã hủy";
  if (!paymentStatus) return "—";
  return PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus;
}

export function getBookingPaymentStatusTextStyle(
  bookingStatus?: string | null,
  paymentStatus?: string | null,
) {
  if (isCancelledBookingStatus(bookingStatus)) return PAYMENT_STATUS_TEXT_STYLES.CANCELLED;
  return paymentStatus
    ? PAYMENT_STATUS_TEXT_STYLES[paymentStatus] || "text-[var(--c-muted)]"
    : "text-[var(--c-muted)]";
}

/**
 * Static class sets for the detail-page stat cards.
 * Built explicitly (not via `bg-${color}-500/5` interpolation) because Tailwind
 * cannot detect dynamically-constructed class names — interpolated variants would
 * be purged from the CSS bundle and silently render unstyled.
 */
export interface StatCardStyle {
  wrap: string;
  label: string;
  icon: string;
  value: string;
}

export const STAT_CARD_STYLES: Record<
  "emerald" | "blue" | "red" | "amber",
  StatCardStyle
> = {
  emerald: {
    wrap: "bg-[rgba(14,159,110,0.06)] border-[rgba(14,159,110,0.14)]",
    label: "text-[#0E9F6E]",
    icon: "text-[#0E9F6E]",
    value: "text-[#0E9F6E]",
  },
  blue: {
    wrap: "bg-[rgba(37,99,235,0.06)] border-[rgba(37,99,235,0.14)]",
    label: "text-[#2563EB]",
    icon: "text-[#2563EB]",
    value: "text-[#2563EB]",
  },
  red: {
    wrap: "bg-[rgba(225,29,72,0.06)] border-[rgba(225,29,72,0.14)]",
    label: "text-[#E11D48]",
    icon: "text-[#E11D48]",
    value: "text-[#E11D48]",
  },
  amber: {
    wrap: "bg-[rgba(217,119,6,0.06)] border-[rgba(217,119,6,0.16)]",
    label: "text-[#D97706]",
    icon: "text-[#D97706]",
    value: "text-[#D97706]",
  },
};
