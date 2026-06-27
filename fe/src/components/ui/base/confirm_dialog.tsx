"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  isPending?: boolean;
}

/** Generic confirm dialog reused for destructive and side-effect admin actions. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Xác nhận",
  variant = "default",
  isPending = false,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* cz-admin so --c-* tokens resolve inside the Radix portal */}
      <DialogContent className="cz-admin rounded-2xl border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[var(--c-ink)]">{title}</DialogTitle>
          <DialogDescription className="pt-2 text-sm text-[var(--c-muted)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]"
          >
            Hủy
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full"
          >
            {isPending ? "Đang xử lý..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
