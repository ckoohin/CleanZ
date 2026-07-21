"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** PayOS đá về đây khi khách bấm Hủy — đơn nạp để nguyên trạng thái CREATED, không cộng ví. */
export default function TopupCancelPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
        <XCircle className="size-8" />
      </div>

      <h1 className="text-xl font-bold">Bạn đã hủy thanh toán</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Đơn nạp chưa được thanh toán nên ví không thay đổi. Bạn có thể nạp lại
        bất cứ lúc nào.
      </p>

      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => router.push("/customer/wallet")}
        >
          Về ví của tôi
        </Button>
      </div>
    </div>
  );
}
