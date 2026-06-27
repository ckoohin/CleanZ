"use client";

import React, { useState, useMemo, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, DollarSign, ScrollText, Wrench,
  Loader2, ChevronRight, CheckCircle2, Info,
  Clock, Moon, PawPrint, Hammer, Timer,
  Search, Plus, X, Check, List, Settings2,
  AlertCircle, Image as ImageIcon,
  Trash2,
  Zap, Layers, MapPin, BarChart3,
  Edit, Eye, CheckSquare, GripVertical, ChevronDown, ChevronUp, ExternalLink, Smile, Star,
  TrendingUp, Shield, Sparkles, Heart,
  Ruler, ClipboardList
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import { BaseButton } from "@/components/ui/base/base_button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  useAdminPackageDetail, useAdminServices, useCreateAdminService, useCoverageAreas, useUpdateCoverageArea,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { usePricingConfigs, usePeakDays, useCreatePeakDay } from "@/features/admin/hooks/useAdminPricing";
import { adminPricingApi, CreatePeakDayConfigDto } from "@/features/admin/services/admin-pricing.service";
import { adminServicesApi } from "@/features/admin/modules/service/services/admin-services.service";
import {
  UpdateAdminPackageDto, AdminServiceEntity, CoverageAreaEntity, PricingMode,
} from "@/features/admin/modules/service/services/admin-services.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { adminWorkflowService } from "@/features/admin/modules/service/services/admin-workflow.service";
import { adminPolicyService } from "@/features/admin/modules/policy/services/admin-policy.service";
import { useAdminPolicies } from "@/features/admin/modules/policy/hooks/useAdminPolicies";
import { POLICY_CATEGORY_META, PolicyCategory } from "@/features/admin/modules/policy/types/policy.type";
import { CreateWorkflowStepDto } from "@/features/admin/modules/service/types/workflow.type";

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Thông tin cơ bản", icon: Package },
  { id: 2, label: "Cấu hình giá",     icon: DollarSign },
  { id: 3, label: "Mức giá chi tiết", icon: BarChart3 },
  { id: 4, label: "Dịch vụ con",      icon: Wrench },
  { id: 5, label: "Khu vực",          icon: MapPin },
  { id: 6, label: "Điều khoản",       icon: ScrollText },
  { id: 7, label: "Xem lại & Lưu",    icon: CheckCircle2 },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const vnd = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

function slugify(text: string) {
  return "PKG-" +
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).join("-").toUpperCase();
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface SelectedSubService {
  id: string; name: string; isRequired: boolean; isDefault: boolean; sortOrder: number;
}

interface PricingTierForm {
  id: string;
  name: string;
  description: string;
  pricingMode: PricingMode;
  // HOURLY
  pricePerHour: string;
  minHours: string;
  maxHours: string;
  defaultHours: string;
  // AREA_HOURLY
  areaMinM2: string;
  areaMaxM2: string;
  pricePerM2: string;
  // FIXED
  fixedPrice: string;
  sortOrder: number;
  isActive: boolean;
}

interface CustomSurcharge {
  id: string; label: string; iconName: string; amount: number; hint: string;
}

interface QuickCreateSubService {
  name: string; shortDescription: string; description: string;
  durationHours: string; coverageArea: string; pricingConfigId: string;
  pricingType: string; fixedPrice: string; hourlyRate: string;
  minHours: string; pricingNote: string; thumbnailUrl: string;
  galleryUrls: string[]; includedTasks: string[]; excludedTasks: string[];
  isActive: boolean;
}

const defaultQuickCreate: QuickCreateSubService = {
  name: "", shortDescription: "", description: "",
  durationHours: "", coverageArea: "", pricingConfigId: "",
  pricingType: "FIXED", fixedPrice: "", hourlyRate: "", minHours: "", pricingNote: "",
  thumbnailUrl: "", galleryUrls: [], includedTasks: [], excludedTasks: [], isActive: true,
};

const newTier = (mode: PricingMode, idx: number): PricingTierForm => ({
  id: crypto.randomUUID(), name: "", description: "", pricingMode: mode,
  pricePerHour: "", minHours: "2", maxHours: "8", defaultHours: "3",
  areaMinM2: "", areaMaxM2: "", pricePerM2: "",
  fixedPrice: "", sortOrder: idx, isActive: true,
});

const SURCHARGE_ICONS = [
  { name: "Moon", icon: Moon, label: "Đêm/Sáng sớm" },
  { name: "PawPrint", icon: PawPrint, label: "Thú cưng" },
  { name: "Timer", icon: Timer, label: "Chờ đợi" },
  { name: "Hammer", icon: Hammer, label: "Công cụ mang theo" },
  { name: "Zap", icon: Zap, label: "Phụ thu nhanh" },
  { name: "TrendingUp", icon: TrendingUp, label: "Cao điểm" },
  { name: "Shield", icon: Shield, label: "Bảo hiểm" },
  { name: "Sparkles", icon: Sparkles, label: "Dọn dẹp sâu" },
  { name: "Heart", icon: Heart, label: "Ưu tiên" },
];

const getIconByName = (name: string): React.ElementType => {
  const iconMap: Record<string, React.ElementType> = {
    Moon,
    PawPrint,
    Timer,
    Hammer,
    Zap,
    TrendingUp,
    Shield,
    Sparkles,
    Heart,
    Package,
    Check,
    Info,
    Star,
  };
  return iconMap[name] || Zap;
};

// ─── TaskTagInput ─────────────────────────────────────────────────────────────
function TaskTagInput({ value, onChange, placeholder, variant }: {
  value: string[]; onChange: (v: string[]) => void;
  placeholder: string; variant: "included" | "excluded";
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isIncluded = variant === "included";

  const add = useCallback(() => {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
  }, [input, value, onChange]);

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && value.length > 0) remove(value.length - 1);
  };

  return (
    <div className={cn("rounded-2xl border-2 overflow-hidden transition-all",
      isIncluded ? "border-emerald-200/70 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10"
                 : "border-rose-200/70 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-900/10")}>
      <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b text-xs font-black uppercase tracking-widest",
        isIncluded ? "border-emerald-200/50 bg-emerald-100/40 text-emerald-700 dark:text-emerald-400"
                   : "border-rose-200/50 bg-rose-100/40 text-rose-600 dark:text-rose-400")}>
        <div className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0",
          isIncluded ? "bg-emerald-500" : "bg-rose-500")}>
          {isIncluded ? <Check className="w-2.5 h-2.5 text-white" /> : <X className="w-2.5 h-2.5 text-white" />}
        </div>
        {isIncluded ? "Công việc bao gồm" : "Không bao gồm"}
        <span className="ml-auto">{value.length} mục</span>
      </div>
      <div className="min-h-[72px] p-3 flex flex-wrap gap-2 cursor-text" onClick={() => inputRef.current?.focus()}>
        {value.map((tag, i) => (
          <span key={i} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border",
            isIncluded ? "bg-emerald-500/10 text-emerald-700 border-emerald-300/50"
                       : "bg-rose-500/10 text-rose-600 border-rose-300/50")}>
            {tag}
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(i); }}
              className={cn("w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all hover:bg-black/10 dark:hover:bg-white/10",
                isIncluded ? "text-emerald-700" : "text-rose-600")}>
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} onBlur={add}
          placeholder={value.length === 0 ? placeholder : ""} className="flex-1 min-w-[120px] bg-transparent text-xs text-foreground outline-none border-0 p-0 focus:ring-0" />
      </div>
    </div>
  );
}

// ─── Field layout helper ──────────────────────────────────────────────────────
function Field({ label, children, required, hint }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string;
}) {
  return (
    <div className="space-y-1.5 w-full">
      <Label className="text-xs font-black text-foreground/90 flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500 font-bold">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground leading-normal">{hint}</p>}
    </div>
  );
}

function SurchargeField({ icon: Icon, label, hint, value, onChange, suffix = "VND", iconColor = "text-primary" }: {
  icon: React.ElementType; label: string; hint: string;
  value: number; onChange: (v: number) => void; suffix?: string; iconColor?: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-muted/20 border border-border/40 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4 shrink-0", iconColor)} />
        <span className="text-sm font-bold">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2 mt-1">
        <Input inputMode="numeric" value={value === 0 ? "" : String(value)}
          onChange={e => { const d = e.target.value.replace(/\D/g, ""); onChange(d ? Number(d) : 0); }}
          className="h-9 rounded-xl text-sm flex-1" />
        <span className="text-xs text-muted-foreground font-semibold shrink-0">{suffix}</span>
      </div>
      {value > 0 && <p className="text-xs font-bold text-primary">{vnd(value)}</p>}
    </div>
  );
}

