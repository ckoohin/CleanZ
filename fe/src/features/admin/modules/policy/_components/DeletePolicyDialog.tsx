'use client';

import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { BaseButton } from '@/components/ui/base/base_button';
import { Badge } from '@/components/ui/badge';
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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-lg font-bold">Xóa chính sách</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Hành động này không thể hoàn tác. Chính sách sẽ bị xóa khỏi hệ thống
            và gỡ khỏi tất cả gói dịch vụ đang dùng.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Policy preview card */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.bgColor}`}>
            <CategoryIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">{policy.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{policy.slug}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="secondary" className={`text-[10px] font-semibold ${meta.color}`}>
                <CategoryIcon className="w-3 h-3 mr-1" />
                {meta.label}
              </Badge>
              {policy.isDefault && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                  Mặc định
                </Badge>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <BaseButton
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Hủy
          </BaseButton>
          <BaseButton
            variant="destructive"
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
          >
            {!deleteMutation.isPending && <Trash2 className="w-4 h-4" />}
            Xóa chính sách
          </BaseButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}