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
  POSTED: "bg-muted text-muted-foreground border-border/50",
  CONFIRMED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  TASKER_ON_THE_WAY: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  CHECKED_IN: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  EXPIRED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
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
  PENDING: "text-amber-600 dark:text-amber-400",
  PAID: "text-emerald-600 dark:text-emerald-400",
  FAILED: "text-rose-600 dark:text-rose-400",
  REFUNDED: "text-blue-600 dark:text-blue-400",
  PARTIALLY_REFUNDED: "text-blue-600 dark:text-blue-400",
};

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
    wrap: "bg-emerald-500/5 border-emerald-500/10",
    label: "text-emerald-700 dark:text-emerald-400",
    icon: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-400",
  },
  blue: {
    wrap: "bg-blue-500/5 border-blue-500/10",
    label: "text-blue-700 dark:text-blue-400",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-400",
  },
  red: {
    wrap: "bg-red-500/5 border-red-500/10",
    label: "text-red-700 dark:text-red-400",
    icon: "text-red-600 dark:text-red-400",
    value: "text-red-700 dark:text-red-400",
  },
  amber: {
    wrap: "bg-amber-500/5 border-amber-500/10",
    label: "text-amber-700 dark:text-amber-400",
    icon: "text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-400",
  },
};
