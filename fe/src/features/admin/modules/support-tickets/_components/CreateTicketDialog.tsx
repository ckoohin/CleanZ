"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTicketOnBehalf } from "../hooks/useSupportTicket";
import type { TicketCategory } from "../types/support-ticket.types";

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "BOOKING_ISSUE", label: "Đặt lịch" },
  { value: "PAYMENT_ISSUE", label: "Thanh toán" },
  { value: "TASKER_BEHAVIOR", label: "Hành vi Tasker" },
  { value: "SERVICE_QUALITY", label: "Chất lượng dịch vụ" },
  { value: "APP_BUG", label: "Lỗi ứng dụng" },
  { value: "ACCOUNT_ISSUE", label: "Tài khoản" },
  { value: "OTHER", label: "Khác" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export const CreateTicketDialog: React.FC<Props> = ({ open, onClose }) => {
  const createTicket = useCreateTicketOnBehalf();

  const [form, setForm] = useState({
    reporterUserId: "",
    subject: "",
    description: "",
    category: "" as TicketCategory | "",
    bookingId: "",
  });

  const handleSubmit = () => {
    if (!form.reporterUserId || !form.subject || !form.category) return;
    createTicket.mutate(
      {
        reporterUserId: form.reporterUserId,
        subject: form.subject,
        description: form.description || undefined,
        category: form.category as TicketCategory,
        bookingId: form.bookingId || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          setForm({ reporterUserId: "", subject: "", description: "", category: "", bookingId: "" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Tạo ticket hộ khách hàng</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">User ID khách hàng *</Label>
            <Input
              placeholder="UUID của người dùng..."
              value={form.reporterUserId}
              onChange={(e) => setForm((p) => ({ ...p, reporterUserId: e.target.value }))}
              className="text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tiêu đề *</Label>
            <Input
              placeholder="Mô tả ngắn vấn đề..."
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              className="text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Loại ticket *</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((p) => ({ ...p, category: v as TicketCategory }))}
            >
              <SelectTrigger className="h-9 rounded-lg text-sm w-full">
                <SelectValue placeholder="Chọn loại..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mô tả chi tiết</Label>
            <Textarea
              placeholder="Nội dung vấn đề..."
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="text-sm rounded-lg resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Booking ID (nếu có)</Label>
            <Input
              placeholder="UUID của booking liên quan..."
              value={form.bookingId}
              onChange={(e) => setForm((p) => ({ ...p, bookingId: e.target.value }))}
              className="text-sm rounded-lg"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            onClick={handleSubmit}
            disabled={!form.reporterUserId || !form.subject || !form.category || createTicket.isPending}
          >
            {createTicket.isPending ? "Đang tạo..." : "Tạo ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
