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
import {
  useAdminTaskerDetail,
  useUpdateTasker,
} from "../hooks/admin-tasker.hooks";
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
  /**
   * Thông tin ngân hàng lấy từ endpoint CHI TIẾT, không từ dòng danh sách.
   *
   * Danh sách Tasker không còn trả số tài khoản: nó là màn hình vận hành mở liên
   * tục và hiển thị hàng chục người một lúc, không có lý do gì phơi thông tin
   * ngân hàng của cả trang chỉ vì thỉnh thoảng có người bấm Sửa. Đổi lại, ô ngân
   * hàng ở đây điền vào sau một nhịp — và dữ liệu cũng tươi hơn bản cache của
   * danh sách.
   */
  const { data: detail, isLoading: isLoadingDetail } = useAdminTaskerDetail(
    isOpen ? tasker.id : "",
  );

  // Lazy-init từ props; parent remount dialog (qua `key`) mỗi lần mở nên state
  // luôn tươi mới mà không cần effect đồng bộ prop.
  const [form, setForm] = useState<FormState>(() => ({
    fullName: tasker.fullName ?? "",
    phone: tasker.phone ?? "",
    workingAddress: tasker.workingAddress ?? "",
    bio: tasker.bio ?? "",
    skills: tasker.skills ?? "",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  }));

  /**
   * Chỉ nạp một lần, và chỉ vào các ô ngân hàng đang trống — nếu ghi đè vô điều
   * kiện thì phần admin vừa gõ sẽ bị xoá khi request chi tiết trả về muộn.
   */
  const bankLoadedRef = React.useRef(false);
  React.useEffect(() => {
    if (!detail || bankLoadedRef.current) return;
    bankLoadedRef.current = true;
    setForm((prev) => ({
      ...prev,
      bankName: prev.bankName || (detail.bank?.name ?? ""),
      bankAccountNumber:
        prev.bankAccountNumber || (detail.bank?.accountNumber ?? ""),
      bankAccountName:
        prev.bankAccountName || (detail.bank?.accountName ?? ""),
    }));
  }, [detail]);
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
      <DialogContent className="cz-admin sm:max-w-lg rounded-[20px] border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--c-ink)]">Cập nhật thông tin tasker</DialogTitle>
          <DialogDescription className="text-[var(--c-muted)]">
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
                <Label htmlFor="tasker-fullName" className="text-[var(--c-ink-soft)]">Họ và tên</Label>
                <Input
                  id="tasker-fullName"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  aria-invalid={!!errors.fullName}
                  aria-describedby={
                    errors.fullName ? "tasker-fullName-error" : undefined
                  }
                  className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
                />
                {errors.fullName && (
                  <p id="tasker-fullName-error" className="text-xs text-[#E11D48]">
                    {errors.fullName}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tasker-phone" className="text-[var(--c-ink-soft)]">Số điện thoại</Label>
                <Input
                  id="tasker-phone"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="0901234567"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "tasker-phone-error" : undefined}
                  className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
                />
                {errors.phone && (
                  <p id="tasker-phone-error" className="text-xs text-[#E11D48]">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasker-workingAddress" className="text-[var(--c-ink-soft)]">Khu vực hoạt động</Label>
              <Input
                id="tasker-workingAddress"
                value={form.workingAddress}
                onChange={(e) => setField("workingAddress", e.target.value)}
                placeholder="Quận 1, TP. Hồ Chí Minh"
                className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasker-skills" className="text-[var(--c-ink-soft)]">Kỹ năng</Label>
              <Input
                id="tasker-skills"
                value={form.skills}
                onChange={(e) => setField("skills", e.target.value)}
                placeholder="Dọn nhà, Vệ sinh công nghiệp..."
                className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasker-bio" className="text-[var(--c-ink-soft)]">Giới thiệu</Label>
              <Textarea
                id="tasker-bio"
                value={form.bio}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Mô tả ngắn về đối tác..."
                rows={3}
                className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tasker-bankName" className="text-[var(--c-ink-soft)]">Ngân hàng</Label>
                <Input
                  id="tasker-bankName"
                  disabled={isLoadingDetail}
                  value={form.bankName}
                  onChange={(e) => setField("bankName", e.target.value)}
                  placeholder="Vietcombank"
                  className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tasker-bankAccountNumber" className="text-[var(--c-ink-soft)]">Số tài khoản</Label>
                <Input
                  id="tasker-bankAccountNumber"
                  disabled={isLoadingDetail}
                  value={form.bankAccountNumber}
                  onChange={(e) => setField("bankAccountNumber", e.target.value)}
                  placeholder="0123456789"
                  className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tasker-bankAccountName" className="text-[var(--c-ink-soft)]">Chủ tài khoản</Label>
              <Input
                id="tasker-bankAccountName"
                  disabled={isLoadingDetail}
                value={form.bankAccountName}
                onChange={(e) => setField("bankAccountName", e.target.value)}
                placeholder="NGUYEN VAN A"
                className="bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]"
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-full bg-[var(--c-primary)] text-white hover:bg-[var(--c-primary)]/90">
              {isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
