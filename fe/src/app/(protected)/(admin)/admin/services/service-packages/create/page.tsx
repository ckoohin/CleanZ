"use client";

import React, { useState, useMemo, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, DollarSign, ScrollText,
  Loader2, ChevronRight, CheckCircle2, Info,
  Clock, Moon, PawPrint, Hammer, Timer,
  Search, Plus, X, Check, List, Settings2,
  AlertCircle, Image as ImageIcon,
  Trash2, Zap, Layers, MapPin, BarChart3,
  Edit, Eye, CheckSquare, ExternalLink, Shield, Sparkles, Heart, Star,
  Percent, Calendar, HelpCircle, Users, Home, TrendingUp, TrendingDown, ShoppingCart
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
  useCreateAdminPackage, useAdminServices, useCreateAdminService, useUpdateAdminService, useDeleteAdminService,
  useAddSubServicesToPackage, useCoverageAreas, useUpdateCoverageArea,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { usePeakDays, useCreatePeakDay } from "@/features/admin/hooks/useAdminPricing";
import { adminPricingApi } from "@/features/admin/services/admin-pricing.service";
import { adminServicesApi } from "@/features/admin/modules/service/services/admin-services.service";
import {
  CreateAdminPackageDto, AdminServiceEntity, CoverageAreaEntity, PricingMode,
  ServiceDurationEntity, ServiceAddonEntity, AddonPriceUnit, ServiceSubscriptionEntity, SubscriptionBillingCycle, ServicePeakHourEntity, ServiceSubServiceEntity
} from "@/features/admin/modules/service/services/admin-services.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { adminWorkflowService } from "@/features/admin/modules/service/services/admin-workflow.service";
import { adminPolicyService } from "@/features/admin/modules/policy/services/admin-policy.service";
import { useAdminPolicies } from "@/features/admin/modules/policy/hooks/useAdminPolicies";
import { POLICY_CATEGORY_META, PolicyCategory } from "@/features/admin/modules/policy/types/policy.type";
import { CreateWorkflowStepDto } from "@/features/admin/modules/service/types/workflow.type";
import { ROUTES } from "@/constants/routes";

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Thông tin cơ bản", icon: Package },
  { id: 2, label: "Cấu hình bảng giá", icon: DollarSign },
  { id: 3, label: "Quy trình & Điều khoản", icon: ScrollText },
  { id: 4, label: "Xem lại & Hoàn tất", icon: CheckCircle2 },
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
  id: string;
  name: string;
  isRequired: boolean;
  isDefault: boolean;
  sortOrder: number;
  price: number;
  isActive: boolean;
}

interface CustomSurcharge {
  id: string;
  label: string;
  iconName: string;
  amount: number;
  hint: string;
}

const SURCHARGE_ICONS = [
  { name: "Moon", icon: Moon, label: "Đêm/Sáng sớm" },
  { name: "PawPrint", icon: PawPrint, label: "Thú cưng" },
  { name: "Timer", icon: Timer, label: "Chờ đợi" },
  { name: "Hammer", icon: Hammer, label: "Công cụ mang theo" },
  { name: "Zap", icon: Zap, label: "Phụ thu nhanh" },
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
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  variant: "included" | "excluded";
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
              className="w-3.5 h-3.5 flex items-center justify-center rounded-full opacity-60 hover:opacity-100">
              <X className="w-2 h-2" />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-2 flex-1 min-w-[140px]">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder={value.length === 0 ? placeholder : "Thêm..."}
            className="flex-1 bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground/50 py-1" />
          {input.trim() && (
            <button type="button" onClick={add}
              className={cn("text-xs font-bold px-2 py-0.5 rounded-lg",
                isIncluded ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500")}>
              +Thêm
            </button>
          )}
        </div>
      </div>
      <div className={cn("px-4 py-1.5 border-t text-[10px] opacity-60",
        isIncluded ? "border-emerald-200/40 text-emerald-600" : "border-rose-200/40 text-rose-500")}>
        Enter / dấu phẩy để thêm · Backspace để xoá
      </div>
    </div>
  );
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, description, headerAction, children }: {
  icon: React.ElementType;
  title: string;
  description?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Icon className="w-4 h-4 text-primary" /></div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg">{title}</h3>
            {description && <p className="text-sm font-medium text-slate-600 mt-0.5">{description}</p>}
          </div>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, tooltip, children }: {
  label: React.ReactNode;
  required?: boolean;
  hint?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-extrabold text-slate-800">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
      {hint && <p className="text-xs font-semibold text-slate-700">{hint}</p>}
    </div>
  );
}

