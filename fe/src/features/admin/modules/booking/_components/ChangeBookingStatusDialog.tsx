"use client";

import React, { useState } from "react";
import { toast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminButton } from "@/components/admin";
import { useChangeBookingStatus } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { getApiErrorMessage } from "@/lib/api/error-message";

interface ChangeBookingStatusDialogProps {
  bookingId: string;
  currentStatus?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const NEXT_STATUSES: Record<string, Array<{ value: string; label: string }>> = {
  POSTED: [{ value: "CANCELLED", label: "Hủy đơn" }],
  CONFIRMED: [
    { value: "TASKER_ON_THE_WAY", label: "Xác nhận Tasker đang di chuyển" },
    { value: "CANCELLED", label: "Hủy đơn" },
  ],
  TASKER_ON_THE_WAY: [{ value: "CANCELLED", label: "Hủy đơn" }],
  CHECKED_IN: [
    { value: "IN_PROGRESS", label: "Xác nhận bắt đầu thực hiện" },
    { value: "CANCELLED", label: "Hủy đơn" },
  ],
  IN_PROGRESS: [
    { value: "COMPLETED", label: "Xác nhận hoàn thành" },
    { value: "CANCELLED", label: "Hủy đơn" },
  ],
  CANCELLED: [{ value: "POSTED", label: "Khôi phục tìm Tasker" }],
  EXPIRED: [{ value: "POSTED", label: "Khôi phục tìm Tasker" }],
};

export function ChangeBookingStatusDialog({
  bookingId,
  currentStatus,
  open,
  onOpenChange,
  onSuccess,
}: ChangeBookingStatusDialogProps) {
  const [status, setStatus] = useState<string>("");
  const [reason, setReason] = useState("");
  const statusMutation = useChangeBookingStatus();

  React.useEffect(() => {
    if (open) {
      setStatus(currentStatus === "IN_PROGRESS" ? "COMPLETED" : "");
      setReason("");
    }
  }, [currentStatus, open]);

  const handleUpdate = () => {
    if (!status) {
      toast.error("Vui lòng chọn trạng thái mới");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error("Vui lòng nhập lý do (tối thiểu 5 ký tự)");
      return;
    }

    statusMutation.mutate(
      {
        id: bookingId,
        payload: { status, reason },
      },
      {
        onSuccess: () => {
          toast.success("Cập nhật trạng thái thành công");
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (err: unknown) => {
          toast.error(getApiErrorMessage(err, "Không thể cập nhật trạng thái"));
        },
      },
    );
  };

  const availableStatuses = currentStatus
    ? (NEXT_STATUSES[currentStatus] ?? [])
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-w-md bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--c-ink)]">
            Cập nhật trạng thái
          </DialogTitle>
          <DialogDescription className="text-[var(--c-muted)]">
            Chỉ các bước chuyển hợp lệ của booking được hiển thị. Mọi thay đổi
            đều bắt buộc có lý do để lưu audit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-semibold mb-1 block text-[var(--c-ink)]">
              Trạng thái mới *
            </label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]">
                <SelectValue placeholder="Chọn trạng thái..." />
              </SelectTrigger>
              <SelectContent className="cz-admin bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
                {availableStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block text-[var(--c-ink)]">
              Lý do thay đổi *
            </label>
            <Textarea
              placeholder="Nhập lý do thay đổi trạng thái (ít nhất 5 ký tự)..."
              className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => onOpenChange(false)}>
            Hủy
          </AdminButton>
          <AdminButton
            variant="primary"
            onClick={handleUpdate}
            disabled={!status || !reason || statusMutation.isPending}
          >
            {statusMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            Xác nhận
          </AdminButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
