"use client";

import React, { useState } from "react";
import {
  DollarSign, Moon, PawPrint, Clock, Wrench, TrendingUp, Edit3, Save, X as XIcon, Sparkles,
  Calculator, AlertCircle, Plus, Trash2, CheckCircle2, XCircle, Pencil, Flame,
  Timer, CalendarDays, SlidersHorizontal, Tag, BarChart3, ArrowUpRight, Info,
  Layers, ChevronDown, ChevronUp, Home, Ruler, ToggleLeft,
} from "lucide-react";
import { AdminServicePackageEntity } from "@/features/admin/modules/service/services/admin-services.service";
import { useUpdateAdminPackage } from "@/features/admin/modules/service/hooks/useAdminServices";
import {
  usePeakDays,
  useCreatePeakDay,
  useUpdatePeakDay,
  useDeletePeakDay,
  usePricingTiers,
  useCreatePricingTier,
  useUpdatePricingTier,
  useDeletePricingTier,
} from "@/features/admin/hooks/useAdminPricing";
import {
  PeakDayConfigEntity,
  CreatePeakDayConfigDto,
  PricingTierEntity,
  CreatePricingTierDto,
  PricingMode,
} from "@/features/admin/services/admin-pricing.service";

import { Input } from "@/components/ui/input";
import { BaseButton } from "@/components/ui/base/base_button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ServiceOptionsBuilder } from "./ServiceOptionsBuilder";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const vnd = (val: number | null | undefined) => {
  if (val === null || val === undefined || val === 0) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
};

const fmtDateStr = (d: string | null | undefined) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: vi }); } catch { return d; }
};

// ─── Section Card ─────────────────────────────────────────────────────────────

