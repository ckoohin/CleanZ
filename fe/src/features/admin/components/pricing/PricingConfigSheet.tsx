"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";
import type { PricingConfigFormValues } from "./PricingConfigDialog";

interface PricingConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PricingConfigFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const NumberInput = ({
  field,
  label,
  suffix = "₫",
  hint,
  placeholder = "0",
  form,
  set,
  errors,
}: {
  field: keyof PricingConfigFormValues;
  label: string;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  form: PricingConfigFormValues;
  set: (field: keyof PricingConfigFormValues, value: string) => void;
  errors: Partial<Record<keyof PricingConfigFormValues, string>>;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wider">
      {label}
    </Label>
    <div className="relative">
      <Input
        type="number"
        min={0}
        value={form[field] as string}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl pr-8 bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-sm font-medium focus-visible:ring-primary/20 focus-visible:border-primary/40"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--c-muted)] font-medium pointer-events-none">
        {suffix}
      </span>
    </div>
    {hint && <p className="text-[11px] text-[var(--c-muted)]">{hint}</p>}
    {errors[field] && (
      <p className="text-xs text-[#E11D48] font-medium">{errors[field]}</p>
    )}
  </div>
);

export function PricingConfigSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: PricingConfigSheetProps) {
  const [form, setForm] = React.useState<PricingConfigFormValues>({
    name: "",
    basePrice: "0",
    peakPrice: "",
    petFee: "0",
    waitingFee: "0",
    isActive: true,
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof PricingConfigFormValues, string>>>({});

  React.useEffect(() => {
    if (open) {
      setForm({
        name: "",
        basePrice: "0",
        peakPrice: "",
        petFee: "0",
        waitingFee: "0",
        isActive: true,
      });
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof PricingConfigFormValues, string>> = {};
    if (!form.name.trim()) {
      errs.name = "Tên bảng giá không được để trống";
    }
    if (form.basePrice === "" || isNaN(Number(form.basePrice)) || Number(form.basePrice) < 0) {
      errs.basePrice = "Giá cơ bản phải là số ≥ 0";
    }
    if (form.peakPrice !== "" && (isNaN(Number(form.peakPrice)) || Number(form.peakPrice) < 0)) {
      errs.peakPrice = "Giá cao điểm phải là số ≥ 0";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const set = (field: keyof PricingConfigFormValues, value: string | boolean) =>
    setForm((s) => ({ ...s, [field]: value }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="cz-admin w-full sm:max-w-md overflow-y-auto p-6 sm:p-8 bg-[var(--c-card)] text-[var(--c-ink)] border-[var(--c-line)]">
        <SheetHeader className="pb-6 border-b border-[var(--c-line)] mb-6 text-left">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-[var(--c-primary-strong)]" />
            </div>
            <SheetTitle className="text-lg font-bold text-[var(--c-ink)]">Thêm bảng giá nhanh</SheetTitle>
          </div>
          <SheetDescription className="text-xs text-[var(--c-muted)]">
            Thiết lập một cấu hình giá mới để áp dụng ngay cho dịch vụ này.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wider">
              Tên Bảng Giá
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="VD: Bảng giá dọn dẹp cơ bản"
              className="h-11 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-sm focus-visible:ring-primary/20"
            />
            {errors.name && (
              <p className="text-xs text-[#E11D48] font-medium">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberInput field="basePrice" label="Giá cơ bản" placeholder="180000" form={form} set={set} errors={errors} />
            <NumberInput
              field="peakPrice"
              label="Giá cao điểm"
              placeholder="220000"
              hint="Để trống = dùng giá cơ bản"
              form={form} set={set} errors={errors}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberInput field="petFee" label="Phí thú cưng" placeholder="30000" form={form} set={set} errors={errors} />
            <NumberInput field="waitingFee" label="Phí chờ" placeholder="50000" form={form} set={set} errors={errors} />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)] px-4 py-3">
            <div>
              <Label
                htmlFor="sheet-config-active"
                className="text-sm font-semibold cursor-pointer text-[var(--c-ink)]"
              >
                Kích hoạt
              </Label>
              <p className="text-[11px] text-[var(--c-muted)] mt-0.5">
                Bảng giá này có hiệu lực ngay
              </p>
            </div>
            <Switch
              id="sheet-config-active"
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
              className="data-[state=checked]:bg-[var(--c-primary)]"
            />
          </div>

          <SheetFooter className="pt-6 border-t border-[var(--c-line)] sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl font-semibold h-11 text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--c-primary)] hover:bg-[var(--c-primary)]/90 text-white rounded-xl font-semibold h-11 px-6 gap-2 shadow-sm"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu bảng giá
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
