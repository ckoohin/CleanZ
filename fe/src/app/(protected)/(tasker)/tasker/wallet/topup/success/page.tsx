"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTaskerTopupStatus } from "@/features/tasker/hooks/useTaskerWallet";

const formatCurrency = (value: number | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);

function TopupSuccessContent() {
  const searchParams = useSearchParams();
  const topupId = searchParams.get("topupId");

  const { data: topup, isError } = useTaskerTopupStatus(topupId);

  const status = topup?.status;
  const isPending = !topupId || !topup || status === "PENDING";
  const isPaid = status === "PAID";
  const isFailed =
    status === "FAILED" || status === "EXPIRED" || status === "CANCELLED";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-6 text-center">
      {!topupId ? (
        <StatusCard
          icon={<XCircle className="size-14 text-destructive" />}
          title="Thiếu thông tin đơn nạp"
          description="Không tìm thấy mã đơn nạp trong đường dẫn. Vui lòng thử nạp lại từ ví."
          tone="error"
        />
      ) : isError ? (
        <StatusCard
          icon={<XCircle className="size-14 text-destructive" />}
          title="Không kiểm tra được đơn nạp"
          description="Có lỗi khi xác nhận giao dịch. Nếu bạn đã thanh toán, số dư sẽ được cập nhật sau ít phút."
          tone="error"
        />
      ) : isPaid ? (
        <StatusCard
          icon={<CheckCircle2 className="size-16 text-emerald-500" />}
          title="Nạp tiền thành công!"
          description={`Đã cộng ${formatCurrency(
            topup?.amountVnd,
          )} vào ví của bạn.`}
          tone="success"
        />
      ) : isFailed ? (
        <StatusCard
          icon={<XCircle className="size-14 text-destructive" />}
          title="Giao dịch chưa hoàn tất"
          description="Đơn nạp đã bị hủy hoặc hết hạn. Nếu bạn bị trừ tiền, hãy liên hệ hỗ trợ để được hoàn lại."
          tone="error"
        />
      ) : (
        <StatusCard
          icon={<Loader2 className="size-14 animate-spin text-primary" />}
          title="Đang xác nhận thanh toán..."
          description="Vui lòng đợi trong giây lát, chúng tôi đang xác nhận giao dịch với PayPal."
          tone="pending"
        />
      )}

      <div className="mt-8 flex w-full flex-col gap-2">
        <Button asChild size="lg" className="h-12 rounded-2xl">
          <Link href="/tasker/earnings">
            <WalletCards className="size-5" />
            Về ví của tôi
          </Link>
        </Button>
        {(isFailed || isError || !topupId) && (
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-12 rounded-2xl"
          >
            <Link href="/tasker/earnings">Thử nạp lại</Link>
          </Button>
        )}
      </div>

      {isPending && topupId && !isError && (
        <p className="mt-4 text-xs text-muted-foreground">
          Không cần đóng trang — số dư sẽ tự cập nhật khi thanh toán hoàn tất.
        </p>
      )}
    </div>
  );
}

function StatusCard({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "success" | "error" | "pending";
}) {
  const ring =
    tone === "success"
      ? "bg-emerald-500/10"
      : tone === "error"
        ? "bg-destructive/10"
        : "bg-primary/10";

  return (
    <>
      <div
        className={`flex size-28 items-center justify-center rounded-full ${ring}`}
      >
        {icon}
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </>
  );
}

export default function TaskerTopupSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <TopupSuccessContent />
    </Suspense>
  );
}
