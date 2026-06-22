"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAvailableTaskers, useAssignTaskerToBooking } from "../../hooks/useAdminBookings";


interface AssignTaskerDialogProps {
  bookingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTaskerId?: string;
}

export function AssignTaskerDialog({ bookingId, open, onOpenChange, currentTaskerId }: AssignTaskerDialogProps) {
  const [keyword, setKeyword] = useState("");
  // Simple debounce logic inline for keyword
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data: taskersData, isLoading } = useAvailableTaskers(open ? bookingId : null, { keyword: debouncedKeyword, limit: 20 });
  const assignMutation = useAssignTaskerToBooking();

  const [selectedTaskerId, setSelectedTaskerId] = useState<string>("");
  const [note, setNote] = useState("");

  React.useEffect(() => {
    if (open) {
      setSelectedTaskerId("");
      setNote("");
      setKeyword("");
    }
  }, [open]);

  const handleAssign = () => {
    if (!selectedTaskerId) {
      toast.error("Vui lòng chọn một Tasker");
      return;
    }
    assignMutation.mutate({ 
      id: bookingId, 
      payload: { taskerId: selectedTaskerId, note: note || undefined } 
    }, {
      onSuccess: () => {
        toast.success("Gán Tasker thành công");
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error?.response?.data?.message || "Lỗi khi gán Tasker");
      }
    });
  };

  const taskers = taskersData?.data || taskersData || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{currentTaskerId ? "Thay đổi Tasker" : "Gán Tasker vào đơn"}</DialogTitle>
          <DialogDescription>
            Tìm kiếm và chọn một Tasker phù hợp đang rảnh trong khung giờ của đơn hàng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nhập tên hoặc số điện thoại..."
              className="pl-8"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="border rounded-md max-h-60 overflow-y-auto space-y-1 p-1">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : taskers.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Không tìm thấy Tasker phù hợp
              </div>
            ) : (
              taskers.map((t: { id: string; fullName: string; phone?: string; phoneNumber?: string }) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                    selectedTaskerId === t.id ? "bg-primary/10 border-primary border" : "hover:bg-slate-100 border border-transparent"
                  }`}
                  onClick={() => setSelectedTaskerId(t.id)}
                >
                  <div>
                    <p className="font-semibold text-sm">{t.fullName}</p>
                    <p className="text-xs text-muted-foreground">{t.phone || t.phoneNumber}</p>
                  </div>
                  {selectedTaskerId === t.id && <UserCheck className="h-5 w-5 text-primary" />}
                </div>
              ))
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Ghi chú cho Tasker (Tùy chọn)</label>
            <Textarea
              placeholder="Nhập ghi chú hoặc lý do thay đổi..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleAssign} disabled={!selectedTaskerId || assignMutation.isPending}>
            {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Xác nhận gán
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
