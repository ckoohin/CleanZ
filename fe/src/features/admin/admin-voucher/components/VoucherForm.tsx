"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Save, TicketPercent } from "lucide-react";
import {
  CreateVoucherPayload,
  UpdateVoucherPayload,
  Voucher,
  VoucherType,
} from "../types/voucher.type";

type Props = {
  mode: "create" | "edit";
  initialData?: Voucher | null;
  onSubmit: (payload: CreateVoucherPayload | UpdateVoucherPayload) => Promise<void> | void;
  isSubmitting?: boolean;
};

type FormState = {
  code: string;
  name: string;
  description: string;
  type: VoucherType;
  value: string;
  maxDiscount: string;
  minOrderAmount: string;
  usageLimit: string;
  serviceId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function buildInitialState(initialData?: Voucher | null): FormState {
  return {
    code: initialData?.code ?? "",
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    type: initialData?.type ?? "PERCENT",
    value: initialData?.value != null ? String(initialData.value) : "",
    maxDiscount:
      initialData?.maxDiscount != null ? String(initialData.maxDiscount) : "",
    minOrderAmount:
      initialData?.minOrderAmount != null ? String(initialData.minOrderAmount) : "",
    usageLimit:
      initialData?.usageLimit != null ? String(initialData.usageLimit) : "",
    serviceId: initialData?.serviceId ?? "",
    startDate: toDatetimeLocal(initialData?.startDate),
    endDate: toDatetimeLocal(initialData?.endDate),
    isActive: initialData?.isActive ?? true,
  };
}

export function VoucherForm({
  mode,
  initialData,
  onSubmit,
  isSubmitting = false,
}: Props) {
  const [form, setForm] = useState<FormState>(buildInitialState(initialData));

  useEffect(() => {
    setForm(buildInitialState(initialData));
  }, [initialData]);

  const isPercent = form.type === "PERCENT";

  const submitPayload = useMemo(() => {
    const payload: CreateVoucherPayload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      value: Number(form.value),
      minOrderAmount:
        form.minOrderAmount !== "" ? Number(form.minOrderAmount) : undefined,
      usageLimit: form.usageLimit !== "" ? Number(form.usageLimit) : undefined,
      serviceId: form.serviceId.trim() || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      isActive: form.isActive,
    };

    if (isPercent) {
      payload.maxDiscount =
        form.maxDiscount !== "" ? Number(form.maxDiscount) : undefined;
    }

    return payload;
  }, [form, isPercent]);

  const handleChange = (
    key: keyof FormState,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(submitPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* top */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <TicketPercent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {mode === "create" ? "Tạo voucher mới" : "Chỉnh sửa voucher"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Quản lý mã giảm giá, điều kiện áp dụng và thời gian hiệu lực.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Mã voucher *</label>
              <input
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="VD: WELCOME20"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              <p className="text-xs text-muted-foreground">
                Nên dùng chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Tên voucher *</label>
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="VD: Giảm 20% cho khách hàng mới"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold">Mô tả</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Mô tả ngắn về voucher..."
                rows={4}
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>

          {/* rule info */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Loại voucher *</label>
              <select
                value={form.type}
                onChange={(e) =>
                  handleChange("type", e.target.value as VoucherType)
                }
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">
                Giá trị voucher *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => handleChange("value", e.target.value)}
                placeholder={form.type === "PERCENT" ? "VD: 20" : "VD: 50000"}
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
              <p className="text-xs text-muted-foreground">
                {form.type === "PERCENT"
                  ? "Nhập phần trăm giảm giá, ví dụ 20 = giảm 20%."
                  : "Nhập số tiền giảm trực tiếp theo VND."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">
                Giảm tối đa {isPercent ? "(nếu có)" : "(không áp dụng)"}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.maxDiscount}
                onChange={(e) => handleChange("maxDiscount", e.target.value)}
                placeholder="VD: 50000"
                disabled={!isPercent}
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Đơn tối thiểu</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.minOrderAmount}
                onChange={(e) => handleChange("minOrderAmount", e.target.value)}
                placeholder="VD: 100000"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Giới hạn lượt dùng</label>
              <input
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => handleChange("usageLimit", e.target.value)}
                placeholder="VD: 100"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-muted-foreground">
                Để trống nếu muốn không giới hạn.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Service ID</label>
              <input
                value={form.serviceId}
                onChange={(e) => handleChange("serviceId", e.target.value)}
                placeholder="UUID của dịch vụ nếu voucher chỉ áp dụng cho 1 service"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Ngày bắt đầu</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Ngày kết thúc</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* status */}
          <div className="rounded-2xl border bg-background p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Trạng thái hiển thị</p>
              <p className="text-sm text-muted-foreground">
                Bật nếu voucher đang hoạt động và có thể áp dụng trong hệ thống.
              </p>
            </div>

            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">
                {form.isActive ? "Đang hoạt động" : "Tạm ẩn"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {mode === "create" ? "Tạo voucher" : "Lưu thay đổi"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}