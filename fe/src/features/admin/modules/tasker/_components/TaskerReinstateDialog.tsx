"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useReinstateTasker } from "../hooks/admin-tasker.hooks";
import type { AdminTasker } from "../types/admin-tasker.types";

interface TaskerReinstateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasker: AdminTasker | null;
}

/**
 * Khôi phục tasker bị chấm dứt vĩnh viễn (TERMINATED) sau kháng cáo hợp lý.
 * Lý do là tùy chọn (ghi vào log audit phía backend).
 */
export const TaskerReinstateDialog: React.FC<TaskerReinstateDialogProps> = ({
  isOpen,
  onClose,
  tasker,
}) => {
  const [reason, setReason] = useState("");
  const reinstate = useReinstateTasker();

  const handleConfirm = () => {
    if (!tasker) return;
    reinstate.mutate(
      { id: tasker.id, reason: reason.trim() || undefined },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="cz-admin sm:max-w-md rounded-[20px] border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--c-ink)]">Khôi phục tài khoản (sau kháng cáo)</DialogTitle>
          <DialogDescription className="pt-1 text-sm text-[var(--c-muted)]">
            Khôi phục đối tác{" "}
            <strong>{tasker?.fullName || "này"}</strong> đã bị chấm dứt vĩnh viễn.
            Tài khoản sẽ hoạt động trở lại theo trạng thái hồ sơ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-1">
          <Label htmlFor="reinstate-reason" className="text-[var(--c-ink-soft)]">Lý do chấp nhận kháng cáo (tùy chọn)</Label>
          <Textarea
            id="reinstate-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Kháng cáo hợp lệ — nhầm lẫn khi xử lý..."
            rows={3}
            maxLength={500}
            className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
          />
        </div>

        <DialogFooter className="mt-2 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={reinstate.isPending}
            className="rounded-full border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={reinstate.isPending}
            className="rounded-full bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]/90"
          >
            {reinstate.isPending ? "Đang xử lý..." : "Khôi phục"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
