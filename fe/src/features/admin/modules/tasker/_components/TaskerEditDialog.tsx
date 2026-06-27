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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpdateTasker } from "../hooks/admin-tasker.hooks";
import type {
  AdminTasker,
  AdminUpdateTaskerPayload,
} from "../types/admin-tasker.types";

interface TaskerEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasker: AdminTasker;
}

type FormState = {
  fullName: string;
  phone: string;
  workingAddress: string;
  bio: string;
  skills: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
};

// Mirror backend DTO validator: bắt đầu bằng 0 và có 10–11 chữ số.
const PHONE_RULE = /^0\d{9,10}$/;

export const TaskerEditDialog: React.FC<TaskerEditDialogProps> = ({
  isOpen,
  onClose,
  tasker,
}) => {
  // Lazy-init từ props; parent remount dialog (qua `key`) mỗi lần mở nên state
  // luôn tươi mới mà không cần effect đồng bộ prop.
  const [form, setForm] = useState<FormState>(() => ({
    fullName: tasker.fullName ?? "",
    phone: tasker.phone ?? "",
    workingAddress: tasker.workingAddress ?? "",
    bio: tasker.bio ?? "",
    skills: tasker.skills ?? "",
    bankName: tasker.bankName ?? "",
    bankAccountNumber: tasker.bankAccountNumber ?? "",
    bankAccountName: tasker.bankAccountName ?? "",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  );

  const updateMutation = useUpdateTasker();
  const isPending = updateMutation.isPending;

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.fullName.trim()) next.fullName = "Họ tên không được để trống";
    else if (form.fullName.length > 100)
      next.fullName = "Họ tên không được vượt quá 100 ký tự";

    if (form.phone && !PHONE_RULE.test(form.phone))
      next.phone = "Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const trim = (v: string) => v.trim();
    const payload: AdminUpdateTaskerPayload = {
      fullName: trim(form.fullName),
      phone: form.phone ? trim(form.phone) : undefined,
      workingAddress: trim(form.workingAddress) || undefined,
      bio: trim(form.bio) || undefined,
      skills: trim(form.skills) || undefined,
      bankName: trim(form.bankName) || undefined,
      bankAccountNumber: trim(form.bankAccountNumber) || undefined,
      bankAccountName: trim(form.bankAccountName) || undefined,
    };

    updateMutation.mutate(
      { id: tasker.id, payload },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-[20px]">
        <DialogHeader>
          <DialogTitle>Cập nhật thông tin tasker</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin cơ bản của đối tác. Giấy tờ KYC không thay đổi.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tasker-fullName">Họ và tên</Label>
                <Input
                  id="tasker-fullName"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  aria-invalid={!!errors.fullName}
                  aria-describedby={
                    errors.fullName ? "tasker-fullName-error" : undefined
                  }
                />
                {errors.fullName && (
                  <p id="tasker-fullName-error" className="text-xs text-destructive">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tasker-phone">Số điện thoại</Label>
                <Input
                  id="tasker-phone"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="0901234567"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "tasker-phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="tasker-phone-error" className="text-xs text-destructive">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasker-workingAddress">Khu vực hoạt động</Label>
              <Input
                id="tasker-workingAddress"
                value={form.workingAddress}
                onChange={(e) => setField("workingAddress", e.target.value)}
                placeholder="Quận 1, TP. Hồ Chí Minh"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasker-skills">Kỹ năng</Label>
              <Input
                id="tasker-skills"
                value={form.skills}
                onChange={(e) => setField("skills", e.target.value)}
                placeholder="Dọn nhà, Vệ sinh công nghiệp..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasker-bio">Giới thiệu</Label>
              <Textarea
                id="tasker-bio"
                value={form.bio}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Mô tả ngắn về đối tác..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tasker-bankName">Ngân hàng</Label>
                <Input
                  id="tasker-bankName"
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                  placeholder="Vietcombank"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tasker-bankAccountNumber">Số tài khoản</Label>
                <Input
                  id="tasker-bankAccountNumber"
                  value={form.bankAccountNumber}
                  onChange={(e) => setField("bankAccountNumber", e.target.value)}
                  placeholder="0123456789"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasker-bankAccountName">Chủ tài khoản</Label>
              <Input
                id="tasker-bankAccountName"
                value={form.bankAccountName}
                onChange={(e) => setField("bankAccountName", e.target.value)}
                placeholder="NGUYEN VAN A"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full"
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-full">
              {isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
