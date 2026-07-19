"use client";

import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function TaskerTopupCancelPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
        <XCircle className="size-8" />
      </div>
      <h1 className="text-xl font-bold">Bạn đã hủy thanh toán</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Giao dịch chưa hoàn tất nên số dư ví Tasker không thay đổi.
      </p>
      <Button
        variant="outline"
        className="mt-6 rounded-xl"
        onClick={() => router.push("/tasker/earnings")}
      >
        Về trang Thu nhập
      </Button>
    </div>
  );
}
