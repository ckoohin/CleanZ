"use client";

import React from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { Policy } from "../types/policy.type";
import { useDeletePolicy } from "../hooks/useDeletePolicy";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  policy: Policy | null;
};

export function DeletePolicyDialog({ open, onClose, policy }: Props) {
  const deleteMutation = useDeletePolicy();

  if (!open || !policy) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(policy.id);
      toast.success("Xóa chính sách thành công");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Không thể xóa chính sách");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border bg-card shadow-2xl overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Xóa chính sách</h3>
              <p className="text-sm text-muted-foreground">
                Hành động này không thể hoàn tác.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm leading-6">
            Bạn có chắc chắn muốn xóa chính sách{" "}
            <span className="font-bold">{policy.title}</span> không?
          </p>

          <div className="rounded-2xl border bg-muted/30 p-4 text-sm space-y-1">
            <p>
              <span className="font-semibold">Slug:</span> {policy.slug}
            </p>
            <p>
              <span className="font-semibold">Đối tượng:</span> {policy.role}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 p-6 border-t">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold hover:bg-muted transition"
          >
            <X className="w-4 h-4" />
            Hủy
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Xóa chính sách
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}