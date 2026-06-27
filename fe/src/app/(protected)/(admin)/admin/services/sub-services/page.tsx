"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Package, Search, Plus, Eye, CheckCircle2, XCircle,
  Check, X, Clock, DollarSign, MapPin, BarChart3, Tag,
  ChevronDown, TrendingUp, Filter, SlidersHorizontal,
  Activity, Layers, FileText, Image as ImageIcon,
  Loader2, Pencil, Trash2, Power, Save, AlertTriangle,
  Shield, RefreshCw, PlusCircle, LayoutGrid, Info,
} from "lucide-react";
import {
  useAdminServices, useAdminPackages,
  useUpdateAdminService, useDeleteAdminService,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import {
  AdminServiceEntity, UpdateAdminServiceDto,
} from "@/features/admin/modules/service/services/admin-services.service";
import {
  useCreatePricingConfig, useUpdatePricingConfig,
} from "@/features/admin/hooks/useAdminPricing";
import {
  CreatePricingConfigDto, PricingConfigEntity,
} from "@/features/admin/services/admin-pricing.service";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BaseButton } from "@/components/ui/base/base_button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const vnd = (val: number | string | null | undefined) => {
  if (!val && val !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency: "VND", maximumFractionDigits: 0,
  }).format(Number(val));
};

