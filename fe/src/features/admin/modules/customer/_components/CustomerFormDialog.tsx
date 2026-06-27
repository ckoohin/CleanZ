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
import { adminInputClass } from "@/components/admin";
import {
  useCreateCustomer,
  useUpdateCustomer,
} from "@/features/admin/modules/customer/hooks/useAdminCustomer";
import { PAYMENT_METHOD_OPTIONS } from "@/features/admin/modules/customer/customer.helpers";
import type {
  CustomerListItem,
  PaymentMethod,
} from "@/features/admin/modules/customer/types/customer.types";

interface CustomerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, the dialog is in edit mode. */
  customer?: CustomerListItem | null;
}

type FormState = {
  email: string;
  fullName: string;
  phone: string;
  defaultPaymentMethod: PaymentMethod;
};

const EMPTY_FORM: FormState = {
  email: "",
  fullName: "",
  phone: "",
  defaultPaymentMethod: "CASH",
};

// Mirror the backend DTO validators (create-customer.dto.ts / update-customer.dto.ts).
const PHONE_RULE = /^0\d{9,10}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CustomerFormDialog: React.FC<CustomerFormDialogProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const isEdit = !!customer;
  // Lazy-initialized from props; the parent remounts this dialog (via `key`) on each
  // open, so state is always fresh without a prop-syncing effect.
  const [form, setForm] = useState<FormState>(() =>
    customer
      ? {
          email: customer.email,
          fullName: customer.fullName,
          phone: customer.phone ?? "",
          defaultPaymentMethod:
            (customer.defaultPaymentMethod as PaymentMethod) ?? "CASH",
        }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const setField = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!isEdit) {
      if (!form.email.trim()) next.email = "Email không được để trống";
      else if (!EMAIL_RULE.test(form.email.trim())) next.email = "Email không hợp lệ";
    }

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

    if (isEdit && customer) {
      updateMutation.mutate(
        {
          id: customer.id,
          payload: {
            fullName: form.fullName.trim(),
            phone: form.phone || undefined,
            defaultPaymentMethod: form.defaultPaymentMethod,
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
          defaultPaymentMethod: form.defaultPaymentMethod,
        },
        { onSuccess: () => onClose() }
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="cz-admin sm:max-w-lg rounded-[20px] border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--c-ink)]">{isEdit ? "Cập nhật khách hàng" : "Thêm khách hàng mới"}</DialogTitle>
          <DialogDescription className="text-[var(--c-muted)]">
            {isEdit
              ? "Chỉnh sửa thông tin tài khoản khách hàng."
              : "Tạo tài khoản khách hàng mới cho hệ thống."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-4 py-2">
            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="customer-email" className="text-[var(--c-ink-soft)]">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="customer@example.com"
                className={adminInputClass}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "customer-email-error" : undefined}
              />
              {errors.email && (
                <p id="customer-email-error" className="text-xs text-[#E11D48]">
                  {errors.email}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="customer-fullName" className="text-[var(--c-ink-soft)]">Họ và tên</Label>
            <Input
              id="customer-fullName"
              value={form.fullName}
              onChange={(e) => setField("fullName", e.target.value)}
              placeholder="Nguyễn Văn A"
              className={adminInputClass}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "customer-fullName-error" : undefined}
            />
            {errors.fullName && (
              <p id="customer-fullName-error" className="text-xs text-[#E11D48]">
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone" className="text-[var(--c-ink-soft)]">Số điện thoại</Label>
              <Input
                id="customer-phone"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="0901234567"
                className={adminInputClass}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "customer-phone-error" : undefined}
              />
              {errors.phone && (
                <p id="customer-phone-error" className="text-xs text-[#E11D48]">
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer-payment" className="text-[var(--c-ink-soft)]">Thanh toán mặc định</Label>
              <Select
                value={form.defaultPaymentMethod}
                onValueChange={(val) => setField("defaultPaymentMethod", val)}
              >
                <SelectTrigger id="customer-payment" className="w-full h-10 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] focus:border-[var(--c-primary)]/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="cz-admin border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isEdit && (
            <p className="rounded-xl bg-[var(--c-card-2)] px-3 py-2.5 text-xs text-[var(--c-muted)]">
              Hệ thống sẽ tự sinh mật khẩu tạm và gửi vào email khách hàng. Khách
              sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
            </p>
          )}
        </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full border-[var(--c-line-strong)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full text-white shadow-[0_8px_18px_-8px_rgba(255,152,0,0.7)] hover:brightness-105"
              style={{ background: "linear-gradient(180deg, #FFB300, #FF9800)" }}
            >
              {isPending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo khách hàng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
