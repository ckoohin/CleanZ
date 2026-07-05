"use client";

import Link from "next/link";
import { PlusCircle, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TaskerTopupCancelPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-6 text-center">
      <div className="flex size-28 items-center justify-center rounded-full bg-amber-500/10">
        <XCircle className="size-14 text-amber-500" />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight">
        Đã hủy nạp tiền
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bạn đã hủy giao dịch trên PayPal. Không có khoản tiền nào bị trừ. Bạn có
        thể thử nạp lại bất cứ lúc nào.
      </p>

      <div className="mt-8 flex w-full flex-col gap-2">
        <Button asChild size="lg" className="h-12 rounded-2xl">
          <Link href="/tasker/earnings">
            <PlusCircle className="size-5" />
            Thử nạp lại
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="h-12 rounded-2xl">
          <Link href="/tasker/earnings">
            <WalletCards className="size-5" />
            Về ví của tôi
          </Link>
        </Button>
      </div>
    </div>
  );
}
