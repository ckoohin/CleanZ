import type { ReactNode } from "react";
import {
  toast as sonnerToast,
  type ExternalToast,
} from "sonner";

type ToastKind =
  | "default"
  | "success"
  | "info"
  | "warning"
  | "error"
  | "message"
  | "loading";

function toStableText(value: ReactNode | (() => ReactNode)): string | null {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : null;
}

/**
 * Các nơi gọi toast cùng loại/nội dung/mô tả sẽ dùng chung ID. Sonner cập nhật
 * toast có cùng ID thay vì tạo thêm một thẻ mới, nên interceptor và UI có thể
 * cùng báo một lỗi mà người dùng vẫn chỉ thấy một thông báo.
 */
export function getToastDedupeId(
  kind: ToastKind,
  message: ReactNode | (() => ReactNode),
  options?: ExternalToast,
): string | number | undefined {
  if (options?.id !== undefined) return options.id;

  const title = toStableText(message);
  if (!title) return undefined;

  const description = options?.description
    ? toStableText(options.description)
    : null;

  return `cleanz:${kind}:${title}:${description ?? ""}`;
}

function withDedupeId(
  kind: ToastKind,
  method: typeof sonnerToast.error,
): typeof sonnerToast.error {
  return ((message, options) =>
    method(message, {
      ...options,
      id: getToastDedupeId(kind, message, options),
    })) as typeof sonnerToast.error;
}

const defaultToast = ((message, options) =>
  sonnerToast(message, {
    ...options,
    id: getToastDedupeId("default", message, options),
  })) as typeof sonnerToast;

export const toast = Object.assign(defaultToast, sonnerToast, {
  success: withDedupeId("success", sonnerToast.success),
  info: withDedupeId("info", sonnerToast.info),
  warning: withDedupeId("warning", sonnerToast.warning),
  error: withDedupeId("error", sonnerToast.error),
  message: withDedupeId("message", sonnerToast.message),
  loading: withDedupeId("loading", sonnerToast.loading),
}) as typeof sonnerToast;
