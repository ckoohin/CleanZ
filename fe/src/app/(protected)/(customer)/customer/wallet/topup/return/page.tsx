"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCaptureTopup } from "@/features/customer/wallet/hooks/useCustomerWallet";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

/**
 * PayOS đá khách về đây sau khi thanh toán. Trang này gọi capture để cộng ví.
 * Capture idempotent ở backend (khóa row + walletTxId), nên F5 không cộng tiền 2 lần.
 */
function TopupReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topupId = searchParams.get("topupId");

  const capture = useCaptureTopup();
  const { mutate } = capture;

  // Không chặn bằng cờ useRef: StrictMode chạy effect hai lượt, cờ sống sót qua cả
  // hai nên `mutate` chỉ được gọi từ observer của lượt đầu — cái đã bị huỷ đăng ký.
  // Observer đang render không biết mutation nào đang chạy → `isIdle` giữ nguyên và
  // màn "Đang xác nhận thanh toán" treo vĩnh viễn dù backend đã cộng tiền.
  // `mutate` có tham chiếu ổn định nên effect chỉ chạy lại khi `topupId` đổi.
  useEffect(() => {
    if (!topupId) return;
    mutate(topupId);
  }, [topupId, mutate]);

  if (!topupId) {
    return (
      <StatusCard
        tone="error"
        title="Thiếu mã đơn nạp"
        description="Đường dẫn không hợp lệ. Vui lòng thử nạp lại từ trang ví."
        onBack={() => router.push("/customer/wallet")}
      />
    );
  }

  if (capture.isPending || capture.isIdle) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
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
        onBack={() => router.push("/customer/wallet")}
      />
    );
  }

  return (
    <StatusCard
      tone="success"
      title="Nạp tiền thành công"
      description={
        Number(capture.data?.debtRecovered ?? 0) > 0
          ? `Đã nạp ${formatVnd(Number(capture.data?.amountVnd ?? 0))}; trong đó ${formatVnd(Number(capture.data?.debtRecovered ?? 0))} được tự động dùng để trả công nợ. Số dư khả dụng hiện tại: ${formatVnd(Number(capture.data?.balance ?? 0))}.`
          : `Đã cộng ${formatVnd(Number(capture.data?.amountVnd ?? 0))} vào ví. Số dư hiện tại: ${formatVnd(Number(capture.data?.balance ?? 0))}.`
      }
      onBack={() => router.push("/customer/wallet")}
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
  const isSuccess = tone === "success";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div
        className={`mb-5 flex size-16 items-center justify-center rounded-full ${
          isSuccess
            ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
            : "bg-destructive/10 text-destructive"
        }`}
      >
        {isSuccess ? (
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
        Về ví của tôi
      </Button>
    </div>
  );
}

export default function TopupReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <TopupReturnContent />
    </Suspense>
  );
}
