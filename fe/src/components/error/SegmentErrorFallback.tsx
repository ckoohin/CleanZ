"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SegmentErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}

/**
 * UI dùng chung cho các `error.tsx` cấp segment. Biến một lỗi render (vốn làm
 * trắng màn hình, phải F5) thành thẻ khôi phục được: nút "Thử lại" gọi `reset()`
 * để render lại segment mà không reload cả trang.
 */
export function SegmentErrorFallback({
  error,
  reset,
  title = "Đã xảy ra lỗi hiển thị",
  description = "Giao diện vừa gặp sự cố ngoài ý muốn. Bạn có thể thử lại ngay mà không cần tải lại trang.",
}: SegmentErrorFallbackProps) {
  useEffect(() => {
    console.error("[SegmentError]", error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        {error?.digest && (
          <p className="mt-3 inline-block rounded-lg bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Mã lỗi: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="h-11 flex-1 gap-2 rounded-2xl font-bold"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Button>
          <Button
            className="h-11 flex-1 gap-2 rounded-2xl font-bold"
            onClick={() => reset()}
          >
            <RotateCcw className="h-4 w-4" /> Thử lại
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SegmentErrorFallback;
