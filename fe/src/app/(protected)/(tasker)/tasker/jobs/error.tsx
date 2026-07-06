"use client";

import { SegmentErrorFallback } from "@/components/error/SegmentErrorFallback";

export default function TaskerJobsError({
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
      title="Không thể hiển thị công việc"
      description="Trang công việc vừa gặp sự cố hiển thị. Bạn có thể thử lại ngay mà không cần tải lại trang."
    />
  );
}
