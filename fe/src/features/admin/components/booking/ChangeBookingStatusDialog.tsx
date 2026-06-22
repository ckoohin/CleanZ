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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChangeBookingStatus } from "../../hooks/useAdminBookings";

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
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || "Lỗi khi cập nhật trạng thái");
      }
    });
  };

  const availableStatuses = [
    { value: "POSTED", label: "Đang Tìm Thợ (POSTED)" },
    { value: "ACCEPTED", label: "Đã Nhận Đơn (ACCEPTED)" },
    { value: "IN_PROGRESS", label: "Đang Thực Hiện (IN_PROGRESS)" },
    { value: "COMPLETED", label: "Hoàn Thành (COMPLETED)" },
    { value: "CANCELLED", label: "Đã Hủy (CANCELLED)" },
  ].filter(s => s.value !== currentStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cập Nhật Trạng Thái</DialogTitle>
          <DialogDescription>
            Admin có quyền ép trạng thái của đơn hàng trong trường hợp cần thiết. Bắt buộc nhập lý do thay đổi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">Trạng thái mới *</label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn trạng thái..." />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Lý do thay đổi *</label>
            <Textarea
              placeholder="Nhập lý do thay đổi trạng thái (ít nhất 5 ký tự)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleUpdate} disabled={!status || !reason || statusMutation.isPending}>
            {statusMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Xác nhận
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
