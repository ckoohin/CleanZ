"use client";

import React from "react";
import { Info, AlertCircle } from "lucide-react";

/**
 * Dòng gợi ý yêu cầu nhập liệu cho admin: mô tả ràng buộc của trường (hint),
 * và hiển thị lỗi (error) đè lên khi giá trị hiện tại không hợp lệ.
 */
export function FieldHint({
  hint,
  error,
}: {
  hint?: React.ReactNode;
  error?: React.ReactNode;
}) {
  if (error) {
    return (
      <p className="flex items-start gap-1 text-[11px] leading-snug text-[#DC2626]">
        <AlertCircle className="mt-px size-3 shrink-0" />
        <span>{error}</span>
      </p>
    );
  }
  if (!hint) return null;
  return (
    <p className="flex items-start gap-1 text-[11px] leading-snug text-[var(--c-muted)]">
      <Info className="mt-px size-3 shrink-0" />
      <span>{hint}</span>
    </p>
  );
}

/** Bộ đếm ký tự cho các trường có giới hạn MaxLength. */
export function CharCount({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const over = len > max;
  return (
    <span
      className={`text-[10px] tabular-nums ${over ? "text-[#DC2626]" : "text-[var(--c-muted)]"}`}
    >
      {len}/{max}
    </span>
  );
}

/** Nhãn trường kèm đánh dấu bắt buộc. */
export function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-1 text-xs font-medium text-[var(--c-ink)]"
    >
      {children}
      {required && <span className="text-[#DC2626]">*</span>}
    </label>
  );
}
