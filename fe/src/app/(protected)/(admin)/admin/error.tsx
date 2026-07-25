"use client";

import { SegmentErrorFallback } from "@/components/error/SegmentErrorFallback";

/**
 * Boundary cấp segment: giữ lỗi render lại trong vùng nội dung thay vì để bung
 * tới global-error (thay cả trang bằng màn hình sự cố toàn cục, phải F5).
 */
export default function AdminSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentErrorFallback
      error={error}
      reset={reset}
      title="Không thể hiển thị trang quản trị"
      description="Trang vừa gặp sự cố hiển thị. Bạn có thể thử lại ngay mà không cần tải lại toàn bộ ứng dụng."
    />
  );
}
