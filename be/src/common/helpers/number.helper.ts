export function toNumber(value?: number | string | null): number {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

/**
 * Làm tròn về đồng VND nguyên. Cột tiền là `numeric(12,2)` nhưng nghiệp vụ VND
 * không có xu; ép nguyên ở biên chuyển tiền để tránh lệch xu khi so sánh/bảo toàn tổng.
 */
export function roundVnd(value?: number | string | null): number {
  return Math.round(toNumber(value));
}
