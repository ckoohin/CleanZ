import React from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CreatePricingConfigDto } from "@/features/admin/services/admin-pricing.service";

const vnd = (val: number | string | null | undefined) => {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0,
  }).format(Number(val));
};

export type PricingFormData = CreatePricingConfigDto & { id?: string };

// ─── Pricing Form Fields (top-level — tránh unmount/remount khi parent re-render) ───────────

export function PricingFormFields({
  form,
  onChange,
}: {
  form: PricingFormData;
  onChange: <K extends keyof PricingFormData>(k: K, v: PricingFormData[K]) => void;
}) {
  const numField = (
    label: string,
    key: keyof PricingFormData,
    placeholder = "0",
    max?: number,
  ) => {
    const raw = form[key];
    const displayVal = raw === null || raw === undefined || raw === 0 ? "" : String(raw);
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-(--c-ink)">{label}</label>
        <Input
          inputMode="numeric"
          placeholder={placeholder}
          value={displayVal}
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, "");
            const num = digits ? Math.min(max ?? Infinity, Number(digits)) : 0;
            onChange(key, num as unknown as PricingFormData[keyof PricingFormData]);
          }}
          className="h-9 rounded-xl"
        />
        {typeof raw === "number" && raw > 0 && !key.includes("Rate") && (
          <p className="text-xs text-[#0E9F6E] font-bold">{vnd(raw)}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tên bảng giá */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold text-(--c-ink)">Tên bảng giá *</label>
          <Input
            value={form.name}
            onChange={e => onChange("name", e.target.value)}
            placeholder="VD: Dọn nhà 1 phòng"
            className="h-9 rounded-xl"
          />
        </div>
        {/* Số tiền */}
        {numField("Giá gốc (₫) *", "basePrice", "150000")}
        {numField("Giá cao điểm (₫)", "peakPrice", "Để trống nếu không có")}
        {numField("Phí thú cưng (₫)", "petFee", "0")}
        {numField("Phí chờ đợi (₫/15p)", "waitingFee", "0")}
        {numField("Hoa hồng nền tảng (%)", "platformCommissionRate", "20", 100)}
        {/* Đơn vị */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-(--c-ink)">Đơn vị tính</label>
          <Input
            value={form.priceUnit || ""}
            placeholder="VND"
            onChange={e => onChange("priceUnit", e.target.value)}
            className="h-9 rounded-xl"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-(--c-card-2) border border-(--c-line)/30 rounded-xl">
        <Switch checked={form.isActive ?? true} onCheckedChange={v => onChange("isActive", v)} />
        <span className={cn("text-sm font-semibold", form.isActive ? "text-[#0E9F6E]" : "text-(--c-muted)")}>
          {form.isActive ? "Đang hoạt động" : "Tắt"}
        </span>
      </div>
    </div>
  );
}
