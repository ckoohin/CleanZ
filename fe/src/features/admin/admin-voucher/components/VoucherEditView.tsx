"use client";

import React from "react";
import { ArrowLeft, Loader2, TicketPercent } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VoucherForm } from "./VoucherForm";
import { useAdminVoucherDetail } from "../hooks/useAdminVoucherDetail";
import { useUpdateVoucher } from "../hooks/useUpdateVoucher";

type Props = {
  id: string;
};

export function VoucherEditView({ id }: Props) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useAdminVoucherDetail(id);
  const updateMutation = useUpdateVoucher();

  if (!id) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600">
        Không tìm thấy ID voucher trên URL.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card px-5 py-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải dữ liệu voucher...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600 space-y-2">
        <p className="font-semibold">Không thể tải dữ liệu voucher để chỉnh sửa.</p>
        <p>Vui lòng thử lại.</p>

        {error && (
          <pre className="whitespace-pre-wrap text-xs text-red-700 bg-white/60 rounded-xl p-3 border overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <TicketPercent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Chỉnh sửa voucher</h2>
              <p className="text-sm text-muted-foreground">
                Cập nhật thông tin voucher, điều kiện áp dụng và thời gian hiệu lực.
              </p>
            </div>
          </div>

          <Link
            href={`/admin/vouchers/${id}`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại chi tiết
          </Link>
        </div>
      </div>

      <VoucherForm
        mode="edit"
        initialData={data}
        isSubmitting={updateMutation.isPending}
        onSubmit={async (payload) => {
          await updateMutation.mutateAsync({
            id,
            payload,
          });
          router.push(`/admin/vouchers/${id}`);
        }}
      />
    </div>
  );
}