function SurchargeField({ icon: Icon, label, hint, value, onChange, suffix = "VND", iconColor = "text-primary" }: {
  icon: React.ElementType;
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  iconColor?: string;
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

function ReviewRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 px-4 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right">{value || "—"}</span>
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
  onStepClick: (id: number) => void;
  validations: Record<number, boolean>;
}) {
  return (
    <div className="flex items-center gap-0 flex-wrap">
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        const isValid = validations[step.id];
        const hasError = done && !isValid;

        return (
          <React.Fragment key={step.id}>
            <button type="button" onClick={() => onStepClick(step.id)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-extrabold shadow-2xs",
                active ? "bg-primary text-white cursor-default"
                : hasError ? "bg-rose-50 text-rose-700 hover:bg-rose-100/80 cursor-pointer border border-rose-200"
                : done ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 cursor-pointer"
                : "text-slate-800 hover:bg-slate-200/50 cursor-pointer")}>
              {hasError ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              ) : done ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <step.icon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:block">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-800 shrink-0 mx-1" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── SubServiceCard ───────────────────────────────────────────────────────────
function SubServiceCard({ svc, isSelected, config, onToggle, onUpdate, onInfo }: {
  svc: AdminServiceEntity;
  isSelected: boolean;
  config?: { price: number; isRequired: boolean; isDefault: boolean; isActive: boolean };
  onToggle: () => void;
  onUpdate: (fields: Partial<{ price: number; isRequired: boolean; isDefault: boolean; isActive: boolean }>) => void;
  onInfo: () => void;
}) {
  const basePrice = svc.pricingConfig?.basePrice ? Number(svc.pricingConfig.basePrice) : 0;
  return (
    <div className={cn(
      "rounded-xl border-2 transition-all duration-200 overflow-hidden",
      isSelected ? "border-primary shadow-md bg-primary/3" : "border-border/40 bg-card hover:border-primary/30 hover:shadow-sm"
    )}>
      {/* ── Header row (always visible) ── */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-muted/40 border border-border/40 shrink-0">
          {svc.thumbnailUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={svc.thumbnailUrl} alt={svc.name} className="w-full h-full object-cover" />
            : <div className="flex h-full items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground/30" /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{svc.name}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold shrink-0">{svc.subServiceCode}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {svc.durationHours && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{svc.durationHours}h</span>}
            {basePrice > 0 && <span className="text-xs text-muted-foreground">Giá gốc: <span className="font-bold text-primary">{vnd(basePrice)}</span></span>}
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
              svc.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
              {svc.isActive ? "Bật" : "Tắt"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button"
            onClick={e => { e.stopPropagation(); onInfo(); }}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Xem chi tiết dịch vụ">
            <Info className="w-3.5 h-3.5" />
          </button>
          <div className={cn("transition-transform duration-200", isSelected ? "rotate-90" : "")}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* ── Expanded config (only when selected) ── */}
      {isSelected && config && (
        <div className="px-4 pb-4 pt-1 border-t border-primary/15 bg-primary/2 space-y-4">
          {/* Description */}
          {svc.shortDescription && (
            <p className="text-xs text-muted-foreground leading-relaxed">{svc.shortDescription}</p>
          )}

          {/* Price input */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs font-bold block mb-1.5">Giá gốc cho gói này (₫)</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={config.price === 0 ? "" : config.price}
                  onChange={e => onUpdate({ price: Number(e.target.value) })}
                  className="h-9 rounded-lg text-sm pr-14"
                  placeholder={basePrice > 0 ? String(basePrice) : "Nhập giá"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₫</span>
              </div>
              {basePrice > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Để trống → dùng giá gốc mặc định <span className="font-bold text-primary">{vnd(basePrice)}</span>
                </p>
              )}
            </div>
            <button type="button" onClick={onToggle}
              className="shrink-0 flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 font-semibold px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors border border-rose-200/60">
              <X className="w-3.5 h-3.5" /> Bỏ chọn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AreaChip ───────────────────────────────────────────────────────────
function AreaChip({ area, selected, onToggle }: {
  area: CoverageAreaEntity;
  selected: boolean;
  onToggle: (id: string) => void;
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

// ─── AreaGroup ───────────────────────────────────────────────────────────
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
        <div className="flex items-center gap-2">
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

  // Group by fee range
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
          <p className="text-sm font-semibold">Không tìm thấy khu vực hoạt động nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AreaGroup title="Quận nội thành (Miễn phí vận chuyển)" areas={inner} color="text-emerald-600" selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />
          <AreaGroup title="Quận/Huyện cận nội thành (Phí ≤ 20K)" areas={near} color="text-blue-600" selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />
          <AreaGroup title="Huyện ngoại thành gần (Phí 20K - 40K)" areas={mid} color="text-amber-600" selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />
          <AreaGroup title="Khu vực ngoại thành xa (Phí > 40K)" areas={far} color="text-rose-600" selected={selected} onToggle={onToggle} onToggleGroup={onToggleGroup} />
        </div>
      )}
    </div>
  );
}

// ─── Custom Surcharge Row ─────────────────────────────────────────────────────
function CustomSurchargeRow({ item, onChange, onRemove }: {
  item: CustomSurcharge;
  onChange: (v: CustomSurcharge) => void;
  onRemove: () => void;
}) {
  const set = (k: keyof CustomSurcharge, v: string | number) => onChange({ ...item, [k]: v });
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-muted/10 border border-border/30 rounded-xl">
      <div className="w-full sm:w-1/3">
        <Input placeholder="Tên phụ phí (VD: Phụ thu tết âm)" value={item.label} onChange={e => set("label", e.target.value)} className="h-9 text-xs rounded-lg" />
      </div>
      <div className="w-full sm:w-1/4">
        <Input placeholder="Mô tả ngắn" value={item.hint} onChange={e => set("hint", e.target.value)} className="h-9 text-xs rounded-lg" />
      </div>
      <div className="w-full sm:w-1/4 flex items-center gap-2">
        <Input inputMode="numeric" value={item.amount === 0 ? "" : String(item.amount)}
          onChange={e => { const d = e.target.value.replace(/\D/g, ""); set("amount", d ? Number(d) : 0); }}
          placeholder="Số tiền" className="h-9 text-xs rounded-lg flex-1" />
        <span className="text-xs text-muted-foreground shrink-0">₫</span>
      </div>
      <div className="w-full sm:w-auto flex justify-between items-center gap-2">
        <Select value={item.iconName} onValueChange={v => set("iconName", v)}>
          <SelectTrigger className="h-9 w-20 rounded-lg text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SURCHARGE_ICONS.map(i => (
              <SelectItem key={i.name} value={i.name}>
                <div className="flex items-center gap-1.5">
                  {React.createElement(i.icon, { className: "w-3.5 h-3.5 text-primary" })}
                  <span className="text-xs">{i.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button type="button" onClick={onRemove} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Workflow Templates ───────────────────────────────────────────────────────
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
  }
];

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function CreatePackagePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createPackage = useCreateAdminPackage();
  const createService = useCreateAdminService();
  const updateService = useUpdateAdminService();
  const deleteService = useDeleteAdminService();
  const addSubServices = useAddSubServicesToPackage();

  const { data: servicesData } = useAdminServices({ limit: 100 });
  const { data: coverageAreas = [] } = useCoverageAreas("Hà Nội");
  const allSubServices = useMemo(() => servicesData?.items ?? [], [servicesData]);

  const [step, setStep] = useState(1);

  // ── STEP 1: Thông tin cơ bản ──
  const [name, setName] = useState("");
  const [packageCode, setPackageCode] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [policyDescription, setPolicyDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ── STEP 2: Cấu hình giá & Phụ phí ──
  const [pricingMode, setPricingMode] = useState<PricingMode>("HOURLY");
  const [maxHours, setMaxHours] = useState(8);
  const [peakRatePercent, setPeakRatePercent] = useState(20);
  const [nightSurcharge, setNightSurcharge] = useState(30000);
  const [petSurcharge, setPetSurcharge] = useState(50000);
  const [waitingSurcharge, setWaitingSurcharge] = useState(15000);
  const [toolFee, setToolFee] = useState(0);
  const [customSurcharges, setCustomSurcharges] = useState<CustomSurcharge[]>([]);

  // ── NEW 5-TAB PRICING STRUCTURE STATES ──
  const [durations, setDurations] = useState<ServiceDurationEntity[]>([
    { durationHours: 2, priceMultiplier: 1.0, isPopular: true, isActive: true, suggestedArea: 55, title: "Căn hộ nhỏ" },
    { durationHours: 3, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 85, title: "Căn hộ trung bình" },
    { durationHours: 4, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 105, title: "Căn hộ lớn" },
  ]);

  const [addons, setAddons] = useState<ServiceAddonEntity[]>([]);
  const [selectedSubServices, setSelectedSubServices] = useState<SelectedSubService[]>([]);
  const [subscriptions, setSubscriptions] = useState<ServiceSubscriptionEntity[]>([]);
  const [peakHours, setPeakHours] = useState<ServicePeakHourEntity[]>([
    { dayOfWeek: 6, startHour: "08:00", endHour: "22:00", multiplier: 1.1, isActive: true },
    { dayOfWeek: 0, startHour: "08:00", endHour: "22:00", multiplier: 1.15, isActive: true },
  ]);

  // Advanced configurations
  const [baseHourlyRate, setBaseHourlyRate] = useState(80000);
  const [premiumHourlyRate, setPremiumHourlyRate] = useState(120000);
  const [allowMultipleTaskers, setAllowMultipleTaskers] = useState(false);
  const [allowSubscription, setAllowSubscription] = useState(false);
  const [allowSingleService, setAllowSingleService] = useState(true);
  const [activeTab, setActiveTab] = useState("durations");

  useEffect(() => {
    if (!allowSubscription && activeTab === "subscriptions") {
      setActiveTab("durations");
    }
    if (!allowSingleService && activeTab === "subservices") {
      setActiveTab("durations");
    }
  }, [allowSubscription, allowSingleService, activeTab]);

  // Helper states for adding new configurations in tabs
  const [newDuration, setNewDuration] = useState({
    durationHours: "",
    priceAdjustment: "0",
    isPopular: false,
    suggestedArea: "",
    taskerCount: "1",
    title: "",
    description: "",
  });
  const [newAddon, setNewAddon] = useState({
    name: "",
    description: "",
    price: "",
    priceUnit: "per_item" as AddonPriceUnit,
    durationMinutes: "",
    maxQuantity: "",
    sortOrder: "",
    isActive: true,
  });
  const [editingAddonIndex, setEditingAddonIndex] = useState<number | null>(null);
  const [editAddonModal, setEditAddonModal] = useState<{
    idx: number; name: string; description: string; price: string;
    priceUnit: AddonPriceUnit; durationMinutes: string; maxQuantity: string;
    sortOrder: string; isActive: boolean;
  } | null>(null);
  const [newSubscription, setNewSubscription] = useState({
    name: "",
    description: "",
    bonusDescription: "",
    discountPercent: "",
    billingCycle: "monthly" as SubscriptionBillingCycle,
    sessionsPerCycle: "",
    commitmentMonths: "",
    isPopular: false,
    sortOrder: "",
    isActive: true,
  });
  const [editingSubscriptionIndex, setEditingSubscriptionIndex] = useState<number | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showAddonPresets, setShowAddonPresets] = useState(false);
  const [viewingAddon, setViewingAddon] = useState<ServiceAddonEntity | null>(null);
  const [detailSvc, setDetailSvc] = useState<AdminServiceEntity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminServiceEntity | null>(null);
  const [crudModal, setCrudModal] = useState<{ open: boolean; mode: "create" | "edit"; svc?: AdminServiceEntity }>({ open: false, mode: "create" });
  const CRUD_EMPTY = { name: "", shortDescription: "", description: "", thumbnailUrl: "", galleryUrl1: "", galleryUrl2: "", durationHours: "", basePrice: "", includedTask: "", excludedTask: "", includedTasks: [] as string[], excludedTasks: [] as string[], isActive: true };
  const [crudForm, setCrudForm] = useState(CRUD_EMPTY);
  const [newPeakHour, setNewPeakHour] = useState({ dayOfWeek: "1", startHour: "08:00", endHour: "22:00", multiplier: "1.1", startDate: "", endDate: "", isActive: true });
  const [editingPeakHourIdx, setEditingPeakHourIdx] = useState<number | null>(null);
  const [editPeakHour, setEditPeakHour] = useState({ dayOfWeek: "1", startHour: "08:00", endHour: "22:00", multiplier: "1.1", startDate: "", endDate: "", isActive: true });
  const [viewingPeakHour, setViewingPeakHour] = useState<(typeof peakHours[number]) | null>(null);

  // Dropdown visibility states for searchable select inputs
  const [isOpenAreaDropdown, setIsOpenAreaDropdown] = useState(false);
  const [isOpenHoursDropdown, setIsOpenHoursDropdown] = useState(false);
  const [isOpenAdjustmentDropdown, setIsOpenAdjustmentDropdown] = useState(false);

  // States for duration full-edit modal
  const [isOpenMetaModal, setIsOpenMetaModal] = useState(false);
  const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [tempHours, setTempHours] = useState("");
  const [tempArea, setTempArea] = useState("");
  const [tempAdjustment, setTempAdjustment] = useState("0");
  const [tempIsPopular, setTempIsPopular] = useState(false);
  const [tempIsActive, setTempIsActive] = useState(true);
  const [tempTaskerCount, setTempTaskerCount] = useState("1");
  const [isOpenTempHoursDropdown, setIsOpenTempHoursDropdown] = useState(false);
  const [isOpenTempAreaDropdown, setIsOpenTempAreaDropdown] = useState(false);
  const [inlineEditingCell, setInlineEditingCell] = useState<{ rowIndex: number; field: 'hours' | 'area' | 'taskerCount' | 'adjustment' } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");
  const [isOpenInlineHoursDropdown, setIsOpenInlineHoursDropdown] = useState(false);
  const [isOpenInlineAreaDropdown, setIsOpenInlineAreaDropdown] = useState(false);
  const [isOpenInlineAdjustmentDropdown, setIsOpenInlineAdjustmentDropdown] = useState(false);
  const [inlineDdRect, setInlineDdRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const captureInlineRect = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setInlineDdRect({ top: r.bottom, left: r.left, width: r.width });
  }, []);
  const [viewingDuration, setViewingDuration] = useState<ServiceDurationEntity | null>(null);

  const handleInlineSave = useCallback((rowIndex: number, field: 'hours' | 'area' | 'taskerCount' | 'adjustment', value: string) => {
    setDurations(prev => {
      return prev.map((d, i) => {
        if (i !== rowIndex) return d;
        const updated = { ...d };
        if (field === 'hours') {
          const val = parseFloat(value);
          if (!isNaN(val) && val > 0 && val <= maxHours) {
            updated.durationHours = val;
          } else {
            toast.error(`Số giờ phải nằm trong khoảng từ 0.1 đến giờ phục vụ tối đa của gói (${maxHours} giờ)!`);
          }
        } else if (field === 'area') {
          const val = parseInt(value, 10);
          if (!isNaN(val) && val >= 0 && val <= 1500) {
            updated.suggestedArea = val || null;
          } else if (value === "") {
            updated.suggestedArea = null;
          } else {
            toast.error("Diện tích phải nằm trong khoảng từ 0 đến 1500!");
          }
        } else if (field === 'taskerCount') {
          const val = parseInt(value, 10);
          if (!isNaN(val) && val >= 1 && val <= 15) {
            updated.taskerCount = val;
          } else {
            toast.error("Số thợ phải nằm trong khoảng từ 1 đến 15!");
          }
        } else if (field === 'adjustment') {
          const val = parseFloat(value);
          if (!isNaN(val)) {
            updated.priceMultiplier = 1 + val / 100;
          } else if (value === "") {
            updated.priceMultiplier = 1.0;
          } else {
            toast.error("Tỉ lệ điều chỉnh giá không hợp lệ!");
          }
        }
        return updated;
      });
    });
    setInlineEditingCell(null);
    setIsOpenInlineHoursDropdown(false);
    setIsOpenInlineAreaDropdown(false);
    setIsOpenInlineAdjustmentDropdown(false);
    setInlineDdRect(null);
  }, [maxHours]);

  // Area options: 55, 75, 95, ... up to 1500
  const areaOptions = useMemo(() => {
    const opts: number[] = [];
    for (let val = 55; val < 1500; val += 20) {
      opts.push(val);
    }
    opts.push(1500);
    return opts;
  }, []);

  // Hour options: 1, 1.5, 2, 2.5, ... up to maxHours
  const hourOptions = useMemo(() => {
    const opts: number[] = [];
    const limit = maxHours > 0 ? maxHours : 24.0;
    for (let h = 1.0; h <= limit; h += 0.5) {
      opts.push(h);
    }
    return opts;
  }, [maxHours]);

  const adjustmentOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: "0", label: "Giá gốc (0%)" }];
    for (let val = -1; val >= -50; val -= 1) {
      opts.push({ value: val.toString(), label: `Giảm ${Math.abs(val)}% (${val}%)` });
    }
    for (let val = 1; val <= 50; val += 1) {
      opts.push({ value: val.toString(), label: `Tăng ${val}% (+${val}%)` });
    }
    return opts;
  }, []);

  // Format decimal hours to detailed hours and minutes representation
  const formatHoursToMinutes = useCallback((hoursStr: string) => {
    const hoursNum = Number(hoursStr);
    if (isNaN(hoursNum) || hoursNum <= 0) return "";
    const h = Math.floor(hoursNum);
    const m = Math.round((hoursNum - h) * 60);
    if (h === 0) return `${m} phút`;
    if (m === 0) return `${h} giờ`;
    return `${h} giờ ${m} phút`;
  }, []);

  const applyTemplate = (type: "hourly" | "deep" | "specialized") => {
    if (type === "hourly") {
      setBaseHourlyRate(80000);
      setPremiumHourlyRate(120000);
      setAllowMultipleTaskers(false);
      setAllowSubscription(true);
      setDurations([
        { durationHours: 2.0, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 55, taskerCount: 1 },
        { durationHours: 3.0, priceMultiplier: 1.0, isPopular: true, isActive: true, suggestedArea: 85, taskerCount: 1 },
        { durationHours: 4.0, priceMultiplier: 0.95, isPopular: false, isActive: true, suggestedArea: 105, taskerCount: 1 },
      ]);
      setSubscriptions([
        { name: "Gói tháng (4 tuần)", description: "Giảm giá đặt chu kỳ ngắn hạn", discountPercent: 5, isActive: true },
        { name: "Gói quý (12 tuần)", description: "Giảm giá đặt chu kỳ dài hạn", discountPercent: 10, isActive: true },
      ]);
      toast.success("Đã áp dụng mẫu Dọn dẹp theo giờ / Định kỳ!");
    } else if (type === "deep") {
      setBaseHourlyRate(120000);
      setPremiumHourlyRate(150000);
      setAllowMultipleTaskers(true);
      setAllowSubscription(false);
      setDurations([
        { durationHours: 4.0, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 100, taskerCount: 2 },
        { durationHours: 6.0, priceMultiplier: 1.0, isPopular: true, isActive: true, suggestedArea: 150, taskerCount: 3 },
        { durationHours: 8.0, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 200, taskerCount: 4 },
      ]);
      setSubscriptions([]);
      toast.success("Đã áp dụng mẫu Tổng vệ sinh (Dọn sâu)!");
    } else if (type === "specialized") {
      setBaseHourlyRate(150000);
      setPremiumHourlyRate(180000);
      setAllowMultipleTaskers(false);
      setAllowSubscription(false);
      setDurations([
        { durationHours: 1.0, priceMultiplier: 1.0, isPopular: true, isActive: true, suggestedArea: 40, taskerCount: 1 },
      ]);
      setSubscriptions([]);
      toast.success("Đã áp dụng mẫu Dịch vụ chuyên sâu!");
    }
  };

  // ── STEP 3: Khu vực phục vụ ──
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  const selectedAreaNames = useMemo(() => {
    if (!coverageAreas || coverageAreas.length === 0) return "";
    return coverageAreas
      .filter(a => selectedAreaIds.includes(a.id))
      .map(a => a.name)
      .join(", ");
  }, [coverageAreas, selectedAreaIds]);

  const updateAreaMutation = useUpdateCoverageArea();
  const [editingArea, setEditingArea] = useState<CoverageAreaEntity | null>(null);
  const [editAreaFee, setEditAreaFee] = useState("");
  const [isUpdatingAreaSaving, setIsUpdatingAreaSaving] = useState(false);

  // ── STEP 4: Điều khoản, Cam kết & Quy trình ──
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [premiumTermsAndConditions, setPremiumTermsAndConditions] = useState("");
  const [commitments, setCommitments] = useState<{ id: string; title: string; content: string; iconName: string }[]>([
    { id: "c1", title: "Cam kết sạch sẽ", content: "Đảm bảo dọn dẹp kỹ lưỡng, sạch sẽ từng ngóc ngách căn phòng.", iconName: "Sparkles" },
    { id: "c2", title: "Nhân viên uy tín", content: "100% nhân viên đã qua đào tạo bài bản và có lý lịch rõ ràng.", iconName: "Shield" },
    { id: "c3", title: "Đền bù đổ vỡ", content: "Cam kết bồi thường thỏa đáng nếu xảy ra rơi vỡ tài sản trong lúc làm.", iconName: "Heart" }
  ]);
  const [newCommitmentTitle, setNewCommitmentTitle] = useState("");
  const [newCommitmentContent, setNewCommitmentContent] = useState("");
  const [newCommitmentIcon, setNewCommitmentIcon] = useState("Shield");
  const [showAddCommitment, setShowAddCommitment] = useState(false);

  // Workflow state
  const [workflowSteps, setWorkflowSteps] = useState<CreateWorkflowStepDto[]>([
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
  ]);
  const [editingWorkflowStepIndex, setEditingWorkflowStepIndex] = useState<number | null>(null);
  
  // State form nhập workflow step
  const [stepTitle, setStepTitle] = useState("");
  const [stepDesc, setStepDesc] = useState("");
  const [stepDuration, setStepDuration] = useState("15");
  const [stepRequired, setStepRequired] = useState(true);
  const [stepChecklist, setStepChecklist] = useState<string[]>([]);
  const [newChecklistVal, setNewChecklistVal] = useState("");

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

  // Sub-services related states
  const [searchSvc, setSearchSvc] = useState("");
  const [subServiceToEditPrice, setSubServiceToEditPrice] = useState<AdminServiceEntity | null>(null);
  const [previewSubService, setPreviewSubService] = useState<AdminServiceEntity | null>(null);
  const [quickPriceType, setQuickPriceType] = useState<"FIXED" | "HOURLY">("FIXED");
  const [quickPriceVal, setQuickPriceVal] = useState("");
  const [quickPricingNote, setQuickPricingNote] = useState("");
  const [isEditingPriceSaving, setIsEditingPriceSaving] = useState(false);

  const canProceedStep1 = name.trim().length >= 2 && packageCode.trim().length >= 3;

  const validations = useMemo(() => ({
    1: name.trim().length >= 2 && packageCode.trim().length >= 3,
    2: baseHourlyRate > 0 && premiumHourlyRate > 0 && durations.length > 0,
    3: workflowSteps.length > 0 && termsAndConditions.trim().length > 0,
    4: true
  }), [name, packageCode, baseHourlyRate, premiumHourlyRate, durations, workflowSteps, termsAndConditions]);

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
    if (exists) {
      setSelectedSubServices(prev => prev.filter(s => s.id !== svc.id));
    } else {
      const defaultPrice = svc.pricingConfig?.basePrice ? Number(svc.pricingConfig.basePrice) : 0;
      setSelectedSubServices(prev => [...prev, {
        id: svc.id,
        name: svc.name,
        isRequired: false,
        isDefault: true,
        sortOrder: prev.length,
        price: defaultPrice,
        isActive: true,
      }]);
    }
  };

  const updateSelected = (id: string, patch: Partial<SelectedSubService>) =>
    setSelectedSubServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const toggleArea = (id: string) => setSelectedAreaIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAllAreas = () => {
    if (coverageAreas.every(a => selectedAreaIds.includes(a.id))) setSelectedAreaIds([]);
    else setSelectedAreaIds(coverageAreas.map(a => a.id));
  };

  const toggleGroupAreas = (groupIds: string[], select: boolean) => {
    setSelectedAreaIds(prev => {
      if (select) {
        const newIds = groupIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      } else {
        return prev.filter(id => !groupIds.includes(id));
      }
    });
  };

  const addCustomSurcharge = () => setCustomSurcharges(prev => [...prev, { id: crypto.randomUUID(), label: "", iconName: "Zap", amount: 0, hint: "" }]);
  const updateCustomSurcharge = (id: string, v: CustomSurcharge) => setCustomSurcharges(prev => prev.map(s => s.id === id ? v : s));
  const removeCustomSurcharge = (id: string) => setCustomSurcharges(prev => prev.filter(s => s.id !== id));

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
          payload: {
            name: configName,
            basePrice: basePriceVal,
          }
        });
        toast.success("Đã cập nhật bảng giá dịch vụ con thành công!");
      } else {
        const newConfig = await adminPricingApi.createPricingConfig({
          name: configName,
          basePrice: basePriceVal,
          description: `Tạo nhanh từ cấu hình dịch vụ con`,
        } as Parameters<typeof adminPricingApi.createPricingConfig>[0]);
        pricingConfigId = newConfig.id;

        await adminServicesApi.updateService({
          id: subServiceToEditPrice.id,
          payload: {
            pricingConfigId,
            pricingType: quickPriceType,
          }
        });
        toast.success("Đã tạo và gán bảng giá mới cho dịch vụ con!");
      }

      // Update in selected list too
      updateSelected(subServiceToEditPrice.id, { price: basePriceVal });

      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      setSubServiceToEditPrice(null);
    } catch (err) {
      toast.error("Có lỗi xảy ra khi cập nhật giá!");
      console.error(err);
    } finally {
      setIsEditingPriceSaving(false);
    }
  };

  const handleSaveDuration = () => {
    const hours = parseFloat(newDuration.durationHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Vui lòng nhập số giờ hợp lệ");
      return;
    }
    if (hours > maxHours) {
      toast.error(`Không được thiết lập giờ vượt quá giờ phục vụ tối đa của gói (${maxHours} giờ). Muốn tăng khung giờ hơn thì hãy đổi giờ phục vụ tối đa cao hơn.`);
      return;
    }
    const adj = parseFloat(newDuration.priceAdjustment) || 0;
    const multi = 1 + adj / 100;

    const area = newDuration.suggestedArea ? Number(newDuration.suggestedArea) : null;
    const taskers = allowMultipleTaskers && newDuration.taskerCount ? Number(newDuration.taskerCount) : 1;

    setDurations(prev => {
      const list = prev.map(d => newDuration.isPopular ? { ...d, isPopular: false } : d);
      return [...list, {
        durationHours: hours,
        priceMultiplier: multi,
        isPopular: newDuration.isPopular,
        isActive: true,
        suggestedArea: area,
        taskerCount: taskers,
        title: newDuration.title.trim() || undefined,
        description: newDuration.description.trim() || undefined,
      }].sort((a, b) => a.durationHours - b.durationHours);
    });

    setNewDuration({ durationHours: "", priceAdjustment: "0", isPopular: false, suggestedArea: "", taskerCount: "1", title: "", description: "" });
    toast.success("Đã thêm thời lượng mới");
  };

  const PEAK_HOUR_QUICK_PRESETS: {
    label: string; icon: React.ElementType; multiplier: string;
    entries?: ServicePeakHourEntity[];
    dayOfWeek?: string; startHour?: string; endHour?: string;
  }[] = [
    { label: "Cuối tuần toàn ngày", icon: Star, multiplier: "1.15", entries: [
      { dayOfWeek: 6, startHour: "08:00", endHour: "22:00", multiplier: 1.15, isActive: true },
      { dayOfWeek: 0, startHour: "08:00", endHour: "22:00", multiplier: 1.15, isActive: true },
    ]},
    { label: "Sáng hàng ngày", icon: TrendingUp, multiplier: "1.1", dayOfWeek: "7", startHour: "07:00", endHour: "09:00" },
    { label: "Trưa hàng ngày", icon: Timer, multiplier: "1.1", dayOfWeek: "7", startHour: "11:00", endHour: "14:00" },
    { label: "Chiều tối hàng ngày", icon: Moon, multiplier: "1.2", dayOfWeek: "7", startHour: "17:00", endHour: "20:00" },
    { label: "Tối hàng ngày", icon: Moon, multiplier: "1.25", dayOfWeek: "7", startHour: "20:00", endHour: "22:00" },
    { label: "Thứ 6 chiều tối", icon: TrendingUp, multiplier: "1.2", dayOfWeek: "5", startHour: "17:00", endHour: "22:00" },
  ];

  const ADDON_PRESETS: { group: string; icon: React.ElementType; items: Omit<ServiceAddonEntity, 'isActive'>[] }[] = [
    {
      group: "Thiết bị gia dụng",
      icon: Zap,
      items: [
        { name: "Vệ sinh máy lạnh", price: 150000, priceUnit: "per_appliance", durationMinutes: 30, description: "Vệ sinh dàn lạnh, dàn nóng, bộ lọc máy lạnh chuyên sâu", sortOrder: 0 },
        { name: "Vệ sinh tủ lạnh", price: 120000, priceUnit: "per_appliance", durationMinutes: 30, description: "Vệ sinh toàn bộ ngăn tủ lạnh, khử mùi", sortOrder: 1 },
        { name: "Vệ sinh máy giặt", price: 120000, priceUnit: "per_appliance", durationMinutes: 30, description: "Vệ sinh lồng giặt, vỏ máy, khay giặt", sortOrder: 2 },
        { name: "Vệ sinh lò vi sóng", price: 80000, priceUnit: "per_appliance", durationMinutes: 20, description: "Lau sạch bên trong và bên ngoài lò vi sóng", sortOrder: 3 },
        { name: "Vệ sinh bếp / máy hút mùi", price: 100000, priceUnit: "per_appliance", durationMinutes: 30, description: "Tẩy dầu mỡ bếp, bộ lọc máy hút mùi", sortOrder: 4 },
      ]
    },
    {
      group: "Lau kính / Cửa sổ",
      icon: Sparkles,
      items: [
        { name: "Lau kính ban công", price: 60000, priceUnit: "per_window", durationMinutes: 15, description: "Lau sạch kính cửa sổ, ban công từ bên trong", sortOrder: 0 },
        { name: "Lau kính ngoài trời", price: 90000, priceUnit: "per_window", durationMinutes: 20, description: "Lau kính mặt ngoài (tầng 2 trở lên)", sortOrder: 1 },
        { name: "Lau cửa kính phòng tắm", price: 50000, priceUnit: "per_window", durationMinutes: 15, description: "Lau sạch cửa kính vách ngăn phòng tắm", sortOrder: 2 },
      ]
    },
    {
      group: "Không gian thêm",
      icon: Home,
      items: [
        { name: "Dọn thêm phòng ngủ", price: 80000, priceUnit: "per_room", durationMinutes: 30, description: "Dọn dẹp thêm mỗi phòng ngủ ngoài gói chuẩn", sortOrder: 0 },
        { name: "Vệ sinh thêm toilet / WC", price: 50000, priceUnit: "per_toilet", durationMinutes: 20, description: "Vệ sinh thêm mỗi phòng tắm / WC", sortOrder: 1 },
        { name: "Dọn thêm tầng", price: 100000, priceUnit: "per_floor", durationMinutes: 30, description: "Dọn dẹp thêm mỗi tầng trong nhà nhiều tầng", sortOrder: 2 },
        { name: "Lau sàn thêm", price: 30000, priceUnit: "per_m2", durationMinutes: 0, description: "Lau sàn khu vực phát sinh thêm ngoài phạm vi gói", sortOrder: 3 },
      ]
    },
    {
      group: "Đồ nội thất",
      icon: Heart,
      items: [
        { name: "Giặt ghế sofa", price: 80000, priceUnit: "per_sofa_seat", durationMinutes: 20, description: "Giặt hút mỗi chỗ ngồi sofa bằng máy chuyên dụng", sortOrder: 0 },
        { name: "Thay ga trải giường", price: 50000, priceUnit: "per_bed", durationMinutes: 15, description: "Thay ga gối, drap giường sạch", sortOrder: 1 },
        { name: "Giặt thảm", price: 120000, priceUnit: "per_m2", durationMinutes: 30, description: "Giặt hút thảm trải sàn bằng máy chuyên dụng", sortOrder: 2 },
      ]
    },
    {
      group: "Giặt ủi",
      icon: Layers,
      items: [
        { name: "Giặt ủi theo kg", price: 30000, priceUnit: "per_kg", durationMinutes: 0, description: "Giặt sấy và ủi quần áo theo trọng lượng", sortOrder: 0 },
        { name: "Giặt ủi theo bộ", price: 25000, priceUnit: "per_set", durationMinutes: 0, description: "Giặt ủi theo từng bộ trang phục", sortOrder: 1 },
      ]
    },
  ];

  const ADDON_PRICE_UNIT_LABELS: Record<AddonPriceUnit, string> = {
    per_item: "Theo dịch vụ",
    per_session: "Theo buổi",
    per_hour: "Theo giờ",
    per_room: "Theo phòng",
    per_floor: "Theo tầng",
    per_toilet: "Theo phòng tắm",
    per_m2: "Theo m²",
    per_window: "Theo cửa/kính",
    per_appliance: "Theo thiết bị",
    per_bed: "Theo giường",
    per_sofa_seat: "Theo chỗ ngồi sofa",
    per_kg: "Theo kg",
    per_set: "Theo bộ",
    fixed: "Cố định",
  };

  const resetNewAddon = () => setNewAddon({
    name: "", description: "", price: "", priceUnit: "per_item",
    durationMinutes: "", maxQuantity: "", sortOrder: "", isActive: true,
  });

  const handleSaveAddon = () => {
    if (!newAddon.name.trim()) {
      toast.error("Vui lòng nhập tên dịch vụ thêm");
      return;
    }
    const priceVal = Number(newAddon.price);
    if (isNaN(priceVal) || priceVal < 0) {
      toast.error("Đơn giá không hợp lệ");
      return;
    }
    const durationVal = newAddon.durationMinutes ? Number(newAddon.durationMinutes) : null;
    if (newAddon.durationMinutes && (isNaN(durationVal!) || durationVal! < 0)) {
      toast.error("Thời gian thực hiện không hợp lệ");
      return;
    }
    const maxQtyVal = newAddon.maxQuantity ? Number(newAddon.maxQuantity) : null;
    if (newAddon.maxQuantity && (isNaN(maxQtyVal!) || maxQtyVal! < 1)) {
      toast.error("Số lượng tối đa phải từ 1 trở lên");
      return;
    }

    const addonEntry: ServiceAddonEntity = {
      name: newAddon.name.trim(),
      description: newAddon.description.trim() || undefined,
      price: priceVal,
      priceUnit: newAddon.priceUnit,
      durationMinutes: durationVal,
      maxQuantity: maxQtyVal,
      sortOrder: newAddon.sortOrder ? Number(newAddon.sortOrder) : undefined,
      isActive: newAddon.isActive,
    };

    setAddons(prev => [...prev, addonEntry]);
    toast.success("Đã thêm dịch vụ thêm");
    resetNewAddon();
  };

  const handleEditAddon = (i: number) => {
    const a = addons[i];
    setEditAddonModal({
      idx: i,
      name: a.name,
      description: a.description ?? "",
      price: String(a.price),
      priceUnit: a.priceUnit ?? "per_item",
      durationMinutes: a.durationMinutes != null ? String(a.durationMinutes) : "",
      maxQuantity: a.maxQuantity != null ? String(a.maxQuantity) : "",
      sortOrder: a.sortOrder != null ? String(a.sortOrder) : "",
      isActive: a.isActive,
    });
  };

  const BILLING_CYCLE_LABELS: Record<SubscriptionBillingCycle, string> = {
    weekly: "Hàng tuần",
    biweekly: "2 tuần/lần",
    monthly: "Hàng tháng",
    quarterly: "Hàng quý",
    yearly: "Hàng năm",
  };

  const SUBSCRIPTION_PRESETS: { label: string; data: Partial<typeof newSubscription> }[] = [
    { label: "Gói tuần", data: { name: "Gói tuần (4 buổi/tháng)", billingCycle: "weekly", sessionsPerCycle: "4", commitmentMonths: "1", discountPercent: "5", description: "Tiết kiệm 5% khi đặt theo tuần" } },
    { label: "Gói tháng", data: { name: "Gói tháng (4 buổi)", billingCycle: "monthly", sessionsPerCycle: "4", commitmentMonths: "1", discountPercent: "10", description: "Tiết kiệm 10% khi đăng ký gói tháng" } },
    { label: "Gói quý", data: { name: "Gói quý (12 buổi)", billingCycle: "quarterly", sessionsPerCycle: "12", commitmentMonths: "3", discountPercent: "15", description: "Tiết kiệm 15% khi cam kết 3 tháng", isPopular: true } },
    { label: "Gói năm", data: { name: "Gói năm (48 buổi)", billingCycle: "yearly", sessionsPerCycle: "48", commitmentMonths: "12", discountPercent: "20", description: "Tiết kiệm 20% khi cam kết cả năm", bonusDescription: "Tặng 2 buổi dọn sâu miễn phí/năm" } },
  ];

  const resetNewSubscription = () => setNewSubscription({
    name: "", description: "", bonusDescription: "", discountPercent: "",
    billingCycle: "monthly", sessionsPerCycle: "", commitmentMonths: "",
    isPopular: false, sortOrder: "", isActive: true,
  });

  const handleSaveSubscription = () => {
    if (!newSubscription.name.trim()) {
      toast.error("Vui lòng nhập tên gói tháng");
      return;
    }
    const discount = Number(newSubscription.discountPercent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      toast.error("Phần trăm giảm giá phải từ 0 đến 100");
      return;
    }

    const entry: ServiceSubscriptionEntity = {
      name: newSubscription.name.trim(),
      description: newSubscription.description.trim() || undefined,
      bonusDescription: newSubscription.bonusDescription.trim() || undefined,
      discountPercent: discount,
      billingCycle: newSubscription.billingCycle,
      sessionsPerCycle: newSubscription.sessionsPerCycle ? Number(newSubscription.sessionsPerCycle) : null,
      commitmentMonths: newSubscription.commitmentMonths ? Number(newSubscription.commitmentMonths) : null,
      isPopular: newSubscription.isPopular,
      sortOrder: newSubscription.sortOrder ? Number(newSubscription.sortOrder) : 0,
      isActive: newSubscription.isActive,
    };

    if (editingSubscriptionIndex !== null) {
      setSubscriptions(prev => prev.map((s, i) => i === editingSubscriptionIndex ? { ...s, ...entry } : s));
      setEditingSubscriptionIndex(null);
      toast.success("Đã cập nhật gói tháng");
    } else {
      setSubscriptions(prev => [...prev, entry]);
      toast.success("Đã thêm cấu hình gói tháng");
    }
    resetNewSubscription();
    setShowSubscriptionModal(false);
  };

  const handleEditSubscription = (i: number) => {
    const s = subscriptions[i];
    setNewSubscription({
      name: s.name,
      description: s.description ?? "",
      bonusDescription: s.bonusDescription ?? "",
      discountPercent: String(s.discountPercent),
      billingCycle: s.billingCycle ?? "monthly",
      sessionsPerCycle: s.sessionsPerCycle != null ? String(s.sessionsPerCycle) : "",
      commitmentMonths: s.commitmentMonths != null ? String(s.commitmentMonths) : "",
      isPopular: s.isPopular ?? false,
      sortOrder: s.sortOrder != null ? String(s.sortOrder) : "",
      isActive: s.isActive,
    });
    setEditingSubscriptionIndex(i);
    setShowSubscriptionModal(true);
  };

  const openCrudCreate = () => { setCrudForm(CRUD_EMPTY); setCrudModal({ open: true, mode: "create" }); };

  const openCrudEdit = (svc: AdminServiceEntity) => {
    const currentPrice = selectedSubServices.find(s => s.id === svc.id)?.price;
    setCrudForm({
      name: svc.name, shortDescription: svc.shortDescription ?? "", description: svc.description ?? "",
      thumbnailUrl: svc.thumbnailUrl ?? "", galleryUrl1: svc.galleryUrls?.[0] ?? "", galleryUrl2: svc.galleryUrls?.[1] ?? "",
      durationHours: svc.durationHours != null ? String(svc.durationHours) : "",
      basePrice: currentPrice ? String(currentPrice) : (svc.pricingConfig?.basePrice ? String(svc.pricingConfig.basePrice) : ""),
      includedTask: "", excludedTask: "", includedTasks: svc.includedTasks ?? [], excludedTasks: svc.excludedTasks ?? [],
      isActive: svc.isActive,
    });
    setCrudModal({ open: true, mode: "edit", svc });
  };

  const handleCrudSubmit = async () => {
    if (!crudForm.name.trim()) { toast.error("Vui lòng nhập tên dịch vụ"); return; }
    const gallery = [crudForm.galleryUrl1, crudForm.galleryUrl2].filter(Boolean);
    const priceVal = crudForm.basePrice ? Number(crudForm.basePrice) : 0;
    const payload = {
      name: crudForm.name.trim(), shortDescription: crudForm.shortDescription.trim() || undefined,
      description: crudForm.description.trim() || undefined, thumbnailUrl: crudForm.thumbnailUrl.trim() || undefined,
      galleryUrls: gallery.length ? gallery : undefined,
      durationHours: crudForm.durationHours ? Number(crudForm.durationHours) : undefined,
      basePrice: priceVal > 0 ? priceVal : undefined,
      includedTasks: crudForm.includedTasks.length ? crudForm.includedTasks : undefined,
      excludedTasks: crudForm.excludedTasks.length ? crudForm.excludedTasks : undefined,
      isActive: crudForm.isActive,
    };
    if (crudModal.mode === "create") {
      const created = await createService.mutateAsync(payload);
      // auto-add to selected list with the entered base price
      setSelectedSubServices(prev => [...prev, { id: created.id, name: created.name, price: priceVal, isRequired: false, isDefault: false, sortOrder: 0, isActive: true }]);
    } else if (crudModal.svc) {
      await updateService.mutateAsync({ id: crudModal.svc.id, payload });
      // update price if already selected
      setSelectedSubServices(prev => prev.map(s => s.id === crudModal.svc!.id ? { ...s, price: priceVal } : s));
      if (detailSvc?.id === crudModal.svc.id) setDetailSvc(null);
    }
    setCrudModal({ open: false, mode: "create" }); setCrudForm(CRUD_EMPTY);
  };

  const handleDeleteSvc = async (svc: AdminServiceEntity) => {
    await deleteService.mutateAsync(svc.id);
    setDeleteConfirm(null);
    setDetailSvc(null);
    setSelectedSubServices(prev => prev.filter(s => s.id !== svc.id));
  };

  const handleSavePeakHour = () => {
    const day = Number(newPeakHour.dayOfWeek);
    const mult = parseFloat(newPeakHour.multiplier);
    if (isNaN(mult) || mult < 1) {
      toast.error("Hệ số nhân phải từ 1.0 trở lên");
      return;
    }
    if (!newPeakHour.startHour || !newPeakHour.endHour) {
      toast.error("Vui lòng chọn khung giờ");
      return;
    }

    setPeakHours(prev => [...prev, {
      dayOfWeek: day,
      startHour: newPeakHour.startHour,
      endHour: newPeakHour.endHour,
      multiplier: mult,
      startDate: newPeakHour.startDate || null,
      endDate: newPeakHour.endDate || null,
      isActive: newPeakHour.isActive,
    }]);

    setNewPeakHour({ dayOfWeek: "1", startHour: "08:00", endHour: "22:00", multiplier: "1.1", startDate: "", endDate: "", isActive: true });
    toast.success("Đã thêm khung giờ cao điểm");
  };

  const handleSubmit = async () => {
    if (!name.trim() || !packageCode.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
      return;
    }
    if (allowSubscription && subscriptions.length === 0) {
      toast.error("Bạn đã kích hoạt 'Cho phép gói tháng'. Vui lòng cấu hình ít nhất một chu kỳ ưu đãi gói tháng tại Tab Gói tháng!");
      setStep(2);
      return;
    }
    try {
      const payload: CreateAdminPackageDto = {
        name: name.trim(),
        packageCode: packageCode.trim().toUpperCase(),
        iconUrl: iconUrl || undefined,
        galleryUrls: galleryUrls.filter(Boolean),
        sortOrder,
        isActive,
        maxHours,
        pricingMode,
        nightSurcharge,
        petSurcharge,
        waitingSurcharge,
        toolFee,
        peakRatePercent,
        termsAndConditions: (() => {
          const std = termsAndConditions.trim();
          const prem = premiumTermsAndConditions.trim();
          if (!prem) return std || undefined;
          return `${std}\n--- PREMIUM ---\n${prem}`;
        })(),
        policyDescription: policyDescription.trim() || undefined,
        coverageAreaIds: coverageAreas.length > 0 ? coverageAreas.map(a => a.id) : undefined,
        
        baseHourlyRate: Number(baseHourlyRate),
        premiumHourlyRate: Number(premiumHourlyRate),
        allowMultipleTaskers,
        allowSubscription,
        allowSingleService,

        durations: durations.map(d => ({
          durationHours: d.durationHours,
          priceMultiplier: d.priceMultiplier,
          isPopular: d.isPopular,
          isActive: d.isActive,
          suggestedArea: d.suggestedArea ? Number(d.suggestedArea) : null,
          taskerCount: d.taskerCount ? Number(d.taskerCount) : 1,
          title: d.title || undefined,
          description: d.description || undefined,
        })),
        
        addons: addons.map(a => ({
          name: a.name,
          description: a.description,
          price: a.price,
          priceUnit: a.priceUnit,
          durationMinutes: a.durationMinutes,
          maxQuantity: a.maxQuantity,
          sortOrder: a.sortOrder,
          isActive: a.isActive,
        })),
        
        subscriptions: subscriptions.map(s => ({
          name: s.name,
          description: s.description,
          bonusDescription: s.bonusDescription,
          discountPercent: s.discountPercent,
          billingCycle: s.billingCycle,
          sessionsPerCycle: s.sessionsPerCycle,
          commitmentMonths: s.commitmentMonths,
          isPopular: s.isPopular,
          sortOrder: s.sortOrder,
          isActive: s.isActive,
        })),
        
        peakHours: peakHours.map(p => ({
          dayOfWeek: p.dayOfWeek,
          startHour: p.startHour,
          endHour: p.endHour,
          multiplier: p.multiplier,
          startDate: p.startDate || null,
          endDate: p.endDate || null,
          isActive: p.isActive,
        })),

        subServices: selectedSubServices.map(s => ({
          subServiceId: s.id,
          price: s.price,
          isActive: s.isActive,
        })),
      };

      const pkg = await createPackage.mutateAsync(payload);

      if (selectedSubServices.length > 0) {
        await addSubServices.mutateAsync({
          packageId: pkg.id,
          subServices: selectedSubServices.map(s => ({
            id: s.id,
            isRequired: s.isRequired,
            isDefault: s.isDefault,
            sortOrder: s.sortOrder
          })),
        });
      }

      if (workflowSteps.length > 0) {
        await adminWorkflowService.create({
          name: `Quy trình thực hiện - ${pkg.name}`,
          description: `Quy trình dịch vụ của gói ${pkg.name}`,
          packageId: pkg.id,
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

      if (selectedPolicyIds.length > 0) {
        await adminPolicyService.assignToPackage(pkg.id, selectedPolicyIds);
      }

      toast.success("Tạo gói dịch vụ thành công!");
      router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.BASE);
    } catch (e: unknown) {
      const error = e as { 
        response?: { 
          data?: { 
            message?: string; 
            errors?: { message?: string } 
          } 
        } 
      };
      const errMsg = error?.response?.data?.errors?.message || error?.response?.data?.message || "Có lỗi xảy ra!";
      toast.error(errMsg);
    }
  };

  const isSubmitting = createPackage.isPending || addSubServices.isPending;

  return (
    <div className="space-y-6 w-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BaseButton variant="outline" size="icon" onClick={() => router.push("/admin/services")}
          className="rounded-full h-10 w-10 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </BaseButton>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-800 font-bold">Quản lý Gói Dịch vụ</p>
          <h1 className="text-2xl font-black text-foreground leading-tight">Tạo gói dịch vụ mới</h1>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <StepIndicator current={step} onStepClick={setStep} validations={validations} />
        <span className="text-xs text-slate-800 font-black">Bước {step} / {STEPS.length}</span>
      </div>

      {/* STEP 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-5">
          <SectionCard icon={Package} title="Thông tin cơ bản" description="Tên, mã code và hình ảnh đại diện của gói">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tên gói dịch vụ" required hint="VD: Dọn dẹp nhà cửa, Tổng vệ sinh...">
                  <Input placeholder="Dọn dẹp nhà cửa" value={name}
                    onChange={e => handleNameChange(e.target.value)} className="h-11 rounded-xl" />
                </Field>
                <Field label="Mã gói (Package Code)" required hint="Tự động tạo, có thể chỉnh sửa">
                  <Input placeholder="PKG-DON-DEP-NHA" value={packageCode}
                    onChange={e => setPackageCode(e.target.value.toUpperCase())}
                    className="h-11 rounded-xl font-mono" />
                </Field>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Ảnh đại diện gói<span className="text-xs text-slate-800 font-bold ml-2">Thumbnail hiển thị trên card</span></Label>
                <ImageUpload value={iconUrl} onChange={setIconUrl} onRemove={() => setIconUrl("")} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">Ảnh gallery phụ<span className="text-xs text-slate-800 font-bold ml-2">Nhiều ảnh cho trang chi tiết</span></Label>
                <MultipleImageUpload value={galleryUrls.filter(Boolean)} onChange={setGalleryUrls} />
              </div>

              <Field label="Mô tả chính sách" hint="Mô tả ngắn hiển thị trong thẻ gói dịch vụ">
                <Textarea placeholder="Gói dọn dẹp nhà cửa chuyên nghiệp, phù hợp cho căn hộ dưới 80m²..."
                  value={policyDescription} onChange={e => setPolicyDescription(e.target.value)}
                  rows={3} className="rounded-xl text-sm resize-none" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Thứ tự hiển thị" hint="Số nhỏ hơn = hiển thị trước">
                  <Input inputMode="numeric" value={sortOrder === 0 ? "" : String(sortOrder)}
                    onChange={e => { const d = e.target.value.replace(/\D/g, ""); setSortOrder(d ? Number(d) : 0); }}
                    className="h-11 rounded-xl" />
                </Field>
                <Field label="Trạng thái hoạt động">
                  <div className="flex items-center gap-3 h-11">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <span className={cn("text-sm font-semibold", isActive ? "text-emerald-600" : "text-muted-foreground")}>
                      {isActive ? "Kích hoạt ngay" : "Lưu nháp"}
                    </span>
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <BaseButton variant="primary" disabled={!canProceedStep1} onClick={() => setStep(2)}
              className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Bảng giá & Thiết lập nâng cao <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 2: 5-Tab pricing configurations */}
      {step === 2 && (
        <div className="space-y-5">
          <SectionCard icon={Settings2} title="Thiết lập nâng cao & Đơn giá giờ" description="Cấu hình hệ thống đơn giá mặc định và các chế độ phân phối dịch vụ">
            {/* Quick Templates Selection */}
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                <Sparkles className="w-4 h-4 text-slate-700" />
                Áp dụng nhanh cấu hình giá mẫu chuẩn
              </p>
              <div className="flex flex-wrap gap-2.5">
                <BaseButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate("hourly")}
                  className="h-9 px-4 text-xs font-extrabold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" /> Mẫu Dọn Dẹp Thường (Theo Giờ / Định Kỳ)
                </BaseButton>
                <BaseButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate("deep")}
                  className="h-9 px-4 text-xs font-extrabold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" /> Mẫu Tổng Vệ Sinh (Dọn Sâu)
                </BaseButton>
                <BaseButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate("specialized")}
                  className="h-9 px-4 text-xs font-extrabold rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" /> Mẫu Sofa / Máy Lạnh / Máy Giặt
                </BaseButton>
              </div>
            </div>

            {/* BẮT BUỘC THIẾT LẬP ĐẦU TIÊN - Alert Banner */}
            <div className="mb-5 p-3.5 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-2.5 shadow-sm">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-slate-800 font-bold">
                <span className="text-primary font-black uppercase mr-1">👉 BẮT BUỘC THIẾT LẬP ĐẦU TIÊN:</span>
                Vui lòng nhập <strong className="text-slate-900 font-extrabold underline">Đơn giá giờ Chuẩn</strong> và <strong className="text-slate-900 font-extrabold underline">Đơn giá giờ Premium</strong> dưới đây trước. Hai đơn giá giờ cốt lõi này là nền tảng cơ sở dùng để nhân với số giờ phục vụ của tất cả các mốc dịch vụ tiếp theo.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field
                label={<span className="text-xs font-black text-slate-900">Đơn giá giờ Chuẩn (₫)</span>}
                required
                hint="Giá mỗi giờ của ca làm việc thường"
                tooltip="Giá tiền mặc định cho mỗi giờ làm việc của một thợ trong ca thường. Được dùng làm đơn giá cốt lõi để nhân với số giờ của mốc dịch vụ khi tính giá cơ bản cho khách hàng."
              >
                <Input inputMode="numeric" value={baseHourlyRate === 0 ? "" : String(baseHourlyRate)} onChange={e => { const d = e.target.value.replace(/\D/g, ""); setBaseHourlyRate(d ? Number(d) : 0); }} className="h-10 rounded-lg border-slate-300 font-bold" />
                {baseHourlyRate > 0 && <p className="text-sm font-black text-slate-900 mt-1">{vnd(baseHourlyRate)} / giờ</p>}
              </Field>
              <Field
                label={<span className="text-xs font-black text-slate-900">Đơn giá giờ Premium (₫)</span>}
                required
                hint="Giá giờ cho dịch vụ cao cấp / làm gấp"
                tooltip="Đơn giá áp dụng khi khách hàng chọn dịch vụ Cao cấp (Premium) hoặc ca đặc biệt. Giá trị mang lại: (1) Chất lượng thợ tối ưu: Chỉ thợ xuất sắc (sao từ 4.8★ trở lên, thâm niên cao, ít hủy ca) mới được nhận việc; (2) VIP Matching: Đơn được đẩy lên ưu tiên hiển thị trước để thợ nhận ngay, đảm bảo 100% có người làm; (3) Làm gấp & Ngoài giờ: Áp dụng khi đặt sát giờ (dưới 2h) hoặc sáng sớm/tối muộn; (4) Dụng cụ nâng cấp: Thợ mang theo hóa chất sinh học chuyên dụng cao cấp."
              >
                <Input inputMode="numeric" value={premiumHourlyRate === 0 ? "" : String(premiumHourlyRate)} onChange={e => { const d = e.target.value.replace(/\D/g, ""); setPremiumHourlyRate(d ? Number(d) : 0); }} className="h-10 rounded-lg border-slate-300 font-bold" />
                {premiumHourlyRate > 0 && <p className="text-sm font-black text-slate-900 mt-1">{vnd(premiumHourlyRate)} / giờ</p>}
              </Field>
              <Field
                label={<span className="text-xs font-black text-slate-900">Giờ phục vụ tối đa (giờ)</span>}
                required
                hint="Số giờ tối đa khách có thể đặt"
                tooltip="Thời lượng phục vụ tối đa cho một đơn hàng của gói này. Mặc định là 8 giờ."
              >
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={maxHours === 0 ? "" : String(maxHours)}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setMaxHours(val ? val : 0);
                  }}
                  className="h-10 rounded-lg border-slate-300 font-bold"
                />
                {maxHours > 0 && <p className="text-sm font-black text-slate-900 mt-1">{maxHours} giờ</p>}
              </Field>
              <div className="flex flex-col gap-2.5 p-3.5 bg-muted/20 border border-border/40 rounded-xl justify-center">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-slate-900">Cho phép nhiều thợ</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg">
                        Cho phép phân phối một đơn hàng cho nhiều thợ cùng làm việc song song (ví dụ: tổng vệ sinh nhà lớn). Bạn sẽ cấu hình số lượng thợ mặc định ở bước thiết lập thời lượng chi tiết.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch checked={allowMultipleTaskers} onCheckedChange={setAllowMultipleTaskers} />
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-normal">Cho phép phân phối một đơn hàng cho nhiều thợ cùng làm việc</p>
              </div>
              <div className="flex flex-col gap-2.5 p-3.5 bg-muted/20 border border-border/40 rounded-lg justify-center">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-slate-900">Cho phép gói tháng</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg">
                        Cho phép khách hàng đặt lịch dọn dẹp định kỳ (lặp lại theo tuần/tháng). Hệ thống sẽ mở thêm tab cấu hình giá ưu đãi dành riêng cho gói tháng.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch checked={allowSubscription} onCheckedChange={setAllowSubscription} />
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-normal">Kích hoạt tính năng đăng ký theo tháng/định kỳ cho gói này</p>
              </div>

              <div className="flex flex-col gap-2.5 p-3.5 bg-muted/20 border border-border/40 rounded-lg justify-center">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-slate-900">Cho phép dịch vụ lẻ</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg">
                        Cho phép khách hàng đặt từng lần riêng lẻ (không cần đăng ký gói). Tắt nếu gói chỉ dành riêng cho đặt theo gói tháng.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch checked={allowSingleService} onCheckedChange={setAllowSingleService} />
                </div>
                <p className="text-xs font-semibold text-slate-700 leading-normal">Kích hoạt chế độ đặt dịch vụ lẻ theo từng lần</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={DollarSign} title="Cấu hình chi tiết bảng giá dịch vụ" description="Thiết lập các thông số tính toán chi phí, tùy chọn dịch vụ, các mức thời lượng và các gói thành viên.">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={cn(
                "grid grid-cols-2 w-full bg-slate-200/60 p-1 rounded-lg mb-4 gap-1 h-auto",
                (allowSubscription && allowSingleService) ? "md:grid-cols-6"
                  : (allowSubscription || allowSingleService) ? "md:grid-cols-5"
                  : "md:grid-cols-4"
              )}>
                <TabsTrigger value="durations" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group">
                  <Clock className="w-3.5 h-3.5 mr-1.5 transition-colors text-primary group-data-[state=active]:text-white" />
                  Thời lượng
                </TabsTrigger>
                <TabsTrigger value="addons" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group">
                  <Plus className="w-3.5 h-3.5 mr-1.5 transition-colors text-primary group-data-[state=active]:text-white" />
                  Dịch vụ thêm
                </TabsTrigger>
                {allowSingleService && (
                  <TabsTrigger value="subservices" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group">
                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5 transition-colors text-primary group-data-[state=active]:text-white" />
                    Dịch vụ lẻ
                  </TabsTrigger>
                )}
                {allowSubscription && (
                  <TabsTrigger value="subscriptions" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group">
                    <Calendar className="w-3.5 h-3.5 mr-1.5 transition-colors text-primary group-data-[state=active]:text-white" />
                    Gói tháng
                  </TabsTrigger>
                )}
                <TabsTrigger value="peakhours" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group">
                  <Zap className="w-3.5 h-3.5 mr-1.5 transition-colors text-primary group-data-[state=active]:text-white" />
                  Cao điểm
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: DURATIONS */}
              <TabsContent value="durations" className="space-y-4">
                <div className="p-4 bg-muted/10 border border-border/30 rounded-lg space-y-4">
                  <p className="text-xs font-bold text-slate-800">Thêm mốc thời lượng làm việc & Thiết lập bảng giá tương ứng</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
                    <Field
                      label={
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>Số giờ</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                              Tổng số giờ làm việc cho ca dọn dẹp ở mốc này. Ví dụ: 2 giờ, 3.5 giờ. Tối đa 24 giờ. Bạn có thể chọn từ danh sách gợi ý hoặc tự nhập số lẻ (ví dụ: 2.2, 2.1).
                            </TooltipContent>
                          </Tooltip>
                          {newDuration.durationHours && (
                            <span className="text-[10px] text-primary font-black ml-1.5 bg-primary/10 px-1.5 py-0.5 rounded inline-flex items-center shrink-0">
                              {formatHoursToMinutes(newDuration.durationHours)}
                            </span>
                          )}
                        </div>
                      }
                      required
                      hint="Ví dụ: 2, 3.5"
                    >
                      <div className="relative">
                        <Input
                          inputMode="decimal"
                          placeholder="2"
                          value={newDuration.durationHours}
                          onChange={e => {
                            const v = e.target.value;
                            if (/^\d*\.?\d*$/.test(v)) {
                              setNewDuration(p => ({ ...p, durationHours: v }));
                            }
                          }}
                          onFocus={() => setIsOpenHoursDropdown(true)}
                          onBlur={() => setTimeout(() => setIsOpenHoursDropdown(false), 200)}
                          className={cn("h-10 pr-8 font-bold placeholder:text-slate-400/60 placeholder:font-normal", isOpenHoursDropdown ? "rounded-t-lg rounded-b-none border-b-transparent" : "rounded-lg")}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        {isOpenHoursDropdown && (
                          <div className="absolute z-50 w-full max-h-80 overflow-y-auto bg-white border border-slate-200 border-t-slate-100 rounded-b-lg shadow-lg">
                            {hourOptions
                              .filter(opt => opt.toString().includes(newDuration.durationHours || ""))
                              .map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onMouseDown={() => setNewDuration(p => ({ ...p, durationHours: opt.toString() }))}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                                >
                                  {opt} giờ ({opt * 60} phút)
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </Field>
 
                    <Field
                      label={
                        <div className="flex items-center gap-1">
                          <span>Diện tích mặc định (m²)</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                              Diện tích căn hộ/nhà gợi ý phù hợp với mốc thời lượng dọn dẹp này. Giới hạn tối đa 1500m². Bạn có thể nhập tự do hoặc tìm kiếm chọn từ danh sách (bắt đầu từ 55m², tăng dần 20m²).
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      }
                      hint="Gợi ý diện tích dọn"
                    >
                      <div className="relative">
                        <Input
                          inputMode="numeric"
                          placeholder="55"
                          value={newDuration.suggestedArea}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, "");
                            setNewDuration(p => ({ ...p, suggestedArea: v }));
                          }}
                          onFocus={() => setIsOpenAreaDropdown(true)}
                          onBlur={() => setTimeout(() => setIsOpenAreaDropdown(false), 200)}
                          className={cn("h-10 pr-8 font-bold placeholder:text-slate-400/60 placeholder:font-normal", isOpenAreaDropdown ? "rounded-t-lg rounded-b-none border-b-transparent" : "rounded-lg")}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        {isOpenAreaDropdown && (
                          <div className="absolute z-50 w-full max-h-80 overflow-y-auto bg-white border border-slate-200 border-t-slate-100 rounded-b-lg shadow-lg">
                            {areaOptions
                              .filter(opt => opt.toString().includes(newDuration.suggestedArea || ""))
                              .map(opt => (
                                <button
                                  key={opt}
                                  type="button"
                                  onMouseDown={() => setNewDuration(p => ({ ...p, suggestedArea: opt.toString() }))}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                                >
                                  {opt} m²
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </Field>
 
                    {allowMultipleTaskers && (
                      <Field
                        label={
                          <div className="flex items-center gap-1">
                            <span>Số lượng thợ</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                                Số lượng thợ dọn dẹp tối thiểu/mặc định được phân công phục vụ cho mốc thời lượng này. Mặc định là 1 thợ, cấu hình tối đa là 15 thợ.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        }
                        hint="Số thợ làm mốc này"
                      >
                        <Select
                          value={newDuration.taskerCount}
                          onValueChange={v => setNewDuration(p => ({ ...p, taskerCount: v }))}
                        >
                          <SelectTrigger className="h-10 rounded-lg font-bold border-slate-300 bg-white">
                            <SelectValue placeholder="1 thợ" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(n => (
                              <SelectItem key={n} value={n.toString()} className="font-semibold text-xs cursor-pointer">
                                {n} thợ
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
 
                    <Field
                      label={
                        <div className="flex items-center gap-1">
                          <span>Tăng/Giảm giá (%)</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                              Tỷ lệ % điều chỉnh giá so với đơn giá gốc chuẩn. Ví dụ: -5 = giảm 5% giá trị của mốc này (khuyến khích đặt mốc dài); 10 = tăng 10% giá trị của mốc này.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      }
                      required
                      hint="Chọn hoặc nhập phần trăm tăng/giảm giá"
                    >
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="0"
                          value={
                            isOpenAdjustmentDropdown
                              ? newDuration.priceAdjustment
                              : adjustmentOptions.find(o => o.value === newDuration.priceAdjustment)?.label || (newDuration.priceAdjustment ? `${newDuration.priceAdjustment}%` : "Giá gốc (0%)")
                          }
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9.-]/g, "");
                            setNewDuration(p => ({ ...p, priceAdjustment: val }));
                          }}
                          onFocus={() => setIsOpenAdjustmentDropdown(true)}
                          onBlur={() => setTimeout(() => setIsOpenAdjustmentDropdown(false), 200)}
                          className="h-10 rounded-lg pr-8 font-bold"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <Search className="w-3.5 h-3.5" />
                        </div>
                        {isOpenAdjustmentDropdown && (
                          <div className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                            {adjustmentOptions
                              .filter(opt =>
                                opt.label.toLowerCase().includes((newDuration.priceAdjustment || "").toLowerCase()) ||
                                opt.value.includes(newDuration.priceAdjustment || "")
                              )
                              .map(opt => (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onMouseDown={() => setNewDuration(p => ({ ...p, priceAdjustment: opt.value }))}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                                >
                                  {opt.label}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </Field>

                    <Field
                      label={<span className="opacity-0 select-none">-</span>}
                      hint=" "
                    >
                      <div className="flex items-center gap-2.5 h-10">
                        <Switch checked={newDuration.isPopular} onCheckedChange={v => setNewDuration(p => ({ ...p, isPopular: v }))} />
                        <div className="flex items-center gap-1">
                          <Label className="text-xs font-bold cursor-pointer">Phổ biến</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                              Đánh dấu mốc thời lượng này là lựa chọn được khuyên dùng hoặc đặt nhiều nhất. Trên giao diện của khách hàng, mốc này sẽ hiển thị kèm nhãn &apos;Phổ biến&apos; và được tự động chọn sẵn để định hướng người dùng đặt lịch nhanh hơn.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </Field>

                    <Field
                      label={<span className="opacity-0 select-none">-</span>}
                      hint=" "
                    >
                      <BaseButton
                        type="button"
                        variant={newDuration.title ? "primary" : "outline"}
                        onClick={() => {
                          setTempTitle(newDuration.title || "");
                          setTempDescription(newDuration.description || "");
                          setTempHours(newDuration.durationHours || "");
                          setTempArea(newDuration.suggestedArea || "");
                          setTempAdjustment(newDuration.priceAdjustment || "0");
                          setTempIsPopular(newDuration.isPopular || false);
                          setTempTaskerCount(newDuration.taskerCount || "1");
                          setIsOpenMetaModal(true);
                        }}
                        className={cn(
                          "h-10 text-xs font-extrabold w-full rounded-lg gap-1.5 transition-all shadow-2xs border-slate-300",
                          newDuration.title
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:text-white"
                            : "hover:bg-slate-50 text-slate-700 bg-white"
                        )}
                      >
                        <ScrollText className="w-3.5 h-3.5" />
                        {newDuration.title ? "Đã có tiêu đề" : "Tiêu đề & Mô tả"}
                      </BaseButton>
                    </Field>
                  </div>

                  <BaseButton type="button" onClick={handleSaveDuration} className="h-10 rounded-lg font-bold bg-primary text-white w-full">
                    + Thêm mốc thời lượng
                  </BaseButton>

                  {/* Estimated price output */}
                  {Number(newDuration.durationHours) > 0 && baseHourlyRate > 0 && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-bold text-slate-700 flex flex-col gap-2">
                      <div className="text-slate-800 font-bold">
                        Dự toán giá của mốc này:
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-slate-200/60 p-2.5 rounded-lg">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Tiêu chuẩn (Standard)</p>
                          <p className="text-sm font-black text-slate-800">
                            {vnd(Number(newDuration.durationHours) * baseHourlyRate * (1 + (Number(newDuration.priceAdjustment) || 0) / 100))}
                          </p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-lg">
                          <p className="text-[10px] text-primary font-bold uppercase mb-0.5">Cao cấp (Premium)</p>
                          <p className="text-sm font-black text-primary">
                            {vnd(Number(newDuration.durationHours) * premiumHourlyRate * (1 + (Number(newDuration.priceAdjustment) || 0) / 100))}
                          </p>
                        </div>
                      </div>
                      {Number(newDuration.priceAdjustment) !== 0 && (
                        <p className="text-[10px] text-slate-500 font-medium">
                          * Đã áp dụng tỷ lệ {Number(newDuration.priceAdjustment) < 0 ? `giảm ${Math.abs(Number(newDuration.priceAdjustment))}%` : `tăng ${Number(newDuration.priceAdjustment)}%`} so với đơn giá gốc chuẩn.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {durations.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs bg-muted/5 border border-dashed border-border/40 rounded-lg">
                    Chưa có cấu hình mốc thời lượng nào. Hãy tạo ít nhất một mốc để áp dụng.
                  </div>
                ) : (
                  <div className="border border-border/30 rounded-lg overflow-hidden bg-card shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/30 text-slate-800 uppercase font-extrabold tracking-wider text-[11px]">
                          <th className="py-3.5 px-4">Số giờ làm việc</th>
                          {allowMultipleTaskers && <th className="py-3.5 px-4 text-center">Số lượng thợ</th>}
                          <th className="py-3.5 px-4 text-center">Diện tích mặc định</th>
                          <th className="py-3.5 px-4 text-center">Đơn giá ước tính</th>
                          <th className="py-3.5 px-4 text-center">Điều chỉnh giá</th>
                          <th className="py-3.5 px-4 text-center">Phổ biến</th>
                          <th className="py-3.5 px-4 text-center">Trạng thái</th>
                          <th className="py-3.5 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {durations.map((d, i) => (
                          <tr key={i} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-4 select-none min-w-[140px]" onDoubleClick={() => {
                              setInlineEditingCell({ rowIndex: i, field: 'hours' });
                              setInlineEditValue(d.durationHours.toString());
                            }}>
                              {inlineEditingCell?.rowIndex === i && inlineEditingCell.field === 'hours' ? (
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    max={24}
                                    value={inlineEditValue}
                                    onChange={e => setInlineEditValue(e.target.value)}
                                    onFocus={e => { captureInlineRect(e); setIsOpenInlineHoursDropdown(true); }}
                                    onBlur={() => setTimeout(() => setIsOpenInlineHoursDropdown(false), 200)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleInlineSave(i, 'hours', inlineEditValue);
                                      if (e.key === 'Escape') setInlineEditingCell(null);
                                    }}
                                    autoFocus
                                    className="h-8 py-0.5 text-xs font-bold w-24 pr-6"
                                  />
                                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Search className="w-3 h-3" />
                                  </div>
                                </div>
                              ) : (
                                <div className="cursor-pointer group flex items-center gap-1" title="Nhấp đúp chuột để sửa nhanh">
                                  <div>
                                    <div className="font-bold text-slate-800">{d.durationHours} giờ</div>
                                    {d.title && <div className="text-[10px] font-extrabold text-primary mt-0.5">{d.title}</div>}
                                    {d.description && <div className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5 max-w-[200px] truncate" title={d.description}>{d.description}</div>}
                                  </div>
                                  <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                                </div>
                              )}
                            </td>
                            {allowMultipleTaskers && (
                              <td className="py-3 px-4 text-center select-none min-w-[100px]" onDoubleClick={() => {
                                setInlineEditingCell({ rowIndex: i, field: 'taskerCount' });
                                setInlineEditValue(d.taskerCount ? d.taskerCount.toString() : "1");
                              }}>
                                {inlineEditingCell?.rowIndex === i && inlineEditingCell.field === 'taskerCount' ? (
                                  <Select
                                    value={inlineEditValue}
                                    onValueChange={v => {
                                      setInlineEditValue(v);
                                      handleInlineSave(i, 'taskerCount', v);
                                    }}
                                    open={true}
                                    onOpenChange={open => {
                                      if (!open) setInlineEditingCell(null);
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs font-bold w-20 mx-auto bg-white border-slate-300">
                                      <SelectValue placeholder="1 thợ" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(n => (
                                        <SelectItem key={n} value={n.toString()} className="font-semibold text-xs cursor-pointer">
                                          {n} thợ
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="cursor-pointer group flex items-center justify-center gap-1" title="Nhấp đúp chuột để sửa nhanh">
                                    <span>{d.taskerCount || 1} thợ</span>
                                    <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="py-3 px-4 text-center select-none min-w-[120px]" onDoubleClick={() => {
                              setInlineEditingCell({ rowIndex: i, field: 'area' });
                              setInlineEditValue(d.suggestedArea ? d.suggestedArea.toString() : "");
                            }}>
                              {inlineEditingCell?.rowIndex === i && inlineEditingCell.field === 'area' ? (
                                <div className="relative">
                                  <Input
                                    type="number"
                                    max={1500}
                                    value={inlineEditValue}
                                    onChange={e => setInlineEditValue(e.target.value)}
                                    onFocus={e => { captureInlineRect(e); setIsOpenInlineAreaDropdown(true); }}
                                    onBlur={() => setTimeout(() => setIsOpenInlineAreaDropdown(false), 200)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleInlineSave(i, 'area', inlineEditValue);
                                      if (e.key === 'Escape') setInlineEditingCell(null);
                                    }}
                                    autoFocus
                                    className="h-8 py-0.5 text-xs font-bold text-center w-24 pr-6 mx-auto"
                                  />
                                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Search className="w-3 h-3" />
                                  </div>
                                </div>
                              ) : (
                                <div className="cursor-pointer group flex items-center justify-center gap-1" title="Nhấp đúp chuột để sửa nhanh">
                                  <span>{d.suggestedArea ? `${d.suggestedArea} m²` : "—"}</span>
                                  <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <p className="font-black text-slate-700 text-xs">{vnd(d.durationHours * baseHourlyRate * d.priceMultiplier)}</p>
                              <p className="text-[10px] text-primary font-bold mt-0.5">{vnd(d.durationHours * premiumHourlyRate * d.priceMultiplier)} <span className="text-primary/60 font-semibold">Premium</span></p>
                            </td>
                            <td className="py-3 px-4 text-center select-none min-w-[150px]" onDoubleClick={() => {
                              setInlineEditingCell({ rowIndex: i, field: 'adjustment' });
                              setInlineEditValue(d.priceMultiplier ? Math.round((d.priceMultiplier - 1) * 100).toString() : "0");
                            }}>
                              {inlineEditingCell?.rowIndex === i && inlineEditingCell.field === 'adjustment' ? (
                                <div className="relative">
                                  <Input
                                    type="text"
                                    value={
                                      isOpenInlineAdjustmentDropdown
                                        ? inlineEditValue
                                        : adjustmentOptions.find(o => o.value === inlineEditValue)?.label || (inlineEditValue ? `${inlineEditValue}%` : "Giá gốc (0%)")
                                    }
                                    onChange={e => {
                                      const val = e.target.value.replace(/[^0-9.-]/g, "");
                                      setInlineEditValue(val);
                                    }}
                                    onFocus={e => { captureInlineRect(e); setIsOpenInlineAdjustmentDropdown(true); }}
                                    onBlur={() => setTimeout(() => setIsOpenInlineAdjustmentDropdown(false), 200)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleInlineSave(i, 'adjustment', inlineEditValue);
                                      if (e.key === 'Escape') setInlineEditingCell(null);
                                    }}
                                    autoFocus
                                    className="h-8 py-0.5 text-xs font-bold text-center w-28 pr-6 mx-auto"
                                  />
                                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Search className="w-3 h-3" />
                                  </div>
                                </div>
                              ) : (
                                <div className="cursor-pointer group flex items-center justify-center gap-1" title="Nhấp đúp chuột để sửa nhanh">
                                  <span>
                                    {d.priceMultiplier === 1.0 ? (
                                      <span className="text-slate-500 font-semibold">Giá gốc</span>
                                    ) : d.priceMultiplier < 1.0 ? (
                                      <span className="text-emerald-600 font-black">Giảm {Math.round((1 - d.priceMultiplier) * 100)}%</span>
                                    ) : (
                                      <span className="text-amber-600 font-black">Tăng {Math.round((d.priceMultiplier - 1) * 100)}%</span>
                                    )}
                                  </span>
                                  <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {d.isPopular ? <Badge className="bg-orange-500 text-white text-[8px] rounded-sm px-1.5 py-0.5">Phổ biến</Badge> : "Không"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Switch checked={d.isActive} onCheckedChange={v => setDurations(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                            </td>
                             <td className="py-3 px-4 text-right">
                               <div className="flex items-center justify-end gap-1.5">
                                 <button
                                   type="button"
                                   onClick={() => setViewingDuration(d)}
                                   className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                   title="Xem chi tiết đầy đủ thông tin"
                                 >
                                   <Eye className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setEditingDurationIndex(i);
                                     setTempHours(d.durationHours.toString());
                                     setTempArea(d.suggestedArea ? d.suggestedArea.toString() : "");
                                     setTempAdjustment(Math.round((d.priceMultiplier - 1) * 100).toString());
                                     setTempIsPopular(d.isPopular || false);
                                     setTempIsActive(d.isActive ?? true);
                                     setTempTaskerCount(d.taskerCount ? d.taskerCount.toString() : "1");
                                     setTempTitle(d.title || "");
                                     setTempDescription(d.description || "");
                                     setIsOpenMetaModal(true);
                                    }}
                                   className="p-1.5 rounded-lg hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors"
                                   title="Chỉnh sửa mốc thời lượng"
                                 >
                                   <Edit className="w-3.5 h-3.5" />
                                 </button>
                                 <button type="button" onClick={() => setDurations(prev => prev.filter((_, idx) => idx !== i))}
                                   className="p-1.5 rounded-lg hover:bg-destructive/10 text-slate-500 hover:text-destructive transition-colors">
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: ADDONS */}
              <TabsContent value="addons" className="space-y-4">

                {/* ── Chọn nhanh từ thư viện preset ── */}
                <div className="border border-border/40 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowAddonPresets(p => !p)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-extrabold text-slate-800">Thêm nhanh từ thư viện dịch vụ phổ biến</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                        {ADDON_PRESETS.reduce((acc, g) => acc + g.items.length, 0)} mẫu
                      </span>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 text-slate-500 transition-transform", showAddonPresets && "rotate-90")} />
                  </button>

                  {showAddonPresets && (
                    <div className="p-4 space-y-4 border-t border-border/30 bg-white">
                      {ADDON_PRESETS.map((group) => (
                        <div key={group.group}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <group.icon className="w-3.5 h-3.5 text-primary/70" />
                            <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">{group.group}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {group.items.map((preset) => {
                              const alreadyAdded = addons.some(a => a.name === preset.name);
                              return (
                                <button
                                  key={preset.name}
                                  type="button"
                                  disabled={alreadyAdded}
                                  onClick={() => {
                                    if (alreadyAdded) return;
                                    setAddons(prev => [...prev, { ...preset, isActive: true }]);
                                    toast.success(`Đã thêm "${preset.name}"`);
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all",
                                    alreadyAdded
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default opacity-70"
                                      : "border-border/50 bg-white hover:border-primary hover:bg-primary/5 hover:text-primary text-slate-700 cursor-pointer shadow-2xs"
                                  )}
                                >
                                  {alreadyAdded
                                    ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                    : <Plus className="w-3 h-3 shrink-0" />
                                  }
                                  <span>{preset.name}</span>
                                  <span className={cn("font-bold ml-0.5", alreadyAdded ? "text-emerald-600" : "text-primary")}>
                                    {vnd(preset.price)}
                                  </span>
                                  <span className="text-[10px] opacity-60 shrink-0">/{ADDON_PRICE_UNIT_LABELS[preset.priceUnit as AddonPriceUnit]?.replace("Theo ", "")}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Form thêm addon ── */}
                <div className="p-4 border rounded-2xl space-y-4 bg-muted/10 border-border/30">
                  <p className="text-xs font-bold text-foreground">Thêm dịch vụ thêm tuỳ chỉnh</p>

                  {/* Row 1: Tên + Đơn giá + Đơn vị tính */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Tên dịch vụ thêm" required>
                      <Input placeholder="Lau kính ban công" value={newAddon.name}
                        onChange={e => setNewAddon(p => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Đơn giá phụ thu (₫)" required
                      hint={newAddon.price ? vnd(Number(newAddon.price)) : undefined}>
                      <Input inputMode="numeric" placeholder="50000" value={newAddon.price}
                        onChange={e => { const d = e.target.value.replace(/\D/g, ""); setNewAddon(p => ({ ...p, price: d })); }}
                        className="h-10 rounded-xl font-bold" />
                    </Field>
                    <Field label="Đơn vị tính" tooltip="Cách tính giá cho mỗi đơn vị khách chọn">
                      <Select value={newAddon.priceUnit} onValueChange={v => setNewAddon(p => ({ ...p, priceUnit: v as AddonPriceUnit }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_item">Theo dịch vụ (mỗi lần)</SelectItem>
                          <SelectItem value="per_session">Theo buổi</SelectItem>
                          <SelectItem value="per_hour">Theo giờ</SelectItem>
                          <SelectItem value="per_room">Theo phòng</SelectItem>
                          <SelectItem value="per_floor">Theo tầng</SelectItem>
                          <SelectItem value="per_toilet">Theo phòng tắm / WC</SelectItem>
                          <SelectItem value="per_m2">Theo m²</SelectItem>
                          <SelectItem value="per_window">Theo cửa / kính</SelectItem>
                          <SelectItem value="per_appliance">Theo thiết bị</SelectItem>
                          <SelectItem value="per_bed">Theo giường</SelectItem>
                          <SelectItem value="per_sofa_seat">Theo chỗ ngồi sofa</SelectItem>
                          <SelectItem value="per_kg">Theo kg (giặt ủi)</SelectItem>
                          <SelectItem value="per_set">Theo bộ</SelectItem>
                          <SelectItem value="fixed">Cố định</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Row 2: Cấu hình bổ sung */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Thời gian thêm (phút)" tooltip="Thời gian phát sinh thêm khi khách chọn addon này">
                      <div className="relative">
                        <Input inputMode="numeric" placeholder="30" value={newAddon.durationMinutes}
                          onChange={e => setNewAddon(p => ({ ...p, durationMinutes: e.target.value.replace(/\D/g, "") }))}
                          className="h-10 rounded-xl pr-10" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-semibold">phút</span>
                      </div>
                      {newAddon.durationMinutes && Number(newAddon.durationMinutes) > 0 && (
                        <p className="text-[10px] text-primary font-bold mt-0.5">
                          {Math.floor(Number(newAddon.durationMinutes) / 60) > 0 ? `${Math.floor(Number(newAddon.durationMinutes) / 60)} giờ ` : ""}
                          {Number(newAddon.durationMinutes) % 60 > 0 ? `${Number(newAddon.durationMinutes) % 60} phút` : ""}
                        </p>
                      )}
                    </Field>
                    <Field label="Số lượng tối đa" tooltip="Để trống = không giới hạn số lượng khách có thể chọn">
                      <Input inputMode="numeric" placeholder="∞ Không giới hạn" value={newAddon.maxQuantity}
                        onChange={e => setNewAddon(p => ({ ...p, maxQuantity: e.target.value.replace(/\D/g, "") }))}
                        className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Thứ tự hiển thị" tooltip="Số nhỏ hơn hiển thị trước trong danh sách addon cho khách">
                      <Input inputMode="numeric" placeholder="0" value={newAddon.sortOrder}
                        onChange={e => setNewAddon(p => ({ ...p, sortOrder: e.target.value.replace(/\D/g, "") }))}
                        className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Trạng thái">
                      <div className="flex items-center gap-2 h-10 px-3 border border-border/40 rounded-xl bg-background">
                        <Switch checked={newAddon.isActive} onCheckedChange={v => setNewAddon(p => ({ ...p, isActive: v }))} />
                        <span className={cn("text-xs font-semibold", newAddon.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                          {newAddon.isActive ? "Đang bật" : "Đã tắt"}
                        </span>
                      </div>
                    </Field>
                  </div>

                  {/* Row 3: Mô tả */}
                  <Field label="Mô tả chi tiết">
                    <Input placeholder="Mô tả ngắn về dịch vụ thêm này..." value={newAddon.description}
                      onChange={e => setNewAddon(p => ({ ...p, description: e.target.value }))} className="h-10 rounded-xl" />
                  </Field>

                  <div className="flex items-center justify-between">
                    {newAddon.name && newAddon.price ? (
                      <p className="text-xs text-slate-600 font-semibold">
                        Giá hiển thị: <span className="text-primary font-black">{vnd(Number(newAddon.price))}</span>
                        <span className="text-slate-400"> / {ADDON_PRICE_UNIT_LABELS[newAddon.priceUnit]?.replace("Theo ", "")}</span>
                      </p>
                    ) : <div />}
                    <BaseButton type="button" onClick={handleSaveAddon}
                      className="h-10 rounded-xl font-bold text-white px-6 bg-primary">
                      + Thêm dịch vụ thêm
                    </BaseButton>
                  </div>
                </div>

                {/* ── Danh sách addons ── */}
                {addons.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl space-y-2">
                    <Plus className="w-8 h-8 mx-auto text-muted-foreground/30" />
                    <p className="font-semibold">Chưa có dịch vụ thêm nào.</p>
                    <p>Chọn nhanh từ thư viện bên trên hoặc tự điền form.</p>
                  </div>
                ) : (
                  <div className="border border-border/30 rounded-xl overflow-hidden bg-card shadow-2xs">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                        {addons.length} dịch vụ thêm
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {addons.filter(a => a.isActive).length} đang bật · {addons.filter(a => !a.isActive).length} đã tắt
                      </span>
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border/30 text-slate-700 uppercase font-extrabold tracking-wider text-[10px]">
                          <th className="py-3 px-4">Tên dịch vụ</th>
                          <th className="py-3 px-4 text-right">Đơn giá</th>
                          <th className="py-3 px-4 text-center">Đơn vị</th>
                          <th className="py-3 px-4 text-center">T.Gian</th>
                          <th className="py-3 px-4 text-center">Tối đa</th>
                          <th className="py-3 px-4 text-center">Bật/Tắt</th>
                          <th className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {addons.map((a, i) => (
                          <tr key={i} className="transition-colors group hover:bg-muted/10">
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground">{a.name}</div>
                              {a.description && <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[220px] truncate">{a.description}</div>}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-primary whitespace-nowrap">{vnd(a.price)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary whitespace-nowrap">
                                {ADDON_PRICE_UNIT_LABELS[a.priceUnit ?? "per_item"]}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {a.durationMinutes ? `+${a.durationMinutes} phút` : "—"}
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {a.maxQuantity != null ? `≤ ${a.maxQuantity}` : "∞"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Switch checked={a.isActive}
                                onCheckedChange={v => setAddons(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <button type="button" onClick={() => setViewingAddon(a)}
                                  title="Xem chi tiết"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-slate-700 transition-colors">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => handleEditAddon(i)}
                                  title="Chỉnh sửa"
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => {
                                  setAddons(prev => prev.filter((_, idx) => idx !== i));
                                  if (editAddonModal?.idx === i) setEditAddonModal(null);
                                }}
                                  title="Xoá"
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: DỊCH VỤ LẺ */}
              {allowSingleService && <TabsContent value="subservices" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-foreground">Chọn dịch vụ lẻ và nhập giá gốc riêng cho từng dịch vụ trong gói này</p>
                    <button type="button" onClick={openCrudCreate}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm">
                      <Plus className="w-3.5 h-3.5" /> Tạo dịch vụ lẻ mới
                    </button>
                  </div>
                  
                  {/* Search and Select Sub Services */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Tìm kiếm nhanh dịch vụ con..." value={searchSvc}
                      onChange={e => setSearchSvc(e.target.value)} className="h-10 rounded-xl pl-9 text-sm" />
                  </div>
                  
                  {selectedSubServices.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Đã chọn <span className="font-bold text-primary">{selectedSubServices.length}</span> dịch vụ lẻ — nhấn vào thẻ để chỉnh sửa chi tiết
                    </p>
                  )}

                  {filteredSvcs.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">
                      <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />Không tìm thấy dịch vụ con nào phù hợp.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredSvcs.map(svc => {
                        const sel = selectedSubServices.find(s => s.id === svc.id);
                        return (
                          <SubServiceCard key={svc.id} svc={svc}
                            isSelected={!!sel}
                            config={sel ? { price: sel.price, isRequired: sel.isRequired, isDefault: sel.isDefault, isActive: sel.isActive } : undefined}
                            onToggle={() => toggleSelect(svc)}
                            onUpdate={fields => updateSelected(svc.id, fields)}
                            onInfo={() => setDetailSvc(svc)} />
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>}

              {/* TAB 4: SUBSCRIPTIONS */}
              <TabsContent value="subscriptions" className="space-y-4">
                {/* Quick presets */}
                <div className="flex flex-wrap gap-2 p-3 bg-emerald-50/60 border border-emerald-200/50 rounded-xl">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide self-center mr-1">Thêm nhanh:</span>
                  {SUBSCRIPTION_PRESETS.map(preset => (
                    <button key={preset.label} type="button"
                      onClick={() => { setNewSubscription(p => ({ ...p, ...preset.data })); setShowSubscriptionModal(true); }}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-xs">
                      {preset.label}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => { resetNewSubscription(); setEditingSubscriptionIndex(null); setShowSubscriptionModal(true); }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs ml-auto">
                    + Thêm gói mới
                  </button>
                </div>

                {/* Dialog thêm/sửa gói định kỳ */}
                <Dialog open={showSubscriptionModal} onOpenChange={open => {
                  setShowSubscriptionModal(open);
                  if (!open) { setEditingSubscriptionIndex(null); resetNewSubscription(); }
                }}>
                  <DialogContent className="w-full sm:max-w-2xl rounded-2xl p-0 bg-card border border-border overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                      <DialogTitle className="text-base font-black flex items-center gap-2">
                        {editingSubscriptionIndex !== null
                          ? <><span className="text-amber-500">✎</span> Chỉnh sửa gói định kỳ</>
                          : <><span className="text-emerald-500">＋</span> Thêm cấu hình gói định kỳ</>}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Cấu hình gói đăng ký định kỳ — khách hàng chọn gói này để đặt dịch vụ với ưu đãi giảm giá theo chu kỳ.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
                      {/* Block 1: Tên & chu kỳ */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Thông tin cơ bản</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label="Tên gói định kỳ" required tooltip="Tên hiển thị với khách hàng, nên ngắn gọn và rõ ràng. Ví dụ: Gói quý (12 buổi)">
                            <Input placeholder="Gói quý (12 buổi)" value={newSubscription.name}
                              onChange={e => setNewSubscription(p => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" />
                          </Field>
                          <Field label="Chu kỳ thanh toán" tooltip="Khách sẽ bị tính phí và gia hạn theo chu kỳ này. Chọn phù hợp với mô hình dịch vụ.">
                            <Select value={newSubscription.billingCycle} onValueChange={v => setNewSubscription(p => ({ ...p, billingCycle: v as SubscriptionBillingCycle }))}>
                              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Hàng tuần (7 ngày)</SelectItem>
                                <SelectItem value="biweekly">2 tuần/lần (14 ngày)</SelectItem>
                                <SelectItem value="monthly">Hàng tháng (30 ngày)</SelectItem>
                                <SelectItem value="quarterly">Hàng quý (90 ngày)</SelectItem>
                                <SelectItem value="yearly">Hàng năm (365 ngày)</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </div>

                      {/* Block 2: Giới hạn & cam kết */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Giới hạn & Cam kết</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label="Số buổi/chu kỳ" tooltip="Tổng số buổi dọn được gộp trong 1 chu kỳ. Ví dụ: gói tháng 4 buổi = mỗi tuần 1 buổi. Để trống nếu không giới hạn.">
                            <Select value={newSubscription.sessionsPerCycle || "custom"}
                              onValueChange={v => setNewSubscription(p => ({ ...p, sessionsPerCycle: v === "custom" ? "" : v }))}>
                              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Chọn số buổi..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 buổi/chu kỳ</SelectItem>
                                <SelectItem value="2">2 buổi/chu kỳ</SelectItem>
                                <SelectItem value="4">4 buổi/chu kỳ</SelectItem>
                                <SelectItem value="6">6 buổi/chu kỳ</SelectItem>
                                <SelectItem value="8">8 buổi/chu kỳ</SelectItem>
                                <SelectItem value="10">10 buổi/chu kỳ</SelectItem>
                                <SelectItem value="12">12 buổi/chu kỳ</SelectItem>
                                <SelectItem value="16">16 buổi/chu kỳ</SelectItem>
                                <SelectItem value="20">20 buổi/chu kỳ</SelectItem>
                                <SelectItem value="24">24 buổi/chu kỳ</SelectItem>
                                <SelectItem value="48">48 buổi/chu kỳ</SelectItem>
                                <SelectItem value="custom">Không giới hạn</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Cam kết tối thiểu (tháng)" tooltip="Số tháng khách phải duy trì gói trước khi có thể huỷ. Dùng để hạn chế huỷ sớm và bảo vệ doanh thu. Để trống nếu không cam kết.">
                            <Select value={newSubscription.commitmentMonths || "none"}
                              onValueChange={v => setNewSubscription(p => ({ ...p, commitmentMonths: v === "none" ? "" : v }))}>
                              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Chọn cam kết..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Không cam kết</SelectItem>
                                <SelectItem value="1">1 tháng</SelectItem>
                                <SelectItem value="2">2 tháng</SelectItem>
                                <SelectItem value="3">3 tháng</SelectItem>
                                <SelectItem value="4">4 tháng</SelectItem>
                                <SelectItem value="6">6 tháng</SelectItem>
                                <SelectItem value="12">12 tháng</SelectItem>
                                <SelectItem value="24">24 tháng</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                      </div>

                      {/* Block 3: Ưu đãi */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Ưu đãi & Giảm giá</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Field label="Giảm giá (%)" required tooltip="Phần trăm giảm so với giá đặt lẻ từng buổi. Ví dụ: 15 nghĩa là khách được giảm 15% tổng hóa đơn.">
                            <div className="relative">
                              <Input type="number" min="0" max="100" placeholder="15" value={newSubscription.discountPercent}
                                onChange={e => setNewSubscription(p => ({ ...p, discountPercent: e.target.value }))} className="h-10 rounded-xl pr-10" />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                            </div>
                          </Field>
                          <Field label="Thứ tự hiển thị" tooltip="Vị trí sắp xếp trên giao diện khách hàng. Số nhỏ hơn hiển thị trước. Để trống = mặc định 0.">
                            <Select value={newSubscription.sortOrder || "0"}
                              onValueChange={v => setNewSubscription(p => ({ ...p, sortOrder: v }))}>
                              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                                  <SelectItem key={n} value={String(n)}>Vị trí {n}{n === 0 ? " (đầu tiên)" : ""}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <Field label="Mô tả ưu đãi" tooltip="Câu mô tả ngắn hiển thị dưới tên gói, nêu bật lợi ích chính. Ví dụ: Tiết kiệm 15% khi cam kết 3 tháng.">
                            <textarea
                              rows={2}
                              placeholder="Tiết kiệm 15% khi cam kết 3 tháng dọn dẹp định kỳ..."
                              value={newSubscription.description}
                              onChange={e => setNewSubscription(p => ({ ...p, description: e.target.value }))}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </Field>
                          <Field label="Ưu đãi thêm (Bonus)" tooltip="Quyền lợi bổ sung ngoài giảm giá. Ví dụ: Tặng 1 buổi dọn sâu miễn phí mỗi quý, ưu tiên đặt lịch giờ vàng.">
                            <textarea
                              rows={2}
                              placeholder="Tặng 2 buổi dọn sâu miễn phí/năm..."
                              value={newSubscription.bonusDescription}
                              onChange={e => setNewSubscription(p => ({ ...p, bonusDescription: e.target.value }))}
                              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </Field>
                        </div>
                      </div>

                      {/* Block 4: Cài đặt hiển thị */}
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Cài đặt hiển thị</p>
                        <div className="grid grid-cols-2 gap-4">
                          <Field label="Phổ biến" tooltip="Đánh dấu badge 'Phổ biến' trên thẻ gói này. Chỉ nên chọn 1 gói phổ biến nhất để tránh loãng.">
                            <div className="flex items-center gap-3 h-10 px-3 bg-muted/20 rounded-xl border border-border/40">
                              <Switch checked={newSubscription.isPopular} onCheckedChange={v => setNewSubscription(p => ({ ...p, isPopular: v }))} />
                              <div>
                                <p className="text-xs font-bold">{newSubscription.isPopular ? "Đang hiện badge" : "Không hiển thị"}</p>
                                <p className="text-[10px] text-muted-foreground">badge &quot;Phổ biến&quot;</p>
                              </div>
                            </div>
                          </Field>
                          <Field label="Trạng thái" tooltip="Bật thì khách hàng có thể nhìn thấy và chọn gói này. Tắt để tạm ẩn mà không xoá.">
                            <div className="flex items-center gap-3 h-10 px-3 bg-muted/20 rounded-xl border border-border/40">
                              <Switch checked={newSubscription.isActive} onCheckedChange={v => setNewSubscription(p => ({ ...p, isActive: v }))} />
                              <div>
                                <p className="text-xs font-bold">{newSubscription.isActive ? "Đang bật" : "Đã tắt"}</p>
                                <p className="text-[10px] text-muted-foreground">{newSubscription.isActive ? "Khách hàng thấy" : "Tạm ẩn"}</p>
                              </div>
                            </div>
                          </Field>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-border/40 flex gap-3">
                      <button type="button" onClick={() => { setShowSubscriptionModal(false); setEditingSubscriptionIndex(null); resetNewSubscription(); }}
                        className="flex-1 h-10 rounded-xl border border-border/40 text-sm font-semibold hover:bg-muted/40 transition-colors">
                        Huỷ
                      </button>
                      <BaseButton type="button" onClick={handleSaveSubscription}
                        className={cn("flex-1 h-10 rounded-xl font-bold text-white",
                          editingSubscriptionIndex !== null ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700")}>
                        {editingSubscriptionIndex !== null ? "Lưu thay đổi" : "Thêm gói định kỳ"}
                      </BaseButton>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Bảng */}
                {subscriptions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                    Chưa có cấu hình gói tháng nào. Dùng preset hoặc nhấn &quot;+ Thêm gói mới&quot;.
                  </div>
                ) : (
                  <div className="border border-border/30 rounded-xl overflow-hidden bg-card shadow-2xs">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{subscriptions.length} gói định kỳ</span>
                      <span className="text-[10px] text-muted-foreground">{subscriptions.filter(s => s.isActive).length} đang bật</span>
                    </div>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/20 border-b border-border/30 text-slate-700 uppercase font-extrabold tracking-wider text-[10px]">
                          <th className="py-3 px-4">Tên gói</th>
                          <th className="py-3 px-4 text-center">Chu kỳ</th>
                          <th className="py-3 px-4 text-center">Số buổi</th>
                          <th className="py-3 px-4 text-center">Cam kết</th>
                          <th className="py-3 px-4 text-center">Giảm giá</th>
                          <th className="py-3 px-4">Mô tả / Bonus</th>
                          <th className="py-3 px-4 text-center">Bật/Tắt</th>
                          <th className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {subscriptions.map((s, i) => (
                          <tr key={i} className={cn("transition-colors",
                            editingSubscriptionIndex === i ? "bg-amber-50/60" : "hover:bg-muted/10")}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">{s.name}</span>
                                {s.isPopular && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-300">
                                    Phổ biến
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                {BILLING_CYCLE_LABELS[s.billingCycle ?? "monthly"]}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {s.sessionsPerCycle ? `${s.sessionsPerCycle} buổi` : "—"}
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {s.commitmentMonths ? `${s.commitmentMonths} tháng` : "—"}
                            </td>
                            <td className="py-3 px-4 text-center font-extrabold text-emerald-600">
                              -{s.discountPercent}%
                            </td>
                            <td className="py-3 px-4 max-w-[200px]">
                              <p className="text-muted-foreground truncate">{s.description || "—"}</p>
                              {s.bonusDescription && (
                                <p className="text-[10px] text-amber-600 font-semibold truncate mt-0.5">🎁 {s.bonusDescription}</p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Switch checked={s.isActive}
                                onCheckedChange={v => setSubscriptions(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <button type="button" onClick={() => handleEditSubscription(i)}
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => {
                                  setSubscriptions(prev => prev.filter((_, idx) => idx !== i));
                                  if (editingSubscriptionIndex === i) { setEditingSubscriptionIndex(null); resetNewSubscription(); }
                                }} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* TAB 5: PEAK HOURS */}
              <TabsContent value="peakhours" className="space-y-3">
                <div className="border border-border/40 rounded-xl bg-card divide-y divide-border/30">

                  {/* ── Preset nhanh ── */}
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span className="text-sm font-extrabold text-foreground w-28 shrink-0 pt-0.5">Chọn nhanh</span>
                    <div className="flex flex-wrap gap-1.5">
                      {PEAK_HOUR_QUICK_PRESETS.map(preset => (
                        <button type="button" key={preset.label}
                          onClick={() => {
                            if (preset.entries) {
                              const toAdd = preset.entries.filter(e =>
                                !peakHours.some(p => p.dayOfWeek === e.dayOfWeek && p.startHour === e.startHour && p.endHour === e.endHour)
                              );
                              if (toAdd.length === 0) { toast.info("Cấu hình này đã được thêm rồi"); return; }
                              setPeakHours(prev => [...prev, ...toAdd]);
                              toast.success(`Đã thêm "${preset.label}"`);
                            } else {
                              setNewPeakHour(p => ({
                                ...p, dayOfWeek: preset.dayOfWeek!,
                                startHour: preset.startHour!, endHour: preset.endHour!, multiplier: preset.multiplier,
                              }));
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          {preset.label} <span className="text-slate-400 font-normal">·</span> +{Math.round((parseFloat(preset.multiplier) - 1) * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Ngày áp dụng ── */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="text-sm font-extrabold text-foreground w-28 shrink-0">Ngày</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { value: "1", label: "Thứ 2" }, { value: "2", label: "Thứ 3" },
                        { value: "3", label: "Thứ 4" }, { value: "4", label: "Thứ 5" },
                        { value: "5", label: "Thứ 6" }, { value: "6", label: "Thứ 7" },
                        { value: "0", label: "Chủ nhật" }, { value: "7", label: "Hàng ngày" },
                      ].map(d => (
                        <button type="button" key={d.value}
                          onClick={() => setNewPeakHour(p => ({ ...p, dayOfWeek: d.value }))}
                          className={cn(
                            "px-3 py-1 rounded-lg border text-sm font-semibold transition-colors",
                            newPeakHour.dayOfWeek === d.value
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-slate-700 border-slate-200 hover:border-primary/60 hover:text-primary"
                          )}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Khung giờ ── */}
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span className="text-sm font-extrabold text-foreground w-28 shrink-0 pt-1">Khung giờ</span>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "Sáng sớm", start: "06:00", end: "09:00" },
                          { label: "Buổi sáng", start: "08:00", end: "11:00" },
                          { label: "Buổi trưa", start: "11:00", end: "14:00" },
                          { label: "Buổi chiều", start: "14:00", end: "18:00" },
                          { label: "Chiều tối", start: "17:00", end: "20:00" },
                          { label: "Buổi tối", start: "19:00", end: "22:00" },
                          { label: "Cả ngày", start: "06:00", end: "22:00" },
                        ].map(t => {
                          const active = newPeakHour.startHour === t.start && newPeakHour.endHour === t.end;
                          return (
                            <button type="button" key={t.label}
                              onClick={() => setNewPeakHour(p => ({ ...p, startHour: t.start, endHour: t.end }))}
                              className={cn(
                                "px-2.5 py-1 rounded-lg border text-sm font-semibold transition-colors",
                                active
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-primary/60 hover:text-primary"
                              )}>
                              {t.label}
                              <span className={cn("ml-1 font-mono text-xs", active ? "opacity-70" : "text-slate-400")}>{t.start}–{t.end}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 h-9 focus-within:border-slate-500 transition-colors">
                          <span className="text-xs text-slate-400 font-medium shrink-0">từ</span>
                          <input type="time" value={newPeakHour.startHour}
                            onChange={e => setNewPeakHour(p => ({ ...p, startHour: e.target.value }))}
                            className="text-sm font-bold bg-transparent outline-none w-24" />
                        </div>
                        <span className="text-slate-400 font-bold">→</span>
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 h-9 focus-within:border-slate-500 transition-colors">
                          <span className="text-xs text-slate-400 font-medium shrink-0">đến</span>
                          <input type="time" value={newPeakHour.endHour}
                            onChange={e => setNewPeakHour(p => ({ ...p, endHour: e.target.value }))}
                            className="text-sm font-bold bg-transparent outline-none w-24" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Tăng giá ── */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="text-sm font-extrabold text-foreground w-28 shrink-0">Tăng giá</span>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {[
                        { label: "+10%", value: "1.1" }, { label: "+15%", value: "1.15" },
                        { label: "+20%", value: "1.2" }, { label: "+25%", value: "1.25" },
                        { label: "+30%", value: "1.3" }, { label: "+50%", value: "1.5" },
                      ].map(m => (
                        <button type="button" key={m.value}
                          onClick={() => setNewPeakHour(p => ({ ...p, multiplier: m.value }))}
                          className={cn(
                            "px-3 py-1 rounded-lg border text-sm font-bold transition-colors",
                            newPeakHour.multiplier === m.value
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-slate-700 border-slate-200 hover:border-primary/60 hover:text-primary"
                          )}>
                          {m.label}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors h-8 px-2.5">
                        <span className="text-sm font-extrabold text-primary select-none">+</span>
                        <input type="number" step="5" min="5" max="200"
                          value={String(Math.round((parseFloat(newPeakHour.multiplier || "1") - 1) * 100))}
                          onChange={e => {
                            const pct = Math.max(5, Math.min(200, parseInt(e.target.value || "5")));
                            setNewPeakHour(p => ({ ...p, multiplier: ((100 + pct) / 100).toFixed(2) }));
                          }}
                          className="w-10 text-sm font-extrabold bg-transparent outline-none text-center text-foreground" />
                        <span className="text-sm font-extrabold text-slate-400 select-none">%</span>
                      </div>
                      {parseFloat(newPeakHour.multiplier) > 1 && (
                        <span className="text-xs font-semibold text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                          × {parseFloat(newPeakHour.multiplier).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Thời hạn ── */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    <span className="text-sm font-extrabold text-foreground w-28 shrink-0">Thời hạn</span>
                    <DateRangePicker
                      startDate={newPeakHour.startDate}
                      endDate={newPeakHour.endDate}
                      onStartChange={v => setNewPeakHour(p => ({ ...p, startDate: v }))}
                      onEndChange={v => setNewPeakHour(p => ({ ...p, endDate: v }))}
                      placeholder="Không giới hạn (để trống)"
                    />
                  </div>

                  {/* ── Submit ── */}
                  <div className="px-4 py-3 flex items-center justify-between bg-slate-50/50">
                    <p className="text-sm text-slate-500">
                      {newPeakHour.startHour && newPeakHour.endHour && newPeakHour.multiplier && parseFloat(newPeakHour.multiplier) > 1
                        ? <><span className="font-bold text-foreground">{["CN","T2","T3","T4","T5","T6","T7","Hàng ngày"][parseInt(newPeakHour.dayOfWeek)]}</span>
                          <span className="mx-1.5 text-muted-foreground/40">·</span>
                          <span className="font-bold text-foreground">{newPeakHour.startHour} – {newPeakHour.endHour}</span>
                          <span className="mx-1.5 text-muted-foreground/40">·</span>
                          <span className="font-bold text-primary">+{Math.round((parseFloat(newPeakHour.multiplier) - 1) * 100)}% giá</span></>
                        : <span className="italic">Chưa đủ thông tin</span>
                      }
                    </p>
                    <BaseButton type="button" onClick={handleSavePeakHour}
                      className="h-9 rounded-lg font-bold bg-primary text-white text-sm px-5">
                      + Thêm khung giờ
                    </BaseButton>
                  </div>
                </div>

                {peakHours.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                    Chưa có cấu hình khung giờ cao điểm riêng cho gói này.
                  </div>
                ) : (
                  <div className="border border-border/30 rounded-xl overflow-hidden bg-card shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border/30 text-slate-500 uppercase font-extrabold tracking-widest text-[10px]">
                          <th className="py-3 px-4">Ngày áp dụng</th>
                          <th className="py-3 px-4">Khung giờ</th>
                          <th className="py-3 px-4">Thời hạn</th>
                          <th className="py-3 px-4 text-center">Hệ số tăng giá</th>
                          <th className="py-3 px-4 text-center">Trạng thái</th>
                          <th className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {peakHours.map((p, i) => {
                          const daysText = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Hàng ngày"];
                          const pct = Math.round((p.multiplier - 1) * 100);
                          const fmt = (s: string) => s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;
                          return (
                            <tr key={i} className="hover:bg-primary/2 transition-colors">
                              {/* Ngày */}
                              <td className="py-3.5 px-4">
                                <span className="font-extrabold text-foreground text-[13px] block leading-tight">{daysText[p.dayOfWeek]}</span>
                                <span className="text-[10px] text-muted-foreground/70 font-medium block mt-0.5">
                                  {p.dayOfWeek === 7 ? "Áp dụng tất cả các ngày trong tuần" : `Chỉ áp dụng vào ${daysText[p.dayOfWeek]}`}
                                </span>
                              </td>
                              {/* Khung giờ */}
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1.5 bg-primary/8 text-primary font-extrabold rounded-lg px-2.5 py-1 text-[12px]">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  {p.startHour} – {p.endHour}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60 block mt-1">
                                  {(() => {
                                    const [sh, sm] = p.startHour.split(":").map(Number);
                                    const [eh, em] = p.endHour.split(":").map(Number);
                                    const mins = (eh * 60 + em) - (sh * 60 + sm);
                                    if (mins <= 0) return "";
                                    const h = Math.floor(mins / 60), m = mins % 60;
                                    return h > 0 ? `${h} giờ${m > 0 ? ` ${m} phút` : ""}` : `${m} phút`;
                                  })()}
                                </span>
                              </td>
                              {/* Thời hạn */}
                              <td className="py-3.5 px-4">
                                {p.startDate || p.endDate ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">
                                      <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                                      {fmt(p.startDate ?? "") ?? "…"} → {fmt(p.endDate ?? "") ?? "…"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/60 block mt-1">Giới hạn thời gian</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/60 font-medium">Không giới hạn</span>
                                )}
                              </td>
                              {/* Hệ số */}
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex flex-col items-center">
                                  <span className="font-extrabold text-primary text-base leading-none">+{pct}%</span>
                                  <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">{p.multiplier}x giá gốc</span>
                                </span>
                              </td>
                              {/* Toggle */}
                              <td className="py-3.5 px-4 text-center">
                                <Switch checked={p.isActive} onCheckedChange={v => setPeakHours(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                              </td>
                              {/* Actions */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center justify-end gap-1">
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button type="button"
                                          onClick={() => setViewingPeakHour(p)}
                                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Xem chi tiết</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button type="button"
                                          onClick={() => {
                                            setEditPeakHour({ dayOfWeek: String(p.dayOfWeek), startHour: p.startHour, endHour: p.endHour, multiplier: String(p.multiplier), startDate: p.startDate ?? "", endDate: p.endDate ?? "", isActive: p.isActive });
                                            setEditingPeakHourIdx(i);
                                          }}
                                          className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors">
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Chỉnh sửa</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button type="button" onClick={() => setPeakHours(prev => prev.filter((_, idx) => idx !== i))}
                                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Xoá</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </SectionCard>

          {/* Cấu hình chi tiết bảng giá v2 */}

          {/* Phụ phí bổ sung đã ẩn/xóa */}

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(1)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(3)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Điều khoản & Hoàn tất <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 3: Terms, Commitments, Workflow & Review */}
      {step === 3 && (
        <div className="space-y-6">
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl bg-muted/60 p-1 rounded-xl mb-4 h-auto">
              <TabsTrigger value="workflow" className="rounded-lg font-bold text-xs py-2">
                <Layers className="w-3.5 h-3.5 mr-1.5 text-primary" />
                1. Quy trình thực hiện
              </TabsTrigger>
              <TabsTrigger value="terms-commitments" className="rounded-lg font-bold text-xs py-2">
                <ScrollText className="w-3.5 h-3.5 mr-1.5 text-primary" />
                2. Điều khoản & Cam kết
              </TabsTrigger>
              <TabsTrigger value="policies" className="rounded-lg font-bold text-xs py-2">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-primary" />
                3. Chính sách gán kèm
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: WORKFLOW */}
            <TabsContent value="workflow" className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-primary flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-primary fill-primary" />
                    Chèn quy trình mẫu chuẩn
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Sử dụng mẫu quy trình đã tối ưu hóa để điền nhanh các bước thực hiện.</p>
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
                      className="h-9 rounded-xl text-xs font-bold bg-card border-primary/25 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      + {tpl.name.split(" (")[0]}
                    </BaseButton>
                  ))}
                </div>
              </div>

              <SectionCard icon={Layers} title="Thiết lập các bước thực hiện công việc" description="Các bước thực tế nhân viên sẽ làm khi đến phục vụ khách hàng">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Form step */}
                  <div className="lg:col-span-1 border border-border/40 rounded-2xl p-5 bg-muted/15 space-y-4">
                    <p className="font-bold text-sm text-foreground flex items-center gap-1.5 border-b border-border/40 pb-2">
                      <Plus className="w-4 h-4 text-primary" />
                      {editingWorkflowStepIndex !== null ? "Sửa bước quy trình" : "Thêm bước quy trình mới"}
                    </p>
                    <div className="space-y-3.5">
                      <Field label="Tiêu đề bước" required>
                        <Input value={stepTitle} onChange={e => setStepTitle(e.target.value)} placeholder="VD: Khảo sát phòng ngủ" className="h-10 text-xs rounded-xl" />
                      </Field>
                      <Field label="Mô tả công việc">
                        <Textarea value={stepDesc} onChange={e => setStepDesc(e.target.value)} placeholder="Mô tả chi tiết những việc nhân viên cần lưu ý..." rows={3} className="text-xs rounded-xl resize-none" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Thời lượng (Phút)" required>
                          <Input inputMode="numeric" value={stepDuration} onChange={e => setStepDuration(e.target.value.replace(/\D/g, ""))} placeholder="30" className="h-10 text-xs rounded-xl" />
                        </Field>
                        <div className="space-y-1.5 flex flex-col justify-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer h-10">
                            <Switch checked={stepRequired} onCheckedChange={setStepRequired} />
                            <span className="text-xs font-semibold">Bắt buộc</span>
                          </label>
                        </div>
                      </div>

                      {/* Checklist */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-foreground">Danh mục việc nhỏ cần kiểm tra (Checklist)</Label>
                        <div className="flex gap-2">
                          <Input value={newChecklistVal} onChange={e => setNewChecklistVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newChecklistVal.trim()) { setStepChecklist([...stepChecklist, newChecklistVal.trim()]); setNewChecklistVal(""); } } }}
                            placeholder="Nhập việc và Enter..." className="h-9 text-xs rounded-xl flex-1" />
                          <BaseButton type="button" variant="outline" onClick={() => { if (newChecklistVal.trim()) { setStepChecklist([...stepChecklist, newChecklistVal.trim()]); setNewChecklistVal(""); } }} className="h-9 rounded-xl text-xs font-bold">+</BaseButton>
                        </div>
                        {stepChecklist.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {stepChecklist.map((item, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted border text-[10px] font-semibold text-muted-foreground">
                                {item}
                                <button type="button" onClick={() => setStepChecklist(prev => prev.filter((_, idx) => idx !== i))} className="w-3 h-3 text-rose-500 hover:text-rose-700">×</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-border/30">
                        {editingWorkflowStepIndex !== null && (
                          <BaseButton type="button" variant="outline" onClick={() => {
                            setEditingWorkflowStepIndex(null);
                            setStepTitle(""); setStepDesc(""); setStepDuration("15"); setStepChecklist([]);
                          }} className="flex-1 h-9.5 text-xs rounded-xl font-bold">Hủy</BaseButton>
                        )}
                        <BaseButton type="button" variant="primary" onClick={() => {
                          if (!stepTitle.trim()) { toast.error("Vui lòng điền tiêu đề bước!"); return; }
                          const dur = parseInt(stepDuration, 10);
                          if (isNaN(dur) || dur <= 0) { toast.error("Thời lượng không hợp lệ!"); return; }

                          const newStepObj = {
                            title: stepTitle.trim(),
                            description: stepDesc.trim() || undefined,
                            durationMinutes: dur,
                            isRequired: stepRequired,
                            checklistItems: stepChecklist,
                            stepOrder: editingWorkflowStepIndex !== null ? editingWorkflowStepIndex : workflowSteps.length,
                            icon: "CheckSquare",
                          };

                          if (editingWorkflowStepIndex !== null) {
                            setWorkflowSteps(workflowSteps.map((w, idx) => idx === editingWorkflowStepIndex ? newStepObj : w));
                            setEditingWorkflowStepIndex(null);
                            toast.success("Đã cập nhật bước quy trình!");
                          } else {
                            setWorkflowSteps([...workflowSteps, newStepObj]);
                            toast.success("Đã thêm bước quy trình!");
                          }
                          setStepTitle(""); setStepDesc(""); setStepDuration("15"); setStepChecklist([]);
                        }} className="flex-1 h-9.5 text-xs rounded-xl font-bold bg-primary text-white">
                          {editingWorkflowStepIndex !== null ? "Lưu lại" : "Thêm bước"}
                        </BaseButton>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách bước hiện tại */}
                  <div className="lg:col-span-2 space-y-3">
                    <p className="font-bold text-sm text-foreground">Danh sách các bước hiện tại ({workflowSteps.length})</p>
                    {workflowSteps.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                        Chưa thiết lập quy trình. Bạn có thể chèn nhanh mẫu ở trên hoặc tự thêm các bước.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {workflowSteps.map((w, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3.5 border border-border/30 rounded-xl bg-card hover:border-primary/20">
                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                {w.title}
                                {w.isRequired && <Badge className="bg-rose-500/10 text-rose-600 border-none text-[8px] px-1.5 py-0.25 rounded-full font-bold">Bắt buộc</Badge>}
                                <Badge className="bg-muted text-muted-foreground text-[8px] px-1.5 py-0.25 rounded-full font-semibold">{w.durationMinutes} phút</Badge>
                              </p>
                              {w.description && <p className="text-[11px] text-muted-foreground mt-1">{w.description}</p>}
                              {w.checklistItems && w.checklistItems.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {w.checklistItems.map((c, ci) => (
                                    <span key={ci} className="text-[9px] text-muted-foreground bg-muted/50 border border-border/20 px-1.5 py-0.5 rounded">✓ {c}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => {
                                setEditingWorkflowStepIndex(idx);
                                setStepTitle(w.title);
                                setStepDesc(w.description || "");
                                setStepDuration(String(w.durationMinutes));
                                setStepRequired(!!w.isRequired);
                                setStepChecklist(w.checklistItems || []);
                              }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => setWorkflowSteps(workflowSteps.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </TabsContent>

            {/* TAB 2: TERMS AND COMMITMENTS */}
            <TabsContent value="terms-commitments" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SectionCard icon={ScrollText} title="Điều khoản & Tiêu chuẩn Premium">
                  <div className="space-y-4">
                    <Field label="Điều khoản áp dụng chung (Gói Chuẩn)" hint="Xuống dòng cho mỗi điều khoản">
                      <Textarea placeholder="1. Khách hàng vui lòng cất giữ tiền bạc và trang sức quý giá.&#10;2. Không hỗ trợ dọn dẹp các vết bẩn công nghiệp nặng.&#10;3. Phải khai báo nếu có vật nuôi dữ trong nhà."
                        value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)}
                        rows={5} className="rounded-xl text-xs resize-none leading-relaxed" />
                    </Field>
                    
                    <Field label="Cam kết & Quy chuẩn dịch vụ Premium riêng" hint="Xuống dòng cho mỗi cam kết (Chỉ hiển thị cho gói Premium)">
                      <Textarea placeholder="1. Chỉ bàn giao thợ đạt đánh giá từ 4.8★ trở lên.&#10;2. Đi kèm trọn bộ nước dọn dẹp thảo mộc hữu cơ cao cấp.&#10;3. Cam kết đền bù đổ vỡ tài sản tối đa lên tới 15.000.000đ."
                        value={premiumTermsAndConditions} onChange={e => setPremiumTermsAndConditions(e.target.value)}
                        rows={5} className="rounded-xl text-xs border-amber-200 focus-visible:ring-amber-500 resize-none leading-relaxed" />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard icon={Heart} title="Cam kết chất lượng (Hộp thông tin vàng)">
                  <div className="space-y-4">
                    {commitments.map((c) => (
                      <div key={c.id} className="flex items-start gap-3 p-3 bg-muted/15 border border-border/30 rounded-xl relative">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary mt-0.5">
                          {React.createElement(getIconByName(c.iconName), { className: "w-4 h-4" })}
                        </div>
                        <div className="min-w-0 pr-8">
                          <p className="font-bold text-xs text-foreground">{c.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">{c.content}</p>
                        </div>
                        <button type="button" onClick={() => setCommitments(prev => prev.filter(x => x.id !== c.id))}
                          className="absolute top-2.5 right-2.5 p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {showAddCommitment ? (
                      <div className="p-4 bg-card border-2 border-primary/25 rounded-2xl space-y-3.5">
                        <p className="text-xs font-bold text-foreground">Thêm cam kết mới</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Field label="Tiêu đề cam kết" required>
                            <Input placeholder="VD: Đền bù 100%" value={newCommitmentTitle} onChange={e => setNewCommitmentTitle(e.target.value)} className="h-9 text-xs rounded-xl" />
                          </Field>
                          <Field label="Icon đại diện">
                            <Select value={newCommitmentIcon} onValueChange={setNewCommitmentIcon}>
                              <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {SURCHARGE_ICONS.map(i => (
                                  <SelectItem key={i.name} value={i.name}>
                                    <div className="flex items-center gap-1.5">
                                      {React.createElement(i.icon, { className: "w-3.5 h-3.5 text-primary" })}
                                      <span className="text-xs">{i.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                        <Field label="Nội dung cam kết" required>
                          <Textarea placeholder="Chi tiết cam kết..." value={newCommitmentContent} onChange={e => setNewCommitmentContent(e.target.value)} rows={2} className="text-xs rounded-xl resize-none" />
                        </Field>
                        <div className="flex justify-end gap-2 pt-1">
                          <BaseButton type="button" variant="outline" size="sm" onClick={() => { setShowAddCommitment(false); setNewCommitmentTitle(""); setNewCommitmentContent(""); }} className="h-8.5 rounded-lg text-xs">Hủy</BaseButton>
                          <BaseButton type="button" variant="primary" size="sm" onClick={() => {
                            if (!newCommitmentTitle.trim() || !newCommitmentContent.trim()) { toast.error("Vui lòng điền đủ thông tin!"); return; }
                            setCommitments([...commitments, { id: crypto.randomUUID(), title: newCommitmentTitle.trim(), content: newCommitmentContent.trim(), iconName: newCommitmentIcon }]);
                            setNewCommitmentTitle(""); setNewCommitmentContent(""); setShowAddCommitment(false);
                          }} className="h-8.5 rounded-lg text-xs bg-primary text-white">Lưu cam kết</BaseButton>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowAddCommitment(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-border/40 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary text-xs font-semibold">
                        <Plus className="w-3.5 h-3.5" /> Thêm cam kết chất lượng khác
                      </button>
                    )}
                  </div>
                </SectionCard>
              </div>
            </TabsContent>

            {/* TAB 3: POLICIES */}
            <TabsContent value="policies" className="space-y-4">
              <SectionCard icon={Shield} title="Lựa chọn chính sách áp dụng từ thư viện" description="Gán kèm các chính sách tiêu chuẩn để hiển thị công khai trên gói dịch vụ này">
                {policiesData.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-xs bg-muted/5 border-2 border-dashed border-border/40 rounded-2xl">
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-25 text-primary" />
                    Chưa có chính sách nào được cấu hình trong hệ thống Admin.
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Toolbar tìm kiếm & chọn nhanh */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 border-b border-border/30 mb-4">
                      <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={policySearch}
                          onChange={e => setPolicySearch(e.target.value)}
                          placeholder="Tìm kiếm chính sách..."
                          className="pl-9 h-10 text-xs rounded-xl"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                        <BaseButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const defaultIds = policiesData.filter(p => p.isDefault).map(p => p.id);
                            setSelectedPolicyIds(prev => Array.from(new Set([...prev, ...defaultIds])));
                            toast.success("Đã chọn các chính sách mặc định!");
                          }}
                          className="h-9 text-xs rounded-xl font-bold gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-primary" /> Chọn mặc định
                        </BaseButton>
                        <BaseButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allFilteredIds = filteredPolicies.map(p => p.id);
                            setSelectedPolicyIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                            toast.success("Đã chọn toàn bộ chính sách đang hiển thị!");
                          }}
                          className="h-9 text-xs rounded-xl font-bold gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Chọn toàn bộ
                        </BaseButton>
                        <BaseButton
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allFilteredIds = filteredPolicies.map(p => p.id);
                            setSelectedPolicyIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                            toast.success("Đã bỏ chọn toàn bộ chính sách đang hiển thị!");
                          }}
                          className="h-9 text-xs rounded-xl font-bold gap-1.5"
                        >
                          <X className="w-3.5 h-3.5 text-rose-600" /> Bỏ chọn
                        </BaseButton>
                      </div>
                    </div>

                    {filteredPolicies.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                        Không tìm thấy chính sách nào khớp với từ khóa tìm kiếm.
                      </div>
                    ) : (
                      (Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).map(cat => {
                        const catPolicies = filteredPolicies.filter(p => p.category === cat);
                        if (catPolicies.length === 0) return null;
                        const CatMeta = POLICY_CATEGORY_META[cat];
                        const CatIcon = CatMeta?.icon || Shield;
                        return (
                          <div key={cat} className="space-y-3 bg-muted/10 border border-border/25 rounded-2xl p-4 shadow-2xs">
                            <p className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-2", CatMeta?.color?.split(" ")[0])}>
                              {CatIcon && <CatIcon className="w-4 h-4" />}
                              {CatMeta?.label || cat}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {catPolicies.map(p => (
                                <div
                                  key={p.id}
                                  className={cn(
                                    "p-4 border rounded-xl flex items-start gap-3 transition-all cursor-pointer bg-card hover:shadow-xs",
                                    selectedPolicyIds.includes(p.id) ? "border-primary ring-2 ring-primary/15 bg-primary/5" : "border-border/40 hover:border-primary/20"
                                  )}
                                  onClick={() => {
                                    if (selectedPolicyIds.includes(p.id)) {
                                      setSelectedPolicyIds(selectedPolicyIds.filter(id => id !== p.id));
                                    } else {
                                      setSelectedPolicyIds([...selectedPolicyIds, p.id]);
                                    }
                                  }}
                                >
                                  <button type="button"
                                    className={cn("w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                                      selectedPolicyIds.includes(p.id) ? "border-primary bg-primary text-white" : "border-muted-foreground/30")}>
                                    {selectedPolicyIds.includes(p.id) && <Check className="w-3 h-3" />}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-bold text-xs text-foreground block truncate">{p.title}</span>
                                    {p.content && (
                                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{p.content}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </SectionCard>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between gap-3 pt-4 border-t border-border/30">
            <BaseButton variant="outline" onClick={() => setStep(2)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(4)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Xem lại & Hoàn tất <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* STEP 4: Xem lại & Hoàn tất */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Card 1: Thông tin cơ bản */}
              <SectionCard icon={Package} title="Thông tin cơ bản">
                <div className="space-y-4">
                  <div className="flex gap-4 items-start border-b border-border/20 pb-4">
                    <div className="space-y-2 shrink-0">
                      <span className="text-xs font-bold text-muted-foreground block">Ảnh đại diện</span>
                      {iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={iconUrl} alt="Thumbnail" className="w-20 h-20 object-cover rounded-2xl border-2 border-border/80 shadow-sm" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/40">
                          <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-lg font-black text-foreground truncate">{name || <span className="text-rose-500 italic">Chưa nhập tên</span>}</h4>
                        <Badge className={isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-extrabold text-[10px]" : "bg-slate-100 text-slate-700 hover:bg-slate-100 border-none font-extrabold text-[10px]"}>
                          {isActive ? "Đang hoạt động" : "Lưu nháp"}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs font-semibold text-slate-700 flex-wrap">
                        <p className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[11px]">Mã gói:</span> 
                          <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-extrabold text-[11px]">{packageCode || "Chưa tạo"}</span>
                        </p>
                        <p className="flex items-center gap-1">
                          <span className="text-muted-foreground text-[11px]">Thứ tự hiển thị:</span> 
                          <span className="font-bold">{sortOrder}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {policyDescription && (
                    <div className="p-3.5 bg-muted/20 border border-border/40 rounded-xl space-y-1">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Mô tả ngắn dịch vụ</span>
                      <p className="text-xs text-slate-700 leading-relaxed">{policyDescription}</p>
                    </div>
                  )}

                  {galleryUrls.filter(Boolean).length > 0 && (
                    <div className="space-y-2 border-t border-border/10 pt-3">
                      <span className="text-xs font-bold text-muted-foreground block">Ảnh gallery chi tiết</span>
                      <div className="flex gap-2 flex-wrap">
                        {galleryUrls.filter(Boolean).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url} alt="Gallery" className="w-14 h-14 object-cover rounded-xl border border-border/40 shadow-2xs hover:scale-105 transition-transform" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Card 2: Thiết lập nâng cao */}
              <SectionCard icon={Settings2} title="Thiết lập nâng cao & Đơn giá">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4 border-b border-border/20 pb-4">
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 rounded-xl p-3 text-center">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 block mb-1">Đơn giá giờ Chuẩn</span>
                      <span className="text-lg font-black text-emerald-600 block">{vnd(baseHourlyRate)} <span className="text-xs font-normal text-muted-foreground">/ giờ</span></span>
                    </div>
                    <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 rounded-xl p-3 text-center">
                      <span className="text-xs font-bold text-orange-800 dark:text-orange-400 block mb-1">Đơn giá giờ Premium</span>
                      <span className="text-lg font-black text-orange-500 block">{vnd(premiumHourlyRate)} <span className="text-xs font-normal text-muted-foreground">/ giờ</span></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-2 rounded-xl shrink-0", allowMultipleTaskers ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                        {allowMultipleTaskers ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Nhiều thợ cùng làm</span>
                        <span className="font-bold text-foreground">{allowMultipleTaskers ? "Cho phép" : "Không hỗ trợ"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={cn("p-2 rounded-xl shrink-0", allowSubscription ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                        {allowSubscription ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Đăng ký gói tháng</span>
                        <span className="font-bold text-foreground">{allowSubscription ? "Cho phép" : "Không hỗ trợ"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border/20 pt-4">
                    <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Khu vực áp dụng ({selectedAreaIds.length})</span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {coverageAreas.filter(a => selectedAreaIds.includes(a.id)).map(a => (
                        <Badge key={a.id} variant="secondary" className="text-[10px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border-none font-bold text-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {a.name}
                        </Badge>
                      ))}
                      {selectedAreaIds.length === 0 && <span className="text-rose-500 italic text-xs">Chưa chọn khu vực nào</span>}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              {/* Card 4: Bảng giá v2 */}
              <SectionCard icon={BarChart3} title="Các mốc giá & Tùy chọn con">
                <div className="space-y-5">
                  {/* Mốc thời lượng */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Mốc thời lượng ({durations.length})</span>
                    <div className="flex flex-wrap gap-2">
                      {durations.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border/60 rounded-xl text-xs font-bold shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{d.durationHours}h {d.title ? `(${d.title})` : ""}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          <span className="text-primary font-extrabold">x{d.priceMultiplier.toFixed(2)}</span>
                        </div>
                      ))}
                      {durations.length === 0 && <span className="text-rose-500 italic text-xs">Chưa có mốc thời lượng</span>}
                    </div>
                  </div>

                  {/* Dịch vụ con */}
                  <div className="space-y-2.5 border-t border-border/20 pt-4">
                    <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Dịch vụ con tùy chọn ({selectedSubServices.length})</span>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                      {selectedSubServices.map((s, i) => (
                        <div key={i} className="flex justify-between items-center px-3 py-2 bg-muted/20 border border-border/40 rounded-xl text-xs font-bold">
                          <span className="truncate pr-2 text-slate-700">{s.name}</span>
                          <span className="text-emerald-600 font-extrabold shrink-0">{vnd(s.price)}</span>
                        </div>
                      ))}
                      {selectedSubServices.length === 0 && <span className="text-muted-foreground italic text-xs">Không có dịch vụ con</span>}
                    </div>
                  </div>

                  {/* Dịch vụ đi kèm (Addon) */}
                  <div className="space-y-2.5 border-t border-border/20 pt-4">
                    <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Dịch vụ đi kèm / Addons ({addons.length})</span>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                      {addons.map((a, i) => (
                        <div key={i} className="flex justify-between items-center px-3 py-2 bg-muted/20 border border-border/40 rounded-xl text-xs font-bold">
                          <span className="truncate pr-2 text-slate-700">{a.name}</span>
                          <span className="text-orange-500 font-extrabold shrink-0">+{vnd(a.price)}</span>
                        </div>
                      ))}
                      {addons.length === 0 && <span className="text-muted-foreground italic text-xs">Không có dịch vụ đi kèm</span>}
                    </div>
                  </div>

                  {/* Khung giờ cao điểm */}
                  <div className="space-y-2.5 border-t border-border/20 pt-4">
                    <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Khung giờ cao điểm ({peakHours.length})</span>
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                      {peakHours.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1 bg-orange-500/5 border border-orange-100 rounded-lg text-[11px] font-bold text-slate-700">
                          <Zap className="w-3 h-3 text-orange-500" />
                          <span>T{p.dayOfWeek === 0 ? "CN" : p.dayOfWeek + 1}: {p.startHour} - {p.endHour}</span>
                          <span className="text-orange-600">x{p.multiplier}</span>
                        </div>
                      ))}
                      {peakHours.length === 0 && <span className="text-muted-foreground italic text-xs">Không có khung giờ cao điểm</span>}
                    </div>
                  </div>

                  {/* Chu kỳ gói tháng */}
                  {allowSubscription && (
                    <div className="space-y-2.5 border-t border-border/20 pt-4">
                      <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Ưu đãi gói tháng ({subscriptions.length})</span>
                      <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                        {subscriptions.map((s, i) => (
                          <div key={i} className="flex justify-between items-center px-3 py-2 bg-muted/20 border border-border/40 rounded-xl text-xs font-bold">
                            <span className="truncate pr-2 text-slate-700">{s.name}</span>
                            <span className="text-emerald-600 font-extrabold shrink-0">Giảm {s.discountPercent}%</span>
                          </div>
                        ))}
                        {subscriptions.length === 0 && <span className="text-muted-foreground italic text-xs">Không có ưu đãi gói tháng</span>}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* Card 5: Điều khoản & Quy trình */}
              <SectionCard icon={ScrollText} title="Quy trình & Điều khoản">
                <div className="space-y-5">
                  {/* Quy trình thực hiện */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Quy trình thực hiện ({workflowSteps.length} bước)</span>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {workflowSteps.map((w, i) => (
                        <div key={i} className="p-3 bg-muted/10 border border-border/40 rounded-xl space-y-2">
                          <div className="flex justify-between items-start gap-2 flex-wrap">
                            <div className="flex gap-2 items-center min-w-0">
                              <span className="w-5 h-5 rounded-full bg-primary text-white font-extrabold flex items-center justify-center shrink-0 text-[10px]">{i + 1}</span>
                              <span className="font-extrabold text-xs text-foreground truncate">{w.title}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {w.durationMinutes} phút
                            </div>
                          </div>
                          {w.description && <p className="text-[11px] text-muted-foreground leading-relaxed pl-7">{w.description}</p>}
                          {w.checklistItems && w.checklistItems.length > 0 && (
                            <div className="pl-7 pt-1.5 border-t border-border/10 mt-1.5 space-y-1">
                              {w.checklistItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-700 font-semibold">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {workflowSteps.length === 0 && <span className="text-rose-500 italic text-xs">Chưa cấu hình quy trình</span>}
                    </div>
                  </div>

                  {/* Cam kết chất lượng */}
                  <div className="space-y-2.5 border-t border-border/20 pt-4">
                    <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Cam kết chất lượng ({commitments.length})</span>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {commitments.map((c, i) => (
                        <div key={i} className="flex gap-2.5 items-start p-2.5 bg-muted/20 border border-border/40 rounded-xl text-xs">
                          <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block">{c.title}</span>
                            {c.content && <span className="text-muted-foreground text-[11px] block mt-0.5 leading-relaxed">{c.content}</span>}
                          </div>
                        </div>
                      ))}
                      {commitments.length === 0 && <span className="text-muted-foreground italic text-xs">Không có cam kết</span>}
                    </div>
                  </div>

                  {/* Chính sách gán kèm */}
                  <div className="space-y-2.5 border-t border-border/20 pt-4">
                    <span className="text-xs font-bold text-muted-foreground block uppercase tracking-wider">Chính sách gán kèm ({selectedPolicyIds.length})</span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {policiesData.filter(p => selectedPolicyIds.includes(p.id)).map(p => (
                        <Badge key={p.id} variant="secondary" className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-700 border-none font-bold">
                          {p.title}
                        </Badge>
                      ))}
                      {selectedPolicyIds.length === 0 && <span className="text-muted-foreground italic text-xs">Không có chính sách</span>}
                    </div>
                  </div>

                  {/* Điều khoản */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border/20 pt-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-border/50 rounded-xl">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Điều khoản áp dụng riêng</span>
                      <span className={cn("text-xs font-bold", termsAndConditions ? "text-emerald-600" : "text-muted-foreground italic")}>
                        {termsAndConditions ? "Đã cấu hình chi tiết" : "Không có cấu hình riêng"}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-border/50 rounded-xl">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Quy chuẩn Premium riêng</span>
                      <span className={cn("text-xs font-bold", premiumTermsAndConditions ? "text-emerald-600" : "text-muted-foreground italic")}>
                        {premiumTermsAndConditions ? "Đã cấu hình chi tiết" : "Không có cấu hình riêng"}
                      </span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t border-border/30">
            <BaseButton variant="outline" onClick={() => setStep(3)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setShowConfirmModal(true)} disabled={isSubmitting}
              className="h-11 px-8 rounded-xl font-bold gap-2 flex-1 md:flex-none">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo...</> : <><CheckCircle2 className="w-4 h-4" />Tạo gói dịch vụ</>}
            </BaseButton>
          </div>
        </div>
      )}

      {/* Dialog Xác nhận Tạo mới */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="w-full sm:max-w-[550px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Xác nhận tạo gói dịch vụ
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Bạn có chắc chắn muốn tạo gói dịch vụ mới này? Vui lòng kiểm tra kỹ các thông tin tóm tắt chi tiết bên dưới.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {/* Phần 1: Thông tin gói */}
            <div className="bg-slate-50 dark:bg-slate-900/30 border border-border/50 rounded-xl p-3.5 space-y-2.5 text-xs">
              <p className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-1.5 mb-2">Thông tin gói</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Tên gói dịch vụ</span>
                  <span className="font-bold text-foreground block truncate" title={name}>{name || <span className="text-rose-500 italic">Chưa nhập</span>}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Mã gói (Package Code)</span>
                  <span className="font-mono font-bold text-foreground block truncate" title={packageCode}>{packageCode || <span className="text-rose-500 italic">Chưa nhập</span>}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Đơn giá cơ bản</span>
                  <span className="font-bold text-emerald-600 block">{vnd(baseHourlyRate)} / giờ</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Đơn giá Premium</span>
                  <span className="font-bold text-orange-600 block">{vnd(premiumHourlyRate)} / giờ</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Trạng thái hoạt động</span>
                  <span className={cn("font-bold block", isActive ? "text-emerald-600" : "text-slate-500")}>
                    {isActive ? "Kích hoạt ngay" : "Lưu nháp"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Thứ tự hiển thị</span>
                  <span className="font-bold text-foreground block">{sortOrder}</span>
                </div>
              </div>
            </div>

            {/* Phần 2: Mốc thời lượng & Giá */}
            <div className="bg-slate-50 dark:bg-slate-900/30 border border-border/50 rounded-xl p-3.5 text-xs">
              <p className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-1.5 mb-2">Các mốc thời lượng ({durations.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {durations.map((d, idx) => (
                  <Badge key={idx} variant="outline" className="bg-card text-foreground border-border/60 py-1 px-2 text-[10px] font-bold">
                    {d.durationHours}h {d.title ? `(${d.title})` : ""} - nhân hệ số: x{d.priceMultiplier.toFixed(2)}
                  </Badge>
                ))}
                {durations.length === 0 && <span className="text-rose-500 italic">Chưa có mốc thời lượng nào</span>}
              </div>
            </div>

            {/* Phần 3: Dịch vụ con & Dịch vụ đi kèm */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/30 border border-border/50 rounded-xl p-3.5">
                <p className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-1.5 mb-2">Dịch vụ con ({selectedSubServices.length})</p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {selectedSubServices.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] border-b border-border/10 pb-1 last:border-0 last:pb-0">
                      <span className="font-semibold text-foreground truncate max-w-[120px]">{s.name}</span>
                      <span className="font-mono font-bold text-emerald-600 shrink-0">{vnd(s.price)}</span>
                    </div>
                  ))}
                  {selectedSubServices.length === 0 && <span className="text-muted-foreground italic text-[10px]">Không có dịch vụ con</span>}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/30 border border-border/50 rounded-xl p-3.5">
                <p className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-1.5 mb-2">Dịch vụ đi kèm ({addons.length})</p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {addons.map((a, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] border-b border-border/10 pb-1 last:border-0 last:pb-0">
                      <span className="font-semibold text-foreground truncate max-w-[120px]">{a.name}</span>
                      <span className="font-mono font-bold text-orange-600 shrink-0">+{vnd(a.price)}</span>
                    </div>
                  ))}
                  {addons.length === 0 && <span className="text-muted-foreground italic text-[10px]">Không có dịch vụ đi kèm</span>}
                </div>
              </div>
            </div>

            {/* Phần 4: Quy trình thực hiện */}
            <div className="bg-slate-50 dark:bg-slate-900/30 border border-border/50 rounded-xl p-3.5 text-xs">
              <p className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-1.5 mb-2">Quy trình thực hiện ({workflowSteps.length} bước)</p>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {workflowSteps.map((w, idx) => (
                  <div key={idx} className="flex gap-2 items-start text-[10px]">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold flex items-center justify-center shrink-0 text-[9px]">{idx + 1}</span>
                    <div className="min-w-0">
                      <span className="font-bold text-foreground block truncate">{w.title}</span>
                      {w.description && <span className="text-muted-foreground text-[9px] block line-clamp-1">{w.description}</span>}
                    </div>
                  </div>
                ))}
                {workflowSteps.length === 0 && <span className="text-rose-500 italic text-[10px]">Chưa cấu hình quy trình thực hiện</span>}
              </div>
            </div>

            {/* Phần 5: Khu vực phủ sóng */}
            <div className="bg-slate-50 dark:bg-slate-900/30 border border-border/50 rounded-xl p-3.5 text-xs">
              <p className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-1.5 mb-2">Khu vực áp dụng ({selectedAreaIds.length} khu vực)</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3">
                {selectedAreaNames || <span className="text-rose-500 italic">Chưa chọn khu vực nào</span>}
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 pt-2 border-t border-border/30">
            <BaseButton
              variant="outline"
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="rounded-xl h-11 px-5 font-bold"
              disabled={isSubmitting}
            >
              Hủy bỏ
            </BaseButton>
            <BaseButton
              variant="primary"
              type="button"
              onClick={async () => {
                try {
                  await handleSubmit();
                } finally {
                  setShowConfirmModal(false);
                }
              }}
              disabled={isSubmitting}
              className="rounded-xl h-11 px-6 font-bold gap-2 bg-orange-500 hover:bg-orange-600 text-white flex-1"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" />Xác nhận & Tạo mới</>
              )}
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Chi tiết dịch vụ lẻ */}
      <Dialog open={!!detailSvc} onOpenChange={open => { if (!open) setDetailSvc(null); }}>
        <DialogContent className="w-full sm:max-w-2xl rounded-2xl p-0 bg-card border border-border overflow-hidden">
          {detailSvc && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
                <DialogTitle className="text-base font-black flex items-center gap-3">
                  {detailSvc.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detailSvc.thumbnailUrl} alt={detailSvc.name} className="w-9 h-9 rounded-xl object-cover border border-border/40" />
                  )}
                  <div>
                    <p>{detailSvc.name}</p>
                    <p className="text-xs font-mono text-primary font-bold">{detailSvc.subServiceCode}</p>
                  </div>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {detailSvc.shortDescription || "Không có mô tả ngắn"}
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* Gallery */}
                {detailSvc.galleryUrls && detailSvc.galleryUrls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hình ảnh</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {detailSvc.galleryUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt={`${detailSvc.name} ${i + 1}`}
                          className="h-24 w-32 object-cover rounded-xl border border-border/40 shrink-0" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Thông tin cơ bản */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Thông tin</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/20 rounded-xl border border-border/40">
                      <p className="text-[10px] text-muted-foreground font-semibold">Thời lượng</p>
                      <p className="text-sm font-bold mt-0.5">{detailSvc.durationHours ? `${detailSvc.durationHours}h` : "—"}</p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-xl border border-border/40">
                      <p className="text-[10px] text-muted-foreground font-semibold">Giá gốc</p>
                      <p className="text-sm font-bold text-primary mt-0.5">
                        {detailSvc.pricingConfig?.basePrice ? vnd(Number(detailSvc.pricingConfig.basePrice)) : "—"}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/20 rounded-xl border border-border/40">
                      <p className="text-[10px] text-muted-foreground font-semibold">Trạng thái</p>
                      <span className={cn("inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
                        detailSvc.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                        {detailSvc.isActive ? "Đang bật" : "Đã tắt"}
                      </span>
                    </div>
                    {detailSvc.coverageArea && (
                      <div className="p-3 bg-muted/20 rounded-xl border border-border/40">
                        <p className="text-[10px] text-muted-foreground font-semibold">Khu vực</p>
                        <p className="text-sm font-bold mt-0.5">{detailSvc.coverageArea}</p>
                      </div>
                    )}
                    {detailSvc.pricingConfig?.peakPrice && (
                      <div className="p-3 bg-muted/20 rounded-xl border border-border/40">
                        <p className="text-[10px] text-muted-foreground font-semibold">Giá cao điểm</p>
                        <p className="text-sm font-bold text-amber-600 mt-0.5">{vnd(Number(detailSvc.pricingConfig.peakPrice))}</p>
                      </div>
                    )}
                    {detailSvc.pricingConfig?.platformCommissionRate != null && (
                      <div className="p-3 bg-muted/20 rounded-xl border border-border/40">
                        <p className="text-[10px] text-muted-foreground font-semibold">Hoa hồng nền tảng</p>
                        <p className="text-sm font-bold mt-0.5">{detailSvc.pricingConfig.platformCommissionRate}%</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mô tả chi tiết */}
                {detailSvc.description && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mô tả chi tiết</p>
                    <p className="text-sm text-foreground leading-relaxed bg-muted/20 rounded-xl p-4 border border-border/40">
                      {detailSvc.description}
                    </p>
                  </div>
                )}

                {/* Công việc bao gồm / không bao gồm */}
                {((detailSvc.includedTasks?.length ?? 0) > 0 || (detailSvc.excludedTasks?.length ?? 0) > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {detailSvc.includedTasks && detailSvc.includedTasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Bao gồm</p>
                        <ul className="space-y-1">
                          {detailSvc.includedTasks.map((task, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                              <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>{task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {detailSvc.excludedTasks && detailSvc.excludedTasks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Không bao gồm</p>
                        <ul className="space-y-1">
                          {detailSvc.excludedTasks.map((task, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="text-rose-400 shrink-0 mt-0.5">✕</span>{task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="px-6 py-4 border-t border-border/40 flex gap-2">
                <button type="button" onClick={() => setDeleteConfirm(detailSvc)}
                  className="h-10 px-4 rounded-xl border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 transition-colors">
                  Xoá
                </button>
                <button type="button" onClick={() => { openCrudEdit(detailSvc!); setDetailSvc(null); }}
                  className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
                  Chỉnh sửa
                </button>
                <button type="button" onClick={() => setDetailSvc(null)}
                  className="h-10 px-4 rounded-xl border border-border/40 text-sm font-semibold hover:bg-muted/40 transition-colors">
                  Đóng
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xoá dịch vụ lẻ */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="w-full sm:max-w-sm rounded-2xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-rose-600">Xác nhận xoá dịch vụ</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Xoá dịch vụ <span className="font-bold text-foreground">&quot;{deleteConfirm?.name}&quot;</span> khỏi hệ thống. Hành động này không thể hoàn tác và sẽ xoá tất cả liên kết với gói dịch vụ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 mt-4">
            <button type="button" onClick={() => setDeleteConfirm(null)}
              className="flex-1 h-10 rounded-xl border border-border/40 text-sm font-semibold hover:bg-muted/40 transition-colors">
              Huỷ
            </button>
            <button type="button" disabled={deleteService.isPending}
              onClick={() => deleteConfirm && handleDeleteSvc(deleteConfirm)}
              className="flex-1 h-10 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-60">
              {deleteService.isPending ? "Đang xoá..." : "Xoá dịch vụ"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tạo / Chỉnh sửa dịch vụ lẻ */}
      <Dialog open={crudModal.open} onOpenChange={open => { if (!open) { setCrudModal({ open: false, mode: "create" }); setCrudForm(CRUD_EMPTY); } }}>
        <DialogContent className="w-full sm:max-w-2xl rounded-2xl p-0 bg-card border border-border overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              {crudModal.mode === "create" ? <><span className="text-primary">＋</span> Tạo dịch vụ lẻ mới</> : <><span className="text-amber-500">✎</span> Chỉnh sửa dịch vụ lẻ</>}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {crudModal.mode === "create" ? "Tạo dịch vụ lẻ mới — tự động thêm vào danh sách đã chọn của gói này." : `Chỉnh sửa thông tin và giá gốc của dịch vụ "${crudModal.svc?.name}".`}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[72vh]">
            {/* Block 1: Thông tin cơ bản + Giá gốc */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Thông tin cơ bản</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tên dịch vụ" required tooltip="Tên chính xác hiển thị với khách hàng, nên mô tả rõ loại dịch vụ">
                  <Input placeholder="Nấu ăn, Giặt ủi, Dọn bếp..." value={crudForm.name}
                    onChange={e => setCrudForm(p => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" />
                </Field>
                <Field label="Thời lượng (giờ)" tooltip="Thời gian trung bình hoàn thành dịch vụ. Hiển thị trên card cho khách hàng tham khảo.">
                  <Select value={crudForm.durationHours || "none"} onValueChange={v => setCrudForm(p => ({ ...p, durationHours: v === "none" ? "" : v }))}>
                    <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Chọn thời lượng..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không xác định</SelectItem>
                      {[0.5,1,1.5,2,2.5,3,4,5,6,8].map(h => <SelectItem key={h} value={String(h)}>{h} giờ</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Giá gốc — field quan trọng */}
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <Field label="Giá gốc (₫)" required tooltip="Giá cơ bản của dịch vụ này trong gói. Khách hàng sẽ thấy giá này khi chọn dịch vụ lẻ.">
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="150000"
                      value={crudForm.basePrice}
                      onChange={e => setCrudForm(p => ({ ...p, basePrice: e.target.value }))}
                      className="h-10 rounded-xl pr-14 text-sm font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₫</span>
                  </div>
                  {crudForm.basePrice && !isNaN(Number(crudForm.basePrice)) && Number(crudForm.basePrice) > 0 && (
                    <p className="text-xs text-primary font-bold mt-1">{vnd(Number(crudForm.basePrice))}</p>
                  )}
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Mô tả ngắn" tooltip="1–2 câu tóm tắt — hiển thị trên card danh sách và preview. Không quá 120 ký tự.">
                  <Input placeholder="Dịch vụ nấu ăn tại nhà bởi đầu bếp có kinh nghiệm..." value={crudForm.shortDescription}
                    onChange={e => setCrudForm(p => ({ ...p, shortDescription: e.target.value }))} className="h-10 rounded-xl" />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Mô tả chi tiết" tooltip="Giải thích đầy đủ nội dung dịch vụ: quy trình thực hiện, cam kết chất lượng, lưu ý cho khách hàng.">
                  <textarea rows={3} placeholder="Mô tả chi tiết về quy trình, chất liệu sử dụng, cam kết chất lượng..."
                    value={crudForm.description} onChange={e => setCrudForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </Field>
              </div>
            </div>

            {/* Block 2: Hình ảnh */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Hình ảnh</p>
              <div className="space-y-3">
                <Field label="Ảnh đại diện (thumbnail)" tooltip="URL ảnh chính — hiển thị trên card dịch vụ. Tỉ lệ 1:1 hoặc 4:3.">
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={crudForm.thumbnailUrl}
                      onChange={e => setCrudForm(p => ({ ...p, thumbnailUrl: e.target.value }))} className="h-10 rounded-xl flex-1" />
                    {crudForm.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={crudForm.thumbnailUrl} alt="thumb" className="h-10 w-10 rounded-xl object-cover border border-border/40 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                  </div>
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Ảnh gallery 1" tooltip="Ảnh bổ sung hiển thị trong trang chi tiết. Nên dùng ảnh ngang 16:9.">
                    <div className="flex gap-2">
                      <Input placeholder="https://..." value={crudForm.galleryUrl1}
                        onChange={e => setCrudForm(p => ({ ...p, galleryUrl1: e.target.value }))} className="h-10 rounded-xl flex-1" />
                      {crudForm.galleryUrl1 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={crudForm.galleryUrl1} alt="g1" className="h-10 w-10 rounded-xl object-cover border border-border/40 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                    </div>
                  </Field>
                  <Field label="Ảnh gallery 2" tooltip="Ảnh thứ 2 trong bộ gallery. Tỉ lệ 16:9.">
                    <div className="flex gap-2">
                      <Input placeholder="https://..." value={crudForm.galleryUrl2}
                        onChange={e => setCrudForm(p => ({ ...p, galleryUrl2: e.target.value }))} className="h-10 rounded-xl flex-1" />
                      {crudForm.galleryUrl2 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={crudForm.galleryUrl2} alt="g2" className="h-10 w-10 rounded-xl object-cover border border-border/40 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            {/* Block 3: Phạm vi công việc */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Phạm vi công việc</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Field label="Công việc bao gồm" tooltip="Liệt kê những gì khách hàng nhận được. Nhấn Enter để thêm mục.">
                    <div className="flex gap-2">
                      <Input placeholder="Lau sàn, Rửa bát..." value={crudForm.includedTask}
                        onChange={e => setCrudForm(p => ({ ...p, includedTask: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && crudForm.includedTask.trim()) { setCrudForm(p => ({ ...p, includedTasks: [...p.includedTasks, p.includedTask.trim()], includedTask: "" })); e.preventDefault(); } }}
                        className="h-9 rounded-xl flex-1 text-sm" />
                      <button type="button"
                        onClick={() => { if (crudForm.includedTask.trim()) setCrudForm(p => ({ ...p, includedTasks: [...p.includedTasks, p.includedTask.trim()], includedTask: "" })); }}
                        className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </Field>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {crudForm.includedTasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200/60">
                        <span className="text-emerald-500 text-xs shrink-0">✓</span>
                        <span className="text-xs flex-1">{t}</span>
                        <button type="button" onClick={() => setCrudForm(p => ({ ...p, includedTasks: p.includedTasks.filter((_, j) => j !== i) }))} className="text-muted-foreground hover:text-rose-500 shrink-0"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {crudForm.includedTasks.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Chưa có mục nào</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Field label="Không bao gồm" tooltip="Những gì không thuộc phạm vi dịch vụ để tránh hiểu nhầm. Nhấn Enter để thêm.">
                    <div className="flex gap-2">
                      <Input placeholder="Giặt quần áo, Dọn ban công..." value={crudForm.excludedTask}
                        onChange={e => setCrudForm(p => ({ ...p, excludedTask: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter" && crudForm.excludedTask.trim()) { setCrudForm(p => ({ ...p, excludedTasks: [...p.excludedTasks, p.excludedTask.trim()], excludedTask: "" })); e.preventDefault(); } }}
                        className="h-9 rounded-xl flex-1 text-sm" />
                      <button type="button"
                        onClick={() => { if (crudForm.excludedTask.trim()) setCrudForm(p => ({ ...p, excludedTasks: [...p.excludedTasks, p.excludedTask.trim()], excludedTask: "" })); }}
                        className="h-9 w-9 rounded-xl bg-rose-100 text-rose-500 hover:bg-rose-200 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </Field>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {crudForm.excludedTasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 rounded-lg border border-rose-200/60">
                        <span className="text-rose-400 text-xs shrink-0">✕</span>
                        <span className="text-xs flex-1">{t}</span>
                        <button type="button" onClick={() => setCrudForm(p => ({ ...p, excludedTasks: p.excludedTasks.filter((_, j) => j !== i) }))} className="text-muted-foreground hover:text-rose-500 shrink-0"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {crudForm.excludedTasks.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">Chưa có mục nào</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Block 4: Trạng thái */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Trạng thái</p>
              <Field label="Trạng thái hiển thị" tooltip="Bật thì dịch vụ có thể được chọn và đặt lịch. Tắt để tạm ẩn.">
                <div className="flex items-center gap-3 h-10 px-3 bg-muted/20 rounded-xl border border-border/40 w-fit">
                  <Switch checked={crudForm.isActive} onCheckedChange={v => setCrudForm(p => ({ ...p, isActive: v }))} />
                  <div>
                    <p className="text-xs font-bold">{crudForm.isActive ? "Đang bật" : "Đang tắt"}</p>
                    <p className="text-[10px] text-muted-foreground">{crudForm.isActive ? "Khách có thể đặt" : "Tạm ẩn khỏi khách hàng"}</p>
                  </div>
                </div>
              </Field>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/40 flex gap-3">
            <button type="button" onClick={() => { setCrudModal({ open: false, mode: "create" }); setCrudForm(CRUD_EMPTY); }}
              className="flex-1 h-10 rounded-xl border border-border/40 text-sm font-semibold hover:bg-muted/40 transition-colors">
              Huỷ
            </button>
            <BaseButton type="button" onClick={handleCrudSubmit}
              disabled={createService.isPending || updateService.isPending}
              className={cn("flex-1 h-10 rounded-xl font-bold text-white",
                crudModal.mode === "edit" ? "bg-amber-500 hover:bg-amber-600" : "bg-primary hover:bg-primary/90")}>
              {(createService.isPending || updateService.isPending) ? "Đang lưu..." : crudModal.mode === "edit" ? "Lưu thay đổi" : "Tạo dịch vụ"}
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
              Phí ship sẽ được cập nhật đồng bộ toàn hệ thống cho khu vực {editingArea?.name}.
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
                if (!editAreaFee.trim() || isNaN(Number(editAreaFee))) {
                  toast.error("Vui lòng nhập phí vận chuyển hợp lệ!");
                  return;
                }
                setIsUpdatingAreaSaving(true);
                try {
                  await updateAreaMutation.mutateAsync({
                    id: editingArea.id,
                    transportFee: Number(editAreaFee),
                  });
                  setEditingArea(null);
                } catch {
                } finally {
                  setIsUpdatingAreaSaving(false);
                }
              }}
              disabled={isUpdatingAreaSaving}
              className="h-10 rounded-xl font-bold flex-1 sm:flex-initial gap-1.5 text-xs"
            >
              {isUpdatingAreaSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Lưu phí ship
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Chỉnh sửa toàn bộ mốc thời lượng */}
      <Dialog open={isOpenMetaModal} onOpenChange={(open) => {
        setIsOpenMetaModal(open);
        if (!open) setEditingDurationIndex(null);
      }}>
        <DialogContent className="w-full sm:max-w-[560px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-slate-800">
              <Edit className="w-4 h-4 text-primary" />
              Chỉnh sửa mốc thời lượng
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Cập nhật toàn bộ thông tin cấu hình cho mốc thời lượng này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 border-t border-b border-border/30 my-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Row 1: Số giờ + Diện tích */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-800 flex items-center gap-1">
                  Số giờ <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    placeholder="2"
                    value={tempHours}
                    onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setTempHours(e.target.value); }}
                    onFocus={() => setIsOpenTempHoursDropdown(true)}
                    onBlur={() => setTimeout(() => setIsOpenTempHoursDropdown(false), 200)}
                    className={cn("h-10 text-sm font-bold pr-8", isOpenTempHoursDropdown ? "rounded-t-xl rounded-b-none border-b-transparent" : "rounded-xl")}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  {isOpenTempHoursDropdown && (
                    <div className="absolute z-50 w-full max-h-52 overflow-y-auto bg-white border border-slate-200 border-t-slate-100 rounded-b-xl shadow-lg">
                      {hourOptions.filter(opt => opt.toString().includes(tempHours || "")).map(opt => (
                        <button key={opt} type="button"
                          onMouseDown={() => { setTempHours(opt.toString()); setIsOpenTempHoursDropdown(false); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                        >
                          {opt} giờ ({opt * 60} phút)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {tempHours && <p className="text-[10px] text-primary font-bold">{formatHoursToMinutes(tempHours)}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-800">Diện tích mặc định (m²)</Label>
                <div className="relative">
                  <Input
                    inputMode="numeric"
                    placeholder="55"
                    value={tempArea}
                    onChange={e => setTempArea(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => setIsOpenTempAreaDropdown(true)}
                    onBlur={() => setTimeout(() => setIsOpenTempAreaDropdown(false), 200)}
                    className={cn("h-10 text-sm font-bold pr-8", isOpenTempAreaDropdown ? "rounded-t-xl rounded-b-none border-b-transparent" : "rounded-xl")}
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  {isOpenTempAreaDropdown && (
                    <div className="absolute z-50 w-full max-h-52 overflow-y-auto bg-white border border-slate-200 border-t-slate-100 rounded-b-xl shadow-lg">
                      {areaOptions.filter(opt => opt.toString().includes(tempArea || "")).map(opt => (
                        <button key={opt} type="button"
                          onMouseDown={() => { setTempArea(opt.toString()); setIsOpenTempAreaDropdown(false); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                        >
                          {opt} m²
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {tempArea && <p className="text-[10px] text-slate-500 font-semibold">{tempArea} m²</p>}
              </div>
            </div>

            {/* Row 2: Điều chỉnh giá */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-800">Điều chỉnh giá (%)</Label>
              <Select value={tempAdjustment} onValueChange={setTempAdjustment}>
                <SelectTrigger className="h-10 rounded-xl text-sm font-bold bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-60">
                  {adjustmentOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs font-semibold cursor-pointer">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {baseHourlyRate > 0 && tempHours && (
                <p className="text-[10px] text-primary font-bold">
                  Ước tính: {vnd(Number(tempHours) * baseHourlyRate * (1 + Number(tempAdjustment) / 100))}
                </p>
              )}
            </div>

            {/* Row 3: Số thợ (nếu allowMultipleTaskers) */}
            {allowMultipleTaskers && (
              <div className="space-y-1.5">
                <Label className="text-xs font-black text-slate-800">Số lượng thợ</Label>
                <Select value={tempTaskerCount} onValueChange={setTempTaskerCount}>
                  <SelectTrigger className="h-10 rounded-xl text-sm font-bold bg-white border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(n => (
                      <SelectItem key={n} value={n.toString()} className="text-xs font-semibold cursor-pointer">{n} thợ</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Row 4: Phổ biến + Trạng thái */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border/30 rounded-xl">
                <Switch checked={tempIsPopular} onCheckedChange={setTempIsPopular} />
                <div>
                  <p className="text-xs font-bold text-slate-800">Phổ biến</p>
                  <p className="text-[10px] text-slate-500">Hiển thị nhãn nổi bật</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border/30 rounded-xl">
                <Switch checked={tempIsActive} onCheckedChange={setTempIsActive} />
                <div>
                  <p className="text-xs font-bold text-slate-800">Hoạt động</p>
                  <p className="text-[10px] text-slate-500">Hiển thị với khách hàng</p>
                </div>
              </div>
            </div>

            {/* Row 5: Tiêu đề + Mô tả */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-800">Tiêu đề mốc (Tùy chọn)</Label>
              <Input
                placeholder="Ví dụ: Căn hộ nhỏ, Dọn dẹp cơ bản..."
                value={tempTitle}
                onChange={e => setTempTitle(e.target.value)}
                className="h-10 rounded-xl text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-800">Mô tả chi tiết (Tùy chọn)</Label>
              <textarea
                placeholder="Ví dụ: Thích hợp phòng trọ, căn hộ nhỏ 1 phòng ngủ..."
                value={tempDescription}
                onChange={e => setTempDescription(e.target.value)}
                rows={3}
                className="w-full min-h-[72px] text-xs font-semibold rounded-xl border border-slate-200 bg-background px-3 py-2 placeholder:text-slate-400 placeholder:font-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0 pt-2">
            <BaseButton
              type="button"
              variant="outline"
              onClick={() => { setIsOpenMetaModal(false); setEditingDurationIndex(null); }}
              className="py-2.5 px-4 rounded-xl text-xs font-bold h-10 flex-1 sm:flex-none"
            >
              Hủy
            </BaseButton>
            <BaseButton
              type="button"
              variant="primary"
              onClick={() => {
                if (editingDurationIndex === null) {
                  // Đang mở từ form thêm mới: chỉ write-back title/description và các trường đã nhập về newDuration
                  setNewDuration(prev => ({
                    ...prev,
                    title: tempTitle.trim(),
                    description: tempDescription.trim(),
                    durationHours: tempHours || prev.durationHours,
                    suggestedArea: tempArea || prev.suggestedArea,
                    priceAdjustment: tempAdjustment,
                    isPopular: tempIsPopular,
                    taskerCount: tempTaskerCount,
                  }));
                  setIsOpenMetaModal(false);
                  toast.success("Đã lưu tiêu đề & mô tả cho mốc mới!");
                  return;
                }
                const hours = parseFloat(tempHours);
                if (isNaN(hours) || hours <= 0) {
                  toast.error("Số giờ không hợp lệ!");
                  return;
                }
                if (hours > maxHours) {
                  toast.error(`Không được thiết lập giờ vượt quá giờ phục vụ tối đa của gói (${maxHours} giờ). Muốn tăng khung giờ hơn thì hãy đổi giờ phục vụ tối đa cao hơn.`);
                  return;
                }
                const adj = parseFloat(tempAdjustment) || 0;
                setDurations(prev => prev.map((x, idx) => idx === editingDurationIndex ? {
                  ...x,
                  durationHours: hours,
                  suggestedArea: tempArea ? Number(tempArea) : null,
                  priceMultiplier: 1 + adj / 100,
                  isPopular: tempIsPopular,
                  isActive: tempIsActive,
                  taskerCount: allowMultipleTaskers ? Number(tempTaskerCount) : x.taskerCount,
                  title: tempTitle.trim() || undefined,
                  description: tempDescription.trim() || undefined,
                } : tempIsPopular ? { ...x, isPopular: false } : x));
                setIsOpenMetaModal(false);
                setEditingDurationIndex(null);
                toast.success("Đã cập nhật mốc thời lượng!");
              }}
              className="py-2.5 px-5 rounded-xl text-xs font-bold h-10 flex-1 sm:flex-none"
            >
              Lưu thay đổi
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Xem chi tiết mốc thời lượng */}
      <Dialog open={!!viewingDuration} onOpenChange={(open) => !open && setViewingDuration(null)}>
        <DialogContent className="w-full sm:max-w-[500px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  {viewingDuration?.title || "—"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 font-medium mt-1">
                  Mốc thời lượng dịch vụ
                </DialogDescription>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {viewingDuration?.isPopular && (
                  <Badge className="bg-orange-500 text-white text-[9px] px-2 py-0.5 font-bold">Phổ biến</Badge>
                )}
                <Badge className={cn("text-[9px] px-2 py-0.5 font-bold", viewingDuration?.isActive ? "bg-emerald-500 text-white" : "bg-slate-300 text-slate-600")}>
                  {viewingDuration?.isActive ? "Hoạt động" : "Ngưng"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {viewingDuration && (
            <div className="space-y-3">
              {/* Stat grid 2x2 */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Số giờ làm việc", value: `${viewingDuration.durationHours} giờ`, sub: `${viewingDuration.durationHours * 60} phút` },
                  { label: "Diện tích mặc định", value: viewingDuration.suggestedArea ? `${viewingDuration.suggestedArea} m²` : "—", sub: "Diện tích gợi ý" },
                  { label: "Số lượng thợ", value: `${viewingDuration.taskerCount || 1} người`, sub: "Tasker thực hiện" },
                  {
                    label: "Điều chỉnh giá",
                    value: viewingDuration.priceMultiplier === 1.0 ? "Giá gốc" : viewingDuration.priceMultiplier < 1.0 ? `−${Math.round((1 - viewingDuration.priceMultiplier) * 100)}%` : `+${Math.round((viewingDuration.priceMultiplier - 1) * 100)}%`,
                    sub: viewingDuration.priceMultiplier === 1.0 ? "Không điều chỉnh" : "So với giá chuẩn",
                    valueColor: viewingDuration.priceMultiplier === 1.0 ? "text-slate-600" : viewingDuration.priceMultiplier < 1.0 ? "text-emerald-600" : "text-rose-600",
                  },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-semibold mb-1">{item.label}</p>
                    <p className={cn("text-base font-extrabold text-slate-800", item.valueColor)}>{item.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* Đơn giá ước tính */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1">Đơn giá Chuẩn</p>
                  <p className="text-sm font-extrabold text-slate-800">{vnd(viewingDuration.durationHours * baseHourlyRate * viewingDuration.priceMultiplier)}</p>
                </div>
                <div className="bg-primary/5 rounded-xl px-4 py-3 border border-primary/15">
                  <p className="text-[10px] text-primary/70 font-semibold mb-1">Đơn giá Premium</p>
                  <p className="text-sm font-extrabold text-primary">{vnd(viewingDuration.durationHours * premiumHourlyRate * viewingDuration.priceMultiplier)}</p>
                </div>
              </div>

              {/* Mô tả */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-semibold mb-1.5">Mô tả chi tiết</p>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                  {viewingDuration.description || <span className="italic text-slate-400">Chưa có mô tả.</span>}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <BaseButton
              type="button"
              variant="primary"
              onClick={() => setViewingDuration(null)}
              className="py-2.5 px-6 rounded-xl text-xs font-bold h-10 w-full sm:w-auto"
            >
              Đóng
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Chỉnh sửa addon ── */}
      <Dialog open={!!editAddonModal} onOpenChange={(open) => { if (!open) setEditAddonModal(null); }}>
        <DialogContent className="w-full sm:max-w-[600px] rounded-2xl p-0 overflow-hidden bg-card border border-border">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Edit className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">
                  Chỉnh sửa: {editAddonModal?.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">Cập nhật thông tin dịch vụ thêm</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editAddonModal && (
            <div className="px-6 py-5 space-y-4">
              {/* Row 1: Tên + Giá + Đơn vị */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1 space-y-1">
                  <label className="text-xs font-bold text-foreground">Tên dịch vụ thêm <span className="text-destructive">*</span></label>
                  <Input placeholder="Lau kính ban công" value={editAddonModal.name}
                    onChange={e => setEditAddonModal(p => p && ({ ...p, name: e.target.value }))}
                    className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Đơn giá phụ thu (₫) <span className="text-destructive">*</span></label>
                  <Input type="number" min="0" placeholder="50000" value={editAddonModal.price}
                    onChange={e => setEditAddonModal(p => p && ({ ...p, price: e.target.value }))}
                    className="h-10 rounded-xl" />
                  {editAddonModal.price && Number(editAddonModal.price) > 0 && (
                    <p className="text-[10px] text-muted-foreground">{Number(editAddonModal.price).toLocaleString("vi-VN")} ₫</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Đơn vị tính</label>
                  <Select value={editAddonModal.priceUnit} onValueChange={v => setEditAddonModal(p => p && ({ ...p, priceUnit: v as AddonPriceUnit }))}>
                    <SelectTrigger className="h-10 rounded-xl text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ADDON_PRICE_UNIT_LABELS) as [AddonPriceUnit, string][]).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Row 2: Thời gian + Số lượng + Thứ tự + Trạng thái */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Thời gian thêm (phút)</label>
                  <div className="relative">
                    <Input type="number" min="0" placeholder="0" value={editAddonModal.durationMinutes}
                      onChange={e => setEditAddonModal(p => p && ({ ...p, durationMinutes: e.target.value }))}
                      className="h-10 rounded-xl pr-12" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">phút</span>
                  </div>
                  {editAddonModal.durationMinutes && <p className="text-[10px] text-primary">{editAddonModal.durationMinutes} phút</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Số lượng tối đa</label>
                  <Input type="number" min="1" placeholder="∞ Không giới hạn" value={editAddonModal.maxQuantity}
                    onChange={e => setEditAddonModal(p => p && ({ ...p, maxQuantity: e.target.value }))}
                    className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Thứ tự hiển thị</label>
                  <Input type="number" min="1" placeholder="1" value={editAddonModal.sortOrder}
                    onChange={e => setEditAddonModal(p => p && ({ ...p, sortOrder: e.target.value }))}
                    className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Trạng thái</label>
                  <div className="h-10 flex items-center gap-2">
                    <Switch checked={editAddonModal.isActive} onCheckedChange={v => setEditAddonModal(p => p && ({ ...p, isActive: v }))} />
                    <span className={cn("text-xs font-bold", editAddonModal.isActive ? "text-emerald-600" : "text-muted-foreground")}>
                      {editAddonModal.isActive ? "Đang bật" : "Đã tắt"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Mô tả */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Mô tả chi tiết</label>
                <Textarea placeholder="Mô tả ngắn về dịch vụ thêm này..." value={editAddonModal.description}
                  onChange={e => setEditAddonModal(p => p && ({ ...p, description: e.target.value }))}
                  className="rounded-xl text-sm resize-none" rows={2} />
              </div>
              {/* Preview */}
              {editAddonModal.price && Number(editAddonModal.price) > 0 && (
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Giá hiển thị:</span>
                  <span className="text-sm font-black text-primary">{Number(editAddonModal.price).toLocaleString("vi-VN")} ₫</span>
                  <span className="text-xs text-slate-400">/ {ADDON_PRICE_UNIT_LABELS[editAddonModal.priceUnit]?.replace("Theo ", "")}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="px-6 pb-5 flex gap-2 border-t border-border/40 pt-4">
            <BaseButton type="button" variant="outline" className="flex-1 h-9 rounded-xl text-xs font-bold" onClick={() => setEditAddonModal(null)}>Huỷ</BaseButton>
            <BaseButton type="button" variant="primary" className="h-9 px-6 rounded-xl text-xs font-bold gap-1.5"
              onClick={() => {
                if (!editAddonModal) return;
                if (!editAddonModal.name.trim()) { toast.error("Vui lòng nhập tên dịch vụ thêm"); return; }
                const priceVal = Number(editAddonModal.price);
                if (isNaN(priceVal) || priceVal < 0) { toast.error("Đơn giá không hợp lệ"); return; }
                setAddons(prev => prev.map((a, i) => i === editAddonModal.idx ? {
                  ...a,
                  name: editAddonModal.name.trim(),
                  description: editAddonModal.description.trim() || undefined,
                  price: priceVal,
                  priceUnit: editAddonModal.priceUnit,
                  durationMinutes: editAddonModal.durationMinutes ? Number(editAddonModal.durationMinutes) : null,
                  maxQuantity: editAddonModal.maxQuantity ? Number(editAddonModal.maxQuantity) : null,
                  sortOrder: editAddonModal.sortOrder ? Number(editAddonModal.sortOrder) : undefined,
                  isActive: editAddonModal.isActive,
                } : a));
                toast.success("Đã cập nhật dịch vụ thêm");
                setEditAddonModal(null);
              }}>
              <Check className="w-3.5 h-3.5" /> Lưu thay đổi
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Xem chi tiết addon */}
      <Dialog open={!!viewingAddon} onOpenChange={(open) => !open && setViewingAddon(null)}>
        <DialogContent className="w-full sm:max-w-[440px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {viewingAddon?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">Chi tiết dịch vụ thêm</DialogDescription>
          </DialogHeader>
          {viewingAddon && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/5 rounded-xl px-4 py-3 border border-primary/10">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1">Đơn giá</p>
                  <p className="text-lg font-black text-primary">{vnd(viewingAddon.price)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1">Đơn vị tính</p>
                  <p className="text-xs font-bold text-slate-700">{ADDON_PRICE_UNIT_LABELS[viewingAddon.priceUnit ?? "per_item"]}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Thời gian thêm</p>
                  <p className="text-xs font-black text-slate-700">
                    {viewingAddon.durationMinutes ? `+${viewingAddon.durationMinutes} phút` : "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Số lượng tối đa</p>
                  <p className="text-xs font-black text-slate-700">
                    {viewingAddon.maxQuantity != null ? `≤ ${viewingAddon.maxQuantity}` : "∞"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold mb-0.5">Trạng thái</p>
                  <p className={cn("text-xs font-black", viewingAddon.isActive ? "text-emerald-600" : "text-rose-500")}>
                    {viewingAddon.isActive ? "Đang bật" : "Đã tắt"}
                  </p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-semibold mb-1.5">Mô tả</p>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                  {viewingAddon.description || <span className="italic text-slate-400">Chưa có mô tả.</span>}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-4 flex gap-2">
            <BaseButton type="button" variant="outline"
              onClick={() => {
                if (!viewingAddon) return;
                const idx = addons.findIndex(a => a === viewingAddon);
                if (idx !== -1) handleEditAddon(idx);
                setViewingAddon(null);
              }}
              className="py-2.5 px-5 rounded-xl text-xs font-bold h-10 flex-1">
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Chỉnh sửa
            </BaseButton>
            <BaseButton type="button" variant="primary"
              onClick={() => setViewingAddon(null)}
              className="py-2.5 px-6 rounded-xl text-xs font-bold h-10 flex-1">
              Đóng
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

      {/* ── Dialog Xem chi tiết khung giờ cao điểm ── */}
      <Dialog open={!!viewingPeakHour} onOpenChange={(open) => !open && setViewingPeakHour(null)}>
        <DialogContent className="w-full sm:max-w-[420px] rounded-2xl p-0 overflow-hidden bg-card border border-border">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">Chi tiết khung giờ cao điểm</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">Thông tin cấu hình tăng giá theo giờ</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {viewingPeakHour && (() => {
            const daysText = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Hàng ngày"];
            const pct = Math.round((viewingPeakHour.multiplier - 1) * 100);
            const fmt = (s: string) => s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;
            const [sh, sm] = viewingPeakHour.startHour.split(":").map(Number);
            const [eh, em] = viewingPeakHour.endHour.split(":").map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            const durText = mins > 0 ? (Math.floor(mins / 60) > 0 ? `${Math.floor(mins / 60)} giờ${mins % 60 > 0 ? ` ${mins % 60} phút` : ""}` : `${mins} phút`) : "";
            return (
              <div className="px-6 py-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">Ngày áp dụng</p>
                    <p className="text-sm font-extrabold text-foreground">{daysText[viewingPeakHour.dayOfWeek]}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{viewingPeakHour.dayOfWeek === 7 ? "Mọi ngày trong tuần" : `Chỉ ngày ${daysText[viewingPeakHour.dayOfWeek]}`}</p>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/15">
                    <p className="text-[10px] font-black text-primary/70 uppercase tracking-wider mb-1">Hệ số tăng giá</p>
                    <p className="text-xl font-black text-primary">+{pct}%</p>
                    <p className="text-[10px] text-primary/60 mt-0.5">{viewingPeakHour.multiplier}x giá gốc</p>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Khung giờ</p>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-extrabold rounded-lg px-3 py-1.5 text-sm">
                      <Clock className="w-3.5 h-3.5" />{viewingPeakHour.startHour} – {viewingPeakHour.endHour}
                    </span>
                    {durText && <span className="text-xs text-muted-foreground font-semibold">({durText})</span>}
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Thời hạn áp dụng</p>
                  {viewingPeakHour.startDate || viewingPeakHour.endDate ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-sm font-bold text-foreground">
                        {fmt(viewingPeakHour.startDate ?? "") ?? "…"} → {fmt(viewingPeakHour.endDate ?? "") ?? "…"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">Không giới hạn</span>
                  )}
                </div>
                <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-bold text-muted-foreground">Trạng thái</p>
                  <span className={cn("text-xs font-extrabold px-2.5 py-1 rounded-full", viewingPeakHour.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {viewingPeakHour.isActive ? "Đang hoạt động" : "Đã tắt"}
                  </span>
                </div>
              </div>
            );
          })()}
          <DialogFooter className="px-6 pb-5 flex gap-2 border-t border-border/40 pt-4">
            {viewingPeakHour && (() => {
              const idx = peakHours.indexOf(viewingPeakHour);
              return (
                <BaseButton type="button" variant="outline" className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5"
                  onClick={() => {
                    const p = viewingPeakHour;
                    setEditPeakHour({ dayOfWeek: String(p.dayOfWeek), startHour: p.startHour, endHour: p.endHour, multiplier: String(p.multiplier), startDate: p.startDate ?? "", endDate: p.endDate ?? "", isActive: p.isActive });
                    setEditingPeakHourIdx(idx);
                    setViewingPeakHour(null);
                  }}>
                  <Edit className="w-3.5 h-3.5" /> Chỉnh sửa
                </BaseButton>
              );
            })()}
            <BaseButton type="button" variant="primary" className="h-9 px-5 rounded-xl text-xs font-bold" onClick={() => setViewingPeakHour(null)}>Đóng</BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Chỉnh sửa khung giờ cao điểm ── */}
      <Dialog open={editingPeakHourIdx !== null} onOpenChange={(open) => { if (!open) setEditingPeakHourIdx(null); }}>
        <DialogContent className="w-full sm:max-w-[560px] rounded-2xl p-0 overflow-hidden bg-card border border-border">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Edit className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-foreground">Chỉnh sửa khung giờ cao điểm</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">Cập nhật thông tin cấu hình tăng giá</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-5">
            <div className="border border-border/40 rounded-xl bg-background divide-y divide-border/30">
              {/* Ngày */}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-extrabold text-foreground w-28 shrink-0">Ngày</span>
                <div className="flex flex-wrap gap-1.5">
                  {[["CN","0"],["T2","1"],["T3","2"],["T4","3"],["T5","4"],["T6","5"],["T7","6"],["Hàng ngày","7"]].map(([label, val]) => (
                    <button key={val} type="button"
                      onClick={() => setEditPeakHour(p => ({ ...p, dayOfWeek: val }))}
                      className={cn("px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors",
                        editPeakHour.dayOfWeek === val
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-700 border-slate-200 hover:border-primary/60 hover:text-primary"
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Khung giờ */}
              <div className="px-4 py-3 flex items-start gap-3">
                <span className="text-sm font-extrabold text-foreground w-28 shrink-0 pt-1">Khung giờ</span>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {[["Sáng sớm","06:00","08:00"],["Buổi sáng","08:00","11:00"],["Buổi trưa","11:00","14:00"],["Buổi chiều","14:00","17:00"],["Chiều tối","17:00","20:00"],["Buổi tối","19:00","22:00"],["Cả ngày","06:00","22:00"]].map(([label, s, e]) => (
                      <button key={label} type="button"
                        onClick={() => setEditPeakHour(p => ({ ...p, startHour: s, endHour: e }))}
                        className={cn("px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors",
                          editPeakHour.startHour === s && editPeakHour.endHour === e
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-slate-700 border-slate-200 hover:border-primary/60 hover:text-primary"
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="time" value={editPeakHour.startHour} onChange={e => setEditPeakHour(p => ({ ...p, startHour: e.target.value }))} className="h-8 rounded-lg text-xs w-32" />
                    <span className="text-slate-400 font-bold text-sm">→</span>
                    <Input type="time" value={editPeakHour.endHour} onChange={e => setEditPeakHour(p => ({ ...p, endHour: e.target.value }))} className="h-8 rounded-lg text-xs w-32" />
                  </div>
                </div>
              </div>
              {/* Tăng giá */}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-extrabold text-foreground w-28 shrink-0">Tăng giá</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[["10%","1.1"],["+15%","1.15"],["+20%","1.2"],["+25%","1.25"],["+30%","1.3"],["+50%","1.5"]].map(([label, val]) => (
                    <button key={val} type="button"
                      onClick={() => setEditPeakHour(p => ({ ...p, multiplier: val }))}
                      className={cn("px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors",
                        editPeakHour.multiplier === val
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-slate-700 border-slate-200 hover:border-primary/60 hover:text-primary"
                      )}>
                      +{label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors h-8 px-2.5">
                    <span className="text-xs font-extrabold text-primary select-none">+</span>
                    <input type="number" step="5" min="5" max="200"
                      value={String(Math.round((parseFloat(editPeakHour.multiplier || "1") - 1) * 100))}
                      onChange={e => {
                        const pct = Math.max(5, Math.min(200, parseInt(e.target.value || "5")));
                        setEditPeakHour(p => ({ ...p, multiplier: ((100 + pct) / 100).toFixed(2) }));
                      }}
                      className="w-10 text-xs font-extrabold bg-transparent outline-none text-center text-foreground" />
                    <span className="text-xs font-extrabold text-slate-400 select-none">%</span>
                  </div>
                  {parseFloat(editPeakHour.multiplier) > 1 && (
                    <span className="text-xs font-semibold text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
                      × {parseFloat(editPeakHour.multiplier).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              {/* Thời hạn */}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-extrabold text-foreground w-28 shrink-0">Thời hạn</span>
                <DateRangePicker
                  startDate={editPeakHour.startDate}
                  endDate={editPeakHour.endDate}
                  onStartChange={v => setEditPeakHour(p => ({ ...p, startDate: v }))}
                  onEndChange={v => setEditPeakHour(p => ({ ...p, endDate: v }))}
                  placeholder="Không giới hạn (để trống)"
                />
              </div>
              {/* Trạng thái */}
              <div className="px-4 py-3 flex items-center gap-3">
                <span className="text-sm font-extrabold text-foreground w-28 shrink-0">Trạng thái</span>
                <div className="flex items-center gap-2">
                  <Switch checked={editPeakHour.isActive} onCheckedChange={v => setEditPeakHour(p => ({ ...p, isActive: v }))} />
                  <span className="text-xs font-semibold text-muted-foreground">{editPeakHour.isActive ? "Đang hoạt động" : "Đã tắt"}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 pb-5 flex gap-2 border-t border-border/40 pt-4">
            <BaseButton type="button" variant="outline" className="flex-1 h-9 rounded-xl text-xs font-bold" onClick={() => setEditingPeakHourIdx(null)}>Huỷ</BaseButton>
            <BaseButton type="button" variant="primary" className="h-9 px-6 rounded-xl text-xs font-bold gap-1.5"
              onClick={() => {
                if (editingPeakHourIdx === null) return;
                setPeakHours(prev => prev.map((item, idx) =>
                  idx === editingPeakHourIdx
                    ? { ...item, dayOfWeek: parseInt(editPeakHour.dayOfWeek), startHour: editPeakHour.startHour, endHour: editPeakHour.endHour, multiplier: parseFloat(editPeakHour.multiplier), startDate: editPeakHour.startDate || null, endDate: editPeakHour.endDate || null, isActive: editPeakHour.isActive }
                    : item
                ));
                setEditingPeakHourIdx(null);
                toast.success("Đã cập nhật khung giờ cao điểm");
              }}>
              <Check className="w-3.5 h-3.5" /> Lưu thay đổi
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Inline table dropdowns rendered via portal to escape overflow:hidden ── */}
      {typeof window !== "undefined" && inlineDdRect && inlineEditingCell && (
        <>
          {inlineEditingCell?.field === 'hours' && createPortal(
            <div style={{ position: "fixed", top: inlineDdRect.top + 4, left: inlineDdRect.left, minWidth: 140, zIndex: 9999 }}
              className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl"
            >
              {hourOptions.filter(opt => opt.toString().includes(inlineEditValue || "")).map(opt => (
                <button key={opt} type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleInlineSave(inlineEditingCell.rowIndex, 'hours', opt.toString()); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                >
                  {opt} giờ ({opt * 60} phút)
                </button>
              ))}
            </div>,
            document.body
          )}
          {inlineEditingCell?.field === 'area' && createPortal(
            <div style={{ position: "fixed", top: inlineDdRect.top + 4, left: inlineDdRect.left, minWidth: 140, zIndex: 9999 }}
              className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl"
            >
              {areaOptions.filter(opt => opt.toString().includes(inlineEditValue || "")).map(opt => (
                <button key={opt} type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleInlineSave(inlineEditingCell.rowIndex, 'area', opt.toString()); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                >
                  {opt} m²
                </button>
              ))}
            </div>,
            document.body
          )}
          {inlineEditingCell?.field === 'adjustment' && createPortal(
            <div style={{ position: "fixed", top: inlineDdRect.top + 4, left: inlineDdRect.left, minWidth: 176, zIndex: 9999 }}
              className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl"
            >
              {adjustmentOptions
                .filter(opt =>
                  opt.label.toLowerCase().includes((inlineEditValue || "").toLowerCase()) ||
                  opt.value.includes(inlineEditValue || "")
                )
                .map(opt => (
                  <button key={opt.value} type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleInlineSave(inlineEditingCell.rowIndex, 'adjustment', opt.value); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                  >
                    {opt.label}
                  </button>
                ))}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