// ─── StepIndicator ────────────────────────────────────────────────────────────
function StepIndicator({
  current,
  onStepClick,
  validations
}: {
  current: number;
  onStepClick: (step: number) => void;
  validations: Record<number, boolean>;
}) {
  return (
    <div className="flex items-center gap-1.5 md:gap-3 flex-wrap">
      {STEPS.map((s, idx) => {
        const Icon = s.id < current && !validations[s.id] ? AlertCircle : s.icon;
        const isActive = s.id === current;
        const isCompleted = s.id < current;
        const isValid = validations[s.id];
        const hasError = isCompleted && !isValid;

        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              onClick={() => onStepClick(s.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-98 border-2",
                isActive
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105"
                  : hasError
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                  : isCompleted
                  ? "bg-primary/5 border-primary/25 text-primary hover:bg-primary/10"
                  : "bg-muted/15 border-border/30 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : hasError ? "text-rose-600 animate-pulse" : isCompleted ? "text-primary" : "text-muted-foreground")} />
              <span className="hidden md:inline">{s.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 hidden md:block" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, description, children, headerAction }: {
  icon: React.ElementType; title: string; description?: string; children: React.ReactNode; headerAction?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/40 rounded-3xl p-5 md:p-6 shadow-2xs space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap pb-3 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-black text-foreground">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
}

// ─── PricingConfigFormFields ──────────────────────────────────────────────────
function PricingTierFormCard({ tier, onChange, onRemove, set }: {
  tier: PricingTierForm; onChange: (t: PricingTierForm) => void; onRemove: () => void;
  set: <K extends keyof PricingTierForm>(k: K, v: PricingTierForm[K]) => void;
}) {
  const num = (v: string) => v.replace(/\D/g, "");
  return (
    <div className="bg-card border border-border/40 hover:border-primary/20 rounded-2xl p-5 space-y-4 transition-all shadow-2xs relative">
      <div className="flex items-center justify-between border-b border-border/20 pb-3">
        <p className="text-xs font-black text-primary uppercase tracking-wider">Mức giá chi tiết</p>
        <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Tên mức giá (VD: Giá ngày thường, Giá VIP)" required>
          <Input value={tier.name} onChange={e => set("name", e.target.value)} placeholder="VD: Gói Ngày Thường" className="h-10 rounded-xl" />
        </Field>
        <Field label="Mô tả mức giá">
          <Input value={tier.description} onChange={e => set("description", e.target.value)} placeholder="VD: Áp dụng các ngày từ T2 đến T6" className="h-10 rounded-xl" />
        </Field>
      </div>

      {tier.pricingMode === "HOURLY" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Đơn giá / giờ" required>
            <div className="flex items-center gap-1">
              <Input inputMode="numeric" value={tier.pricePerHour} onChange={e => set("pricePerHour", num(e.target.value))} placeholder="80000" className="h-10 rounded-xl" />
              <span className="text-xs text-muted-foreground font-semibold shrink-0">₫/h</span>
            </div>
            {tier.pricePerHour && <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{vnd(Number(tier.pricePerHour))}/h</p>}
          </Field>
          <Field label="Giờ tối thiểu" required>
            <Input inputMode="numeric" value={tier.minHours} onChange={e => set("minHours", num(e.target.value))} placeholder="2" className="h-10 rounded-xl" />
          </Field>
          <Field label="Giờ tối đa" required>
            <Input inputMode="numeric" value={tier.maxHours} onChange={e => set("maxHours", num(e.target.value))} placeholder="8" className="h-10 rounded-xl" />
          </Field>
          <Field label="Giờ mặc định" required>
            <Input inputMode="numeric" value={tier.defaultHours} onChange={e => set("defaultHours", num(e.target.value))} placeholder="3" className="h-10 rounded-xl" />
          </Field>
        </div>
      )}

      {tier.pricingMode === "AREA_HOURLY" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Field label="Diện tích từ (m²)" required>
            <Input inputMode="numeric" value={tier.areaMinM2} onChange={e => set("areaMinM2", num(e.target.value))} placeholder="20" className="h-10 rounded-xl" />
          </Field>
          <Field label="Đến diện tích (m²)" required>
            <Input inputMode="numeric" value={tier.areaMaxM2} onChange={e => set("areaMaxM2", num(e.target.value))} placeholder="50" className="h-10 rounded-xl" />
          </Field>
          <Field label="Giá / m² (Phụ thu)" required>
            <div className="flex items-center gap-1">
              <Input inputMode="numeric" value={tier.pricePerM2} onChange={e => set("pricePerM2", num(e.target.value))} placeholder="1500" className="h-10 rounded-xl" />
              <span className="text-xs text-muted-foreground font-semibold shrink-0">₫/m²</span>
            </div>
            {tier.pricePerM2 && <p className="text-[10px] font-bold text-emerald-600 mt-0.5">{vnd(Number(tier.pricePerM2))}/m²</p>}
          </Field>
          {tier.areaMinM2 && tier.pricePerM2 && (
            <div className="col-span-1 md:col-span-4 p-3 bg-muted/20 border border-border/20 rounded-xl text-xs text-muted-foreground">
              💡 Ví dụ {tier.areaMinM2}m² × 2h = <strong>{vnd(Number(tier.pricePerM2) * Number(tier.areaMinM2) * 2)}</strong>
            </div>
          )}
        </div>
      )}

      {tier.pricingMode === "FIXED" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Giá cố định" required hint="Giá niêm yết cho khách">
            <div className="flex items-center gap-1">
              <Input inputMode="numeric" value={tier.fixedPrice} onChange={e => set("fixedPrice", num(e.target.value))}
                placeholder="300000" className="h-10 rounded-xl" />
              <span className="text-sm font-bold text-muted-foreground shrink-0">₫</span>
            </div>
            {tier.fixedPrice && <p className="text-xs font-bold text-emerald-600">{vnd(Number(tier.fixedPrice))}</p>}
          </Field>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1 border-t border-border/20">
        <Switch checked={tier.isActive} onCheckedChange={v => set("isActive", v)} />
        <span className={cn("text-xs font-semibold", tier.isActive ? "text-emerald-600" : "text-muted-foreground")}>
          {tier.isActive ? "Kích hoạt ngay" : "Ẩn mức giá này"}
        </span>
      </div>
    </div>
  );
}

// ─── AreaChip ────────────────────────────────────────────────────────────────
function AreaChip({ area, selected, onToggle }: {
  area: CoverageAreaEntity; selected: boolean; onToggle: (id: string) => void;
}) {
  const fee = Number(area.transportFee);
  return (
    <button type="button" onClick={() => onToggle(area.id)}
      className={cn(
        "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center min-w-[90px]",
        selected
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border/40 hover:border-primary/40 text-muted-foreground hover:text-foreground"
      )}>
      <MapPin className={cn("w-4 h-4", selected ? "text-primary" : "text-muted-foreground")} />
      <span className="text-xs font-bold leading-tight">{area.name}</span>
      <span className={cn("text-[10px] font-semibold",
        fee === 0 ? "text-emerald-600" : fee <= 20000 ? "text-blue-600" : fee <= 40000 ? "text-amber-600" : "text-rose-600")}>
        {fee === 0 ? "Miễn phí" : `+${vnd(fee)}`}
      </span>
      {selected && <Check className="w-3 h-3 text-primary" />}
    </button>
  );
}

// ─── AreaGroup ───────────────────────────────────────────────────────────────
function AreaGroup({ title, areas, color, selected, onToggle, onToggleGroup }: {
  title: string;
  areas: CoverageAreaEntity[];
  color: string;
  selected: string[];
  onToggle: (id: string) => void;
  onToggleGroup: (ids: string[], select: boolean) => void;
}) {
  if (areas.length === 0) return null;
  const groupIds = areas.map(a => a.id);
  const allGroupSelected = groupIds.every(id => selected.includes(id));

  return (
    <div className="space-y-3.5 p-4 bg-muted/15 border border-border/30 rounded-2xl shadow-2xs">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border/20 pb-2">
        <p className={cn("text-xs font-black uppercase tracking-wider", color)}>{title}</p>
        <button
          type="button"
          onClick={() => onToggleGroup(groupIds, !allGroupSelected)}
          className={cn(
            "text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all border",
            allGroupSelected
              ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
              : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
          )}
        >
          {allGroupSelected ? "Bỏ chọn nhóm" : "Chọn toàn bộ nhóm"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {areas.map(a => (
          <AreaChip key={a.id} area={a} selected={selected.includes(a.id)} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

// ─── CoverageAreaSelector ─────────────────────────────────────────────────────
function CoverageAreaSelector({ areas, selected, onToggle, onToggleAll, onToggleGroup }: {
  areas: CoverageAreaEntity[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onToggleGroup: (ids: string[], select: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = areas.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  const allSelected = areas.length > 0 && areas.every(a => selected.includes(a.id));

  const inner = filtered.filter(a => Number(a.transportFee) === 0);
  const near = filtered.filter(a => Number(a.transportFee) > 0 && Number(a.transportFee) <= 20000);
  const mid = filtered.filter(a => Number(a.transportFee) > 20000 && Number(a.transportFee) <= 40000);
  const far = filtered.filter(a => Number(a.transportFee) > 40000);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm quận/huyện..." className="h-10 rounded-xl pl-9 text-sm" />
        </div>
        <button type="button" onClick={onToggleAll}
          className={cn("px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all shrink-0",
            allSelected ? "border-rose-300 bg-rose-50 text-rose-600" : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10")}>
          {allSelected ? "Bỏ tất cả" : "Chọn tất cả"}
        </button>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-xl">
          <Check className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-bold text-primary">Đã chọn {selected.length} khu vực</span>
        </div>
      )}

      {areas.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Đang tải danh sách khu vực...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AreaGroup title=" Nội thành — Miễn phí vận chuyển" areas={inner} color="text-emerald-600" selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />
          <AreaGroup title=" Ngoại thành gần — Phí vận chuyển thấp" areas={near} color="text-blue-600" selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />
          <AreaGroup title=" Ngoại thành — Phí vận chuyển trung bình" areas={mid} color="text-amber-600" selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />
          <AreaGroup title=" Ngoại thành xa — Phí vận chuyển cao" areas={far} color="text-rose-500" selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />
        </div>
      )}
    </div>
  );
}

// ─── CustomSurchargeRow ───────────────────────────────────────────────────────
function CustomSurchargeRow({ item, onChange, onRemove }: {
  item: CustomSurcharge; onChange: (v: CustomSurcharge) => void; onRemove: () => void;
}) {
  const [showIcons, setShowIcons] = useState(false);
  const currentIconObj = SURCHARGE_ICONS.find(i => i.name === item.iconName) || SURCHARGE_ICONS[4];
  const CurrentIcon = currentIconObj.icon;

  return (
    <div className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3">
      <div className="relative">
        <button type="button" onClick={() => setShowIcons(v => !v)}
          className="w-9 h-9 rounded-xl border border-border/50 hover:border-primary/50 bg-muted/30 flex items-center justify-center text-primary transition-all">
          <CurrentIcon className="w-4 h-4" />
        </button>
        {showIcons && (
          <div className="absolute top-10 left-0 z-10 bg-card border border-border rounded-xl p-2 shadow-xl grid grid-cols-3 gap-1 w-48">
            {SURCHARGE_ICONS.map(i => {
              const IconComp = i.icon;
              return (
                <button key={i.name} type="button" onClick={() => { onChange({ ...item, iconName: i.name }); setShowIcons(false); }}
                  className={cn("w-7 h-7 flex items-center justify-center hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground", item.iconName === i.name ? "bg-primary/10 text-primary hover:text-primary" : "")}
                  title={i.label}>
                  <IconComp className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2">
        <Input placeholder="Tên phụ phí..." value={item.label} onChange={e => onChange({ ...item, label: e.target.value })} className="h-9 rounded-xl text-sm" />
        <Input placeholder="Ghi chú..." value={item.hint} onChange={e => onChange({ ...item, hint: e.target.value })} className="h-9 rounded-xl text-sm" />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Input inputMode="numeric" placeholder="0" value={item.amount ? String(item.amount) : ""}
          onChange={e => { const d = e.target.value.replace(/\D/g, ""); onChange({ ...item, amount: d ? Number(d) : 0 }); }}
          className="h-9 rounded-xl text-sm w-24 text-right" />
        <span className="text-xs text-muted-foreground font-semibold">₫</span>
        <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const WORKFLOW_TEMPLATES = [
  {
    name: "Quy trình Dọn dẹp tiêu chuẩn (3 bước)",
    steps: [
      {
        title: "Chuẩn bị công cụ dụng cụ",
        description: "Nhân viên chuẩn bị và kiểm tra các loại máy móc, hóa chất trước khi làm việc.",
        durationMinutes: 10,
        isRequired: true,
        checklistItems: ["Kiểm tra máy hút bụi", "Chuẩn bị khăn sạch", "Kiểm tra hóa chất lau sàn"],
        stepOrder: 0,
        icon: "CheckSquare"
      },
      {
        title: "Thực hiện dọn dẹp phòng khách",
        description: "Quét bụi, hút bụi và lau chùi các bề mặt trong phòng khách.",
        durationMinutes: 45,
        isRequired: true,
        checklistItems: ["Hút bụi sofa", "Lau bụi bàn trà", "Lau sàn phòng khách"],
        stepOrder: 1,
        icon: "CheckSquare"
      },
      {
        title: "Vệ sinh phòng tắm và WC",
        description: "Lau chùi bồn cầu, gương, bồn rửa mặt và sàn phòng tắm.",
        durationMinutes: 30,
        isRequired: true,
        checklistItems: ["Tẩy rửa bồn cầu", "Lau sạch gương soi", "Khử trùng sàn nhà tắm"],
        stepOrder: 2,
        icon: "CheckSquare"
      }
    ]
  },
  {
    name: "Quy trình Dọn dẹp sâu (4 bước)",
    steps: [
      {
        title: "Dọn dẹp thô & Gom rác",
        description: "Thu gom rác nổi, sắp xếp lại đồ đạc ngăn nắp trước khi làm sạch sâu.",
        durationMinutes: 15,
        isRequired: true,
        checklistItems: ["Thu gom rác phòng khách", "Gom rác phòng ngủ", "Sắp xếp đồ chơi/sách báo"],
        stepOrder: 0,
        icon: "CheckSquare"
      },
      {
        title: "Làm sạch trần, tường & Kính",
        description: "Quét mạng nhện trên trần nhà, lau bụi tường và vệ sinh bề mặt kính.",
        durationMinutes: 35,
        isRequired: true,
        checklistItems: ["Quét mạng nhện trần", "Lau sạch kính cửa sổ", "Lau bụi các ổ điện/công tắc"],
        stepOrder: 1,
        icon: "CheckSquare"
      },
      {
        title: "Lau chùi chi tiết nội thất & Bếp",
        description: "Tẩy rửa dầu mỡ khu vực bếp, lau chùi mặt ngoài tủ lạnh, lò vi sóng và các kệ đồ.",
        durationMinutes: 60,
        isRequired: true,
        checklistItems: ["Lau sạch bếp nấu", "Lau mặt tủ bếp", "Tẩy cặn bám bồn rửa bếp"],
        stepOrder: 2,
        icon: "CheckSquare"
      },
      {
        title: "Khử khuẩn phòng tắm & Lau sàn",
        description: "Dùng nước khử khuẩn lau sàn nhà toàn bộ căn hộ, dọn sạch nhà vệ sinh.",
        durationMinutes: 40,
        isRequired: true,
        checklistItems: ["Lau sàn bằng nước sát khuẩn", "Tẩy rửa sàn nhà tắm", "Lau cửa phòng tắm"],
        stepOrder: 3,
        icon: "CheckSquare"
      }
    ]
  },
  {
    name: "Quy trình Tổng vệ sinh (5 bước)",
    steps: [
      {
        title: "Chuẩn bị & Che phủ nội thất",
        description: "Che chắn các thiết bị điện tử quan trọng, lắp ráp máy móc, pha hóa chất dọn dẹp chuyên dụng.",
        durationMinutes: 20,
        isRequired: true,
        checklistItems: ["Lắp ráp máy hút bụi công nghiệp", "Che phủ tivi/thiết bị điện", "Pha dung dịch lau tẩy"],
        stepOrder: 0,
        icon: "CheckSquare"
      },
      {
        title: "Vệ sinh thô & Hút bụi tổng thể",
        description: "Quét dọn rác thô, hút bụi trần nhà, các khe góc tường và gầm tủ kệ.",
        durationMinutes: 40,
        isRequired: true,
        checklistItems: ["Quét dọn rác thô đóng bao", "Hút bụi mạng nhện góc trần", "Hút bụi khe cửa/gầm giường"],
        stepOrder: 1,
        icon: "CheckSquare"
      },
      {
        title: "Tẩy rửa sâu nội thất & Thiết bị",
        description: "Lau chùi dầu mỡ nhà bếp, tẩy cặn canxi trên vách kính/bồn cầu trong phòng tắm.",
        durationMinutes: 80,
        isRequired: true,
        checklistItems: ["Tẩy dầu mỡ bếp & máy hút mùi", "Tẩy cặn canxi vách kính tắm", "Đánh bóng vòi sen inox"],
        stepOrder: 2,
        icon: "CheckSquare"
      },
      {
        title: "Lau chùi hệ thống cửa & Vách ngăn",
        description: "Vệ sinh toàn bộ hệ thống cửa ra vào, cửa phòng, cửa sổ và các mặt kính.",
        durationMinutes: 30,
        isRequired: true,
        checklistItems: ["Lau sạch cửa chính & tay nắm", "Lau kính hai mặt", "Lau bụi vách ngăn trang trí"],
        stepOrder: 3,
        icon: "CheckSquare"
      },
      {
        title: "Chà sàn & Phun khử khuẩn phòng",
        description: "Chà sạch sàn nhà bằng máy chà sàn, hút khô nước bẩn và xịt nước hoa phòng hương nhẹ tự nhiên.",
        durationMinutes: 40,
        isRequired: true,
        checklistItems: ["Đánh sàn bằng máy chuyên dụng", "Hút khô nước bẩn trên sàn", "Phun xịt khử mùi thơm mát"],
        stepOrder: 4,
        icon: "CheckSquare"
      }
    ]
  },
  {
    name: "Quy trình Dọn vệ sinh chuẩn (7 bước)",
    steps: [
      {
        title: "Tiếp nhận & Chuẩn bị",
        description: "Gặp gỡ khách hàng, tiếp nhận khu vực yêu cầu dọn dẹp và chuẩn bị máy móc dụng cụ làm việc.",
        durationMinutes: 10,
        isRequired: true,
        checklistItems: ["Gặp gỡ và chào hỏi khách hàng", "Kiểm tra tình trạng thiết bị điện/nước", "Chuẩn bị hóa chất và khăn lau phân loại"],
        stepOrder: 0,
        icon: "CheckSquare"
      },
      {
        title: "Điều phối đồ đạc & Sắp xếp",
        description: "Dọn dẹp gọn gàng, thu gom rác thô và sắp xếp lại đồ đạc trước khi làm sạch bề mặt.",
        durationMinutes: 15,
        isRequired: true,
        checklistItems: ["Gom rác nổi vào túi chuyên dụng", "Sắp xếp chăn gối/đồ dùng gọn gàng", "Phân loại vật dụng cá nhân"],
        stepOrder: 1,
        icon: "CheckSquare"
      },
      {
        title: "Vệ sinh phòng tắm / Nhà vệ sinh",
        description: "Vệ sinh sạch sẽ bồn cầu, gương kính, bồn rửa và khử mùi hôi nhà vệ sinh.",
        durationMinutes: 25,
        isRequired: true,
        checklistItems: ["Cọ rửa bồn cầu sạch khuẩn", "Lau gương kính phòng tắm", "Chà rửa bồn rửa mặt và vách kính"],
        stepOrder: 2,
        icon: "CheckSquare"
      },
      {
        title: "Vệ sinh bếp",
        description: "Lau chùi dầu mỡ bếp nấu, bồn rửa chén và lau mặt ngoài tủ bếp sạch sẽ.",
        durationMinutes: 25,
        isRequired: true,
        checklistItems: ["Lau sạch dầu mỡ trên bếp nấu", "Tẩy sạch bồn rửa chén", "Lau mặt ngoài tủ bếp và kệ đồ"],
        stepOrder: 3,
        icon: "CheckSquare"
      },
      {
        title: "Dọn dẹp phòng khách / Phòng ngủ",
        description: "Lau bụi các bề mặt kệ, tủ, bàn ghế, giường ngủ và hút bụi tổng thể.",
        durationMinutes: 25,
        isRequired: true,
        checklistItems: ["Lau bụi kệ tủ/bàn ghế", "Thay ga giường/vuốt thẳng nệm", "Hút bụi thảm và gầm giường"],
        stepOrder: 4,
        icon: "CheckSquare"
      },
      {
        title: "Lau sàn toàn bộ",
        description: "Quét dọn bụi bẩn và lau sàn bằng hóa chất chuyên dụng giúp sàn sạch bóng thơm tho.",
        durationMinutes: 20,
        isRequired: true,
        checklistItems: ["Hút bụi toàn bộ mặt sàn", "Lau sàn bằng nước lau sàn chuyên dụng", "Lau khô các khu vực ẩm ướt"],
        stepOrder: 5,
        icon: "CheckSquare"
      },
      {
        title: "Kiểm tra & Nghiệm thu",
        description: "Rà soát lại chất lượng dọn dẹp từng phòng và bàn giao cho khách hàng kiểm tra.",
        durationMinutes: 10,
        isRequired: true,
        checklistItems: ["Kiểm tra lại chất lượng dọn dẹp", "Khử mùi phòng", "Bàn giao khách hàng nghiệm thu"],
        stepOrder: 6,
        icon: "CheckSquare"
      }
    ]
  }
];

// ─── Main wizard ──────────────────────────────────────────────────────────────
export default function EditServicePackagePage({ params }: { params: React.Usable<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = React.use(params);

  // Fetch package details
  const { data: pkg, isLoading: isLoadingPkg } = useAdminPackageDetail(id);

  // Fetch pricing tiers
  const { data: oldTiers, isLoading: isLoadingTiers } = useQuery({
    queryKey: ['admin-pricing-tiers', id],
    queryFn: () => adminPricingApi.getTiersByPackage(id),
    enabled: !!id,
  });

  const { data: servicesData } = useAdminServices({ limit: 100 });
  const { data: pricingData } = usePricingConfigs({ limit: 100 });
  const { data: coverageAreas = [] } = useCoverageAreas("Hà Nội");
  
  const allSubServices = useMemo(() => servicesData?.items ?? [], [servicesData]);
  const pricingConfigs = useMemo(() => pricingData?.items ?? [], [pricingData]);

  const [step, setStep] = useState(1);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── STEP 1: Thông tin cơ bản ──
  const [name, setName] = useState("");
  const [packageCode, setPackageCode] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [policyDescription, setPolicyDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // ── STEP 2: Cấu hình giá & Phụ phí ──
  const [pricingMode, setPricingMode] = useState<PricingMode>("HOURLY");
  const [maxHours, setMaxHours] = useState(8);
  const [peakRatePercent, setPeakRatePercent] = useState(20);
  const [nightSurcharge, setNightSurcharge] = useState(30000);
  const [petSurcharge, setPetSurcharge] = useState(50000);
  const [waitingSurcharge, setWaitingSurcharge] = useState(15000);
  const [toolFee, setToolFee] = useState(0);
  const [customSurcharges, setCustomSurcharges] = useState<CustomSurcharge[]>([]);

  // ── STEP 3: Pricing Tiers ──
  const [tiers, setTiers] = useState<PricingTierForm[]>([]);

  // ── STEP 4: Dịch vụ con ──
  const [searchSvc, setSearchSvc] = useState("");
  const [selectedSubServices, setSelectedSubServices] = useState<SelectedSubService[]>([]);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreate, setQuickCreate] = useState<QuickCreateSubService>(defaultQuickCreate);

  // ── STEP 5: Khu vực phục vụ ──
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const updateAreaMutation = useUpdateCoverageArea();
  const [editingArea, setEditingArea] = useState<CoverageAreaEntity | null>(null);
  const [editAreaFee, setEditAreaFee] = useState("");
  const [isUpdatingAreaSaving, setIsUpdatingAreaSaving] = useState(false);

  // ── STEP 6: Điều khoản & Cam kết ──
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [commitments, setCommitments] = useState<{ id: string; title: string; content: string; iconName: string }[]>([
    { id: "c1", title: "Cam kết sạch sẽ", content: "Đảm bảo dọn dẹp kỹ lưỡng, sạch sẽ từng ngóc ngách căn phòng.", iconName: "Sparkles" },
    { id: "c2", title: "Nhân viên uy tín", content: "100% nhân viên đã qua đào tạo bài bản và có lý lịch rõ ràng.", iconName: "Shield" },
    { id: "c3", title: "Đền bù đổ vỡ", content: "Cam kết bồi thường thỏa đáng nếu xảy ra rơi vỡ tài sản trong lúc làm.", iconName: "Heart" }
  ]);
  const [newCommitmentTitle, setNewCommitmentTitle] = useState("");
  const [newCommitmentContent, setNewCommitmentContent] = useState("");
  const [newCommitmentIcon, setNewCommitmentIcon] = useState("Shield");
  const [showAddCommitment, setShowAddCommitment] = useState(false);

  // Thư viện chính sách
  const { data: policiesData = [] } = useAdminPolicies();
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [policySearch, setPolicySearch] = useState("");

  const filteredPolicies = useMemo(() => {
    return policiesData.filter(p =>
      p.title.toLowerCase().includes(policySearch.toLowerCase()) ||
      (p.content && p.content.toLowerCase().includes(policySearch.toLowerCase()))
    );
  }, [policiesData, policySearch]);

  // Cấu hình cao điểm
  const { data: peakDaysData = [] } = usePeakDays();
  const createPeakDayMutation = useCreatePeakDay();
  const [showAddPeakDay, setShowAddPeakDay] = useState(false);
  const [peakDayName, setPeakDayName] = useState("");
  const [peakDayRate, setPeakDayRate] = useState("10");
  const [peakDayStartAt, setPeakDayStartAt] = useState("");
  const [peakDayEndAt, setPeakDayEndAt] = useState("");
  const [peakDayStartTime, setPeakDayStartTime] = useState("");
  const [peakDayEndTime, setPeakDayEndTime] = useState("");
  const [peakDayActive, setPeakDayActive] = useState(true);

  // Workflow state
  const [workflowSteps, setWorkflowSteps] = useState<CreateWorkflowStepDto[]>([]);
  const [oldWorkflowId, setOldWorkflowId] = useState<string | null>(null);
  const [editingWorkflowStepIndex, setEditingWorkflowStepIndex] = useState<number | null>(null);

  const [stepTitle, setStepTitle] = useState("");
  const [stepDesc, setStepDesc] = useState("");
  const [stepDuration, setStepDuration] = useState("15");
  const [stepRequired, setStepRequired] = useState(true);
  const [stepChecklist, setStepChecklist] = useState<string[]>([]);
  const [newChecklistVal, setNewChecklistVal] = useState("");

  // Quick pricing dialog
  const [subServiceToEditPrice, setSubServiceToEditPrice] = useState<AdminServiceEntity | null>(null);
  const [previewSubService, setPreviewSubService] = useState<AdminServiceEntity | null>(null);
  const [quickPriceType, setQuickPriceType] = useState<"FIXED" | "HOURLY">("FIXED");
  const [quickPriceVal, setQuickPriceVal] = useState("");
  const [quickPricingNote, setQuickPricingNote] = useState("");
  const [quickThumbnailUrl, setQuickThumbnailUrl] = useState("");
  const [quickGalleryUrls, setQuickGalleryUrls] = useState<string[]>([]);
  const [isEditingPriceSaving, setIsEditingPriceSaving] = useState(false);

  const validations = useMemo(() => ({
    1: name.trim().length >= 2 && packageCode.trim().length >= 3,
    2: nightSurcharge >= 0 && petSurcharge >= 0 && waitingSurcharge >= 0 && toolFee >= 0,
    3: tiers.length > 0,
    4: true,
    5: selectedAreaIds.length > 0,
    6: workflowSteps.length > 0 || termsAndConditions.trim().length > 0,
    7: true
  }), [name, packageCode, nightSurcharge, petSurcharge, waitingSurcharge, toolFee, tiers, selectedAreaIds, workflowSteps, termsAndConditions]);

  // ── Initialize States from data ──
  useEffect(() => {
    if (pkg && !hasInitialized) {
      setName(pkg.name);
      setPackageCode(pkg.packageCode);
      setIconUrl(pkg.iconUrl || "");
      setGalleryUrls(pkg.galleryUrls || []);
      setSortOrder(pkg.sortOrder);
      setIsActive(pkg.isActive);
      setMaxHours(pkg.maxHours);
      setPricingMode(pkg.pricingMode || "HOURLY");
      setTermsAndConditions(pkg.termsAndConditions || "");
      setPolicyDescription(pkg.policyDescription || "");
      setNightSurcharge(pkg.nightSurcharge);
      setPetSurcharge(pkg.petSurcharge);
      setWaitingSurcharge(pkg.waitingSurcharge);
      setToolFee(pkg.toolFee);
      setPeakRatePercent(pkg.peakRatePercent);
      setSelectedAreaIds(pkg.coverageAreas?.map(a => a.id) || []);
      setSelectedSubServices(pkg.packageSubServices?.map(s => ({
        id: s.subService.id,
        name: s.subService.name,
        isRequired: !!s.isRequired,
        isDefault: !!s.isDefault,
        sortOrder: s.sortOrder ?? 0,
      })) || []);
      setHasInitialized(true);
    }
  }, [pkg, hasInitialized]);

  // Load Pricing Tiers
  useEffect(() => {
    if (oldTiers && oldTiers.length > 0 && tiers.length === 0) {
      setTiers(oldTiers.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || "",
        pricingMode: t.pricingMode,
        pricePerHour: t.pricePerHour ? String(t.pricePerHour) : "",
        minHours: String(t.minHours),
        maxHours: String(t.maxHours),
        defaultHours: t.defaultHours ? String(t.defaultHours) : "",
        areaMinM2: t.areaMinM2 ? String(t.areaMinM2) : "",
        areaMaxM2: t.areaMaxM2 ? String(t.areaMaxM2) : "",
        pricePerM2: t.pricePerM2 ? String(t.pricePerM2) : "",
        fixedPrice: t.fixedPrice ? String(t.fixedPrice) : "",
        sortOrder: t.sortOrder,
        isActive: t.isActive,
      })));
    }
  }, [oldTiers, tiers.length]);

  // Load Workflow Steps
  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        const workflows = await adminWorkflowService.getAll({ packageId: id });
        if (workflows && workflows.length > 0) {
          const wf = workflows[0];
          setOldWorkflowId(wf.id);
          setWorkflowSteps(wf.steps.map(s => ({
            title: s.title,
            description: s.description || "",
            durationMinutes: s.durationMinutes || 15,
            isRequired: s.isRequired,
            checklistItems: s.checklistItems || [],
            icon: s.icon || "CheckSquare",
          })));
        }
      } catch (err) {
        console.error("Lỗi khi tải workflow: ", err);
      }
    };
    if (id) fetchWorkflow();
  }, [id]);

  // Load Policies
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const assigned = await adminPolicyService.getPoliciesByPackage(id);
        if (assigned && assigned.length > 0) {
          setSelectedPolicyIds(assigned.map(p => p.id));
        }
      } catch (err) {
        console.error("Lỗi khi tải chính sách: ", err);
      }
    };
    if (id) fetchPolicies();
  }, [id]);

  // ── Derived ──
  const canProceedStep1 = name.trim().length >= 2 && packageCode.trim().length >= 3;

  const filteredSvcs = useMemo(() =>
    allSubServices.filter(s =>
      s.name.toLowerCase().includes(searchSvc.toLowerCase()) ||
      s.subServiceCode?.toLowerCase().includes(searchSvc.toLowerCase())
    ), [allSubServices, searchSvc]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (v) setPackageCode(slugify(v));
  };

  const toggleSelect = (svc: AdminServiceEntity) => {
    const exists = selectedSubServices.find(s => s.id === svc.id);
    if (exists) setSelectedSubServices(prev => prev.filter(s => s.id !== svc.id));
    else setSelectedSubServices(prev => [...prev, { id: svc.id, name: svc.name, isRequired: false, isDefault: true, sortOrder: prev.length }]);
  };

  const updateSelected = (idSvc: string, patch: Partial<SelectedSubService>) =>
    setSelectedSubServices(prev => prev.map(s => s.id === idSvc ? { ...s, ...patch } : s));

  const removeSelected = (idSvc: string) => setSelectedSubServices(prev => prev.filter(s => s.id !== idSvc));

  const addTier = () => setTiers(prev => [...prev, newTier(pricingMode, prev.length)]);
  const updateTier = (idTier: string, t: PricingTierForm) => setTiers(prev => prev.map(x => x.id === idTier ? t : x));
  const removeTier = (idTier: string) => setTiers(prev => prev.filter(x => x.id !== idTier));

  const toggleArea = (idArea: string) => setSelectedAreaIds(prev =>
    prev.includes(idArea) ? prev.filter(x => x !== idArea) : [...prev, idArea]);

  const toggleAllAreas = () => {
    if (coverageAreas.every(a => selectedAreaIds.includes(a.id))) setSelectedAreaIds([]);
    else setSelectedAreaIds(coverageAreas.map(a => a.id));
  };

  const toggleGroupAreas = (groupIds: string[], select: boolean) => {
    setSelectedAreaIds(prev => {
      if (select) {
        const newIds = groupIds.filter(idArea => !prev.includes(idArea));
        return [...prev, ...newIds];
      } else {
        return prev.filter(idArea => !groupIds.includes(idArea));
      }
    });
  };

  const addCustomSurcharge = () => setCustomSurcharges(prev => [...prev, { id: crypto.randomUUID(), label: "", iconName: "Zap", amount: 0, hint: "" }]);
  const updateCustomSurcharge = (idSur: string, v: CustomSurcharge) => setCustomSurcharges(prev => prev.map(s => s.id === idSur ? v : s));
  const removeCustomSurcharge = (idSur: string) => setCustomSurcharges(prev => prev.filter(s => s.id !== idSur));

  const handleSaveQuickPrice = async () => {
    if (!subServiceToEditPrice) return;
    if (!quickPriceVal.trim() || isNaN(Number(quickPriceVal))) {
      toast.error("Vui lòng nhập mức giá hợp lệ!");
      return;
    }
    setIsEditingPriceSaving(true);
    try {
      let pricingConfigId = subServiceToEditPrice.pricingConfigId;
      const basePriceVal = Number(quickPriceVal);
      const configName = quickPricingNote.trim() || `${subServiceToEditPrice.name} - Giá nhanh`;

      if (pricingConfigId) {
        await adminPricingApi.updatePricingConfig({
          id: pricingConfigId,
          payload: { name: configName, basePrice: basePriceVal }
        });
      } else {
        const newConfig = await adminPricingApi.createPricingConfig({
          name: configName,
          basePrice: basePriceVal,
        });
        pricingConfigId = newConfig.id;
      }

      await adminServicesApi.updateService({
        id: subServiceToEditPrice.id,
        payload: {
          pricingConfigId,
          thumbnailUrl: quickThumbnailUrl || undefined,
          galleryUrls: quickGalleryUrls.filter(Boolean),
        }
      });

      toast.success("Đã cập nhật dịch vụ con thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["admin-packages", "detail", id] });
      setSubServiceToEditPrice(null);
    } catch {
      toast.error("Lỗi khi cấu hình dịch vụ con!");
    } finally {
      setIsEditingPriceSaving(false);
    }
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!name.trim() || !packageCode.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }
    setIsSaving(true);
    try {
      // 1. Cập nhật gói chính
      const payload: UpdateAdminPackageDto = {
        name: name.trim(),
        packageCode: packageCode.trim().toUpperCase(),
        iconUrl: iconUrl || undefined,
        galleryUrls: galleryUrls.filter(Boolean),
        sortOrder, isActive, maxHours, pricingMode,
        nightSurcharge, petSurcharge, waitingSurcharge, toolFee, peakRatePercent,
        termsAndConditions: termsAndConditions.trim() || undefined,
        policyDescription: policyDescription.trim() || undefined,
        coverageAreaIds: selectedAreaIds.length > 0 ? selectedAreaIds : [],
      };
      await adminServicesApi.updatePackage({ id, payload });

      // 2. Cập nhật pricing tiers: Xóa các tiers cũ và tạo lại các tiers mới
      if (oldTiers && oldTiers.length > 0) {
        await Promise.all(oldTiers.map(t => adminPricingApi.deleteTier(t.id)));
      }
      const validTiers = tiers.filter(t => t.name.trim());
      if (validTiers.length > 0) {
        await Promise.all(validTiers.map((t, idx) =>
          adminPricingApi.createTier({
            packageId: id,
            name: t.name.trim(),
            description: t.description || undefined,
            pricingMode: t.pricingMode,
            pricePerHour: t.pricePerHour ? Number(t.pricePerHour) : undefined,
            minHours: t.minHours ? Number(t.minHours) : undefined,
            maxHours: t.maxHours ? Number(t.maxHours) : undefined,
            defaultHours: t.defaultHours ? Number(t.defaultHours) : undefined,
            areaMinM2: t.areaMinM2 ? Number(t.areaMinM2) : undefined,
            areaMaxM2: t.areaMaxM2 ? Number(t.areaMaxM2) : undefined,
            pricePerM2: t.pricePerM2 ? Number(t.pricePerM2) : undefined,
            fixedPrice: t.fixedPrice ? Number(t.fixedPrice) : undefined,
            sortOrder: idx,
            isActive: t.isActive,
          })
        ));
      }

      // 3. Link dịch vụ con: Xóa toàn bộ liên kết cũ và gán liên kết mới
      if (pkg?.packageSubServices && pkg.packageSubServices.length > 0) {
        await Promise.all(pkg.packageSubServices.map(s =>
          adminServicesApi.removeSubServiceFromPackage(id, s.subService.id)
        ));
      }
      if (selectedSubServices.length > 0) {
        await adminServicesApi.addSubServicesToPackage(id, selectedSubServices.map(s => ({
          id: s.id,
          isRequired: s.isRequired,
          isDefault: s.isDefault,
          sortOrder: s.sortOrder,
        })));
      }

      // 4. Cập nhật workflow
      if (oldWorkflowId) {
        await adminWorkflowService.remove(oldWorkflowId);
      }
      if (workflowSteps.length > 0) {
        await adminWorkflowService.create({
          name: `Quy trình thực hiện - ${name.trim()}`,
          description: `Quy trình dịch vụ của gói ${name.trim()}`,
          packageId: id,
          isActive: true,
          steps: workflowSteps.map((w, idx) => ({
            title: w.title,
            description: w.description || undefined,
            stepOrder: idx + 1,
            durationMinutes: w.durationMinutes || 15,
            isRequired: !!w.isRequired,
            checklistItems: w.checklistItems || [],
            icon: w.icon || "CheckSquare",
          })),
        });
      }

      // 5. Gán chính sách
      await adminPolicyService.assignToPackage(id, selectedPolicyIds);

      toast.success("Cập nhật gói dịch vụ thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-packages", "detail", id] });
      router.push(`/admin/services/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi lưu thay đổi gói dịch vụ!");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingPkg || isLoadingTiers) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BaseButton variant="outline" size="icon" onClick={() => router.push(`/admin/services/${id}`)}
          className="rounded-full h-10 w-10 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </BaseButton>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Chỉnh sửa Gói Dịch vụ</p>
          <h1 className="text-2xl font-black text-foreground leading-tight">Cập nhật gói: {pkg?.name}</h1>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-card border border-border/50 rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <StepIndicator current={step} onStepClick={setStep} validations={validations} />
        <span className="text-xs text-muted-foreground font-semibold">Bước {step} / {STEPS.length}</span>
      </div>

      {/* STEP 1: Thông tin cơ bản */}
      {step === 1 && (
        <div className="space-y-5">
          <SectionCard icon={Package} title="Thông tin cơ bản gói dịch vụ" description="Tên gói, mã code, icon và mô tả chính sách ban đầu.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tên gói dịch vụ" required hint="VD: Dọn dẹp nhà, Lau kính cao ốc">
                <Input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Nhập tên gói..." className="h-11 rounded-xl text-sm" />
              </Field>
              <Field label="Mã gói (Package Code)" required hint="Mã định danh hệ thống, tự động sinh theo tên">
                <Input value={packageCode} onChange={e => setPackageCode(e.target.value.toUpperCase())} placeholder="VD: PKG-DON-NHA" className="h-11 rounded-xl text-sm font-mono" />
              </Field>
              <Field label="Ảnh đại diện (Icon URL)" hint="Đường dẫn ảnh logo hoặc icon của gói">
                <div className="flex flex-col gap-2">
                  <ImageUpload value={iconUrl} onChange={setIconUrl} onRemove={() => setIconUrl("")} />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Thứ tự hiển thị" hint="Thứ tự ưu tiên xếp hàng">
                  <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="h-11 rounded-xl text-sm" />
                </Field>
                <div className="flex flex-col justify-end pb-3">
                  <div className="flex items-center gap-2.5">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <span className="text-sm font-bold text-foreground">Kích hoạt gói hoạt động</span>
                  </div>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <Field label="Album ảnh phụ (Gallery URLs)" hint="Các hình ảnh thực tế của gói dịch vụ">
                  <MultipleImageUpload value={galleryUrls.filter(Boolean)} onChange={setGalleryUrls} />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={ScrollText} title="Mô tả chính sách (Policy Description)" description="Thông tin tóm tắt hiển thị trực tiếp cho khách hàng.">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <Field label="Nội dung mô tả chính sách" hint="Tối đa 1000 ký tự. Tự động giãn dòng theo văn bản.">
                <div className="relative">
                  <Textarea
                    value={policyDescription}
                    onChange={e => { if (e.target.value.length <= 1000) setPolicyDescription(e.target.value); }}
                    placeholder="Mô tả tóm tắt dịch vụ, các cam kết, các quy định chính mà khách hàng cần lưu ý khi đặt lịch gói dịch vụ này..."
                    className="rounded-2xl p-4 leading-relaxed min-h-[140px] resize-none"
                  />
                  <div className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground font-semibold">
                    {policyDescription.length}/1000 ký tự
                  </div>
                </div>
              </Field>

              {/* Live Preview */}
              <div className="border border-border/40 bg-muted/10 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-primary animate-pulse" /> Xem trước App khách hàng
                </p>
                <div className="bg-card border border-border/20 rounded-xl p-4 shadow-3xs space-y-2">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    {name || "Tên gói dịch vụ"}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {policyDescription || "Nội dung mô tả chính sách của gói dịch vụ sẽ xuất hiện ở đây..."}
                  </p>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end pt-2">
            <BaseButton variant="primary" disabled={!canProceedStep1} onClick={() => setStep(2)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp tục <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 2: Cấu hình giá */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <SectionCard icon={DollarSign} title="Chế độ tính giá" description="Chọn cách tính giá cho gói dịch vụ này.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { v: "HOURLY" as PricingMode, label: "Theo giờ", icon: Clock, desc: "Giá × số giờ làm việc", color: "border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700" },
                { v: "AREA_HOURLY" as PricingMode, label: "Diện tích × Giờ", icon: Layers, desc: "Giá/m² × số giờ làm việc", color: "border-violet-300 bg-violet-50 dark:bg-violet-900/20 text-violet-700" },
                { v: "FIXED" as PricingMode, label: "Cố định", icon: Zap, desc: "Một mức giá cố định trọn gói", color: "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700" },
              ] as { v: PricingMode; label: string; icon: React.ElementType; desc: string; color: string }[]).map(opt => (
                <button key={opt.v} type="button" onClick={() => { setPricingMode(opt.v); setTiers([]); }}
                  className={cn("flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all text-center",
                    pricingMode === opt.v ? opt.color + " shadow-xs" : "border-border/40 hover:border-primary/30 text-muted-foreground hover:text-foreground")}>
                  <opt.icon className="w-6 h-6 shrink-0" />
                  <span className="text-sm font-black">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.desc}</span>
                  {pricingMode === opt.v && <Check className="w-4 h-4 text-primary mt-1" />}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={Clock} title="Cấu hình thời gian & Giờ cao điểm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Thời lượng làm việc tối đa (Giờ)" required hint="Giới hạn thời gian làm việc tối đa cho 1 ca làm">
                <div className="flex items-center gap-3">
                  <Input type="number" min={1} max={24} value={maxHours} onChange={e => setMaxHours(Number(e.target.value))} className="h-11 rounded-xl flex-1 text-sm" />
                  <span className="text-sm text-muted-foreground font-semibold">giờ</span>
                </div>
              </Field>
              <Field label="Hệ số giờ cao điểm (%)" required hint="Áp dụng phụ thu khi đặt giờ cao điểm">
                <div className="flex items-center gap-3">
                  <Input type="number" value={peakRatePercent} onChange={e => setPeakRatePercent(Number(e.target.value))} className="h-11 rounded-xl flex-1 text-sm" />
                  <span className="text-sm text-muted-foreground font-semibold">%</span>
                </div>
                {peakRatePercent > 0 && <p className="text-[11px] text-amber-600 font-semibold mt-1">→ 100k + {peakRatePercent}% = {vnd(100000 * (1 + peakRatePercent / 100))}</p>}
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={DollarSign} title="Bảng phụ phí mặc định" description="Áp dụng chung cho tất cả các đơn hàng thuộc gói dịch vụ này.">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SurchargeField icon={Moon} label="Phụ thu làm đêm" hint="Bắt đầu từ 20h00 - 05h00" value={nightSurcharge} onChange={setNightSurcharge} iconColor="text-indigo-500" />
                <SurchargeField icon={PawPrint} label="Phụ thu thú cưng" hint="Cộng dồn nếu nhà có nuôi thú cưng" value={petSurcharge} onChange={setPetSurcharge} iconColor="text-amber-500" />
                <SurchargeField icon={Timer} label="Phí chờ đợi (15 phút)" hint="Khi thợ phải đợi khách ngoài giờ hẹn" value={waitingSurcharge} onChange={setWaitingSurcharge} iconColor="text-rose-500" />
                <SurchargeField icon={Hammer} label="Phí dụng cụ mang theo" hint="Phí thuê dụng cụ chùi dọn chuyên dụng" value={toolFee} onChange={setToolFee} iconColor="text-slate-500" />
              </div>

              {customSurcharges.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phụ phí tuỳ chỉnh</p>
                  {customSurcharges.map(cs => (
                    <CustomSurchargeRow key={cs.id} item={cs}
                      onChange={v => updateCustomSurcharge(cs.id, v)}
                      onRemove={() => removeCustomSurcharge(cs.id)} />
                  ))}
                </div>
              )}
              <button type="button" onClick={addCustomSurcharge}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border/40 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary text-sm font-semibold">
                <Plus className="w-4 h-4" /> Thêm loại phụ phí tùy chỉnh
              </button>
            </div>
          </SectionCard>

          {/* Khung giờ cao điểm hệ thống */}
          <SectionCard
            icon={TrendingUp}
            title="Danh sách giờ cao điểm hệ thống"
            description="Bảng hiển thị các khung giờ hệ thống tự động cộng thêm phụ thu dịch vụ."
            headerAction={
              <BaseButton
                type="button"
                onClick={() => setShowAddPeakDay(true)}
                className="h-9 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/95 flex items-center gap-1.5 transition-all"
              >
                + Thêm cao điểm
              </BaseButton>
            }
          >
            <div className="overflow-x-auto border border-border/40 rounded-2xl bg-muted/5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20 text-muted-foreground font-black uppercase tracking-wider">
                    <th className="p-3.5">Tên cấu hình</th>
                    <th className="p-3.5">Mức phụ thu</th>
                    <th className="p-3.5">Khung giờ áp dụng</th>
                    <th className="p-3.5">Khoảng ngày áp dụng</th>
                    <th className="p-3.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-foreground font-medium">
                  {peakDaysData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground font-semibold italic">
                        Chưa có khung giờ cao điểm nào được thiết lập.
                      </td>
                    </tr>
                  ) : (
                    peakDaysData.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3.5 font-bold text-foreground">{d.name}</td>
                        <td className="p-3.5 text-primary font-black">+{d.peakRate * 100}%</td>
                        <td className="p-3.5 font-semibold text-muted-foreground">
                          {d.startTime && d.endTime ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>{d.startTime} - {d.endTime}</span>
                            </span>
                          ) : (
                            "Cả ngày"
                          )}
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {d.startAt ? new Date(d.startAt).toLocaleDateString("vi-VN") : "Hằng ngày"}
                          {d.endAt ? ` - ${new Date(d.endAt).toLocaleDateString("vi-VN")}` : ""}
                        </td>
                        <td className="p-3.5 text-center">
                          <Badge className={d.isActive ? "bg-emerald-500/10 text-emerald-600 border-none rounded-full" : "bg-muted text-muted-foreground border-none rounded-full"}>
                            {d.isActive ? "Đang chạy" : "Tắt"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(1)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(3)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 3: Mức giá chi tiết */}
      {step === 3 && (
        <div className="space-y-5">
          <SectionCard
            icon={BarChart3}
            title={`Cấu hình bảng mức giá chi tiết (${pricingMode})`}
            description="Thiết lập các mốc giá dựa trên thời gian làm việc hoặc diện tích dọn dẹp cụ thể."
            headerAction={
              <BaseButton type="button" onClick={addTier} className="h-9.5 px-4 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/95 flex items-center gap-1.5 transition-all">
                + Thêm mốc giá
              </BaseButton>
            }
          >
            {tiers.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-bold text-muted-foreground">Chưa cấu hình các mốc giá</p>
                <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Mỗi gói dịch vụ cần ít nhất 1 mốc giá chi tiết để tính phí đơn hàng.</p>
                <BaseButton type="button" variant="outline" onClick={addTier} className="h-9 rounded-xl text-xs font-bold text-primary border-primary hover:bg-primary/5 shadow-xs">
                  + Tạo mốc giá đầu tiên
                </BaseButton>
              </div>
            ) : (
              <div className="space-y-4">
                {tiers.map((tier, idx) => (
                  <PricingTierFormCard
                    key={tier.id}
                    tier={tier}
                    onChange={(t) => updateTier(tier.id, t)}
                    onRemove={() => removeTier(tier.id)}
                    set={(k, v) => updateTier(tier.id, { ...tier, [k]: v })}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(2)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" disabled={tiers.filter(t => t.name.trim()).length === 0} onClick={() => setStep(4)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 4: Dịch vụ con */}
      {step === 4 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cột trái: Tìm và chọn dịch vụ con */}
            <SectionCard icon={Wrench} title="Thư viện dịch vụ con" description="Tìm kiếm và tích chọn các dịch vụ con thuộc gói dịch vụ này.">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchSvc} onChange={e => setSearchSvc(e.target.value)}
                  placeholder="Tìm dịch vụ con (tên hoặc mã)..." className="h-10 rounded-xl pl-9 text-xs" />
              </div>

              {filteredSvcs.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground bg-muted/10 border border-dashed border-border rounded-2xl">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Không tìm thấy dịch vụ con nào tương ứng.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredSvcs.map(svc => {
                    const isSelected = !!selectedSubServices.find(s => s.id === svc.id);
                    return (
                      <div
                        key={svc.id}
                        onClick={() => toggleSelect(svc)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer",
                          isSelected
                            ? "bg-primary/5 border-primary shadow-3xs"
                            : "bg-card border-border/40 hover:border-primary/30"
                        )}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-black text-foreground truncate">{svc.name}</p>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setPreviewSubService(svc); }}
                              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 uppercase">{svc.subServiceCode}</span>
                            {svc.pricingConfig?.basePrice && (
                              <span className="text-[10px] font-black text-emerald-600">
                                {vnd(Number(svc.pricingConfig.basePrice))}
                                {svc.pricingType === "HOURLY" ? "/h" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                          isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30")}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Cột phải: Danh sách dịch vụ con đã liên kết */}
            <SectionCard icon={CheckCircle2} title={`Dịch vụ con được chọn (${selectedSubServices.length})`} description="Thiết lập các thuộc tính hoạt động, giá cả và thứ tự hiển thị của các dịch vụ con.">
              {selectedSubServices.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                  <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Chưa có dịch vụ con nào được chọn</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Vui lòng chọn từ thư viện bên trái.</p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                  {selectedSubServices.map((s, idx) => {
                    const originalSvc = allSubServices.find(x => x.id === s.id);
                    return (
                      <div key={s.id} className="p-4 bg-muted/20 border border-border/30 rounded-2xl space-y-3 shadow-3xs relative">
                        <div className="flex items-start justify-between gap-3 border-b border-border/20 pb-2">
                          <div>
                            <p className="text-xs font-black text-foreground">{s.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {originalSvc?.pricingConfig?.basePrice ? (
                                <span className="text-[10px] font-bold text-emerald-600">
                                  Giá: {vnd(Number(originalSvc.pricingConfig.basePrice))}
                                  {originalSvc.pricingType === "HOURLY" ? "/h" : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground italic">Chưa có giá</span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  if (originalSvc) {
                                    setSubServiceToEditPrice(originalSvc);
                                    setQuickPriceType(originalSvc.pricingType as "FIXED" | "HOURLY" || "FIXED");
                                    setQuickPriceVal(originalSvc.pricingConfig?.basePrice ? String(originalSvc.pricingConfig.basePrice) : "");
                                    setQuickPricingNote(originalSvc.pricingConfig?.name || "");
                                    setQuickThumbnailUrl(originalSvc.thumbnailUrl || "");
                                    setQuickGalleryUrls(originalSvc.galleryUrls || []);
                                  }
                                }}
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                                title="Chỉnh sửa chi tiết dịch vụ con (ảnh đại diện, ảnh phụ và giá)"
                              >
                                <Edit className="w-2.5 h-2.5" /> Sửa chi tiết
                              </button>
                              {originalSvc && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewSubService(originalSvc)}
                                  className="text-[10px] text-muted-foreground hover:text-primary hover:underline flex items-center gap-0.5 font-bold border-l border-border/60 pl-2 ml-2"
                                  title="Xem chi tiết toàn bộ thông tin dịch vụ con"
                                >
                                  <Eye className="w-2.5 h-2.5" /> Xem chi tiết
                                </button>
                              )}
                            </div>
                          </div>
                          <button type="button" onClick={() => removeSelected(s.id)} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="flex items-center justify-between p-2 bg-card border border-border/20 rounded-xl">
                            <span className="text-[10px] font-bold text-muted-foreground">Bắt buộc:</span>
                            <Switch checked={s.isRequired} onCheckedChange={v => updateSelected(s.id, { isRequired: v })} className="scale-75" />
                          </div>
                          <div className="flex items-center justify-between p-2 bg-card border border-border/20 rounded-xl">
                            <span className="text-[10px] font-bold text-muted-foreground">Mặc định:</span>
                            <Switch checked={s.isDefault} onCheckedChange={v => updateSelected(s.id, { isDefault: v })} className="scale-75" />
                          </div>
                          <div className="flex items-center gap-1.5 p-1 px-2.5 bg-card border border-border/20 rounded-xl">
                            <span className="text-[10px] font-bold text-muted-foreground shrink-0">Thứ tự:</span>
                            <input type="number" value={s.sortOrder} onChange={e => updateSelected(s.id, { sortOrder: Number(e.target.value) })}
                              className="w-full text-center font-bold text-xs bg-transparent border-0 p-0 outline-none focus:ring-0 text-primary" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(3)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(5)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 5: Khu vực phục vụ */}
      {step === 5 && (
        <div className="space-y-5">
          <SectionCard icon={MapPin} title="Khu vực phục vụ"
            description={`Chọn quận/huyện tại Hà Nội gói này sẽ hoạt động · Đã chọn: ${selectedAreaIds.length} khu vực`}>
            <CoverageAreaSelector
              areas={coverageAreas}
              selected={selectedAreaIds}
              onToggle={toggleArea}
              onToggleAll={toggleAllAreas}
              onToggleGroup={toggleGroupAreas}
            />
          </SectionCard>

          {selectedAreaIds.length > 0 && (
            <div className="bg-card border border-border/50 rounded-2xl p-5">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">Phí vận chuyển tổng hợp (Click để sửa phí ship)</p>
              <div className="flex flex-wrap gap-2">
                {coverageAreas.filter(a => selectedAreaIds.includes(a.id)).map(a => (
                  <div key={a.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 border border-border/40 rounded-xl">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-xs font-semibold">{a.name}</span>
                    <span
                      onClick={() => {
                        setEditingArea(a);
                        setEditAreaFee(String(a.transportFee));
                      }}
                      className={cn("text-[10px] font-bold cursor-pointer hover:underline",
                        Number(a.transportFee) === 0 ? "text-emerald-600" : Number(a.transportFee) <= 20000 ? "text-blue-600" : "text-amber-600")}
                      title="Click để chỉnh sửa nhanh phí ship"
                    >
                      {Number(a.transportFee) === 0 ? "Free" : `+${vnd(Number(a.transportFee))}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingArea(a);
                        setEditAreaFee(String(a.transportFee));
                      }}
                      className="p-0.5 rounded text-blue-600 hover:bg-blue-50 hover:text-blue-700 shrink-0 ml-0.5"
                      title="Chỉnh sửa phí vận chuyển"
                    >
                      <Edit className="w-2.5 h-2.5" />
                    </button>
                    <button type="button" onClick={() => toggleArea(a.id)} className="w-3.5 h-3.5 flex items-center justify-center opacity-50 hover:opacity-100 shrink-0">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 rounded-2xl">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Khu vực phục vụ có thể để trống và cập nhật sau. Phí vận chuyển sẽ được cộng thêm vào giá khi khách hàng đặt đơn ở khu vực đó.
            </p>
          </div>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(4)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(6)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 6: Điều khoản */}
      {step === 6 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="workflow" className="rounded-lg font-bold text-xs">
                <Layers className="w-3.5 h-3.5 mr-1.5 text-primary animate-pulse" />
                1. Quy trình thực hiện
              </TabsTrigger>
              <TabsTrigger value="terms-commitments" className="rounded-lg font-bold text-xs">
                <ScrollText className="w-3.5 h-3.5 mr-1.5 text-primary" />
                2. Điều khoản & Cam kết
              </TabsTrigger>
              <TabsTrigger value="policies" className="rounded-lg font-bold text-xs">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-primary" />
                3. Chính sách gán kèm
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: WORKFLOW */}
            <TabsContent value="workflow" className="mt-4 space-y-5">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div>
                  <p className="text-sm font-black text-primary flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-primary fill-primary animate-bounce" />
                    Thêm nhanh quy trình mẫu chuẩn
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Chèn nhanh quy trình dọn dẹp mẫu cho gói dịch vụ của bạn.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {WORKFLOW_TEMPLATES.map((tpl, tIdx) => (
                    <BaseButton
                      key={tIdx}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWorkflowSteps(tpl.steps);
                        toast.success(`Đã áp dụng mẫu: ${tpl.name}`);
                      }}
                      className="h-9 rounded-xl text-xs font-bold bg-card border-primary/25 text-primary hover:bg-primary/10 hover:text-primary hover:scale-[1.02] active:scale-95 transition-all shadow-xs"
                    >
                      + {tpl.name.split(" (")[0]}
                    </BaseButton>
                  ))}
                </div>
              </div>

              <SectionCard icon={Layers} title="Thiết lập các bước thực hiện công việc" description="Mô tả cụ thể từng bước và checklist để đảm bảo chất lượng dịch vụ đồng đều">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Cột trái: Thêm/Sửa bước */}
                  <div className="lg:col-span-1 border border-border/40 rounded-2xl p-5 bg-muted/15 space-y-4 shadow-2xs">
                    <p className="font-bold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Plus className="w-4 h-4 text-primary" />
                      {editingWorkflowStepIndex !== null ? "Sửa bước quy trình" : "Thêm bước quy trình mới"}
                    </p>
                    <div className="space-y-3.5">
                      <Field label="Tiêu đề bước" required>
                        <Input value={stepTitle} onChange={e => setStepTitle(e.target.value)} placeholder="VD: Khảo sát phòng ngủ" className="h-10 text-xs rounded-xl" />
                      </Field>
                      <Field label="Mô tả công việc">
                        <Textarea value={stepDesc} onChange={e => setStepDesc(e.target.value)} placeholder="Mô tả chi tiết những việc nhân viên cần lưu ý..." rows={3} className="text-xs rounded-xl resize-none leading-relaxed" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Thời lượng (Phút)" required>
                          <Input inputMode="numeric" value={stepDuration} onChange={e => setStepDuration(e.target.value.replace(/\D/g, ""))} placeholder="30" className="h-10 text-xs rounded-xl" />
                        </Field>
                        <div className="space-y-1.5 flex flex-col justify-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <Switch checked={stepRequired} onCheckedChange={setStepRequired} />
                            <span className="text-xs font-bold text-foreground/80">Bắt buộc</span>
                          </label>
                        </div>
                      </div>

                      {/* Checklist */}
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs font-black text-foreground/90">Checklist đầu việc nhỏ</Label>
                        <div className="flex gap-2">
                          <Input value={newChecklistVal} onChange={e => setNewChecklistVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newChecklistVal.trim()) { setStepChecklist([...stepChecklist, newChecklistVal.trim()]); setNewChecklistVal(""); } } }}
                            placeholder="Thêm đầu việc nhỏ..." className="h-9 text-xs rounded-xl flex-1" />
                          <BaseButton type="button" variant="outline" size="sm" onClick={() => { if (newChecklistVal.trim()) { setStepChecklist([...stepChecklist, newChecklistVal.trim()]); setNewChecklistVal(""); } }} className="h-9 px-2 rounded-xl text-xs">Thêm</BaseButton>
                        </div>
                        {stepChecklist.length > 0 && (
                          <div className="space-y-1 mt-2 max-h-32 overflow-y-auto bg-card border border-border/20 rounded-xl p-2.5">
                            {stepChecklist.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 text-xs py-1 px-2 hover:bg-muted/40 rounded-lg">
                                <span className="truncate flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  {item}
                                </span>
                                <button type="button" onClick={() => setStepChecklist(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive shrink-0">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border/20">
                      {editingWorkflowStepIndex !== null ? (
                        <>
                          <BaseButton type="button" variant="outline" onClick={() => {
                            setEditingWorkflowStepIndex(null); setStepTitle(""); setStepDesc(""); setStepDuration("15"); setStepRequired(true); setStepChecklist([]);
                          }} className="flex-1 h-9 rounded-xl text-xs font-bold">Hủy</BaseButton>
                          <BaseButton type="button" variant="primary" onClick={() => {
                            if (!stepTitle.trim()) { toast.error("Vui lòng điền tiêu đề!"); return; }
                            setWorkflowSteps(prev => prev.map((item, i) => i === editingWorkflowStepIndex ? {
                              title: stepTitle.trim(), description: stepDesc.trim() || undefined,
                              durationMinutes: Number(stepDuration) || 15, isRequired: stepRequired,
                              checklistItems: stepChecklist, icon: item.icon || "CheckSquare"
                            } : item));
                            setEditingWorkflowStepIndex(null); setStepTitle(""); setStepDesc(""); setStepDuration("15"); setStepRequired(true); setStepChecklist([]);
                          }} className="flex-1 h-9 rounded-xl text-xs font-bold">Lưu</BaseButton>
                        </>
                      ) : (
                        <BaseButton type="button" variant="primary" onClick={() => {
                          if (!stepTitle.trim()) { toast.error("Vui lòng điền tiêu đề!"); return; }
                          setWorkflowSteps(prev => [...prev, {
                            title: stepTitle.trim(), description: stepDesc.trim() || undefined,
                            durationMinutes: Number(stepDuration) || 15, isRequired: stepRequired,
                            checklistItems: stepChecklist, icon: "CheckSquare"
                          }]);
                          setStepTitle(""); setStepDesc(""); setStepDuration("15"); setStepRequired(true); setStepChecklist([]);
                        }} className="w-full h-9 rounded-xl text-xs font-bold">Thêm vào quy trình</BaseButton>
                      )}
                    </div>
                  </div>

                  {/* Cột phải: Preview và sắp xếp timeline đứng */}
                  <div className="lg:col-span-2 space-y-4">
                    {workflowSteps.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                        <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm font-bold text-muted-foreground">Chưa có bước quy trình nào</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Sử dụng form bên trái để xây dựng từng bước quy trình.</p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-primary/20 space-y-5 ml-4 py-1">
                        {workflowSteps.map((w, idx) => {
                          const StepIcon = getIconByName(w.icon || "CheckSquare");
                          return (
                            <div key={idx} className="relative pl-7 flex gap-3.5 items-start">
                              <div className="absolute -left-[14px] top-0.5 w-6.5 h-6.5 rounded-full border-2 border-primary bg-background flex items-center justify-center font-black text-xs text-primary shadow-2xs z-10">
                                {idx + 1}
                              </div>

                              <div className="p-4 bg-card border border-border/30 rounded-2xl flex-1 min-w-0 shadow-2xs group relative">
                                <div className="flex items-center gap-2 flex-wrap pr-16">
                                  <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                    <StepIcon className="w-4 h-4 text-primary shrink-0" />
                                    {w.title}
                                  </p>
                                  {w.isRequired && (
                                    <Badge className="bg-rose-500/10 text-rose-600 border-none text-[8.5px] px-1.5 py-0.2 rounded-full font-bold">Bắt buộc</Badge>
                                  )}
                                  {w.durationMinutes && (
                                    <Badge variant="secondary" className="bg-muted text-muted-foreground text-[8.5px] px-1.5 py-0.2 rounded-full font-bold">
                                      {w.durationMinutes} phút
                                    </Badge>
                                  )}
                                </div>
                                {w.description && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{w.description}</p>}
                                {w.checklistItems && w.checklistItems.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/20 pt-2.5">
                                    {w.checklistItems.map((item, cIdx) => (
                                      <span key={cIdx} className="text-[10px] text-muted-foreground bg-muted/40 border border-border/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                        <Check className="w-3 h-3 text-emerald-500" />
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Nút thao tác bước */}
                                <div className="absolute right-3.5 top-3.5 flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => {
                                    setEditingWorkflowStepIndex(idx); setStepTitle(w.title); setStepDesc(w.description || ""); setStepDuration(String(w.durationMinutes || 15)); setStepRequired(!!w.isRequired); setStepChecklist(w.checklistItems || []);
                                  }} className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50">
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" onClick={() => setWorkflowSteps(prev => prev.filter((_, i) => i !== idx))} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </TabsContent>

            {/* TAB 2: TERMS & COMMITMENTS */}
            <TabsContent value="terms-commitments" className="mt-4 space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard icon={ScrollText} title="Điều khoản sử dụng (Hợp đồng & Cam kết)" description="Điều khoản chung liên quan đến trách nhiệm và nghĩa vụ của hai bên.">
                  <Field label="Nội dung điều khoản sử dụng gói dịch vụ" hint="Văn bản pháp lý sẽ được hiển thị khi khách hàng checkout đặt lịch.">
                    <Textarea value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)}
                      placeholder="Quy định thanh toán, chính sách hủy lịch, cam kết chất lượng, bảo hiểm tài sản..." rows={12} className="rounded-2xl p-4 leading-relaxed resize-none" />
                  </Field>
                </SectionCard>

                <SectionCard
                  icon={Heart}
                  title={`Cam kết chất lượng dịch vụ (${commitments.length})`}
                  description="Hiển thị dạng các thẻ nhỏ kèm icon trực quan ở trang chi tiết đặt đơn."
                  headerAction={
                    <BaseButton type="button" onClick={() => setShowAddCommitment(true)} className="h-9 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/95 flex items-center gap-1.5 transition-all">
                      + Thêm cam kết
                    </BaseButton>
                  }
                >
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {commitments.map((c, idx) => {
                      const IconComp = getIconByName(c.iconName);
                      return (
                        <div key={c.id} className="p-4 bg-muted/20 border border-border/30 rounded-2xl flex items-start gap-3.5 relative shadow-3xs hover:border-primary/20 transition-all">
                          <div className="w-8.5 h-8.5 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <IconComp className="w-4.5 h-4.5" />
                          </div>
                          <div className="min-w-0 flex-1 pr-8">
                            <p className="text-xs font-black text-foreground">{c.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{c.content}</p>
                          </div>
                          <button type="button" onClick={() => setCommitments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-3.5 right-3.5 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </div>
            </TabsContent>

            {/* TAB 3: POLICIES */}
            <TabsContent value="policies" className="mt-4 space-y-5 animate-in fade-in duration-200">
              <SectionCard icon={Shield} title="Gán các chính sách hoạt động hệ thống" description={`Tìm và chọn các chính sách từ thư viện (Cam kết, Bồi thường, Hoàn tiền) để gán cho gói dịch vụ này · Đã chọn: ${selectedPolicyIds.length} chính sách`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={policySearch} onChange={e => setPolicySearch(e.target.value)}
                      placeholder="Tìm kiếm chính sách..." className="h-10 rounded-xl pl-9 text-xs" />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <BaseButton type="button" variant="outline" size="sm" onClick={() => setSelectedPolicyIds(policiesData.filter(p => p.isDefault).map(p => p.id))} className="h-9 rounded-xl text-xs font-bold bg-card border-primary/20 text-primary">Mặc định</BaseButton>
                    <BaseButton type="button" variant="outline" size="sm" onClick={() => setSelectedPolicyIds(policiesData.map(p => p.id))} className="h-9 rounded-xl text-xs font-bold bg-card border-border/50">Chọn tất cả</BaseButton>
                    <BaseButton type="button" variant="outline" size="sm" onClick={() => setSelectedPolicyIds([])} className="h-9 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border-rose-100">Bỏ chọn</BaseButton>
                  </div>
                </div>

                {filteredPolicies.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                    <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Không tìm thấy chính sách</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Thử thay đổi từ khóa hoặc liên hệ Admin hệ thống để tạo chính sách mới.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Phân nhóm theo danh mục chính sách */}
                    {(Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).map(cat => {
                      const catPolicies = filteredPolicies.filter(p => p.category === cat);
                      if (catPolicies.length === 0) return null;
                      const CatMeta = POLICY_CATEGORY_META[cat];
                      const CatIcon = CatMeta?.icon;
                      return (
                        <div key={cat} className="border border-border/40 rounded-2xl p-4 bg-muted/15 space-y-3 shadow-3xs">
                          <p className="text-[10px] font-black text-foreground/80 uppercase tracking-widest flex items-center gap-1.5 border-b border-border/30 pb-2">
                            <span className="text-primary">{CatIcon ? <CatIcon className="w-3.5 h-3.5" /> : "📜"}</span>
                            {CatMeta?.label || cat}
                          </p>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {catPolicies.map(pol => {
                              const isSelected = selectedPolicyIds.includes(pol.id);
                              return (
                                <div
                                  key={pol.id}
                                  onClick={() => setSelectedPolicyIds(prev => prev.includes(pol.id) ? prev.filter(x => x !== pol.id) : [...prev, pol.id])}
                                  className={cn("p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs",
                                    isSelected ? "bg-primary/5 border-primary shadow-3xs" : "bg-card border-border/40 hover:border-primary/20")}
                                >
                                  <span className="font-bold text-foreground leading-normal line-clamp-2">{pol.title}</span>
                                  <div className={cn("w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                    isSelected ? "bg-primary border-primary text-white" : "border-muted-foreground/30")}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(5)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(7)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 7: Xem lại */}
      {step === 7 && (
        <div className="space-y-5">
          <SectionCard icon={CheckCircle2} title="Xem lại các cấu hình và Lưu thay đổi" description="Vui lòng kiểm tra kỹ lưỡng toàn bộ cấu hình gói trước khi xác nhận lưu thay đổi.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Cột trái: Tóm tắt thông tin gói & Cam kết */}
              <div className="space-y-4">
                <div className="bg-muted/20 border border-border/30 rounded-2xl p-4.5 space-y-3.5">
                  <p className="text-xs font-black text-primary uppercase tracking-wider border-b border-border/20 pb-2">Thông tin chung</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block font-bold">Tên gói dịch vụ:</span>
                      <span className="font-black text-foreground block mt-0.5">{name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-bold">Mã gói (Code):</span>
                      <span className="font-mono text-primary font-black block mt-0.5 uppercase">{packageCode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-bold">Chế độ tính giá:</span>
                      <span className="font-black text-foreground block mt-0.5">
                        {pricingMode === "HOURLY" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>Theo giờ</span>
                          </span>
                        ) : pricingMode === "AREA_HOURLY" ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Ruler className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>Theo m² & Giờ</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>Giá cố định</span>
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-bold">Thời lượng tối đa:</span>
                      <span className="font-black text-foreground block mt-0.5">{maxHours} giờ / ca</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/20 border border-border/30 rounded-2xl p-4.5 space-y-3">
                  <p className="text-xs font-black text-primary uppercase tracking-wider border-b border-border/20 pb-2">Phụ phí & Vận chuyển</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block font-bold">Hệ số giờ cao điểm:</span>
                      <span className="font-black text-foreground block mt-0.5">+{peakRatePercent}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-bold">Phụ thu làm đêm:</span>
                      <span className="font-black text-foreground block mt-0.5">+{vnd(nightSurcharge)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-bold">Phụ thu thú cưng:</span>
                      <span className="font-black text-foreground block mt-0.5">+{vnd(petSurcharge)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-bold">Phí dụng cụ mang theo:</span>
                      <span className="font-black text-foreground block mt-0.5">+{vnd(toolFee)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground block font-bold">Khu vực phục vụ:</span>
                      <span className="font-black text-foreground block mt-0.5">{selectedAreaIds.length} quận/huyện đã chọn</span>
                    </div>
                  </div>
                </div>

                {commitments.length > 0 && (
                  <div className="bg-muted/20 border border-border/30 rounded-2xl p-4.5 space-y-3.5">
                    <p className="text-xs font-black text-primary uppercase tracking-wider border-b border-border/20 pb-2">Cam kết chất lượng</p>
                    <div className="flex flex-col gap-2">
                      {commitments.map(c => {
                        const IconComp = getIconByName(c.iconName);
                        return (
                          <div key={c.id} className="flex items-start gap-2.5 text-xs py-1">
                            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-foreground block">{c.title}</span>
                              <span className="text-[10px] text-muted-foreground leading-normal block mt-0.5">{c.content}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Cột phải: Chính sách liên kết */}
              <div className="space-y-4">
                <div className="bg-muted/20 border border-border/30 rounded-2xl p-4.5 space-y-3.5">
                  <p className="text-xs font-black text-primary uppercase tracking-wider border-b border-border/20 pb-2">Dịch vụ con liên kết ({selectedSubServices.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSubServices.map(s => (
                      <Badge key={s.id} variant="secondary" className="px-2.5 py-1 text-xs font-bold rounded-xl flex items-center gap-1 bg-card border border-border/30">
                        <Wrench className="w-3.5 h-3.5 text-primary shrink-0" />
                        {s.name}
                        {s.isRequired && <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded uppercase ml-1">Req</span>}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-muted/20 border border-border/30 rounded-2xl p-4.5 space-y-3.5">
                  <p className="text-xs font-black text-primary uppercase tracking-wider border-b border-border/20 pb-2">Chính sách đã gán ({selectedPolicyIds.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPolicyIds.map(pId => {
                      const pol = policiesData.find(p => p.id === pId);
                      if (!pol) return null;
                      const CatMeta = POLICY_CATEGORY_META[pol.category as PolicyCategory];
                      return (
                        <div key={pId} className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border/30 rounded-xl text-xs font-bold">
                          <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{pol.title}</span>
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 rounded bg-muted shrink-0 ml-2">
                            {CatMeta?.label || pol.category}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Dưới cùng (Full width): Quy trình thực hiện */}
            {workflowSteps.length > 0 && (
              <SectionCard icon={Layers} title={`Xem lại — Quy trình thực hiện (${workflowSteps.length} bước)`}>
                <div className="relative border-l-2 border-primary/20 space-y-5 ml-3 py-1">
                  {workflowSteps.map((w, idx) => {
                    const StepIcon = getIconByName(w.icon || "CheckSquare");
                    return (
                      <div key={idx} className="relative pl-7 flex gap-3.5 items-start">
                        <div className="absolute -left-[14px] top-0.5 w-6.5 h-6.5 rounded-full border-2 border-primary bg-background flex items-center justify-center font-black text-xs text-primary shadow-2xs z-10">
                          {idx + 1}
                        </div>

                        <div className="p-3 bg-muted/15 border border-border/30 rounded-2xl flex-1 min-w-0 shadow-2xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <StepIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                              {w.title}
                            </p>
                            {w.isRequired && (
                              <Badge className="bg-rose-500/10 text-rose-600 border-none text-[8px] px-1.5 py-0 rounded-full font-bold">Bắt buộc</Badge>
                            )}
                            {w.durationMinutes && (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground text-[8px] px-1.5 py-0 rounded-full font-bold">
                                {w.durationMinutes} phút
                              </Badge>
                            )}
                          </div>
                          {w.description && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{w.description}</p>}
                          {w.checklistItems && w.checklistItems.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {w.checklistItems.map((item, cIdx) => (
                                <span key={cIdx} className="text-[10px] text-muted-foreground bg-card border border-border/20 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5 text-emerald-500" />
                                  {item}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            <div className="flex justify-between gap-3 pt-4 border-t border-border/30">
              <BaseButton variant="outline" onClick={() => setStep(6)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
              <BaseButton variant="primary" onClick={handleSubmit} disabled={isSaving}
                className="h-11 px-8 rounded-xl font-bold gap-2 flex-1 md:flex-none">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Đang lưu...</> : <><CheckCircle2 className="w-4 h-4" />Lưu thay đổi</>}
              </BaseButton>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Dialog Cấu hình giá nhanh cho dịch vụ con */}
      <Dialog open={!!subServiceToEditPrice} onOpenChange={open => { if (!open) setSubServiceToEditPrice(null); }}>
        <DialogContent className="w-full sm:max-w-[480px] rounded-2xl p-6 bg-card border border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Edit className="w-4 h-4 text-primary" />
              Chỉnh sửa chi tiết: {subServiceToEditPrice?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thay đổi loại giá, thiết lập giá cơ bản, ảnh đại diện và ảnh phụ cho dịch vụ con này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Ảnh thumbnail */}
            <div className="space-y-2">
              <Label className="text-xs font-black text-foreground/90">Ảnh đại diện dịch vụ con</Label>
              <ImageUpload
                value={quickThumbnailUrl}
                onChange={setQuickThumbnailUrl}
                onRemove={() => setQuickThumbnailUrl("")}
              />
            </div>

            {/* Ảnh gallery */}
            <div className="space-y-2">
              <Label className="text-xs font-black text-foreground/90">Ảnh gallery phụ (nhiều ảnh)</Label>
              <MultipleImageUpload
                value={quickGalleryUrls.filter(Boolean)}
                onChange={setQuickGalleryUrls}
              />
            </div>

            <Field label="Loại tính giá">
              <Select value={quickPriceType} onValueChange={v => setQuickPriceType(v as "FIXED" | "HOURLY")}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Giá cố định</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="HOURLY">
                    <span className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Tính theo giờ</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Mức giá cơ bản" required>
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={quickPriceVal}
                  onChange={e => setQuickPriceVal(e.target.value.replace(/\D/g, ""))}
                  placeholder={quickPriceType === "FIXED" ? "300000" : "80000"}
                  className="h-10 rounded-xl"
                />
                <span className="text-sm font-bold text-muted-foreground">
                  {quickPriceType === "FIXED" ? "₫" : "₫/giờ"}
                </span>
              </div>
              {quickPriceVal && (
                <p className="text-xs font-bold text-primary mt-1">
                  {vnd(Number(quickPriceVal))} {quickPriceType === "HOURLY" ? "/ giờ" : ""}
                </p>
              )}
            </Field>

            <Field label="Ghi chú cấu hình giá (Tên cấu hình)" hint="Tên gợi nhớ cho bảng giá này">
              <Input
                value={quickPricingNote}
                onChange={e => setQuickPricingNote(e.target.value)}
                placeholder="VD: Giá tiêu chuẩn ngày thường"
                className="h-10 rounded-xl text-sm"
              />
            </Field>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0 pt-2 border-t border-border/30">
            <BaseButton
              type="button"
              variant="outline"
              onClick={() => setSubServiceToEditPrice(null)}
              className="h-10 rounded-xl font-bold flex-1 sm:flex-initial text-xs"
            >
              Hủy
            </BaseButton>
            <BaseButton
              type="button"
              variant="primary"
              onClick={handleSaveQuickPrice}
              disabled={isEditingPriceSaving}
              className="h-10 rounded-xl font-bold flex-1 sm:flex-initial gap-1.5 text-xs"
            >
              {isEditingPriceSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Lưu thay đổi
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tạo mới khung giờ cao điểm hệ thống */}
      <Dialog open={showAddPeakDay} onOpenChange={setShowAddPeakDay}>
        <DialogContent className="w-full sm:max-w-[480px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2 text-foreground">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Tạo cấu hình giờ cao điểm mới
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thiết lập khung giờ và tỷ lệ phụ thu áp dụng tự động cho các đơn hàng.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <Field label="Tên cấu hình cao điểm" required hint="VD: Tết Nguyên Đán 2027, Giờ cao điểm hằng ngày">
              <Input
                value={peakDayName}
                onChange={e => setPeakDayName(e.target.value)}
                placeholder="VD: Tết Nguyên Đán 2027"
                className="h-10 rounded-xl text-sm"
              />
            </Field>

            <Field label="Mức phụ thu (%)" required hint="Số phần trăm tăng thêm so với giá gốc">
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={peakDayRate}
                  onChange={e => setPeakDayRate(e.target.value.replace(/\D/g, ""))}
                  placeholder="20"
                  className="h-10 rounded-xl"
                />
                <span className="text-sm font-bold text-muted-foreground">%</span>
              </div>
              {peakDayRate && (
                <p className="text-xs font-bold text-primary mt-1">
                  Tương đương hệ số phụ thu: +{Number(peakDayRate) / 100} (+{peakDayRate}%)
                </p>
              )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Áp dụng từ ngày" hint="Để trống nếu áp dụng mọi ngày">
                <Input
                  type="date"
                  value={peakDayStartAt}
                  onChange={e => setPeakDayStartAt(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </Field>
              <Field label="Đến hết ngày" hint="Để trống nếu không giới hạn">
                <Input
                  type="date"
                  value={peakDayEndAt}
                  onChange={e => setPeakDayEndAt(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Khung giờ từ" hint="VD: 08:00 (Để trống nếu cả ngày)">
                <Input
                  type="time"
                  value={peakDayStartTime}
                  onChange={e => setPeakDayStartTime(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </Field>
              <Field label="Đến giờ" hint="VD: 18:00 (Để trống nếu cả ngày)">
                <Input
                  type="time"
                  value={peakDayEndTime}
                  onChange={e => setPeakDayEndTime(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </Field>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-muted/20 border border-border/20 rounded-xl">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground block">Kích hoạt trạng thái</span>
                <span className="text-[10px] text-muted-foreground leading-normal block">Tự động áp dụng ngay sau khi tạo</span>
              </div>
              <Switch checked={peakDayActive} onCheckedChange={setPeakDayActive} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/30">
            <BaseButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddPeakDay(false); setPeakDayName(""); setPeakDayRate("10"); setPeakDayStartAt(""); setPeakDayEndAt(""); setPeakDayStartTime(""); setPeakDayEndTime(""); setPeakDayActive(true);
              }}
              className="h-9.5 rounded-xl text-xs"
            >
              Hủy
            </BaseButton>
            <BaseButton
              type="button"
              variant="primary"
              size="sm"
              disabled={createPeakDayMutation.isPending}
              onClick={async () => {
                if (!peakDayName.trim()) { toast.error("Vui lòng điền tên cấu hình giờ cao điểm!"); return; }
                if (!peakDayRate || isNaN(Number(peakDayRate)) || Number(peakDayRate) <= 0) { toast.error("Vui lòng điền mức phụ thu hợp lệ!"); return; }
                try {
                  const payload: CreatePeakDayConfigDto = {
                    name: peakDayName.trim(),
                    peakRate: Number(peakDayRate) / 100,
                    startAt: peakDayStartAt ? new Date(peakDayStartAt).toISOString() : undefined,
                    endAt: peakDayEndAt ? new Date(peakDayEndAt).toISOString() : undefined,
                    startTime: peakDayStartTime || undefined,
                    endTime: peakDayEndTime || undefined,
                    isActive: peakDayActive,
                  };
                  await createPeakDayMutation.mutateAsync(payload);
                  setPeakDayName(""); setPeakDayRate("10"); setPeakDayStartAt(""); setPeakDayEndAt(""); setPeakDayStartTime(""); setPeakDayEndTime(""); setPeakDayActive(true);
                  setShowAddPeakDay(false);
                } catch {}
              }}
              className="h-9.5 rounded-xl text-xs font-bold bg-primary text-white"
            >
              {createPeakDayMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Lưu cấu hình
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Chỉnh sửa nhanh phí ship của khu vực */}
      <Dialog open={!!editingArea} onOpenChange={open => { if (!open) setEditingArea(null); }}>
        <DialogContent className="w-full sm:max-w-[400px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Chỉnh sửa phí ship: {editingArea?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Phí ship sẽ được cập nhật đồng bộ toàn hệ thống cho khu vực {editingArea?.name} ({editingArea?.city}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <Field label="Phí vận chuyển (₫)" required hint="Nhập 0 nếu muốn miễn phí ship">
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={editAreaFee}
                  onChange={e => setEditAreaFee(e.target.value.replace(/\D/g, ""))}
                  placeholder="15000"
                  className="h-10 rounded-xl"
                />
                <span className="text-sm font-bold text-muted-foreground">₫</span>
              </div>
              {editAreaFee && (
                <p className="text-xs font-bold text-primary mt-1">
                  {vnd(Number(editAreaFee))} (phụ thu phí ship)
                </p>
              )}
            </Field>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0 pt-2 border-t border-border/30">
            <BaseButton
              type="button"
              variant="outline"
              onClick={() => setEditingArea(null)}
              className="h-10 rounded-xl font-bold flex-1 sm:flex-initial text-xs"
            >
              Hủy
            </BaseButton>
            <BaseButton
              type="button"
              variant="primary"
              onClick={async () => {
                if (!editingArea) return;
                if (!editAreaFee.trim() || isNaN(Number(editAreaFee))) { toast.error("Vui lòng nhập phí vận chuyển hợp lệ!"); return; }
                setIsUpdatingAreaSaving(true);
                try {
                  await updateAreaMutation.mutateAsync({ id: editingArea.id, transportFee: Number(editAreaFee) });
                  setEditingArea(null);
                } catch {
                } finally {
                  setIsUpdatingAreaSaving(false);
                }
              }}
              disabled={isUpdatingAreaSaving}
              className="h-10 rounded-xl font-bold flex-1 sm:flex-initial gap-1.5 text-xs"
            >
              {isUpdatingAreaSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Lưu phí ship
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet Trượt từ phải ra để Xem toàn bộ chi tiết dịch vụ con */}
      <Sheet open={!!previewSubService} onOpenChange={(open) => !open && setPreviewSubService(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto px-0 pb-8 flex flex-col bg-card border-l border-border shadow-xl">
          {previewSubService && (
            <>
              <SheetHeader className="px-6 pb-4 border-b border-border/40 shrink-0">
                {previewSubService.thumbnailUrl && (
                  <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-4 border border-border/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewSubService.thumbnailUrl} alt={previewSubService.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <SheetTitle className="text-lg font-black text-foreground">{previewSubService.name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 uppercase">{previewSubService.subServiceCode}</span>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                    previewSubService.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                    {previewSubService.isActive ? "Hoạt động" : "Tắt"}
                  </span>
                </div>
                {previewSubService.shortDescription && (
                  <SheetDescription className="text-left text-xs text-muted-foreground mt-2 leading-relaxed">
                    {previewSubService.shortDescription}
                  </SheetDescription>
                )}
              </SheetHeader>
              <div className="flex-1 px-6 pt-5 space-y-5 overflow-y-auto">
                {previewSubService.description && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Mô tả chi tiết</p>
                    <p className="text-xs bg-muted/20 p-3.5 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed text-foreground/80">
                      {previewSubService.description}
                    </p>
                  </div>
                )}
                {previewSubService.durationHours && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Thời lượng làm việc ước tính</p>
                    <p className="text-xs font-bold text-foreground bg-muted/20 px-3.5 py-2 rounded-xl border border-border/40 w-fit flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{previewSubService.durationHours} giờ</span>
                    </p>
                  </div>
                )}
                {previewSubService.pricingConfig && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Cấu hình giá</p>
                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/20">
                      <p className="text-[9px] text-primary/70 font-black uppercase mb-1">Giá cơ bản</p>
                      <p className="text-lg font-black text-primary">
                        {vnd(Number(previewSubService.pricingConfig.basePrice))}
                        {previewSubService.pricingType === "HOURLY" ? "/giờ" : ""}
                      </p>
                    </div>
                  </div>
                )}
                {previewSubService.includedTasks && previewSubService.includedTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Công việc bao gồm</p>
                    <ul className="space-y-1.5">
                      {previewSubService.includedTasks.map((t, idx) => (
                        <li key={idx} className="text-xs text-foreground/85 flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {previewSubService.excludedTasks && previewSubService.excludedTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Công việc không bao gồm</p>
                    <ul className="space-y-1.5">
                      {previewSubService.excludedTasks.map((t, idx) => (
                        <li key={idx} className="text-xs text-foreground/85 flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="px-6 pt-4 border-t border-border/40 flex gap-2 shrink-0">
                <BaseButton
                  type="button"
                  variant="outline"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold gap-1.5 h-10"
                  onClick={() => window.open(`/admin/services/sub-services?openId=${previewSubService.id}`, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" /> Xem trang chi tiết
                </BaseButton>
                <BaseButton
                  type="button"
                  variant="primary"
                  className="py-2.5 px-5 rounded-xl text-xs font-bold h-10"
                  onClick={() => setPreviewSubService(null)}
                >
                  Đóng
                </BaseButton>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
