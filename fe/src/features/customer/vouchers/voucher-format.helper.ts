import type { AvailableVoucher } from "./useCustomerVouchers";

export function formatVoucherDiscount(voucher: AvailableVoucher): string {
  if (voucher.type === "PERCENT") {
    const base = `Giảm ${voucher.value}%`;
    return voucher.maxDiscount
      ? `${base} (tối đa ${voucher.maxDiscount.toLocaleString("vi-VN")}đ)`
      : base;
  }
  return `Giảm ${voucher.value.toLocaleString("vi-VN")}đ`;
}
