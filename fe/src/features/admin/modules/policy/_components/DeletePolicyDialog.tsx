'use client';

import React from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { Policy } from '../types/policy.type';
import { useDeletePolicy } from '../hooks/useDeletePolicy';

type DeletePolicyDialogProps = {
  open: boolean;
  onClose: () => void;
  policy: Policy | null;
};

export function DeletePolicyDialog({
  open,
  onClose,
  policy,
}: DeletePolicyDialogProps) {
  const deleteMutation = useDeletePolicy();

  if (!open || !policy) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(policy.id);
      onClose();
    } catch {
      // lỗi đã có toast interceptor xử lý
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-background shadow-2xl">
        <div className="border-b px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-black tracking-tight">
                Xóa chính sách
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Bạn có chắc muốn xóa chính sách này không? Hành động này không thể hoàn tác.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Chính sách sẽ bị xóa:</p>
            <p className="mt-1 font-bold">{policy.title}</p>
            <p className="text-sm text-muted-foreground">{policy.slug}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleteMutation.isPending}
            className="inline-flex h-11 items-center justify-center rounded-2xl border px-5 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Xóa chính sách
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}