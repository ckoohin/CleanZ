"use client";

import React from "react";
import { Sparkles, TicketPercent, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VoucherForm } from "@/features/admin/admin-voucher/components/VoucherForm";
import { useCreateVoucher } from "@/features/admin/admin-voucher/hooks/useCreateVoucher";

export default function AdminCreateVoucherPage() {
  const router = useRouter();
  const createMutation = useCreateVoucher();

  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full space-y-6">
        <div className="space-y-2 pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <TicketPercent size={14} /> Hệ thống quản trị
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-balance leading-tight tracking-tight flex items-center gap-2">
                Tạo voucher mới
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </h1>

              <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed mt-2">
                Tạo mã giảm giá mới cho khách hàng, thiết lập điều kiện áp dụng và thời gian hiệu lực.
              </p>
            </div>

            <Link
              href="/admin/vouchers"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách
            </Link>
          </div>
        </div>

        <VoucherForm
          mode="create"
          isSubmitting={createMutation.isPending}
          onSubmit={async (payload) => {
            const created = await createMutation.mutateAsync(payload);
            router.push(`/admin/vouchers/${created.id}`);
          }}
        />
      </div>
    </main>
  );
}