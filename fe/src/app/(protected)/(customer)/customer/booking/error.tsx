"use client";

import { SegmentErrorFallback } from "@/components/error/SegmentErrorFallback";

export default function CustomerBookingError({
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
      title="Không thể hiển thị đơn hàng"
      description="Trang chi tiết đơn vừa gặp sự cố hiển thị. Bạn có thể thử lại ngay mà không cần tải lại trang."
    />
  );
}
