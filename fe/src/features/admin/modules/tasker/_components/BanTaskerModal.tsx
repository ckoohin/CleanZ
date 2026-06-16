"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BanTaskerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, type: string) => void;
  isLoading?: boolean;
}

export const BanTaskerModal: React.FC<BanTaskerModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [reason, setReason] = useState("");
  const [type, setType] = useState("DAYS_2");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason, type);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xử lý vi phạm / Khóa tài khoản</DialogTitle>
          <DialogDescription>
            Chọn hình thức kỷ luật và nêu rõ lý do.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="type">Hình thức</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Chọn hình thức" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAYS_2">Khóa 2 ngày</SelectItem>
                <SelectItem value="DAYS_7">Khóa 7 ngày</SelectItem>
                <SelectItem value="PERMANENT">Khóa vĩnh viễn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Lý do vi phạm</Label>
            <Textarea
              id="reason"
              placeholder="Nhập lý do cụ thể..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isLoading || !reason.trim()}>
            {isLoading ? "Đang xử lý..." : "Xác nhận khóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
