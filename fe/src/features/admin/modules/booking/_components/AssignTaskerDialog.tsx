"use client";

import React, { useState } from "react";
import { toast } from "@/lib/toast";
import { Loader2, Search, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminButton } from "@/components/admin";
import { useAvailableTaskers, useAssignTaskerToBooking } from "@/features/admin/modules/booking/hooks/useAdminBooking";
import { getApiErrorMessage } from "@/lib/api/error-message";

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
        toast.error(getApiErrorMessage(err, "Không thể gán Tasker"));
      }
    });
  };

  const taskers = taskersData?.data || taskersData || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-w-md bg-[var(--c-card)] border-[var(--c-line)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--c-ink)]">{currentTaskerId ? "Thay đổi Tasker" : "Gán Tasker vào đơn"}</DialogTitle>
          <DialogDescription className="text-[var(--c-muted)]">
            Tìm kiếm và chọn một Tasker phù hợp đang rảnh trong khung giờ của đơn hàng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--c-muted)]" />
            <Input
              placeholder="Nhập tên hoặc số điện thoại..."
              className="pl-8 bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <div className="border border-[var(--c-line)] rounded-md max-h-60 overflow-y-auto space-y-1 p-1">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--c-muted)]" />
              </div>
            ) : taskers.length === 0 ? (
              <div className="text-center py-4 text-sm text-[var(--c-muted)]">
                Không tìm thấy Tasker phù hợp
              </div>
            ) : (
              taskers.map((t: { id: string; fullName: string; phone?: string; phoneNumber?: string }) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${
                    selectedTaskerId === t.id ? "bg-[var(--c-primary-soft)] border-[var(--c-primary)] border" : "hover:bg-[var(--c-card-2)] border border-transparent"
                  }`}
                  onClick={() => setSelectedTaskerId(t.id)}
                >
                  <div>
                    <p className="font-semibold text-sm text-[var(--c-ink)]">{t.fullName}</p>
                    <p className="text-xs text-[var(--c-muted)]">{t.phone || t.phoneNumber}</p>
                  </div>
                  {selectedTaskerId === t.id && <UserCheck className="h-5 w-5 text-[var(--c-primary-strong)]" />}
                </div>
              ))
            )}
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block text-[var(--c-ink)]">Ghi chú cho Tasker (Tùy chọn)</label>
            <Textarea
              placeholder="Nhập ghi chú hoặc lý do thay đổi..."
              className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <AdminButton variant="secondary" onClick={() => onOpenChange(false)}>
            Hủy
          </AdminButton>
          <AdminButton variant="primary" onClick={handleAssign} disabled={!selectedTaskerId || assignMutation.isPending}>
            {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Xác nhận gán
          </AdminButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
