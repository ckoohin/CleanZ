"use client";

import { useParams } from "next/navigation";
import { Sparkles, TicketPercent } from "lucide-react";
import { VoucherEditView } from "@/features/admin/admin-voucher/components/VoucherEditView";

export default function AdminVoucherEditPage() {
  const params = useParams();

  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full space-y-6">
        <div className="space-y-2 pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <TicketPercent size={14} /> Hệ thống quản trị
          </div>

          <h1 className="text-3xl font-black text-balance leading-tight tracking-tight flex items-center gap-2">
            Chỉnh sửa voucher
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </h1>

          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Cập nhật nội dung voucher, điều kiện áp dụng và trạng thái hoạt động.
          </p>
        </div>

        <VoucherEditView id={id} />
      </div>
    </main>
  );
}