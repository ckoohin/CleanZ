'use client';

import React from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AdminButton, StatusBadge } from '@/components/admin';
import { POLICY_CATEGORY_META, Policy } from '../types/policy.type';
import { useDeletePolicy } from '../hooks/useDeletePolicy';

type DeletePolicyDialogProps = {
  open: boolean;
  onClose: () => void;
  policy: Policy | null;
};

export function DeletePolicyDialog({ open, onClose, policy }: DeletePolicyDialogProps) {
  const deleteMutation = useDeletePolicy();

  if (!open || !policy) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(policy.id);
      onClose();
    } catch {
      /* errors handled via toast */
    }
  };

  const meta = POLICY_CATEGORY_META[policy.category] ?? POLICY_CATEGORY_META.GENERAL;
  const CategoryIcon = meta.icon;

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent className="cz-admin max-w-md bg-[var(--c-card)] border-[var(--c-line)]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[rgba(225,29,72,0.12)] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#E11D48]" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-[var(--c-ink)]">Xóa chính sách</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-[var(--c-muted)]">
            Hành động này không thể hoàn tác. Chính sách sẽ bị xóa khỏi hệ thống
            và gỡ khỏi tất cả gói dịch vụ đang dùng.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Policy preview card */}
        <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4 flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bgColor}`}>
            <CategoryIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-[var(--c-ink)] truncate">{policy.title}</p>
            <p className="text-xs text-[var(--c-muted)] mt-0.5 font-mono">{policy.slug}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="secondary" className={`text-[10px] font-semibold ${meta.color}`}>
                <CategoryIcon className="w-3 h-3 mr-1" />
                {meta.label}
              </Badge>
              {policy.isDefault && (
                <StatusBadge tone="warning">Mặc định</StatusBadge>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AdminButton
            variant="secondary"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Hủy
          </AdminButton>
          <AdminButton
            variant="danger"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            icon={deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          >
            Xóa chính sách
          </AdminButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}