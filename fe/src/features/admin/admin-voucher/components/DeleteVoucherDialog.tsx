"use client";

import React from "react";
import { Loader2, Trash2, XCircle } from "lucide-react";
import { Voucher } from "../types/voucher.type";
import { useDeleteVoucher } from "../hooks/useDeleteVoucher";

type Props = {
  open: boolean;
  onClose: () => void;
  voucher: Voucher | null;
};

export function DeleteVoucherDialog({ open, onClose, voucher }: Props) {
  const deleteMutation = useDeleteVoucher();

  if (!open || !voucher) return null;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(voucher.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-card border shadow-2xl overflow-hidden">
        <div className="p-6 border-b flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Xóa voucher</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Hành động này không thể hoàn tác. Voucher sẽ bị xóa khỏi hệ thống.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">Voucher được chọn</p>
            <p className="font-bold text-lg">{voucher.name}</p>
            <p className="text-sm text-primary">{voucher.code}</p>
          </div>

          <p className="text-sm text-foreground/80">
            Em có chắc muốn xóa voucher này không?
          </p>
        </div>

        <div className="p-6 border-t flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
          >
            <XCircle className="w-4 h-4" />
            Hủy
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Xóa voucher
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}