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
import { Loader2, Flame } from "lucide-react";
import type { PeakDayConfig } from "@/features/admin/types/pricing.types";

export interface PeakDayFormValues {
  name: string;
  startAt: string;
  endAt: string;
  startTime: string;
  endTime: string;
  peakRate: string;
  isActive: boolean;
}

interface PeakDayConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: PeakDayConfig | null;
  onSubmit: (data: PeakDayFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function PeakDayConfigDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSubmit,
  isSubmitting,
}: PeakDayConfigDialogProps) {
  const [form, setForm] = React.useState<PeakDayFormValues>({
    name: "",
    startAt: "",
    endAt: "",
    startTime: "",
    endTime: "",
    peakRate: "0.1",
    isActive: true,
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof PeakDayFormValues, string>>>({});

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialData) {
      setForm({
        name: initialData.name,
        startAt: initialData.startAt
          ? new Date(initialData.startAt).toISOString().slice(0, 16)
          : "",
        endAt: initialData.endAt
          ? new Date(initialData.endAt).toISOString().slice(0, 16)
          : "",
        startTime: initialData.startTime ?? "",
        endTime: initialData.endTime ?? "",
        peakRate: String(initialData.peakRate),
        isActive: initialData.isActive,
      });
    } else {
      setForm({
        name: "",
        startAt: "",
        endAt: "",
        startTime: "",
        endTime: "",
        peakRate: "0.1",
        isActive: true,
      });
    }
    setErrors({});
  }, [open, mode, initialData]);

  const validate = (): boolean => {
    const errs: Partial<Record<keyof PeakDayFormValues, string>> = {};
    if (!form.name.trim()) errs.name = "Tên không được để trống";
    const rate = Number(form.peakRate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      errs.peakRate = "Tỷ lệ phụ thu từ 0 đến 1 (= 0% đến 100%)";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  const set = (field: keyof PeakDayFormValues, value: string | boolean) =>
    setForm((s) => ({ ...s, [field]: value }));

  const peakRatePercent = isNaN(Number(form.peakRate))
    ? 0
    : Number(form.peakRate) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-border/50 shadow-2xl bg-card">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {mode === "create"
                ? "Tạo cấu hình ngày cao điểm"
                : "Chỉnh sửa ngày cao điểm"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Phụ thu tự động áp dụng khi booking rơi vào khung giờ / khoảng ngày cao điểm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tên ngày cao điểm
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="VD: Tết Nguyên Đán 2026"
              className="h-11 rounded-xl bg-muted/30 border-border/50 text-sm font-medium focus-visible:ring-primary/20"
            />
            {errors.name && (
              <p className="text-xs text-destructive font-medium">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tỷ lệ phụ thu cao điểm
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={1}
                value={form.peakRate}
                onChange={(e) => set("peakRate", e.target.value)}
                placeholder="0.1"
                className="h-11 rounded-xl bg-muted/30 border-border/50 text-sm font-medium pr-24 focus-visible:ring-primary/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500 pointer-events-none">
                +{peakRatePercent.toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              0.1 = +10% · 0.25 = +25% · Tối đa 1 (= 100%)
            </p>
            {errors.peakRate && (
              <p className="text-xs text-destructive font-medium">{errors.peakRate}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Khoảng ngày áp dụng
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Từ ngày</Label>
                <Input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => set("startAt", e.target.value)}
                  className="h-10 rounded-xl bg-muted/30 border-border/50 text-sm focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Đến ngày</Label>
                <Input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => set("endAt", e.target.value)}
                  className="h-10 rounded-xl bg-muted/30 border-border/50 text-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Khung giờ hàng ngày
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Giờ bắt đầu</Label>
                <Input
                  type="time"
                  step={1}
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  className="h-10 rounded-xl bg-muted/30 border-border/50 text-sm focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Giờ kết thúc</Label>
                <Input
                  type="time"
                  step={1}
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                  className="h-10 rounded-xl bg-muted/30 border-border/50 text-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Để trống nếu áp dụng cả ngày.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
            <div>
              <Label htmlFor="peak-active" className="text-sm font-semibold cursor-pointer">
                Kích hoạt
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Phụ thu được áp dụng tự động
              </p>
            </div>
            <Switch
              id="peak-active"
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl font-semibold h-10"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold h-10 px-6 gap-2 shadow-sm"
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
