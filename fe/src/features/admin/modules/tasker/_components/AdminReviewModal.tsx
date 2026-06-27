"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AdminReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

export const AdminReviewModal: React.FC<AdminReviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading
}) => {
  const [notes, setNotes] = useState("");

  // Chỉ xóa nội dung khi modal đóng. Parent chỉ đóng khi submit thành công, nên
  // text được giữ lại nếu mutation lỗi (người dùng không phải gõ lại).
  useEffect(() => {
    if (!isOpen) setNotes("");
  }, [isOpen]);

  const handleConfirm = () => {
    if (!notes.trim()) return;
    onConfirm(notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="cz-admin sm:max-w-[425px] rounded-[2rem] border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[var(--c-ink)]">{title}</DialogTitle>
          <DialogDescription className="text-[var(--c-muted)] pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Nhập nội dung phản hồi cụ thể cho nhân viên..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={1500}
            className="min-h-[120px] rounded-2xl resize-none bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus-visible:ring-[var(--c-primary)]/30 focus-visible:border-[var(--c-primary)]/50"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-full text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]">
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!notes.trim() || isLoading}
            className="rounded-full bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]/90 min-w-[100px]"
          >
            {isLoading ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
