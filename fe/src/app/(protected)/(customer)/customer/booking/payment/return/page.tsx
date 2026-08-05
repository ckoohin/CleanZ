"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customerBookingApi } from "@/features/booking/services/booking.service";

/** Số lần hỏi PayOS trước khi bảo khách tự kiểm tra lại — 20 × 3s ≈ 1 phút. */
const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 3_000;

type ReturnState = "checking" | "paid" | "cancelled" | "failed";

/**
 * PayOS đá khách về đây sau khi quét QR. Đơn đặt lịch CHƯA tồn tại ở bước này —
 * backend chỉ tạo booking khi xác nhận được tiền, nên trang này hỏi lại cho tới
 * khi có bookingId rồi mới chuyển sang trang chi tiết đơn.
 */
function BookingPaymentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");
  const paymentParam = searchParams.get("payment");

  const [state, setState] = useState<ReturnState>(
    paymentParam === "cancel" ? "cancelled" : "checking",
  );
  const attemptsRef = useRef(0);
  const doneRef = useRef(false);

  const verify = useCallback(async () => {
    if (!draftId || doneRef.current) return;

    try {
      const { paid, bookingId } =
        await customerBookingApi.verifyDraftPayment(draftId);
      if (paid && bookingId) {
        doneRef.current = true;
        setState("paid");
        router.replace(`/customer/booking/${bookingId}`);
        return;
      }
    } catch {
      // Bỏ qua — thử lại ở vòng sau.
    }

    attemptsRef.current += 1;
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      doneRef.current = true;
      setState("failed");
      return;
    }
    setTimeout(() => void verify(), RETRY_DELAY_MS);
  }, [draftId, router]);

  useEffect(() => {
    if (paymentParam === "cancel") return;
    void verify();
    // verify tự lặp qua setTimeout nên chỉ khởi động một lần.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draftId) {
    return (
      <StatusCard
        tone="error"
        title="Thiếu mã yêu cầu thanh toán"
        description="Đường dẫn không hợp lệ. Vui lòng đặt lịch lại từ đầu."
        action={
          <Button onClick={() => router.replace("/customer/booking")}>
            Về trang đặt lịch
          </Button>
        }
      />
    );
  }

  if (state === "cancelled") {
    return (
      <StatusCard
        tone="error"
        title="Bạn đã huỷ thanh toán"
        description="Đơn đặt lịch chưa được tạo. Bạn có thể đặt lại bất cứ lúc nào."
        action={
          <Button onClick={() => router.replace("/customer/booking")}>
            Đặt lịch lại
          </Button>
        }
      />
    );
  }

  if (state === "failed") {
    return (
      <StatusCard
        tone="error"
        title="Chưa xác nhận được thanh toán"
        description="Nếu tiền đã bị trừ, đơn sẽ tự xuất hiện trong danh sách của bạn khi ngân hàng báo về. Nếu không, số tiền sẽ được hoàn lại."
        action={
          <Button onClick={() => router.replace("/customer/history")}>
            Xem đơn của tôi
          </Button>
        }
      />
    );
  }

  if (state === "paid") {
    return (
      <StatusCard
        tone="success"
        title="Thanh toán thành công"
        description="Đang mở đơn đặt lịch của bạn..."
      />
    );
  }

  return (
    <StatusCard
      tone="loading"
      title="Đang xác nhận thanh toán"
      description="Vui lòng không đóng trang. Đơn sẽ được tạo ngay khi CleanZ nhận được tiền."
    />
  );
}

function StatusCard({
  tone,
  title,
  description,
  action,
}: {
  tone: "loading" | "success" | "error";
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border/50 rounded-3xl p-8 text-center shadow-lg space-y-4">
        <div className="flex justify-center">
          {tone === "loading" && (
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          )}
          {tone === "success" && (
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          )}
          {tone === "error" && (
            <AlertCircle className="w-12 h-12 text-red-500" />
          )}
        </div>
        <h1 className="text-xl font-black text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}

export default function BookingPaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <StatusCard
          tone="loading"
          title="Đang tải"
          description="Vui lòng đợi trong giây lát."
        />
      }
    >
      <BookingPaymentReturnContent />
    </Suspense>
  );
}
