"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCaptureTaskerTopup } from "@/features/tasker/hooks/useTaskerWallet";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

function TopupReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topupId = searchParams.get("topupId");
  const capture = useCaptureTaskerTopup();
  const { mutate } = capture;

  // KHÔNG chặn bằng cờ useRef ở đây.
  //
  // StrictMode (dev) chạy effect hai lượt: setup → cleanup → setup. Cờ ref sống
  // sót qua cả hai lượt, nên `mutate` chỉ được gọi từ observer của lượt đầu — cái
  // đã bị huỷ đăng ký ngay sau đó. Observer của lượt thứ hai là cái đang render,
  // và nó không biết gì về mutation đang chạy → `isIdle` giữ nguyên vĩnh viễn,
  // màn "Đang xác nhận thanh toán" không bao giờ thoát dù backend đã cộng tiền.
  //
  // `mutate` có tham chiếu ổn định (React Query v5) nên effect chỉ chạy lại khi
  // `topupId` đổi. StrictMode gọi hai lần là chấp nhận được: `captureTopup` khoá
  // row rồi kiểm tra `status === COMPLETED && walletTxId` nên lần hai chỉ đọc lại
  // kết quả, không cộng ví lần nữa.
  useEffect(() => {
    if (!topupId) return;
    mutate(topupId);
  }, [topupId, mutate]);

  if (!topupId) {
    return (
      <StatusCard
        tone="error"
        title="Thiếu mã đơn nạp"
        description="Đường dẫn không hợp lệ. Vui lòng thử lại từ mục Ví."
        onBack={() => router.push("/tasker/earnings")}
      />
    );
  }

  if (capture.isPending || capture.isIdle) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <Loader2 className="size-10 animate-spin text-primary" />
        <div>
          <h1 className="text-lg font-bold">Đang xác nhận thanh toán...</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vui lòng không đóng trang này.
          </p>
        </div>
      </div>
    );
  }

  if (capture.isError) {
    return (
      <StatusCard
        tone="error"
        title="Nạp tiền chưa hoàn tất"
        description={getErrorMessage(capture.error)}
        onBack={() => router.push("/tasker/earnings")}
      />
    );
  }

  return (
    <StatusCard
      tone="success"
      title="Nạp tiền thành công"
      description={`Đã cộng ${formatVnd(Number(capture.data?.amountVnd ?? 0))} vào ví. Số dư hiện tại: ${formatVnd(Number(capture.data?.balance ?? 0))}.`}
      onBack={() => router.push("/tasker/earnings")}
    />
  );
}

function StatusCard({
  tone,
  title,
  description,
  onBack,
}: {
  tone: "success" | "error";
  title: string;
  description: string;
  onBack: () => void;
}) {
  const success = tone === "success";
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div
        className={`mb-5 flex size-16 items-center justify-center rounded-full ${
          success
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-destructive/10 text-destructive"
        }`}
      >
        {success ? (
          <CheckCircle2 className="size-8" />
        ) : (
          <AlertCircle className="size-8" />
        )}
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <Button className="mt-6 rounded-xl" onClick={onBack}>
        Về trang Thu nhập
      </Button>
    </div>
  );
}

export default function TaskerTopupReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <TopupReturnContent />
    </Suspense>
  );
}
