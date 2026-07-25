"use client";

import { SegmentErrorFallback } from "@/components/error/SegmentErrorFallback";

/**
 * Trước đây chỉ /tasker/jobs có error.tsx, nên lỗi render ở các trang tasker khác
 * (hồ sơ, ví, lịch...) bung thẳng tới global-error và thay cả trang bằng màn hình
 * sự cố toàn cục. Boundary này giữ lỗi lại trong vùng nội dung, còn sidebar và
 * thanh điều hướng vẫn dùng được.
 */
export default function TaskerSegmentError({
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
      title="Không thể hiển thị trang này"
      description="Trang vừa gặp sự cố hiển thị. Bạn có thể thử lại ngay mà không cần tải lại toàn bộ ứng dụng."
    />
  );
}
