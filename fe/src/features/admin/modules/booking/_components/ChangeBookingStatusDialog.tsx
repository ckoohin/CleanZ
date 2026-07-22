"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminButton } from "@/components/admin";
import { useChangeBookingStatus } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { getApiErrorMessage } from "@/lib/api/error-message";

interface ChangeBookingStatusDialogProps {
  bookingId: string;
  currentStatus?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeBookingStatusDialog({ bookingId, currentStatus, open, onOpenChange }: ChangeBookingStatusDialogProps) {
  const [status, setStatus] = useState<string>("");
  const [reason, setReason] = useState("");
  const statusMutation = useChangeBookingStatus();

  React.useEffect(() => {
    if (open) {
      setStatus("");
      setReason("");
    }
  }, [open]);

  const handleUpdate = () => {
    if (!status) {
      toast.error("Vui lòng chọn trạng thái mới");
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error("Vui lòng nhập lý do (tối thiểu 5 ký tự)");
      return;
    }
    
    statusMutation.mutate({ 
      id: bookingId, 
      payload: { status, reason } 
    }, {
      onSuccess: () => {
        toast.success("Cập nhật trạng thái thành công");
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        toast.error(getApiErrorMessage(err, "Không thể cập nhật trạng thái"));
      }
    });
  };

  const availableStatuses = [
    { value: "POSTED", label: "Đang kiếm nhân viên(POSTED)" },
    { value: "CONFIRMED", label: "Đã Nhận Đơn (CONFIRMED)" },
    { value: "TASKER_ON_THE_WAY", label: "Đang Di Chuyển (TASKER_ON_THE_WAY)" },
    { value: "CHECKED_IN", label: "Đã Đến Nơi (CHECKED_IN)" },
    { value: "IN_PROGRESS", label: "Đang Thực Hiện (IN_PROGRESS)" },
    { value: "COMPLETED", label: "Hoàn Thành (COMPLETED)" },
    { value: "CANCELLED", label: "Đã Hủy (CANCELLED)" },
  ].filter(s => s.value !== currentStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-w-md bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--c-ink)]">Cập Nhật Trạng Thế</DialogTitle>
          <DialogDescription className="text-[var(--c-muted)]">
            Admin có quyền ép trạng thái của đơn hàng trong trường hợp cần thiết. Bắt buộc nhập lý do thay đổi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-semibold mb-1 block text-[var(--c-ink)]">Trạng thái mới *</label>
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
            <label className="text-sm font-semibold mb-1 block text-[var(--c-ink)]">Lý do thay đổi *</label>
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
          <AdminButton variant="primary" onClick={handleUpdate} disabled={!status || !reason || statusMutation.isPending}>
            {statusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Xác nhận
          </AdminButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