const PRICING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  FIXED:  { label: "Cố định",   color: "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)] dark:text-[#0E9F6E]" },
  HOURLY: { label: "Theo giờ",  color: "bg-[rgba(37,99,235,0.12)] text-[#2563EB] dark:bg-[rgba(37,99,235,0.12)] dark:text-[#2563EB]" },
  CUSTOM: { label: "Tuỳ chỉnh", color: "bg-[rgba(124,58,237,0.12)] text-[#7C3AED] dark:bg-[rgba(124,58,237,0.12)] dark:text-[#7C3AED]" },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconColor, bgColor, label, value, sub }: {
  icon: React.ElementType; iconColor: string; bgColor: string;
  label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl p-5 flex items-center gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", bgColor)}>
        <Icon className={cn("w-5 h-5", iconColor)} aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-[var(--c-muted)] font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-[var(--c-ink)] leading-tight">{value}</p>
        {sub && <p className="text-xs text-[var(--c-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Pricing Form Fields (top-level — tránh unmount/remount khi parent re-render) ───────────

type PricingFormData = CreatePricingConfigDto & { id?: string };

function PricingFormFields({
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
        <label className="text-xs font-bold text-[var(--c-ink)]">{label}</label>
        <Input
          inputMode="numeric"
          placeholder={placeholder}
          value={displayVal}
          onChange={e => {
            const digits = e.target.value.replace(/\D/g, "");
            const num = digits ? Math.min(max ?? Infinity, Number(digits)) : 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange(key, num as any);
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
          <label className="text-xs font-bold text-[var(--c-ink)]">Tên bảng giá *</label>
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
          <label className="text-xs font-bold text-[var(--c-ink)]">Đơn vị tính</label>
          <Input
            value={form.priceUnit || ""}
            placeholder="VND"
            onChange={e => onChange("priceUnit", e.target.value)}
            className="h-9 rounded-xl"
          />
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 bg-[var(--c-card-2)] border border-[var(--c-line)]/30 rounded-xl">
        <Switch checked={form.isActive ?? true} onCheckedChange={v => onChange("isActive", v)} />
        <span className={cn("text-sm font-semibold", form.isActive ? "text-[#0E9F6E]" : "text-[var(--c-muted)]")}>
          {form.isActive ? "Đang hoạt động" : "Tắt"}
        </span>
      </div>
    </div>
  );
}

// ─── Pricing Config Manager (inside Detail Sheet) ────────────────────────────────────

type PricingMode = "view" | "edit" | "create";

const emptyPricingForm: CreatePricingConfigDto = {
  name: "", basePrice: 0, peakPrice: null,
  petFee: 0, waitingFee: 0, priceUnit: "VND",
  platformCommissionRate: 20, isActive: true,
};

function PricingConfigManager({ svc }: { svc: AdminServiceEntity }) {
  const [mode, setMode] = useState<PricingMode>("view");
  const [editForm, setEditForm] = useState<PricingFormData>({ ...emptyPricingForm });

  const updateSvc  = useUpdateAdminService();
  const createCfg  = useCreatePricingConfig();
  const updateCfg  = useUpdatePricingConfig();

  const cfg = svc.pricingConfig;

  // Seed helpers — gọi khi user click, không dùng useEffect
  const startEdit = () => {
    if (!cfg) return;
    setEditForm({
      id: cfg.id, name: cfg.name,
      basePrice: Number(cfg.basePrice ?? 0),
      peakPrice: cfg.peakPrice ? Number(cfg.peakPrice) : null,
      petFee: cfg.petFee ? Number(cfg.petFee) : 0,
      waitingFee: cfg.waitingFee ? Number(cfg.waitingFee) : 0,
      priceUnit: "VND", platformCommissionRate: 20, isActive: true,
    });
    setMode("edit");
  };

  const startCreate = () => {
    setEditForm({ ...emptyPricingForm });
    setMode("create");
  };

  const set = <K extends keyof PricingFormData>(k: K, v: PricingFormData[K]) =>
    setEditForm(prev => ({ ...prev, [k]: v }));

  const handleSaveEdit = () => {
    if (!editForm.id) return;
    updateCfg.mutate(
      { id: editForm.id, payload: editForm },
      { onSuccess: () => setMode("view") },
    );
  };

  const handleCreate = () => {
    createCfg.mutate(editForm, {
      onSuccess: (newCfg: PricingConfigEntity) => {
        updateSvc.mutate(
          { id: svc.id, payload: { pricingConfigId: newCfg.id } },
          { onSuccess: () => { toast.success("Đã tạo và liên kết bảng giá!"); setMode("view"); } },
        );
      },
    });
  };

  const isSaving = createCfg.isPending || updateCfg.isPending || updateSvc.isPending;

  // ── VIEW mode ──
  if (mode === "view") {
    return (
      <div className="space-y-4">
        {cfg ? (
          <>
            {/* Current config display */}
            <div className="bg-gradient-to-br from-[var(--c-primary-soft)] to-[var(--c-primary-soft)] border border-[var(--c-primary)]/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-black text-[var(--c-ink)] text-base">{cfg.name}</p>
                  <p className="text-xs text-[var(--c-muted)] mt-0.5">ID: <span className="font-mono">{cfg.id}</span></p>
                </div>
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]">
                  Đang liên kết
                </span>
              </div>

              {/* Price grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Giá gốc",      value: vnd(cfg.basePrice),                              highlight: true  },
                  { label: "Giá cao điểm", value: cfg.peakPrice ? vnd(cfg.peakPrice) : "—",       highlight: false },
                  { label: "Phí thú cưng", value: cfg.petFee    ? vnd(cfg.petFee)    : "—",       highlight: false },
                  { label: "Phí chờ đợi",  value: cfg.waitingFee ? vnd(cfg.waitingFee) : "—",    highlight: false },
                ].map(f => (
                  <div key={f.label} className="bg-[var(--c-card)] border border-[var(--c-line)]/30 rounded-xl p-3">
                    <p className="text-[9px] text-[var(--c-muted)] font-bold uppercase tracking-wide">{f.label}</p>
                    <p className={cn("text-sm font-black mt-0.5", f.highlight ? "text-[var(--c-primary-strong)] text-base" : "text-[var(--c-ink)]")}>
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions — chỉ edit/create, không share config */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--c-primary)] text-white text-xs font-bold hover:bg-[var(--c-primary)] transition-colors">
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />Chỉnh sửa giá
              </button>
              <button type="button" onClick={startCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--c-line)]/50 text-xs font-semibold text-[var(--c-muted)] hover:text-[#0E9F6E] hover:border-[#0E9F6E] transition-colors">
                <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />Tạo lại bảng giá mới
              </button>
            </div>

            {/* Note */}
            <div className="flex items-start gap-2 p-3 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] border border-[#2563EB]/50 rounded-xl">
              <Info className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[10px] text-[#2563EB] dark:text-[#2563EB]">
                Bảng giá này dành riêng cho <strong>{svc.name}</strong>. Giá của gói dịch vụ sẽ được tính dựa trên giá gốc của từng dịch vụ con cộng với phụ phí gói.
              </p>
            </div>
          </>
        ) : (
          /* No config yet */
          <div className="py-8 text-center border-2 border-dashed border-[var(--c-line)]/50 rounded-2xl">
            <DollarSign className="w-10 h-10 mx-auto mb-3 text-[var(--c-muted)]" aria-hidden="true" />
            <p className="text-sm font-semibold text-[var(--c-muted)]">Chưa thiết lập giá</p>
            <p className="text-xs text-[var(--c-muted)] mt-1 mb-4">Tạo bảng giá riêng cho <strong>{svc.name}</strong></p>
            <button type="button" onClick={() => setMode("create")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--c-primary)] text-white text-xs font-bold hover:bg-[var(--c-primary)] transition-colors mx-auto">
              <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />Tạo bảng giá
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── EDIT mode ──
  if (mode === "edit") {
    return (
      <div className="space-y-4 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] border border-[#2563EB]/60 rounded-2xl p-5">
        <p className="text-sm font-black text-[#2563EB] dark:text-[#2563EB] flex items-center gap-2">
          <Pencil className="w-4 h-4" aria-hidden="true" />Chỉnh sửa bảng giá
        </p>
        <PricingFormFields form={editForm} onChange={set} />
        <div className="flex gap-2 justify-end">
          <BaseButton variant="outline" size="sm" onClick={() => setMode("view")} disabled={isSaving} className="rounded-xl">Hủy</BaseButton>
          <BaseButton variant="primary" size="sm" onClick={handleSaveEdit}
            disabled={isSaving || !editForm.name?.trim()} className="rounded-xl gap-2">
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            {isSaving ? "Đang lưu..." : "Lưu bảng giá"}
          </BaseButton>
        </div>
      </div>
    );
  }

  // ── CREATE mode ──
  if (mode === "create") {
    return (
      <div className="space-y-4 bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)] border border-[#0E9F6E]/60 rounded-2xl p-5">
        <p className="text-sm font-black text-[#0E9F6E] dark:text-[#0E9F6E] flex items-center gap-2">
          <PlusCircle className="w-4 h-4" aria-hidden="true" />Tạo bảng giá mới và liên kết
        </p>
        <PricingFormFields form={editForm} onChange={set} />
        <div className="flex gap-2 justify-end">
          <BaseButton variant="outline" size="sm" onClick={() => setMode("view")} disabled={isSaving} className="rounded-xl">Hủy</BaseButton>
          <BaseButton variant="primary" size="sm" onClick={handleCreate}
            disabled={isSaving || !editForm.name?.trim() || !editForm.basePrice} className="rounded-xl gap-2">
            <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {isSaving ? "Đang tạo..." : "Tạo & Liên kết"}
          </BaseButton>
        </div>
      </div>
    );
  }

  return null;
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, highlight = false }: {
  label: string; value: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-3 py-2.5 px-4 border-b border-[var(--c-line)]/30 last:border-0">
      <span className="text-xs text-[var(--c-muted)] shrink-0 pt-0.5">{label}</span>
      <span className={cn("text-sm font-semibold text-right", highlight ? "text-[var(--c-primary-strong)]" : "text-[var(--c-ink)]")}>
        {value}
      </span>
    </div>
  );
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function ServiceDetailSheet({ svc, open, onClose, onEdit }: {
  svc: AdminServiceEntity | null;
  open: boolean;
  onClose: () => void;
  onEdit: (svc: AdminServiceEntity) => void;
}) {
  // ⚠️ hooks phải đầu component, trước early return
  const [tab, setTab] = useState<"info" | "pricing">("info");

  if (!svc) return null;
  const pt = PRICING_TYPE_LABELS[svc.pricingType] ?? { label: svc.pricingType, color: "bg-[var(--c-card-2)] text-[var(--c-muted)]" };

  const tabs = [
    { key: "info" as const,    label: "Thông tin" },
    { key: "pricing" as const, label: "Cấu hình giá" },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="cz-admin w-full sm:max-w-[560px] p-0 overflow-y-auto flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-[var(--c-line)]/50 bg-[var(--c-card)] sticky top-0 z-10">
          <div className="flex items-start gap-4">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-[var(--c-card-2)] shrink-0 border border-[var(--c-line)]/40">
              {svc.thumbnailUrl ? (
                <Image src={svc.thumbnailUrl} alt={svc.name} fill className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="w-6 h-6 text-[var(--c-muted)]" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-black text-[var(--c-ink)] leading-tight">{svc.name}</SheetTitle>
              <SheetDescription className="mt-1.5">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] font-bold">
                    {svc.subServiceCode}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase", pt.color)}>
                    {pt.label}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                    svc.isActive ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]" : "bg-[rgba(225,29,72,0.12)] text-[#E11D48]",
                  )}>
                    {svc.isActive ? "Hoạt động" : "Tắt"}
                  </span>
                </div>
              </SheetDescription>
            </div>
            <button type="button" onClick={() => { onClose(); onEdit(svc); }}
              className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] hover:bg-[var(--c-primary-soft)] transition-colors shrink-0">
              <Pencil className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mt-3 bg-[var(--c-card-2)] p-1 rounded-xl">
            {tabs.map(t => (
              <button key={t.key} type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all",
                  tab === t.key
                    ? "bg-[var(--c-card)] text-[var(--c-primary-strong)] shadow-sm"
                    : "text-[var(--c-muted)] hover:text-[var(--c-ink)]",
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-8">

          {/* ── TAB: INFO ── */}
          {tab === "info" && (
            <>
              {/* Price summary */}
              <div className="grid grid-cols-2 gap-3 p-4 border-b border-[var(--c-line)]/40">
                {[
                  { label: "Giá gốc",      value: svc.pricingConfig?.basePrice ? vnd(svc.pricingConfig.basePrice) : "Chưa thiết lập", color: "text-[var(--c-primary-strong)]" },
                  { label: "Giá cao điểm", value: svc.pricingConfig?.peakPrice ? vnd(svc.pricingConfig.peakPrice) : "—",               color: "text-[#D97706]" },
                  { label: "Phí thú cưng", value: svc.pricingConfig?.petFee ? vnd(svc.pricingConfig.petFee) : "—",                     color: "text-[var(--c-ink)]" },
                  { label: "Phí chờ đợi",  value: svc.pricingConfig?.waitingFee ? vnd(svc.pricingConfig.waitingFee) : "—",             color: "text-[var(--c-ink)]" },
                ].map(s => (
                  <div key={s.label} className="bg-[var(--c-card-2)] rounded-xl p-3 border border-[var(--c-line)]/30">
                    <p className="text-[9px] text-[var(--c-muted)] font-bold uppercase tracking-wide">{s.label}</p>
                    <p className={cn("text-sm font-black mt-0.5", s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Core fields */}
              <div className="divide-y divide-[var(--c-line)]/30 mt-1">
                <InfoRow label="Mã dịch vụ" value={<span className="font-mono text-xs">{svc.subServiceCode}</span>} />
                <InfoRow label="Loại tính giá" value={svc.pricingType} />
                {svc.durationHours != null && (
                  <InfoRow label="Thời lượng" value={`${svc.durationHours} giờ`} highlight />
                )}
                {svc.coverageArea && (
                  <InfoRow label="Khu vực phục vụ" value={svc.coverageArea} />
                )}
                {svc.pricingConfig?.name && (
                  <InfoRow label="Bảng giá liên kết" value={svc.pricingConfig.name} />
                )}
              </div>

              {/* Descriptions */}
              {(svc.shortDescription || svc.description) && (
                <div className="px-4 pt-5 pb-3 border-t border-[var(--c-line)]/40 space-y-4">
                  {svc.shortDescription && (
                    <div>
                      <p className="text-[10px] font-black text-[var(--c-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" aria-hidden="true" />Mô tả ngắn
                      </p>
                      <p className="text-sm leading-relaxed text-[var(--c-ink)] bg-[var(--c-card-2)] p-3 rounded-xl border border-[var(--c-line)]/30">
                        {svc.shortDescription}
                      </p>
                    </div>
                  )}
                  {svc.description && (
                    <div>
                      <p className="text-[10px] font-black text-[var(--c-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" aria-hidden="true" />Mô tả đầy đủ
                      </p>
                      <p className="text-sm leading-relaxed text-[var(--c-muted)] bg-[var(--c-card-2)] p-3 rounded-xl border border-[var(--c-line)]/30 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {svc.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tasks */}
              {((svc.includedTasks?.length ?? 0) > 0 || (svc.excludedTasks?.length ?? 0) > 0) && (
                <div className="px-4 pt-4 pb-3 border-t border-[var(--c-line)]/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {(svc.includedTasks?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-[#0E9F6E] uppercase tracking-wider mb-3 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          Bao gồm ({svc.includedTasks?.length})
                        </p>
                        <ul className="space-y-2">
                          {svc.includedTasks?.map((task, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check className="w-3.5 h-3.5 text-[#0E9F6E] shrink-0 mt-0.5" aria-hidden="true" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(svc.excludedTasks?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-[#E11D48] uppercase tracking-wider mb-3 flex items-center gap-1">
                          <XCircle className="w-3 h-3" aria-hidden="true" />
                          Không gồm ({svc.excludedTasks?.length})
                        </p>
                        <ul className="space-y-2">
                          {svc.excludedTasks?.map((task, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--c-muted)]">
                              <X className="w-3.5 h-3.5 text-[#E11D48] shrink-0 mt-0.5" aria-hidden="true" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gallery */}
              {(svc.galleryUrls?.length ?? 0) > 0 && (
                <div className="px-4 pt-4 pb-3 border-t border-[var(--c-line)]/40">
                  <p className="text-[10px] font-black text-[var(--c-muted)] uppercase tracking-wider mb-3 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" aria-hidden="true" />
                    Ảnh dịch vụ ({svc.galleryUrls?.length})
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {svc.galleryUrls?.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--c-line)]/40">
                        <Image src={url} alt={`${svc.name} ${i + 1}`} fill className="object-cover hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── TAB: PRICING ── */}
          {tab === "pricing" && (
            <div className="p-5">
              <PricingConfigManager svc={svc} />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────

function EditServiceSheet({ svc, open, onClose }: {
  svc: AdminServiceEntity | null;
  open: boolean;
  onClose: () => void;
}) {
  const updateMutation = useUpdateAdminService();
  // Lazy initializer — form được reset bằng key={svc?.id} ở nơi render
  const [form, setForm] = useState<UpdateAdminServiceDto>(() => ({
    name: svc?.name ?? "",
    shortDescription: svc?.shortDescription ?? "",
    description: svc?.description ?? "",
    coverageArea: svc?.coverageArea ?? "",
    durationHours: svc?.durationHours ?? undefined,
    pricingType: svc?.pricingType,
    isActive: svc?.isActive ?? true,
  }));

  if (!svc) return null;

  const set = <K extends keyof UpdateAdminServiceDto>(k: K, v: UpdateAdminServiceDto[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="cz-admin w-full sm:max-w-[520px] p-0 overflow-y-auto flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-[var(--c-line)]/50 bg-[var(--c-card)] sticky top-0 z-10">
          <SheetTitle className="text-xl font-black flex items-center gap-2">
            <Pencil className="w-5 h-5 text-[var(--c-primary-strong)]" aria-hidden="true" />
            Chỉnh sửa dịch vụ con
          </SheetTitle>
          <SheetDescription>
            <span className="font-mono text-xs text-[var(--c-primary-strong)]">{svc.subServiceCode}</span> · {svc.name}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--c-ink)]">Tên dịch vụ *</label>
            <Input value={form.name ?? ""} onChange={e => set("name", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--c-ink)]">Mô tả ngắn</label>
            <Textarea value={form.shortDescription ?? ""} onChange={e => set("shortDescription", e.target.value)}
              rows={2} className="rounded-xl resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--c-ink)]">Mô tả đầy đủ</label>
            <Textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)}
              rows={4} className="rounded-xl resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--c-ink)]">Khu vực phục vụ</label>
            <Input value={form.coverageArea ?? ""} onChange={e => set("coverageArea", e.target.value)}
              placeholder="VD: Hà Nội, TP.HCM..." className="h-10 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--c-ink)]">Thời lượng (giờ)</label>
              <Input type="number" min={0} step={0.5}
                value={form.durationHours ?? ""}
                onChange={e => set("durationHours", e.target.value ? Number(e.target.value) : undefined)}
                className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--c-ink)]">Loại tính giá</label>
              <Select value={form.pricingType ?? "FIXED"} onValueChange={v => set("pricingType", v)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="cz-admin">
                  <SelectItem value="FIXED">Cố định</SelectItem>
                  <SelectItem value="HOURLY">Theo giờ</SelectItem>
                  <SelectItem value="CUSTOM">Tuỳ chỉnh</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-[var(--c-card-2)] border border-[var(--c-line)]/40 rounded-xl">
            <Switch checked={form.isActive ?? true} onCheckedChange={v => set("isActive", v)} />
            <div>
              <p className={cn("text-sm font-bold", form.isActive ? "text-[#0E9F6E]" : "text-[var(--c-muted)]")}>
                {form.isActive ? "Đang hoạt động" : "Tắt"}
              </p>
              <p className="text-xs text-[var(--c-muted)]">
                {form.isActive ? "Dịch vụ hiển thị cho khách hàng" : "Dịch vụ đang bị ẩn"}
              </p>
            </div>
          </div>
          <div className="bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)] border border-[#D97706]/60 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-[#D97706] dark:text-[#D97706]">
              Thay đổi tên/mô tả sẽ ảnh hưởng đến tất cả gói dịch vụ liên kết.
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--c-line)]/40 px-6 py-4 flex gap-3 justify-end bg-[var(--c-card)]">
          <BaseButton variant="outline" onClick={onClose} className="rounded-xl">Hủy</BaseButton>
          <BaseButton variant="primary" onClick={() => updateMutation.mutate({ id: svc.id, payload: form }, { onSuccess: onClose })}
            disabled={updateMutation.isPending || !form.name?.trim()} className="rounded-xl gap-2">
            <Save className="w-4 h-4" aria-hidden="true" />
            {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </BaseButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Service Row ──────────────────────────────────────────────────────────────

function ServiceRow({ svc, onViewDetail, onEdit, onDelete, onToggle, isToggling }: {
  svc: AdminServiceEntity;
  onViewDetail: (svc: AdminServiceEntity) => void;
  onEdit: (svc: AdminServiceEntity) => void;
  onDelete: (svc: AdminServiceEntity) => void;
  onToggle: (svc: AdminServiceEntity) => void;
  isToggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const pt = PRICING_TYPE_LABELS[svc.pricingType] ?? { label: svc.pricingType, color: "bg-[var(--c-card-2)] text-[var(--c-muted)]" };
  const bp = svc.pricingConfig?.basePrice;

  return (
    <div className={cn(
      "border rounded-2xl overflow-hidden bg-[var(--c-card)] transition-all duration-200",
      expanded ? "border-[var(--c-primary)]/40 shadow-lg" : "border-[var(--c-line)]/50 shadow-sm hover:border-[var(--c-primary)]/20 hover:shadow-md",
    )}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-3.5">
        <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-[var(--c-card-2)] shrink-0 border border-[var(--c-line)]/40 cursor-pointer"
          onClick={() => setExpanded(!expanded)}>
          {svc.thumbnailUrl ? (
            <Image src={svc.thumbnailUrl} alt={svc.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="w-5 h-5 text-[var(--c-muted)]" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-[var(--c-ink)] text-sm hover:text-[var(--c-primary-strong)] transition-colors">{svc.name}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] font-bold hidden sm:inline">{svc.subServiceCode}</span>
            <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase hidden sm:inline", pt.color)}>{pt.label}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase",
              svc.isActive
                ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] dark:bg-[rgba(14,159,110,0.12)] dark:text-[#0E9F6E]"
                : "bg-[rgba(225,29,72,0.12)] text-[#E11D48] dark:bg-[rgba(225,29,72,0.12)] dark:text-[#E11D48]",
            )}>{svc.isActive ? "Hoạt động" : "Tắt"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-[var(--c-muted)]">
            {svc.durationHours && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" aria-hidden="true" />{svc.durationHours}h</span>}
            {bp && <span className="flex items-center gap-0.5 text-[var(--c-primary-strong)] font-semibold"><DollarSign className="w-3 h-3" aria-hidden="true" />{vnd(bp)}</span>}
            {svc.coverageArea && <span className="flex items-center gap-0.5 hidden sm:flex"><MapPin className="w-3 h-3" aria-hidden="true" />{svc.coverageArea}</span>}
            {(svc.includedTasks?.length ?? 0) > 0 && <span className="flex items-center gap-0.5 text-[#0E9F6E]"><Check className="w-3 h-3" aria-hidden="true" />{svc.includedTasks?.length} tác vụ</span>}
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" title={svc.isActive ? "Tắt" : "Bật"} onClick={e => { e.stopPropagation(); onToggle(svc); }} disabled={isToggling}
            className={cn("p-2 rounded-xl transition-colors disabled:opacity-40", svc.isActive ? "text-[#0E9F6E] hover:bg-[rgba(14,159,110,0.12)] dark:hover:bg-[rgba(14,159,110,0.12)]" : "text-[var(--c-muted)] hover:bg-[var(--c-card-2)]")}>
            <Power className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button type="button" title="Xem chi tiết" onClick={e => { e.stopPropagation(); onViewDetail(svc); }}
            className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] hover:bg-[var(--c-primary-soft)] transition-colors">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button type="button" title="Chỉnh sửa" onClick={e => { e.stopPropagation(); onEdit(svc); }}
            className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[#2563EB] hover:bg-[rgba(37,99,235,0.12)] dark:hover:bg-[rgba(37,99,235,0.12)] transition-colors">
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button type="button" title="Xóa" onClick={e => { e.stopPropagation(); onDelete(svc); }}
            className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[#E11D48] hover:bg-[rgba(225,29,72,0.12)] transition-colors">
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setExpanded(!expanded)} className="p-2 rounded-xl text-[var(--c-muted)] hover:bg-[var(--c-card-2)] transition-colors">
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", expanded && "rotate-180")} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-[var(--c-line)]/50 bg-[var(--c-card-2)] p-4 animate-in fade-in-0 slide-in-from-top-1 duration-200 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: "Giá gốc", value: bp ? vnd(bp) : "Chưa thiết lập", color: "text-[var(--c-primary-strong)]", bg: "bg-[var(--c-primary-soft)]", icon: DollarSign },
              { label: "Giá cao điểm", value: svc.pricingConfig?.peakPrice ? vnd(svc.pricingConfig.peakPrice) : "—", color: "text-[#D97706]", bg: "bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)]", icon: TrendingUp },
              { label: "Thời lượng", value: svc.durationHours ? `${svc.durationHours}h` : "—", color: "text-[#2563EB]", bg: "bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)]", icon: Clock },
              { label: "Tasks bao gồm", value: `${svc.includedTasks?.length ?? 0} mục`, color: "text-[#0E9F6E]", bg: "bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]", icon: Check },
            ].map(s => (
              <div key={s.label} className="bg-[var(--c-card)] border border-[var(--c-line)]/40 rounded-xl p-3 flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", s.bg)}>
                  <s.icon className={cn("w-3.5 h-3.5", s.color)} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-[var(--c-muted)] font-bold uppercase tracking-wide">{s.label}</p>
                  <p className="text-xs font-bold text-[var(--c-ink)] truncate">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {svc.shortDescription && (
            <p className="text-sm text-[var(--c-muted)] bg-[var(--c-card)] p-3 rounded-xl border border-[var(--c-line)]/40 leading-relaxed">
              {svc.shortDescription}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onViewDetail(svc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--c-primary)] text-white text-xs font-bold hover:bg-[var(--c-primary)] transition-colors">
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />Xem chi tiết & Cấu hình giá
            </button>
            <button type="button" onClick={() => onEdit(svc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--c-line)]/50 text-xs font-semibold text-[var(--c-muted)] hover:text-[#2563EB] hover:border-[#2563EB] transition-colors">
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />Chỉnh sửa
            </button>
            <button type="button" onClick={() => onToggle(svc)} disabled={isToggling}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40",
                svc.isActive ? "border-[#E11D48] text-[#E11D48] hover:bg-[rgba(225,29,72,0.12)]" : "border-[#0E9F6E] text-[#0E9F6E] hover:bg-[rgba(14,159,110,0.12)]")}>
              <Power className="w-3.5 h-3.5" aria-hidden="true" />{svc.isActive ? "Tắt dịch vụ" : "Bật dịch vụ"}
            </button>
            <button type="button" onClick={() => onDelete(svc)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E11D48] text-xs font-semibold text-[#E11D48] hover:bg-[rgba(225,29,72,0.12)] transition-colors">
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />Xóa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubServicesManagementPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [pricingFilter, setPricingFilter] = useState("ALL");
  const [packageFilter, setPackageFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [detailSvc, setDetailSvc] = useState<AdminServiceEntity | null>(null);
  const [editSvc, setEditSvc] = useState<AdminServiceEntity | null>(null);
  const [deleteSvc, setDeleteSvc] = useState<AdminServiceEntity | null>(null);

  const updateMutation = useUpdateAdminService();
  const deleteMutation = useDeleteAdminService();

  const { data: packagesData } = useAdminPackages();
  const packages = packagesData ?? [];

  const { data, isLoading } = useAdminServices({
    page, limit,
    search: search || undefined,
    isActive: activeFilter === "ALL" ? undefined : activeFilter === "ACTIVE",
    packageId: packageFilter === "ALL" ? undefined : packageFilter,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const filtered = useMemo(() => {
    if (pricingFilter === "ALL") return items;
    if (pricingFilter === "PRICED") return items.filter(s => s.pricingConfig?.basePrice);
    if (pricingFilter === "UNPRICED") return items.filter(s => !s.pricingConfig?.basePrice);
    return items.filter(s => s.pricingType === pricingFilter);
  }, [items, pricingFilter]);

  const activeCount = items.filter(s => s.isActive).length;
  const pricedCount = items.filter(s => s.pricingConfig?.basePrice).length;
  const avgPrice = pricedCount > 0
    ? items.reduce((sum, s) => sum + (s.pricingConfig?.basePrice ? Number(s.pricingConfig.basePrice) : 0), 0) / pricedCount
    : 0;

  const handleToggle = (svc: AdminServiceEntity) => {
    updateMutation.mutate(
      { id: svc.id, payload: { isActive: !svc.isActive } },
      { onSuccess: () => toast.success(svc.isActive ? "Đã tắt dịch vụ" : "Đã bật dịch vụ") }
    );
  };

  const handleDelete = () => {
    if (!deleteSvc) return;
    deleteMutation.mutate(deleteSvc.id, { onSuccess: () => setDeleteSvc(null) });
  };

  const hasFilters = search || activeFilter !== "ALL" || pricingFilter !== "ALL" || packageFilter !== "ALL";

  return (
    <div className="space-y-6 w-full">

      {/* Sheets */}
      <ServiceDetailSheet
        svc={detailSvc}
        open={!!detailSvc}
        onClose={() => setDetailSvc(null)}
        onEdit={svc => { setDetailSvc(null); setEditSvc(svc); }}
      />
      <EditServiceSheet key={editSvc?.id} svc={editSvc} open={!!editSvc} onClose={() => setEditSvc(null)} />
      <AlertDialog open={!!deleteSvc} onOpenChange={open => !open && setDeleteSvc(null)}>
        <AlertDialogContent className="cz-admin">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-[#E11D48]" aria-hidden="true" />Xóa dịch vụ con
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Xóa <strong>{deleteSvc?.name}</strong>? Thao tác không thể hoàn tác.</p>
              <div className="bg-[rgba(225,29,72,0.12)] dark:bg-[rgba(225,29,72,0.12)] border border-[#E11D48]/60 rounded-xl p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#E11D48] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-xs text-[#E11D48] dark:text-[#E11D48]">
                  Nếu dịch vụ đang có đơn hàng chưa hoàn thành, hệ thống sẽ từ chối xóa.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}
              className="bg-[#E11D48] text-white hover:bg-[#E11D48] gap-2">
              {deleteMutation.isPending
                ? <><RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />Đang xóa...</>
                : <><Trash2 className="w-4 h-4" aria-hidden="true" />Xóa dịch vụ</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--c-ink)]">Quản lý Dịch vụ con</h1>
          <p className="text-sm text-[var(--c-muted)] mt-1">
            Danh sách đầy đủ các dịch vụ con với thông số phân tích và cấu hình giá chi tiết
          </p>
        </div>
        <BaseButton variant="primary" onClick={() => router.push("/admin/services/create")}
          className="gap-2 rounded-xl h-9 shrink-0">
          <Plus className="w-4 h-4" aria-hidden="true" />Thêm dịch vụ con
        </BaseButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Layers}    iconColor="text-[var(--c-primary-strong)]"     bgColor="bg-[var(--c-primary-soft)]"                    label="Tổng dịch vụ"    value={total}         sub="trên hệ thống" />
        <StatCard icon={Activity}  iconColor="text-[#0E9F6E]" bgColor="bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]" label="Đang hoạt động" value={activeCount}   sub={`${total - activeCount} tắt`} />
        <StatCard icon={Tag}       iconColor="text-[#2563EB]"    bgColor="bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)]"   label="Có cấu hình giá" value={pricedCount}   sub="dịch vụ" />
        <StatCard icon={BarChart3} iconColor="text-[#D97706]"   bgColor="bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)]" label="Giá TB"          value={vnd(Math.round(avgPrice))} sub="/ dịch vụ" />
      </div>

      {/* Filters */}
      <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" aria-hidden="true" />
            <Input placeholder="Tìm theo tên dịch vụ..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 h-9 rounded-xl text-sm bg-[var(--c-card)]" />
          </div>

          {/* Package filter */}
          <Select value={packageFilter} onValueChange={v => { setPackageFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[170px] rounded-xl text-xs font-semibold">
              <LayoutGrid className="w-3.5 h-3.5 mr-1.5 text-[var(--c-muted)]" aria-hidden="true" />
              <SelectValue placeholder="Theo gói" />
            </SelectTrigger>
            <SelectContent className="cz-admin">
              <SelectItem value="ALL">Tất cả gói dịch vụ</SelectItem>
              {packages.map(pkg => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active filter */}
          <Select value={activeFilter} onValueChange={v => { setActiveFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[140px] rounded-xl text-xs font-semibold">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-[var(--c-muted)]" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="cz-admin">
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
              <SelectItem value="INACTIVE">Tắt</SelectItem>
            </SelectContent>
          </Select>

          {/* Pricing type filter */}
          <Select value={pricingFilter} onValueChange={v => { setPricingFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-[var(--c-muted)]" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="cz-admin">
              <SelectItem value="ALL">Tất cả loại giá</SelectItem>
              <SelectItem value="PRICED">Đã cấu hình giá</SelectItem>
              <SelectItem value="UNPRICED">Chưa có giá</SelectItem>
              <SelectItem value="FIXED">Cố định</SelectItem>
              <SelectItem value="HOURLY">Theo giờ</SelectItem>
              <SelectItem value="CUSTOM">Tuỳ chỉnh</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <BaseButton variant="outline" size="sm"
              onClick={() => { setSearch(""); setActiveFilter("ALL"); setPricingFilter("ALL"); setPackageFilter("ALL"); setPage(1); }}
              className="rounded-xl h-9 text-xs gap-1">
              <X className="w-3.5 h-3.5" aria-hidden="true" />Xóa bộ lọc
            </BaseButton>
          )}

          <div className="ml-auto text-xs text-[var(--c-muted)]">
            <span className="font-bold text-[var(--c-ink)]">{filtered.length}</span> / {total} dịch vụ
          </div>
        </div>

        {/* Active package badge */}
        {packageFilter !== "ALL" && (
          <div className="flex items-center gap-2 bg-[var(--c-primary-soft)] border border-[var(--c-primary)]/20 rounded-xl px-3 py-2">
            <LayoutGrid className="w-3.5 h-3.5 text-[var(--c-primary-strong)]" aria-hidden="true" />
            <span className="text-xs text-[var(--c-primary-strong)] font-semibold">
              Đang lọc theo gói: <strong>{packages.find(p => p.id === packageFilter)?.name}</strong>
            </span>
            <button type="button" onClick={() => setPackageFilter("ALL")} className="ml-auto text-[var(--c-muted)] hover:text-[var(--c-ink)]">
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-[var(--c-primary-strong)] animate-spin" aria-hidden="true" />
          <p className="text-sm text-[var(--c-muted)]">Đang tải danh sách dịch vụ con...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20">
          <BaseEmptyState title="Không tìm thấy dịch vụ con"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm" icon={Package} />
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(svc => (
            <ServiceRow key={svc.id} svc={svc}
              onViewDetail={setDetailSvc} onEdit={setEditSvc}
              onDelete={setDeleteSvc} onToggle={handleToggle}
              isToggling={updateMutation.isPending} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-[var(--c-muted)]">
            Trang <span className="font-bold">{page}</span> / <span className="font-bold">{totalPages}</span>
            {" "}· <span className="font-bold text-[var(--c-primary-strong)]">{total}</span> bản ghi
          </p>
          <div className="flex gap-2">
            <BaseButton variant="outline" size="sm" disabled={page === 1}
              onClick={() => setPage(p => p - 1)} className="rounded-xl h-9 text-xs">← Trước</BaseButton>
            <BaseButton variant="outline" size="sm" disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)} className="rounded-xl h-9 text-xs">Sau →</BaseButton>
          </div>
        </div>
      )}
    </div>
  );
}
