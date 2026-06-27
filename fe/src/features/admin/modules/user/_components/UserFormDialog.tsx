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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUser, useUpdateUser } from "../hooks/useAdminUser";
import { CREATABLE_ROLES, ROLE_LABELS } from "../constants";
import type { AdminUser, UserRole } from "../types/user.types";

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the dialog is in edit mode. */
  user?: AdminUser | null;
}

type FormState = {
  email: string;
  fullName: string;
  phone: string;
  password: string;
  role: UserRole;
};

const EMPTY_FORM: FormState = {
  email: "",
  fullName: "",
  phone: "",
  password: "",
  role: "CUSTOMER",
};

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;
const PHONE_RULE = /^0\d{9,10}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UserFormDialog: React.FC<UserFormDialogProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const isEdit = !!user;
  // Lazy-initialized from props; the parent remounts this dialog (via `key`) on each
  // open, so state is always fresh without a prop-syncing effect.
  const [form, setForm] = useState<FormState>(() =>
    user
      ? {
          email: user.email,
          fullName: user.fullName,
          phone: user.phone ?? "",
          password: "",
          role: user.role,
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    // Email chỉ sửa được khi tạo mới; ở chế độ sửa email là read-only nên bỏ qua.
    if (!isEdit) {
      if (!form.email.trim()) next.email = "Email không được để trống";
      else if (!EMAIL_RULE.test(form.email.trim())) next.email = "Email không hợp lệ";
    }

    if (!form.fullName.trim()) next.fullName = "Họ tên không được để trống";
    else if (form.fullName.length > 100) next.fullName = "Họ tên không được vượt quá 100 ký tự";

    if (form.phone && !PHONE_RULE.test(form.phone))
      next.phone = "Số điện thoại phải bắt đầu bằng 0 và có 10-11 chữ số";

    // Password required on create; optional on edit (blank = keep current).
    if (!isEdit || form.password) {
      if (!form.password) next.password = "Mật khẩu không được để trống";
      else if (!PASSWORD_RULE.test(form.password))
        next.password = "Tối thiểu 6 ký tự, gồm chữ hoa, chữ thường và số";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (isEdit && user) {
      // Backend bỏ qua role/email/provider — chỉ gửi các trường được phép sửa.
      updateMutation.mutate(
        {
          id: user.id,
          payload: {
            fullName: form.fullName.trim(),
            phone: form.phone || undefined,
            ...(form.password ? { password: form.password } : {}),
          },
        },
        { onSuccess: () => onClose() }
      );
    } else {
      createMutation.mutate(
        {
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone || undefined,
          password: form.password,
          role: form.role,
        },
        { onSuccess: () => onClose() }
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-[20px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Cập nhật người dùng" : "Thêm người dùng mới"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Chỉnh sửa thông tin tài khoản. Để trống mật khẩu nếu không muốn thay đổi."
              : "Tạo tài khoản người dùng mới cho hệ thống."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="user@example.com"
                // Email là định danh — không cho đổi khi sửa (backend cũng bỏ qua).
                disabled={isEdit}
                readOnly={isEdit}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "user-email-error" : undefined}
              />
              {errors.email && (
                <p id="user-email-error" className="text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-fullName">Họ và tên</Label>
              <Input
                id="user-fullName"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                placeholder="Nguyễn Văn A"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? "user-fullName-error" : undefined}
              />
              {errors.fullName && (
                <p id="user-fullName-error" className="text-xs text-destructive">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="user-phone">Số điện thoại</Label>
                <Input
                  id="user-phone"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="0901234567"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "user-phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="user-phone-error" className="text-xs text-destructive">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="user-role">Vai trò</Label>
                {isEdit ? (
                  // Vai trò chỉ đổi qua flow chuyên biệt — read-only khi sửa.
                  <Input
                    id="user-role"
                    value={ROLE_LABELS[form.role] || form.role}
                    disabled
                    readOnly
                  />
                ) : (
                  <Select value={form.role} onValueChange={(val) => setField("role", val)}>
                    <SelectTrigger id="user-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role] || role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-password">
                {isEdit ? "Mật khẩu mới (tùy chọn)" : "Mật khẩu"}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder={isEdit ? "Để trống nếu không đổi" : "••••••••"}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "user-password-error" : undefined}
              />
              {errors.password && (
                <p id="user-password-error" className="text-xs text-destructive">
                  {errors.password}
                </p>
              )}
            </div>

            {!isEdit && (
              <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.
              </p>
            )}
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
              {isPending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo người dùng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
