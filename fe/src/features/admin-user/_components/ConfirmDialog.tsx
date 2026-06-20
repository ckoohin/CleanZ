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

/** Generic confirm dialog reused for destructive (soft-delete) and side-effect (reset-password) actions. */
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
      <DialogContent className="sm:max-w-md rounded-[20px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2 text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full"
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
