"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Search, TicketPercent, X } from "lucide-react";
import { AdminButton, AdminCard, FormField, adminInputClass } from "@/components/admin";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useAdminPackages } from "@/features/admin/modules/service/hooks/useAdminServices";
import { useAdminCustomers } from "@/features/admin/modules/customer/hooks/useAdminCustomer";
import {
  CreateVoucherPayload,
  Voucher,
  VoucherType,
} from "../types/voucher.type";

type Props = {
  mode: "create" | "edit";
  initialData?: Voucher | null;
  onSubmit: (payload: CreateVoucherPayload) => Promise<void> | void;
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
  perCustomerLimit: string;
  packageIds: string[];
  customerIds: string[];
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
    perCustomerLimit:
      initialData?.perCustomerLimit != null ? String(initialData.perCustomerLimit) : "",
    packageIds: initialData?.packageIds ?? [],
    customerIds: initialData?.customerIds ?? [],
    startDate: toDatetimeLocal(initialData?.startDate),
    endDate: toDatetimeLocal(initialData?.endDate),
    isActive: initialData?.isActive ?? true,
  };
}

function hasCustomerScope(initialData?: Voucher | null) {
  return Boolean(initialData?.customerIds?.length);
}

export function VoucherForm({
  mode,
  initialData,
  onSubmit,
  isSubmitting = false,
}: Props) {
  const [form, setForm] = useState<FormState>(buildInitialState(initialData));
  const [customerScopeEnabled, setCustomerScopeEnabled] = useState(
    hasCustomerScope(initialData),
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: packages = [] } = useAdminPackages();
  const trimmedCustomerSearch = customerSearch.trim();
  const canSearchCustomers = customerScopeEnabled && trimmedCustomerSearch.length >= 2;
  const { data: customersData, isFetching: isSearchingCustomers } = useAdminCustomers(
    {
      keyword: trimmedCustomerSearch,
      isActive: true,
      limit: 10,
    },
    { enabled: canSearchCustomers },
  );

  useEffect(() => {
    setForm(buildInitialState(initialData));
    setCustomerScopeEnabled(hasCustomerScope(initialData));
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
      perCustomerLimit:
        form.perCustomerLimit !== "" ? Number(form.perCustomerLimit) : undefined,
      packageIds: form.packageIds.length ? form.packageIds : undefined,
      customerIds: customerScopeEnabled ? form.customerIds : [],
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      isActive: form.isActive,
    };

    if (isPercent) {
      payload.maxDiscount =
        form.maxDiscount !== "" ? Number(form.maxDiscount) : undefined;
    }

    return payload;
  }, [customerScopeEnabled, form, isPercent]);

  const handleChange = (key: keyof FormState, value: string | boolean | string[]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const togglePackage = (packageId: string) => {
    setForm((prev) => ({
      ...prev,
      packageIds: prev.packageIds.includes(packageId)
        ? prev.packageIds.filter((id) => id !== packageId)
        : [...prev.packageIds, packageId],
    }));
  };

  const customers = canSearchCustomers ? (customersData?.data ?? []) : [];
  const selectedCustomers = customers.filter((customer) =>
    form.customerIds.includes(customer.id),
  );
  const selectedCustomerIdSet = new Set(form.customerIds);

  const toggleCustomer = (customerId: string) => {
    setForm((prev) => ({
      ...prev,
      customerIds: prev.customerIds.includes(customerId)
        ? prev.customerIds.filter((id) => id !== customerId)
        : [...prev.customerIds, customerId],
    }));
  };

  const removeCustomer = (customerId: string) => {
    setForm((prev) => ({
      ...prev,
      customerIds: prev.customerIds.filter((id) => id !== customerId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(submitPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* top */}
      <AdminCard className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-[var(--c-line)] p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary)]">
            <TicketPercent className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--c-ink)]">
              {mode === "create" ? "Tạo voucher mới" : "Chỉnh sửa voucher"}
            </h2>
            <p className="text-sm text-[var(--c-muted)]">
              Thiết lập giảm giá, quota sử dụng, phạm vi gói dịch vụ và hiệu lực.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Mã voucher" required hint="Chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.">
              <input
                value={form.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="VD: WELCOME20"
                className={adminInputClass}
                required
              />
            </FormField>

            <FormField label="Tên voucher" required>
              <input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="VD: Giảm 20% cho khách hàng mới"
                className={adminInputClass}
                required
              />
            </FormField>

            <FormField label="Mô tả" className="md:col-span-2">
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Mô tả ngắn về voucher..."
                rows={4}
                className={cn(adminInputClass, "h-auto resize-none py-3")}
              />
            </FormField>
          </div>

          {/* rule info */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <FormField label="Loại voucher" required>
              <select
                value={form.type}
                onChange={(e) =>
                  handleChange("type", e.target.value as VoucherType)
                }
                className={adminInputClass}
              >
                <option value="PERCENT">Phần trăm (%)</option>
                <option value="FIXED">Số tiền cố định</option>
              </select>
            </FormField>

            <FormField
              label="Giá trị voucher"
              required
              hint={form.type === "PERCENT" ? "20 = giảm 20%." : "Số tiền giảm trực tiếp theo VND."}
            >
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => handleChange("value", e.target.value)}
                placeholder={form.type === "PERCENT" ? "VD: 20" : "VD: 50000"}
                className={adminInputClass}
                required
              />
            </FormField>

            <FormField label={`Giảm tối đa ${isPercent ? "" : "(không áp dụng)"}`}>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.maxDiscount}
                onChange={(e) => handleChange("maxDiscount", e.target.value)}
                placeholder="VD: 50000"
                disabled={!isPercent}
                className={cn(adminInputClass, "disabled:cursor-not-allowed disabled:opacity-50")}
              />
            </FormField>

            <FormField label="Đơn tối thiểu">
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.minOrderAmount}
                onChange={(e) => handleChange("minOrderAmount", e.target.value)}
                placeholder="VD: 100000"
                className={adminInputClass}
              />
            </FormField>
          </div>

          {/* time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Ngày bắt đầu">
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
                className={adminInputClass}
              />
            </FormField>

            <FormField label="Ngày kết thúc">
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                className={adminInputClass}
              />
            </FormField>
          </div>

          {/* status */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
            <div>
              <p className="font-semibold text-[var(--c-ink)]">Trạng thái sử dụng</p>
              <p className="text-sm text-[var(--c-muted)]">
                Bật nếu voucher đang hoạt động và có thể áp dụng trong hệ thống.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => handleChange("isActive", checked)}
              />
              <span className="text-sm font-medium">
                {form.isActive ? "Đang hoạt động" : "Tạm ẩn"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Giới hạn toàn hệ thống" hint="Để trống nếu không giới hạn. Slot được giữ khi tạo booking, chỉ đếm used khi hoàn thành.">
              <input
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => handleChange("usageLimit", e.target.value)}
                placeholder="VD: 100"
                className={adminInputClass}
              />
            </FormField>

            <FormField label="Giới hạn mỗi khách" hint="Để trống nếu mỗi khách được dùng không giới hạn.">
              <input
                type="number"
                min={1}
                value={form.perCustomerLimit}
                onChange={(e) => handleChange("perCustomerLimit", e.target.value)}
                placeholder="VD: 1"
                className={adminInputClass}
              />
            </FormField>
          </div>

          <FormField
            label="Gói dịch vụ áp dụng"
            hint="Không chọn gói nào nghĩa là voucher áp dụng cho tất cả gói dịch vụ."
          >
            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3 md:grid-cols-2">
              {packages.map((pkg) => {
                const selected = form.packageIds.includes(pkg.id);
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => togglePackage(pkg.id)}
                    className={cn(
                      "flex min-h-10 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors",
                      selected
                        ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]"
                        : "border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink-soft)] hover:text-[var(--c-ink)]",
                    )}
                  >
                    <span className="truncate">{pkg.name}</span>
                    <span className="text-[11px]">{selected ? "Đã chọn" : "Chọn"}</span>
                  </button>
                );
              })}
              {packages.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">Chưa tải được danh sách gói dịch vụ.</p>
              ) : null}
            </div>
          </FormField>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4">
            <div>
              <p className="font-semibold text-[var(--c-ink)]">Chỉ áp dụng cho khách hàng cụ thể</p>
              <p className="text-sm text-[var(--c-muted)]">
                Khi tắt, voucher áp dụng cho mọi khách hàng đủ điều kiện.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-3">
              <Switch
                checked={customerScopeEnabled}
                onCheckedChange={setCustomerScopeEnabled}
              />
              <span className="text-sm font-medium">
                {customerScopeEnabled ? `${form.customerIds.length} khách` : "Tất cả khách"}
              </span>
            </label>
          </div>

          {customerScopeEnabled ? (
            <FormField
              label="Khách hàng áp dụng"
              hint="Tìm và chọn khách hàng được phép sử dụng voucher này."
            >
              <div className="space-y-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--c-muted)]" />
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Tìm theo tên, email hoặc số điện thoại..."
                    className={cn(adminInputClass, "pl-9")}
                  />
                </div>

                {form.customerIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {form.customerIds.map((customerId) => {
                      const customer = selectedCustomers.find((item) => item.id === customerId);
                      return (
                        <button
                          key={customerId}
                          type="button"
                          onClick={() => removeCustomer(customerId)}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--c-primary)] bg-[var(--c-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--c-primary-strong)]"
                        >
                          <span className="truncate">
                            {customer?.fullName ?? customerId}
                          </span>
                          <X className="size-3" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="grid max-h-[260px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                  {customers.map((customer) => {
                    const selected = selectedCustomerIdSet.has(customer.id);
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => toggleCustomer(customer.id)}
                        className={cn(
                          "flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                          selected
                            ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)]"
                            : "border-[var(--c-line)] bg-[var(--c-card)] hover:border-[var(--c-line-strong)]",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[var(--c-ink)]">
                            {customer.fullName}
                          </span>
                          <span className="block truncate text-xs text-[var(--c-muted)]">
                            {customer.phone || "Chưa có SĐT"} · {customer.email}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-[var(--c-primary)]">
                          {selected ? "Đã chọn" : "Chọn"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {customers.length === 0 ? (
                  <p className="text-sm text-[var(--c-muted)]">
                    {!canSearchCustomers
                      ? "Nhập ít nhất 2 ký tự để tìm khách hàng."
                      : isSearchingCustomers
                        ? "Đang tìm khách hàng..."
                        : "Không tìm thấy khách hàng phù hợp."}
                  </p>
                ) : null}
              </div>
            </FormField>
          ) : null}
        </div>
      </AdminCard>

      {/* actions */}
      <div className="flex flex-wrap justify-end gap-3">
        <AdminButton
          type="submit"
          disabled={isSubmitting}
          variant="primary"
          icon={isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        >
          {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo voucher" : "Lưu thay đổi"}
        </AdminButton>
      </div>
    </form>
  );
}
