"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";
import type { PricingConfig } from "@/features/admin/types/pricing.types";

export interface PricingConfigFormValues {
  name: string;
  basePrice: string;
  peakPrice: string;
  petFee: string;
  waitingFee: string;
  isActive: boolean;
}

interface PricingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: PricingConfig | null;
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
        className="h-11 rounded-xl pr-8 bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] text-sm font-medium focus:border-[var(--c-primary)]/50"
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

export function PricingConfigDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  isSubmitting,
}: PricingConfigDialogProps) {
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
    if (!open) return;
    if (mode === "edit" && initialData) {
      setForm({
        name: initialData.name ?? "",
        basePrice: String(initialData.basePrice),
        peakPrice: initialData.peakPrice != null ? String(initialData.peakPrice) : "",
        petFee: String(initialData.petFee),
        waitingFee: String(initialData.waitingFee),
        isActive: initialData.isActive,
      });
    } else {
      setForm({
        name: "",
        basePrice: "0",
        peakPrice: "",
        petFee: "0",
        waitingFee: "0",
        isActive: true,
      });
    }
    setErrors({});
  }, [open, mode, initialData]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof PricingConfigFormValues, string>> = {};
    if (mode === "create" && !form.name.trim()) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cz-admin max-w-lg rounded-2xl border-[var(--c-line)] shadow-2xl bg-[var(--c-card)] text-[var(--c-ink)]">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--c-primary-soft)] flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-[var(--c-primary-strong)]" />
            </div>
            <DialogTitle className="text-lg font-bold text-[var(--c-ink)]">
              {mode === "create" ? "Tạo cấu hình giá" : "Chỉnh sửa cấu hình giá"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[var(--c-muted)]">
            {mode === "create"
              ? "Thiết lập một bảng giá mới."
              : `Đang chỉnh sửa bảng giá: ${initialData?.name}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[var(--c-muted)] uppercase tracking-wider">
              Tên Bảng Giá
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="VD: Bảng giá dọn dẹp cơ bản"
              className="h-11 rounded-xl bg-[var(--c-card-2)] border-[var(--c-line-strong)] text-[var(--c-ink)] text-sm focus:border-[var(--c-primary)]/50"
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
            <NumberInput field="waitingFee" label="Phí schờ" placeholder="50000" form={form} set={set} errors={errors} />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[var(--c-card-2)] border border-[var(--c-line)] px-4 py-3">
            <div>
              <Label
                htmlFor="config-active"
                className="text-sm font-semibold cursor-pointer text-[var(--c-ink)]"
              >
                Kích hoạt
              </Label>
              <p className="text-[11px] text-[var(--c-muted)] mt-0.5">
                Bảng giá này có hiệu lực ngay
              </p>
            </div>
            <Switch
              id="config-active"
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
              className="data-[state=checked]:bg-[var(--c-primary)]"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl font-semibold h-10 text-[var(--c-ink-soft)] hover:bg-[var(--c-card-2)] hover:text-[var(--c-ink)]"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--c-primary)] hover:bg-[var(--c-primary)]/90 text-white rounded-xl font-semibold h-10 px-6 gap-2 shadow-sm"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "create" ? "Tạo mới" : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
