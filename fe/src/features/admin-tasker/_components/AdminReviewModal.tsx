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

  const handleConfirm = () => {
    if (!notes.trim()) return;
    onConfirm(notes);
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Nhập nội dung phản hồi cụ thể cho nhân viên..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[120px] rounded-2xl resize-none focus-visible:ring-primary"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="rounded-full">
            Hủy
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!notes.trim() || isLoading}
            className="rounded-full bg-primary hover:bg-primary/90 min-w-[100px]"
          >
            {isLoading ? "Đang xử lý..." : "Xác nhận"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