function SCard({ icon: Icon, title, description, action, children }: {
  icon: React.ElementType; title: string; description?: string;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-[var(--c-line)]/40 bg-[var(--c-card-2)] flex items-center gap-3">
        <div className="p-2 bg-[var(--c-primary-soft)] rounded-xl shrink-0">
          <Icon className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[var(--c-ink)] text-base">{title}</h3>
          {description && <p className="text-xs text-[var(--c-muted)] mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Surcharge Tiles ──────────────────────────────────────────────────────────

interface SurchargeField {
  key: keyof Pick<AdminServicePackageEntity, "nightSurcharge" | "petSurcharge" | "waitingSurcharge" | "toolFee" | "peakRatePercent">;
  label: string; icon: React.ElementType; color: string;
  isPercent?: boolean; description: string; emoji: string;
}

const SURCHARGE_FIELDS: SurchargeField[] = [
  { key: "nightSurcharge",   label: "Phụ thu giờ đêm",           icon: Moon,       color: "text-[#2563EB]", description: "Áp dụng cho ca làm việc sau 20h hoặc trước 7h sáng",         emoji: "🌙" },
  { key: "petSurcharge",     label: "Phụ thu thú cưng",           icon: PawPrint,   color: "text-[#D97706]",  description: "Áp dụng khi khách hàng có thú cưng tại nhà",                emoji: "🐾" },
  { key: "waitingSurcharge", label: "Phụ thu chờ đợi (15 phút)", icon: Clock,      color: "text-[#2563EB]",   description: "Phụ phí nếu nhân viên phải chờ khách quá 15 phút",          emoji: "⏱️" },
  { key: "toolFee",          label: "Phí dụng cụ mang theo",      icon: Wrench,     color: "text-[#0E9F6E]",description: "Phí dụng cụ và hóa chất vệ sinh nếu khách không chuẩn bị",  emoji: "🔧" },
  { key: "peakRatePercent",  label: "Tỷ lệ giờ cao điểm (%)",    icon: TrendingUp, color: "text-[#E11D48]",   description: "Phần trăm tăng thêm vào giá gốc trong giờ cao điểm",       emoji: "📈", isPercent: true },
];


// ─── Peak Day Row ─────────────────────────────────────────────────────────────

function PeakDayRow({ peak, onEdit, onDelete, isDeleting }: {
  peak: PeakDayConfigEntity;
  onEdit: (p: PeakDayConfigEntity) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <tr className={cn(
      "border-b border-[var(--c-line)]/30 last:border-0 transition-colors group",
      peak.isActive ? "hover:bg-[var(--c-card-2)]" : "opacity-50 hover:bg-[var(--c-card-2)]",
    )}>
      <td className="py-3 px-4">
        <p className="font-bold text-sm text-[var(--c-ink)] group-hover:text-[var(--c-primary-strong)] transition-colors">{peak.name}</p>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm font-black text-[#E11D48]">+{((peak.peakRate ?? 0) * 100).toFixed(0)}%</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs text-[var(--c-muted)]">
          {fmtDateStr(peak.startAt)} {peak.startAt && peak.endAt ? "→" : ""} {fmtDateStr(peak.endAt)}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={cn(
          "text-xs font-mono font-semibold",
          peak.startTime ? "text-[#2563EB]" : "text-[var(--c-muted)]",
        )}>
          {peak.startTime && peak.endTime
            ? `${peak.startTime.slice(0, 5)} – ${peak.endTime.slice(0, 5)}`
            : "Cả ngày"}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={cn(
          "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full",
          peak.isActive ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]" : "bg-[var(--c-card-2)] text-[var(--c-muted)]",
        )}>
          {peak.isActive
            ? <><CheckCircle2 className="w-2.5 h-2.5" />Hoạt động</>
            : <><XCircle className="w-2.5 h-2.5" />Tắt</>}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-[var(--c-muted)]">{fmtDateStr(peak.createdAt)}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => onEdit(peak)}
            className="p-1.5 rounded-lg hover:bg-[var(--c-card-2)] transition-colors text-[var(--c-muted)] hover:text-[var(--c-ink)]">
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onDelete(peak.id)} disabled={isDeleting}
            className="p-1.5 rounded-lg hover:bg-[rgba(225,29,72,0.12)] transition-colors text-[var(--c-muted)] hover:text-[#E11D48] disabled:opacity-30">
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Peak Day Form ────────────────────────────────────────────────────────────

const defaultPeakForm: CreatePeakDayConfigDto & { id?: string } = {
  name: "", startTime: "", endTime: "",
  startAt: "", endAt: "", peakRate: 0.2, isActive: true,
};

function PeakDayForm({ initial, onSave, onCancel, isSaving }: {
  initial?: Partial<CreatePeakDayConfigDto & { id?: string }>;
  onSave: (data: CreatePeakDayConfigDto & { id?: string }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({ ...defaultPeakForm, ...initial });
  const set = (k: keyof typeof form, v: string | number | boolean | undefined) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const peakPercent = ((form.peakRate ?? 0) * 100).toFixed(0);

  return (
    <div className="space-y-4 bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)] border border-[#D97706]/60 rounded-xl p-5">
      <p className="text-sm font-black text-[#D97706] dark:text-[#D97706] flex items-center gap-2">
        <Flame className="w-4 h-4" aria-hidden="true" />
        {form.id ? "Chỉnh sửa cấu hình cao điểm" : "Thêm khung giờ cao điểm mới"}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-bold">Tên cấu hình *</label>
          <Input placeholder="VD: Giờ cao điểm tối, Tết Nguyên Đán 2027..."
            value={form.name} onChange={e => set("name", e.target.value)} className="h-10 rounded-xl" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold">Phụ thu (%)</label>
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              value={peakPercent === "0" ? "" : peakPercent}
              placeholder="10"
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "");
                const pct = v ? Math.min(500, Number(v)) : 0;
                set("peakRate", pct / 100);
              }}
              className="h-10 rounded-xl flex-1"
            />
            <span className="text-sm font-bold text-[var(--c-muted)]">%</span>
          </div>
          {(form.peakRate ?? 0) > 0 && (
            <p className="text-xs font-bold text-[#D97706]">
              → Giá 100.000đ + {peakPercent}% = {vnd(100000 * (1 + (form.peakRate ?? 0)))}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold">Trạng thái</label>
          <div className="flex items-center gap-3 h-10">
            <Switch checked={form.isActive ?? true} onCheckedChange={v => set("isActive", v)} />
            <span className={cn("text-sm font-semibold", form.isActive ? "text-[#0E9F6E]" : "text-[var(--c-muted)]")}>
              {form.isActive ? "Hoạt động" : "Tắt"}
            </span>
          </div>
        </div>
      </div>

      {/* Khung giờ */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold">Khung giờ trong ngày</label>
        <p className="text-[10px] text-[var(--c-muted)]">Để trống nếu áp dụng cả ngày</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--c-muted)]">Từ giờ</label>
            <Input type="time" value={form.startTime ?? ""} onChange={e => set("startTime", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div>
            <label className="text-xs text-[var(--c-muted)]">Đến giờ</label>
            <Input type="time" value={form.endTime ?? ""} onChange={e => set("endTime", e.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Ngày áp dụng */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold">Khoảng ngày áp dụng</label>
        <p className="text-[10px] text-[var(--c-muted)]">Để trống nếu áp dụng vô thời hạn</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--c-muted)]">Từ ngày</label>
            <Input type="datetime-local" value={form.startAt ?? ""} onChange={e => set("startAt", e.target.value)} className="h-10 rounded-xl text-xs" />
          </div>
          <div>
            <label className="text-xs text-[var(--c-muted)]">Đến ngày</label>
            <Input type="datetime-local" value={form.endAt ?? ""} onChange={e => set("endAt", e.target.value)} className="h-10 rounded-xl text-xs" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <BaseButton variant="outline" size="sm" onClick={onCancel} disabled={isSaving} className="rounded-xl">Hủy</BaseButton>
        <BaseButton variant="primary" size="sm" disabled={isSaving || !form.name.trim()}
          onClick={() => onSave(form)} className="rounded-xl gap-2">
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
          {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
        </BaseButton>
      </div>
    </div>
  );
}

// ─── Pricing Mode config ──────────────────────────────────────────────────────

const MODE_META: Record<PricingMode, { label: string; color: string; bg: string; icon: React.ElementType; desc: string }> = {
  AREA_HOURLY: { label: "Theo m²", color: "text-violet-700", bg: "bg-violet-100", icon: Ruler,      desc: "Giá = đơn giá/m² × diện tích × giờ" },
  HOURLY:      { label: "Theo giờ", color: "text-blue-700",   bg: "bg-blue-100",   icon: Clock,      desc: "Giá = đơn giá/giờ × số giờ" },
  FIXED:       { label: "Cố định",  color: "text-emerald-700",bg: "bg-emerald-100",icon: ToggleLeft, desc: "Giá cố định, không phụ thuộc giờ/m²" },
};

// ─── Pricing Tier Card ────────────────────────────────────────────────────────

function PricingTierCard({ tier, onEdit, onDelete, isDeleting }: {
  tier: PricingTierEntity;
  onEdit: (t: PricingTierEntity) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const meta = MODE_META[tier.pricingMode];
  const ModeIcon = meta.icon;

  const priceDisplay = () => {
    if (tier.pricingMode === "AREA_HOURLY") {
      return (
        <div className="space-y-1">
          <p className="text-xl font-black text-violet-700">{vnd(Number(tier.pricePerM2))}<span className="text-xs font-normal text-muted-foreground ml-1">/m²/giờ</span></p>
          {(tier.areaMinM2 || tier.areaMaxM2) && (
            <p className="text-xs text-muted-foreground">
              📐 {tier.areaMinM2 ? `${tier.areaMinM2}m²` : "—"} → {tier.areaMaxM2 ? `${tier.areaMaxM2}m²` : "∞"}
            </p>
          )}
        </div>
      );
    }
    if (tier.pricingMode === "HOURLY") {
      return <p className="text-xl font-black text-blue-700">{vnd(Number(tier.pricePerHour))}<span className="text-xs font-normal text-muted-foreground ml-1">/giờ</span></p>;
    }
    return <p className="text-xl font-black text-emerald-700">{vnd(Number(tier.fixedPrice))}</p>;
  };

  return (
    <div className={cn(
      "rounded-2xl border p-5 space-y-3 transition-all group relative",
      tier.isActive ? "border-primary/30 bg-primary/5 shadow-sm" : "border-border/40 bg-muted/20 opacity-60",
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">{tier.name}</p>
          {tier.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{tier.description}</p>}
        </div>
        <span className={cn("text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shrink-0", meta.bg, meta.color)}>
          <ModeIcon className="w-3 h-3" />{meta.label}
        </span>
      </div>

      {/* Price */}
      {priceDisplay()}

      {/* Hours range */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tier.minHours}h – {tier.maxHours}h</span>
        {tier.defaultHours && <span className="text-primary font-semibold">mặc định {tier.defaultHours}h</span>}
      </div>

      {/* Active badge */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full",
          tier.isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground",
        )}>
          {tier.isActive ? <><CheckCircle2 className="w-2.5 h-2.5" />Hoạt động</> : <><XCircle className="w-2.5 h-2.5" />Tắt</>}
        </span>
        <span className="text-[9px] text-muted-foreground">#{tier.sortOrder}</span>
      </div>

      {/* Actions — hover */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={() => onEdit(tier)}
          className="p-1.5 rounded-lg hover:bg-background border border-transparent hover:border-border/40 transition-all text-muted-foreground hover:text-foreground">
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onDelete(tier.id)} disabled={isDeleting}
          className="p-1.5 rounded-lg hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all text-muted-foreground hover:text-destructive disabled:opacity-30">
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Pricing Tier Form ────────────────────────────────────────────────────────

const defaultTierForm: Omit<CreatePricingTierDto, "packageId"> & { id?: string } = {
  name: "", description: "", pricingMode: "HOURLY",
  pricePerHour: undefined, pricePerM2: undefined, fixedPrice: undefined,
  areaMinM2: undefined, areaMaxM2: undefined,
  minHours: 1, maxHours: 8, defaultHours: undefined,
  sortOrder: 0, isActive: true,
};

function PricingTierForm({ initial, packageId, onSave, onCancel, isSaving }: {
  initial?: Partial<typeof defaultTierForm>;
  packageId: string;
  onSave: (data: CreatePricingTierDto & { id?: string }) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState({ ...defaultTierForm, ...initial });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const meta = MODE_META[form.pricingMode];

  const canSave = () => {
    if (!form.name.trim()) return false;
    if (form.pricingMode === "AREA_HOURLY" && !form.pricePerM2) return false;
    if (form.pricingMode === "HOURLY" && !form.pricePerHour) return false;
    if (form.pricingMode === "FIXED" && !form.fixedPrice) return false;
    return true;
  };

  return (
    <div className="space-y-5 bg-muted/30 border border-border/50 rounded-2xl p-5">
      <p className="text-sm font-black text-foreground flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        {form.id ? "Chỉnh sửa mức giá" : "Thêm mức giá mới"}
      </p>

      {/* Mode selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold">Loại tính giá *</label>
        <div className="grid grid-cols-3 gap-2">
          {(["HOURLY", "AREA_HOURLY", "FIXED"] as PricingMode[]).map(mode => {
            const m = MODE_META[mode];
            const MIcon = m.icon;
            const active = form.pricingMode === mode;
            return (
              <button key={mode} type="button" onClick={() => set("pricingMode", mode)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-bold transition-all",
                  active
                    ? cn("border-primary bg-primary/10 text-primary")
                    : "border-border/50 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}>
                <MIcon className="w-4 h-4" />
                {m.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">{meta.desc}</p>
      </div>

      {/* Name & description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Tên mức giá *</label>
          <Input placeholder="VD: Nhà dưới 60m²" value={form.name}
            onChange={e => set("name", e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Mô tả</label>
          <Input placeholder="VD: Phù hợp căn hộ 1 phòng ngủ" value={form.description ?? ""}
            onChange={e => set("description", e.target.value)} className="h-10 rounded-xl" />
        </div>
      </div>

      {/* Mode-specific fields */}
      {form.pricingMode === "AREA_HOURLY" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold">Đơn giá / m² / giờ (₫) *</label>
            <Input inputMode="numeric" placeholder="4500"
              value={form.pricePerM2 ?? ""}
              onChange={e => set("pricePerM2", e.target.value ? Number(e.target.value) : undefined)}
              className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold">m² tối thiểu</label>
            <Input inputMode="numeric" placeholder="Không giới hạn"
              value={form.areaMinM2 ?? ""}
              onChange={e => set("areaMinM2", e.target.value ? Number(e.target.value) : undefined)}
              className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold">m² tối đa</label>
            <Input inputMode="numeric" placeholder="Không giới hạn"
              value={form.areaMaxM2 ?? ""}
              onChange={e => set("areaMaxM2", e.target.value ? Number(e.target.value) : undefined)}
              className="h-10 rounded-xl" />
          </div>
        </div>
      )}

      {form.pricingMode === "HOURLY" && (
        <div className="space-y-1.5 max-w-xs">
          <label className="text-xs font-bold">Đơn giá / giờ (₫) *</label>
          <Input inputMode="numeric" placeholder="150000"
            value={form.pricePerHour ?? ""}
            onChange={e => set("pricePerHour", e.target.value ? Number(e.target.value) : undefined)}
            className="h-10 rounded-xl" />
          {form.pricePerHour && (
            <p className="text-xs text-blue-600 font-semibold">→ 3 giờ = {vnd(form.pricePerHour * 3)}</p>
          )}
        </div>
      )}

      {form.pricingMode === "FIXED" && (
        <div className="space-y-1.5 max-w-xs">
          <label className="text-xs font-bold">Giá cố định (₫) *</label>
          <Input inputMode="numeric" placeholder="300000"
            value={form.fixedPrice ?? ""}
            onChange={e => set("fixedPrice", e.target.value ? Number(e.target.value) : undefined)}
            className="h-10 rounded-xl" />
        </div>
      )}

      {/* Hours & common */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Giờ tối thiểu</label>
          <Input inputMode="decimal" value={form.minHours ?? 1}
            onChange={e => set("minHours", Number(e.target.value))} className="h-10 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Giờ tối đa</label>
          <Input inputMode="decimal" value={form.maxHours ?? 8}
            onChange={e => set("maxHours", Number(e.target.value))} className="h-10 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Giờ mặc định</label>
          <Input inputMode="decimal" placeholder="Không bắt buộc"
            value={form.defaultHours ?? ""}
            onChange={e => set("defaultHours", e.target.value ? Number(e.target.value) : undefined)}
            className="h-10 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold">Thứ tự</label>
          <Input inputMode="numeric" value={form.sortOrder ?? 0}
            onChange={e => set("sortOrder", Number(e.target.value))} className="h-10 rounded-xl" />
        </div>
      </div>

      {/* Status + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={form.isActive ?? true} onCheckedChange={v => set("isActive", v)} />
          <span className={cn("text-sm font-semibold", form.isActive ? "text-emerald-600" : "text-muted-foreground")}>
            {form.isActive ? "Hoạt động" : "Tắt"}
          </span>
        </div>
        <div className="flex gap-2">
          <BaseButton variant="outline" size="sm" onClick={onCancel} disabled={isSaving} className="rounded-xl">
            Hủy
          </BaseButton>
          <BaseButton variant="primary" size="sm" disabled={isSaving || !canSave()}
            onClick={() => onSave({ ...form, packageId })} className="rounded-xl gap-2">
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Đang lưu..." : "Lưu mức giá"}
          </BaseButton>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface PackagePricingTabProps {
  pkg: AdminServicePackageEntity;
}

export function PackagePricingTab({ pkg }: PackagePricingTabProps) {
  // ── Surcharge editing ──
  const [isSurchargeEditing, setIsSurchargeEditing] = useState(false);
  const [surchargeValues, setSurchargeValues] = useState({
    maxHours: pkg.maxHours,
    nightSurcharge: pkg.nightSurcharge,
    petSurcharge: pkg.petSurcharge,
    waitingSurcharge: pkg.waitingSurcharge,
    toolFee: pkg.toolFee,
    peakRatePercent: pkg.peakRatePercent,
  });

  const updateMutation = useUpdateAdminPackage();

  const handleSurchargeSave = () => {
    updateMutation.mutate(
      { id: pkg.id, payload: surchargeValues },
      { onSuccess: () => { toast.success("Đã cập nhật cấu hình giá!"); setIsSurchargeEditing(false); } }
    );
  };

  const handleSurchargeCancel = () => {
    setSurchargeValues({
      maxHours: pkg.maxHours, nightSurcharge: pkg.nightSurcharge,
      petSurcharge: pkg.petSurcharge, waitingSurcharge: pkg.waitingSurcharge,
      toolFee: pkg.toolFee, peakRatePercent: pkg.peakRatePercent,
    });
    setIsSurchargeEditing(false);
  };


  // ── Peak days ──
  const { data: peakDays, isLoading: peakLoading } = usePeakDays();
  const createPeakMutation = useCreatePeakDay();
  const updatePeakMutation = useUpdatePeakDay();
  const deletePeakMutation = useDeletePeakDay();

  const [showPeakForm, setShowPeakForm] = useState(false);
  const [editingPeak, setEditingPeak] = useState<PeakDayConfigEntity | null>(null);

  // ── Pricing Tiers ──
  const { data: tiers, isLoading: tiersLoading } = usePricingTiers(pkg.id);
  const createTierMutation = useCreatePricingTier();
  const updateTierMutation = useUpdatePricingTier(pkg.id);
  const deleteTierMutation = useDeletePricingTier(pkg.id);

  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTierEntity | null>(null);

  const handleTierSave = (data: CreatePricingTierDto & { id?: string }) => {
    if (data.id) {
      const { id, packageId: _pkgId, ...payload } = data;
      updateTierMutation.mutate(
        { id, payload },
        { onSuccess: () => setEditingTier(null) }
      );
    } else {
      createTierMutation.mutate(data, {
        onSuccess: () => setShowTierForm(false),
      });
    }
  };

  const handleTierDelete = (id: string) => {
    if (confirm("Xác nhận xóa mức giá này?")) {
      deleteTierMutation.mutate(id);
    }
  };

  const handlePeakSave = (data: CreatePeakDayConfigDto & { id?: string }) => {
    const cleanData = {
      name: data.name,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      startAt: data.startAt || undefined,
      endAt: data.endAt || undefined,
      peakRate: data.peakRate,
      isActive: data.isActive,
    };
    if (data.id) {
      updatePeakMutation.mutate(
        { id: data.id, payload: cleanData },
        { onSuccess: () => { setEditingPeak(null); } }
      );
    } else {
      createPeakMutation.mutate(cleanData as CreatePeakDayConfigDto, {
        onSuccess: () => { setShowPeakForm(false); }
      });
    }
  };

  const handlePeakDelete = (id: string) => {
    if (confirm("Xác nhận xóa cấu hình cao điểm này?")) {
      deletePeakMutation.mutate(id);
    }
  };

  // ── Price simulation ──
  const firstSvc = pkg.packageSubServices?.[0]?.subService;
  const basePrice = firstSvc?.pricingConfig?.basePrice ? Number(firstSvc.pricingConfig.basePrice) : 0;

  const scenarios: { label: string; desc: string; total: number; emoji: string; highlight?: boolean }[] = basePrice > 0 ? [
    { label: "Thường",         desc: "Ban ngày, không phụ phí",   total: basePrice, emoji: "☀️" },
    { label: "Giờ cao điểm",   desc: "+ phụ phí cao điểm",        total: basePrice * (1 + surchargeValues.peakRatePercent / 100), emoji: "📈" },
    { label: "Ban đêm",        desc: "+ phụ thu ban đêm",          total: basePrice + surchargeValues.nightSurcharge, emoji: "🌙" },
    { label: "Thú cưng",       desc: "+ phụ thu thú cưng",         total: basePrice + surchargeValues.petSurcharge, emoji: "🐾" },
    { label: "Tất cả phụ phí", desc: "Kịch bản phức tạp nhất",     total: basePrice * (1 + surchargeValues.peakRatePercent / 100) + surchargeValues.nightSurcharge + surchargeValues.petSurcharge + surchargeValues.waitingSurcharge + surchargeValues.toolFee, emoji: "💰", highlight: true },
  ] : [];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ═══ SECTION 1: Phụ phí & Thời lượng ═══════════════════════════════ */}
      <SCard
        icon={SlidersHorizontal}
        title="Cấu hình phụ phí & Thời lượng"
        description="Thiết lập phụ thu áp dụng chung cho tất cả dịch vụ con trong gói"
        action={
          isSurchargeEditing ? (
            <div className="flex gap-2">
              <BaseButton variant="outline" size="sm" onClick={handleSurchargeCancel}
                disabled={updateMutation.isPending} className="gap-1 rounded-xl h-8 text-xs">
                <XIcon className="w-3.5 h-3.5" aria-hidden="true" />Hủy
              </BaseButton>
              <BaseButton variant="primary" size="sm" onClick={handleSurchargeSave}
                disabled={updateMutation.isPending} className="gap-1 rounded-xl h-8 text-xs">
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                {updateMutation.isPending ? "Đang lưu..." : "Lưu"}
              </BaseButton>
            </div>
          ) : (
            <BaseButton variant="outline" size="sm" onClick={() => setIsSurchargeEditing(true)} className="gap-1 rounded-xl h-8 text-xs">
              <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />Chỉnh sửa
            </BaseButton>
          )
        }
      >
        <div className="space-y-5">
          {/* Max hours */}
          <div className="flex items-center gap-4 bg-[var(--c-card-2)] border border-[var(--c-line)]/40 rounded-xl p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--c-primary-strong)]" aria-hidden="true" />
                <p className="text-sm font-bold text-[var(--c-ink)]">Thời lượng tối đa</p>
              </div>
              <p className="text-xs text-[var(--c-muted)] mt-0.5">Số giờ tối đa cho một đơn hàng</p>
              {(pkg.packageSubServices?.length ?? 0) > 0 && (
                <p className="text-xs text-[#D97706] dark:text-[#D97706] mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  Áp dụng cho tất cả {pkg.packageSubServices?.length} dịch vụ con
                </p>
              )}
            </div>
            {isSurchargeEditing ? (
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  inputMode="decimal"
                  value={String(surchargeValues.maxHours)}
                  onChange={e => {
                    const v = e.target.value;
                    if (/^\d*\.?\d*$/.test(v)) {
                      const n = parseFloat(v);
                      setSurchargeValues(prev => ({ ...prev, maxHours: isNaN(n) ? 0.5 : Math.min(24, Math.max(0.5, n)) }));
                    }
                  }}
                  className="rounded-xl h-10 w-24 text-center" />
                <span className="text-sm text-[var(--c-muted)] font-semibold">giờ</span>
              </div>
            ) : (
              <div className="text-2xl font-black text-[var(--c-primary-strong)] shrink-0">{surchargeValues.maxHours} giờ</div>
            )}
          </div>

          {/* Surcharge tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SURCHARGE_FIELDS.map(field => {
              const val = surchargeValues[field.key];
              return (
                <div key={field.key} className={cn(
                  "rounded-2xl border p-5 space-y-3 transition-all",
                  (val as number) > 0 ? "border-[var(--c-primary)]/30 bg-[var(--c-primary-soft)] shadow-sm" : "border-[var(--c-line)]/50 bg-[var(--c-card)]",
                )}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{field.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-[var(--c-ink)]">{field.label}</p>
                      <p className="text-xs text-[var(--c-muted)] mt-0.5 leading-relaxed">{field.description}</p>
                    </div>
                  </div>
                  {isSurchargeEditing ? (
                    <div className="relative">
                      <input
                        inputMode="numeric"
                        value={val as number === 0 ? "" : String(val)}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, "");
                          setSurchargeValues(prev => ({ ...prev, [field.key]: digits ? Number(digits) : 0 }));
                        }}
                        className="w-full h-10 px-3 pr-12 rounded-xl border border-[var(--c-line)]/60 bg-[var(--c-card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/30"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--c-muted)] font-semibold">
                        {field.isPercent ? "%" : "₫"}
                      </span>
                    </div>
                  ) : (
                    <div className={cn("text-xl font-bold", (val as number) > 0 ? "text-[var(--c-primary-strong)]" : "text-[var(--c-muted)]")}>
                      {field.isPercent ? `${val}%` : vnd(val as number)}
                    </div>
                  )}
                  {!isSurchargeEditing && (val as number) === 0 && (
                    <p className="text-[10px] text-[var(--c-muted)] italic">Chưa áp dụng</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SCard>

      {/* ═══ SECTION 2: Pricing Tiers ══════════════════════════════════════ */}
      <SCard
        icon={Layers}
        title="Mức giá gói (Pricing Tiers)"
        description="Cấu hình các mức giá theo giờ, m² hoặc cố định — khách sẽ chọn khi đặt đơn"
        action={
          !showTierForm && !editingTier ? (
            <BaseButton variant="primary" size="sm" onClick={() => setShowTierForm(true)} className="gap-1 rounded-xl h-8 text-xs">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />Thêm mức giá
            </BaseButton>
          ) : null
        }
      >
        <div className="space-y-4">
          {/* Summary */}
          {!tiersLoading && (tiers?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/10 text-primary text-xs font-bold">
                📋 {tiers?.length} mức giá
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                ✅ {tiers?.filter(t => t.isActive).length} đang hoạt động
              </Badge>
              {tiers?.some(t => t.pricingMode === "AREA_HOURLY") && (
                <Badge className="bg-violet-100 text-violet-700 text-xs font-bold">📐 Có tính theo m²</Badge>
              )}
            </div>
          )}

          {/* Create / Edit form */}
          {showTierForm && (
            <PricingTierForm
              packageId={pkg.id}
              onSave={handleTierSave}
              onCancel={() => setShowTierForm(false)}
              isSaving={createTierMutation.isPending}
            />
          )}
          {editingTier && (
            <PricingTierForm
              packageId={pkg.id}
              initial={{
                id: editingTier.id,
                name: editingTier.name,
                description: editingTier.description ?? "",
                pricingMode: editingTier.pricingMode,
                pricePerHour: editingTier.pricePerHour ? Number(editingTier.pricePerHour) : undefined,
                pricePerM2: editingTier.pricePerM2 ? Number(editingTier.pricePerM2) : undefined,
                fixedPrice: editingTier.fixedPrice ? Number(editingTier.fixedPrice) : undefined,
                areaMinM2: editingTier.areaMinM2 ? Number(editingTier.areaMinM2) : undefined,
                areaMaxM2: editingTier.areaMaxM2 ? Number(editingTier.areaMaxM2) : undefined,
                minHours: Number(editingTier.minHours),
                maxHours: Number(editingTier.maxHours),
                defaultHours: editingTier.defaultHours ? Number(editingTier.defaultHours) : undefined,
                sortOrder: editingTier.sortOrder,
                isActive: editingTier.isActive,
              }}
              onSave={handleTierSave}
              onCancel={() => setEditingTier(null)}
              isSaving={updateTierMutation.isPending}
            />
          )}

          {/* Tiers grid */}
          {tiersLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Đang tải mức giá...</div>
          ) : (tiers?.length ?? 0) === 0 && !showTierForm ? (
            <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-2xl">
              <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" aria-hidden="true" />
              <p className="text-sm font-semibold text-muted-foreground">Chưa có mức giá nào</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Nhấn Thêm mức giá để tạo mức giá đầu tiên</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {(tiers ?? []).map(tier => (
                <PricingTierCard
                  key={tier.id}
                  tier={tier}
                  onEdit={t => { setEditingTier(t); setShowTierForm(false); }}
                  onDelete={handleTierDelete}
                  isDeleting={deleteTierMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </SCard>

      {/* ═══ SECTION 3: Tổng hợp giá dịch vụ con ═══════════════════════════ */}
      <SCard
        icon={Tag}
        title="Tổng hợp giá dịch vụ con"
        description="Giá gói được tính từ giá riêng của từng dịch vụ con cộng với phụ phí gói"
        action={
          <Link href="/admin/services/sub-services"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--c-line)]/50 text-xs font-semibold text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] hover:border-[var(--c-primary)]/40 transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            Quản lý dịch vụ con
          </Link>
        } 
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] border border-[#2563EB]/50 rounded-xl">
            <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-[#2563EB] dark:text-[#2563EB]">
              Mỗi dịch vụ con có bảng giá riêng. Vào trang <strong>Quản lý dịch vụ con</strong>
              → mở chi tiết → tab <strong>Cấu hình giá</strong> để thiết lập giá riêng.
            </p>
          </div>
          {(pkg.packageSubServices?.length ?? 0) === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-[var(--c-line)]/40 rounded-xl">
              <Tag className="w-8 h-8 mx-auto mb-3 text-[var(--c-muted)]" aria-hidden="true" />
              <p className="text-sm text-[var(--c-muted)]">Gói này chưa có dịch vụ con</p>
              <p className="text-xs text-[var(--c-muted)] mt-1">Thêm dịch vụ con trong tab <strong>Dịch vụ</strong></p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {pkg.packageSubServices?.map(pss => {
                  const svc = pss.subService;
                  if (!svc) return null;
                  const bp = svc.pricingConfig?.basePrice;
                  const peakP = svc.pricingConfig?.peakPrice;
                  const hasPricing = !!bp;
                  return (
                    <div key={pss.id} className={cn(
                      "rounded-2xl border p-4 space-y-3 transition-all",
                      hasPricing ? "border-[var(--c-primary)]/30 bg-[var(--c-primary-soft)]" : "border-[#D97706]/60 bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)]",
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[var(--c-ink)] truncate">{svc.name}</p>
                          <span className="text-[9px] font-mono text-[var(--c-muted)]">{svc.subServiceCode}</span>
                        </div>
                        {hasPricing
                          ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] shrink-0">Có giá</span>
                          : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(217,119,6,0.14)] text-[#D97706] shrink-0">Chưa có giá</span>}
                      </div>
                      {hasPricing ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-[var(--c-card)] border border-[var(--c-line)]/30 rounded-lg p-2">
                            <p className="text-[9px] text-[var(--c-muted)]">Giá gốc</p>
                            <p className="text-base font-black text-[var(--c-primary-strong)]">{vnd(Number(bp))}</p>
                          </div>
                          <div className="bg-[var(--c-card)] border border-[var(--c-line)]/30 rounded-lg p-2">
                            <p className="text-[9px] text-[var(--c-muted)]">Giá cao điểm</p>
                            <p className="text-base font-bold text-[#D97706]">{peakP ? vnd(Number(peakP)) : "—"}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#D97706] italic">Chưa thiết lập giá riêng</p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-[var(--c-muted)]">
                        {svc.durationHours && (
                          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{svc.durationHours}h</span>
                        )}
                        <span className="bg-[var(--c-card-2)] px-1.5 py-0.5 rounded font-semibold">{svc.pricingType}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {basePrice > 0 && (
                <div className="bg-linear-to-r from-[var(--c-card-2)] to-[var(--c-card-2)] border border-[var(--c-line)]/40 rounded-xl p-4">
                  <p className="text-xs font-black text-[var(--c-muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5" />Mô phỏng giá (dựa trên dịch vụ con đầu tiên)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {scenarios.map(s => (
                      <div key={s.label} className={cn(
                        "bg-[var(--c-card)] rounded-xl border p-3 text-center",
                        s.highlight ? "border-[var(--c-primary)]/40 bg-[var(--c-primary-soft)]" : "border-[var(--c-line)]/30",
                      )}>
                        <div className="text-lg mb-0.5">{s.emoji}</div>
                        <p className="text-[9px] text-[var(--c-muted)] font-bold uppercase">{s.label}</p>
                        <p className={cn("text-base font-black mt-0.5", s.highlight ? "text-[var(--c-primary-strong)]" : "text-[var(--c-ink)]")}>
                          {vnd(Math.round(s.total))}
                        </p>
                        <p className="text-[9px] text-[var(--c-muted)] mt-0.5">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SCard>

      {/* ═══ SECTION 3: Khung giờ cao điểm ══════════════════════════════════ */}
      <SCard
        icon={Flame}
        title="Cấu hình khung giờ cao điểm"
        description="Phụ thu tự động áp dụng khi booking rơi vào khung giờ cao điểm (tỷ lệ 0.1 = +10%)"
        action={
          !showPeakForm && !editingPeak ? (
            <BaseButton variant="primary" size="sm" onClick={() => setShowPeakForm(true)} className="gap-1 rounded-xl h-8 text-xs">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />Thêm cao điểm
            </BaseButton>
          ) : null
        }
      >
        <div className="space-y-4">
          {/* Summary badges */}
          {!peakLoading && (peakDays?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[rgba(217,119,6,0.14)] text-[#D97706] dark:bg-[rgba(217,119,6,0.14)] dark:text-[#D97706] text-xs font-bold">
                🔥 {peakDays?.length} cấu hình
              </Badge>
              <Badge className="bg-[rgba(14,159,110,0.12)] text-[#0E9F6E] text-xs font-bold">
                ✅ {peakDays?.filter(p => p.isActive).length} đang hoạt động
              </Badge>
              <Badge className="bg-[rgba(225,29,72,0.12)] text-[#E11D48] text-xs font-bold">
                📈 TB +{peakDays?.length
                  ? ((peakDays.reduce((sum, p) => sum + (p.peakRate ?? 0), 0) / peakDays.length) * 100).toFixed(0)
                  : 0}%
              </Badge>
            </div>
          )}

          {/* Create / Edit form */}
          {showPeakForm && (
            <PeakDayForm
              onSave={handlePeakSave}
              onCancel={() => setShowPeakForm(false)}
              isSaving={createPeakMutation.isPending}
            />
          )}
          {editingPeak && (
            <PeakDayForm
              initial={{
                id: editingPeak.id, name: editingPeak.name,
                startTime: editingPeak.startTime ?? "", endTime: editingPeak.endTime ?? "",
                startAt: editingPeak.startAt ?? "", endAt: editingPeak.endAt ?? "",
                peakRate: editingPeak.peakRate, isActive: editingPeak.isActive,
              }}
              onSave={handlePeakSave}
              onCancel={() => setEditingPeak(null)}
              isSaving={updatePeakMutation.isPending}
            />
          )}

          {/* Peak days table */}
          {peakLoading ? (
            <div className="py-8 text-center text-sm text-[var(--c-muted)]">Đang tải cấu hình cao điểm...</div>
          ) : (peakDays?.length ?? 0) === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-[var(--c-line)]/40 rounded-xl">
              <CalendarDays className="w-8 h-8 mx-auto mb-3 text-[var(--c-muted)]" aria-hidden="true" />
              <p className="text-sm text-[var(--c-muted)]">Chưa có cấu hình giờ cao điểm nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--c-line)]/50">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--c-line)]/50 bg-[var(--c-card-2)]">
                    {["Tên cấu hình", "Phụ thu", "Từ ngày → Đến ngày", "Khung giờ", "Trạng thái", "Ngày tạo", ""].map(h => (
                      <th key={h} className="text-left py-2.5 px-4 text-[10px] font-black text-[var(--c-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(peakDays ?? []).map(peak => (
                    <PeakDayRow
                      key={peak.id}
                      peak={peak}
                      onEdit={p => { setEditingPeak(p); setShowPeakForm(false); }}
                      onDelete={handlePeakDelete}
                      isDeleting={deletePeakMutation.isPending}
                    />
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-[var(--c-line)]/30 bg-[var(--c-card-2)]">
                <p className="text-xs text-[var(--c-muted)]">
                  Hiển thị <span className="font-bold text-[var(--c-ink)]">1–{peakDays?.length ?? 0}</span> trong <span className="font-bold text-[var(--c-primary-strong)]">{peakDays?.length ?? 0}</span> bản ghi
                </p>
              </div>
            </div>
          )}
        </div>
      </SCard>

      {/* ═══ SECTION 4: Mô phỏng giá ════════════════════════════════════════ */}
      {scenarios.length > 0 && (
        <SCard icon={Calculator} title="Mô phỏng tổng giá theo kịch bản"
          description={`Dựa trên giá khởi điểm ${vnd(basePrice)} của ${firstSvc?.name}`}>
          <div className="overflow-x-auto rounded-xl border border-[var(--c-line)]/50">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--c-line)]/50 bg-[var(--c-card-2)]">
                  <th className="text-left py-2.5 px-4 text-xs font-bold text-[var(--c-muted)] uppercase tracking-wider">Kịch bản</th>
                  <th className="text-left py-2.5 px-4 text-xs font-bold text-[var(--c-muted)] uppercase tracking-wider">Mô tả</th>
                  <th className="text-right py-2.5 px-4 text-xs font-bold text-[var(--c-muted)] uppercase tracking-wider">Ước tính</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(s => (
                  <tr key={s.label} className={cn(
                    "border-b border-[var(--c-line)]/30 last:border-0 transition-colors",
                    s.highlight ? "bg-[var(--c-primary-soft)]" : "hover:bg-[var(--c-card-2)]",
                  )}>
                    <td className="py-3 px-4 font-semibold">
                      <span className="mr-1.5">{s.emoji}</span>{s.label}
                    </td>
                    <td className="py-3 px-4 text-[var(--c-muted)] text-xs">{s.desc}</td>
                    <td className={cn("py-3 px-4 text-right font-bold", s.highlight ? "text-[var(--c-primary-strong)] text-base" : "text-[var(--c-ink)]")}>
                      {vnd(Math.round(s.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[var(--c-muted)] italic mt-2">
            * Giá mô phỏng chỉ mang tính tham khảo. Giá thực tế được tính qua API quote trước khi đặt đơn.
          </p>
        </SCard>
      )}

      {/* ═══ SECTION 5: Add-ons ══════════════════════════════════════════════ */}
      <SCard icon={Sparkles} title="Tuỳ chọn thêm (Add-ons)"
        description="Cấu hình các tùy chọn mở rộng riêng — VD: Thêm phòng, vệ sinh đệm...">
        {pkg.packageSubServices?.[0]?.subService ? (
          <ServiceOptionsBuilder service={pkg.packageSubServices[0].subService} />
        ) : (
          <div className="py-10 text-center border border-dashed border-[var(--c-line)] rounded-2xl bg-[var(--c-card-2)]">
            <p className="text-sm text-[var(--c-muted)]">Thêm dịch vụ con vào gói để cấu hình tuỳ chọn</p>
          </div>
        )}
      </SCard>

    </div>
  );
}
