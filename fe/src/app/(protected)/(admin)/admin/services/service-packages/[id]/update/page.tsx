"use client";

import React, { useState, useMemo, useCallback, useRef, KeyboardEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, DollarSign, ScrollText, Wrench,
  Loader2, ChevronRight, CheckCircle2, Info,
  Clock, Moon, PawPrint, Hammer, Timer,
  Search, Plus, X, Check, List, Settings2,
  AlertCircle, Image as ImageIcon,
  Trash2, Zap, Layers, MapPin, BarChart3,
  Edit, Eye, CheckSquare, ExternalLink, Shield, Sparkles, Heart, Star,
  Percent, Calendar, HelpCircle, Users, Home, TrendingUp, TrendingDown
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
  useUpdateAdminPackage, useAdminPackageDetail, useAdminServices, useCreateAdminService, useAddSubServicesToPackage, useCoverageAreas, useUpdateCoverageArea,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { usePeakDays, useCreatePeakDay } from "@/features/admin/hooks/useAdminPricing";
import { adminPricingApi } from "@/features/admin/services/admin-pricing.service";
import { adminServicesApi } from "@/features/admin/modules/service/services/admin-services.service";
import {
  UpdateAdminPackageDto, CreateAdminPackageDto, AdminServiceEntity, CoverageAreaEntity, PricingMode,
  ServiceDurationEntity, ServiceAddonEntity, AddonPriceUnit, ServiceSubscriptionEntity, SubscriptionBillingCycle, ServicePeakHourEntity, ServiceSubServiceEntity
} from "@/features/admin/modules/service/services/admin-services.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { adminWorkflowService } from "@/features/admin/modules/service/services/admin-workflow.service";
import { adminPolicyService } from "@/features/admin/modules/policy/services/admin-policy.service";
import { useAdminPolicies } from "@/features/admin/modules/policy/hooks/useAdminPolicies";
import { POLICY_CATEGORY_META, PolicyCategory } from "@/features/admin/modules/policy/types/policy.type";
import { CreateWorkflowStepDto } from "@/features/admin/modules/service/types/workflow.type";

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
function SubServiceCard({ svc, isSelected, onToggle, onPreview }: {
  svc: AdminServiceEntity;
  isSelected: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={cn("rounded-xl border-2 transition-all duration-200 overflow-hidden",
      isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 bg-card hover:border-primary/30")}>
      <div className="flex items-center gap-3 p-3">
        <button type="button" onClick={onToggle}
          className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </button>
        <button type="button" onClick={onToggle} className="relative h-11 w-11 rounded-xl overflow-hidden bg-muted/40 border border-border/40 shrink-0">
          {svc.thumbnailUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={svc.thumbnailUrl} alt={svc.name} className="w-full h-full object-cover" />
            : <div className="flex h-full items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground/30" /></div>}
        </button>
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm truncate">{svc.name}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold shrink-0">{svc.subServiceCode}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {svc.durationHours && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{svc.durationHours}h</span>}
            {svc.pricingConfig?.basePrice && <span className="text-xs text-primary font-bold">{vnd(Number(svc.pricingConfig.basePrice))}</span>}
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
              svc.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
              {svc.isActive ? "Bật" : "Tắt"}
            </span>
          </div>
        </button>
        <button type="button" onClick={onPreview}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
          title="Xem chi tiết">
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
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
export default function EditServicePackagePage({ params }: { params: React.Usable<{ id: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = React.use(params);
  
  const updatePackage = useUpdateAdminPackage();
  const createService = useCreateAdminService();
  const addSubServices = useAddSubServicesToPackage();

  // Fetch package details
  const { data: pkg, isLoading: isLoadingPkg, isError: isErrorPkg } = useAdminPackageDetail(id);

  // Fetch pricing tiers / old tiers
  const { data: oldTiers, isLoading: isLoadingTiers } = useQuery({
    queryKey: ['admin-pricing-tiers', id],
    queryFn: () => adminPricingApi.getTiersByPackage(id),
    enabled: !!id,
  });

  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
  const [activeTab, setActiveTab] = useState("durations");

  useEffect(() => {
    if (!allowSubscription && activeTab === "subscriptions") {
      setActiveTab("durations");
    }
  }, [allowSubscription, activeTab]);

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
  const [newPeakHour, setNewPeakHour] = useState({ dayOfWeek: "1", startHour: "08:00", endHour: "22:00", multiplier: "1.1", startDate: "", endDate: "", isActive: true });

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
  const [oldWorkflowId, setOldWorkflowId] = useState<string | null>(null);

  // Load dữ liệu cũ của gói dịch vụ
  useEffect(() => {
    if (pkg && !hasInitialized) {
      setName(pkg.name);
      setPackageCode(pkg.packageCode);
      setIconUrl(pkg.iconUrl || "");
      setGalleryUrls(pkg.galleryUrls || []);
      setPolicyDescription(pkg.policyDescription || "");
      setSortOrder(pkg.sortOrder);
      setIsActive(pkg.isActive);
      
      setPricingMode(pkg.pricingMode || "HOURLY");
      setMaxHours(pkg.maxHours);
      setPeakRatePercent(pkg.peakRatePercent);
      setNightSurcharge(pkg.nightSurcharge);
      setPetSurcharge(pkg.petSurcharge);
      setWaitingSurcharge(pkg.waitingSurcharge);
      setToolFee(pkg.toolFee);
      
      setBaseHourlyRate(Number(pkg.baseHourlyRate || 80000));
      setPremiumHourlyRate(Number(pkg.premiumHourlyRate || 120000));
      setAllowMultipleTaskers(!!pkg.allowMultipleTaskers);
      setAllowSubscription(!!pkg.allowSubscription);
      
      // Terms & conditions
      if (pkg.termsAndConditions) {
        const parts = pkg.termsAndConditions.split("\n--- PREMIUM ---\n");
        setTermsAndConditions(parts[0] || "");
        setPremiumTermsAndConditions(parts[1] || "");
      } else {
        setTermsAndConditions("");
        setPremiumTermsAndConditions("");
      }

      // Durations
      if (pkg.durations && pkg.durations.length > 0) {
        setDurations(pkg.durations.map(d => ({
          id: d.id,
          durationHours: d.durationHours,
          priceMultiplier: Number(d.priceMultiplier),
          isPopular: !!d.isPopular,
          isActive: !!d.isActive,
          suggestedArea: d.suggestedArea ? Number(d.suggestedArea) : null,
          taskerCount: d.taskerCount ? Number(d.taskerCount) : 1,
          title: d.title || "",
          description: d.description || "",
        })));
      }

      // Addons
      if (pkg.addons && pkg.addons.length > 0) {
        setAddons(pkg.addons.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description || "",
          price: Number(a.price),
          priceUnit: a.priceUnit ?? "per_item",
          durationMinutes: a.durationMinutes ?? null,
          maxQuantity: a.maxQuantity ?? null,
          sortOrder: a.sortOrder ?? undefined,
          isActive: !!a.isActive,
        })));
      }

      // Subscriptions
      if (pkg.subscriptions && pkg.subscriptions.length > 0) {
        setSubscriptions(pkg.subscriptions.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || "",
          bonusDescription: s.bonusDescription ?? "",
          discountPercent: Number(s.discountPercent),
          billingCycle: s.billingCycle ?? "monthly",
          sessionsPerCycle: s.sessionsPerCycle ?? null,
          commitmentMonths: s.commitmentMonths ?? null,
          isPopular: s.isPopular ?? false,
          sortOrder: s.sortOrder ?? 0,
          isActive: !!s.isActive,
        })));
      }

      // Peak Hours
      if (pkg.peakHours && pkg.peakHours.length > 0) {
        setPeakHours(pkg.peakHours.map(p => ({
          id: p.id,
          dayOfWeek: p.dayOfWeek,
          startHour: p.startHour,
          endHour: p.endHour,
          multiplier: Number(p.multiplier),
          startDate: p.startDate || null,
          endDate: p.endDate || null,
          isActive: !!p.isActive,
        })));
      }

      // Sub services
      if (pkg.packageSubServices && pkg.packageSubServices.length > 0) {
        setSelectedSubServices(pkg.packageSubServices.map(s => ({
          id: s.subService.id,
          name: s.subService.name,
          isRequired: !!s.isRequired,
          isDefault: !!s.isDefault,
          sortOrder: s.sortOrder ?? 0,
          price: s.price ? Number(s.price) : (s.subService.pricingConfig?.basePrice ? Number(s.subService.pricingConfig.basePrice) : 0),
          isActive: !!s.isActive,
        })));
      }
      
      // Coverage Areas
      if (pkg.coverageAreas && pkg.coverageAreas.length > 0) {
        setSelectedAreaIds(pkg.coverageAreas.map(a => a.id));
      }

      setHasInitialized(true);
    }
  }, [pkg, hasInitialized]);

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

  const handleInlineSave = useCallback((rowIndex: number, field: 'hours' | 'area' | 'taskerCount' | 'adjustment', value: string) => {
    setDurations(prev => {
      return prev.map((d, i) => {
        if (i !== rowIndex) return d;
        const updated = { ...d };
        if (field === 'hours') {
          const val = parseFloat(value);
          if (!isNaN(val) && val > 0 && val <= 24) {
            updated.durationHours = val;
          } else {
            toast.error("Số giờ phải nằm trong khoảng từ 0.1 đến 24!");
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
  }, []);

  // Area options: 55, 75, 95, ... up to 1500
  const areaOptions = useMemo(() => {
    const opts: number[] = [];
    for (let val = 55; val < 1500; val += 20) {
      opts.push(val);
    }
    opts.push(1500);
    return opts;
  }, []);

  // Hour options: 1, 1.5, 2, 2.5, ... up to 24
  const hourOptions = useMemo(() => {
    const opts: number[] = [];
    for (let h = 1.0; h <= 24.0; h += 0.5) {
      opts.push(h);
    }
    return opts;
  }, []);

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

  const removeSelected = (id: string) => setSelectedSubServices(prev => prev.filter(s => s.id !== id));

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

  const ADDON_PRICE_UNIT_LABELS: Record<AddonPriceUnit, string> = {
    per_item: "Theo dịch vụ",
    per_room: "Theo phòng",
    per_m2: "Theo m²",
    per_session: "Theo buổi",
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

    if (editingAddonIndex !== null) {
      setAddons(prev => prev.map((a, i) => i === editingAddonIndex ? { ...a, ...addonEntry } : a));
      setEditingAddonIndex(null);
      toast.success("Đã cập nhật dịch vụ thêm");
    } else {
      setAddons(prev => [...prev, addonEntry]);
      toast.success("Đã thêm dịch vụ thêm");
    }
    resetNewAddon();
  };

  const handleEditAddon = (i: number) => {
    const a = addons[i];
    setNewAddon({
      name: a.name,
      description: a.description ?? "",
      price: String(a.price),
      priceUnit: a.priceUnit ?? "per_item",
      durationMinutes: a.durationMinutes != null ? String(a.durationMinutes) : "",
      maxQuantity: a.maxQuantity != null ? String(a.maxQuantity) : "",
      sortOrder: a.sortOrder != null ? String(a.sortOrder) : "",
      isActive: a.isActive,
    });
    setEditingAddonIndex(i);
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
    setIsSaving(true);
    try {
      const payload: UpdateAdminPackageDto = {
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
        coverageAreaIds: selectedAreaIds.length > 0 ? selectedAreaIds : [],
        
        baseHourlyRate: Number(baseHourlyRate),
        premiumHourlyRate: Number(premiumHourlyRate),
        allowMultipleTaskers,
        allowSubscription,
        
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

      await updatePackage.mutateAsync({ id, payload });

      // Link dịch vụ con: Xóa toàn bộ liên kết cũ và gán liên kết mới
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
          sortOrder: s.sortOrder
        })));
      }

      // Cập nhật workflow
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

      // Gán chính sách
      await adminPolicyService.assignToPackage(id, selectedPolicyIds);

      toast.success("Cập nhật gói dịch vụ thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-packages", "detail", id] });
      router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.DETAIL(id));
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
    } finally {
      setIsSaving(false);
    }
  };

  const isSubmitting = updatePackage.isPending || isSaving;

  if (isLoadingPkg || isLoadingTiers) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-(--c-primary-strong) animate-spin" />
      </div>
    );
  }

  if (isErrorPkg || !pkg) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BaseEmptyState 
          title="Không tìm thấy gói dịch vụ" 
          description="Gói dịch vụ này có thể đã bị xóa hoặc không tồn tại." 
        />
        <BaseButton className="mt-6" onClick={() => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.BASE)}>
          Quay lại danh sách
        </BaseButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BaseButton variant="outline" size="icon" onClick={() => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.DETAIL(id))}
          className="rounded-full h-10 w-10 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </BaseButton>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-800 font-bold">Quản lý Gói Dịch vụ</p>
          <h1 className="text-2xl font-black text-foreground leading-tight">Cập nhật gói dịch vụ</h1>
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
                <Field label="Trạng thái khi tạo">
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
            </div>
          </SectionCard>

          <SectionCard icon={DollarSign} title="Cấu hình chi tiết bảng giá dịch vụ" description="Thiết lập các thông số tính toán chi phí, tùy chọn dịch vụ, các mức thời lượng và các gói thành viên.">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={cn(
                "grid grid-cols-2 w-full bg-slate-200/60 p-1 rounded-lg mb-4 gap-1 h-auto",
                allowSubscription ? "md:grid-cols-5" : "md:grid-cols-4"
              )}>
                <TabsTrigger value="durations" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group">
                  <Clock className="w-3.5 h-3.5 mr-1.5 transition-colors text-primary group-data-[state=active]:text-white" />
                  Thời lượng
                </TabsTrigger>
                <TabsTrigger value="addons" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group">
                  <Plus className="w-3.5 h-3.5 mr-1.5 transition-colors text-primary group-data-[state=active]:text-white" />
                  Dịch vụ thêm
                </TabsTrigger>
                <TabsTrigger value="subservices" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group">
                  <Wrench className="w-3.5 h-3.5 mr-1.5 transition-colors text-primary group-data-[state=active]:text-white" />
                  Tùy chọn (Con)
                </TabsTrigger>
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
                {/* Form thêm / chỉnh sửa addon */}
                <div className={cn("p-4 border rounded-2xl space-y-4 transition-colors",
                  editingAddonIndex !== null
                    ? "bg-amber-50/50 border-amber-300/60 dark:bg-amber-900/10 dark:border-amber-700/40"
                    : "bg-muted/10 border-border/30")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">
                      {editingAddonIndex !== null
                        ? `Đang chỉnh sửa: ${addons[editingAddonIndex]?.name}`
                        : "Thêm dịch vụ thêm mới (Ví dụ: Lau kính ngoài, Vệ sinh tủ lạnh, Dọn thêm phòng)"}
                    </p>
                    {editingAddonIndex !== null && (
                      <button type="button" onClick={() => { setEditingAddonIndex(null); resetNewAddon(); }}
                        className="text-xs font-bold px-3 py-1 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground">
                        Huỷ sửa
                      </button>
                    )}
                  </div>

                  {/* Row 1: Thông tin chính */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Tên dịch vụ thêm" required>
                      <Input placeholder="Lau kính ban công" value={newAddon.name}
                        onChange={e => setNewAddon(p => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Đơn giá phụ thu (₫)" required>
                      <Input type="number" placeholder="50000" value={newAddon.price}
                        onChange={e => setNewAddon(p => ({ ...p, price: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Đơn vị tính" tooltip="Cách tính giá khi khách chọn addon này">
                      <Select value={newAddon.priceUnit} onValueChange={v => setNewAddon(p => ({ ...p, priceUnit: v as AddonPriceUnit }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_item">Theo dịch vụ (mỗi lần)</SelectItem>
                          <SelectItem value="per_room">Theo phòng</SelectItem>
                          <SelectItem value="per_m2">Theo m²</SelectItem>
                          <SelectItem value="per_session">Theo buổi</SelectItem>
                          <SelectItem value="fixed">Cố định</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  {/* Row 2: Cấu hình bổ sung */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Field label="Thời gian thêm (phút)" tooltip="Thời gian phát sinh thêm khi khách chọn addon này">
                      <Input type="number" placeholder="30" value={newAddon.durationMinutes}
                        onChange={e => setNewAddon(p => ({ ...p, durationMinutes: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Số lượng tối đa" tooltip="Giới hạn khách có thể chọn tối đa bao nhiêu đơn vị. Để trống = không giới hạn">
                      <Input type="number" placeholder="Không giới hạn" value={newAddon.maxQuantity}
                        onChange={e => setNewAddon(p => ({ ...p, maxQuantity: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Thứ tự hiển thị" tooltip="Số nhỏ hơn hiển thị trước">
                      <Input type="number" placeholder="0" value={newAddon.sortOrder}
                        onChange={e => setNewAddon(p => ({ ...p, sortOrder: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Trạng thái">
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={newAddon.isActive} onCheckedChange={v => setNewAddon(p => ({ ...p, isActive: v }))} />
                        <span className="text-xs font-semibold">{newAddon.isActive ? "Đang bật" : "Đã tắt"}</span>
                      </div>
                    </Field>
                  </div>

                  {/* Row 3: Mô tả full width */}
                  <Field label="Mô tả chi tiết">
                    <Input placeholder="Thực hiện lau chùi kính toàn bộ khu vực ban công, loại bỏ vết bẩn cứng đầu..." value={newAddon.description}
                      onChange={e => setNewAddon(p => ({ ...p, description: e.target.value }))} className="h-10 rounded-xl" />
                  </Field>

                  <div className="flex justify-end">
                    <BaseButton type="button" onClick={handleSaveAddon}
                      className={cn("h-10 rounded-xl font-bold text-white px-6",
                        editingAddonIndex !== null ? "bg-amber-500 hover:bg-amber-600" : "bg-primary")}>
                      {editingAddonIndex !== null ? "Lưu thay đổi" : "+ Thêm dịch vụ thêm"}
                    </BaseButton>
                  </div>
                </div>

                {/* Bảng danh sách addons */}
                {addons.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                    Chưa có dịch vụ thêm nào. Thêm ở form bên trên.
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
                          <th className="py-3 px-4">Mô tả</th>
                          <th className="py-3 px-4 text-right">Đơn giá</th>
                          <th className="py-3 px-4 text-center">Đơn vị</th>
                          <th className="py-3 px-4 text-center">T.Gian</th>
                          <th className="py-3 px-4 text-center">Tối đa</th>
                          <th className="py-3 px-4 text-center">Thứ tự</th>
                          <th className="py-3 px-4 text-center">Bật/Tắt</th>
                          <th className="py-3 px-4 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {addons.map((a, i) => (
                          <tr key={i} className={cn("transition-colors",
                            editingAddonIndex === i ? "bg-amber-50/60 dark:bg-amber-900/10" : "hover:bg-muted/10")}>
                            <td className="py-3 px-4 font-bold text-foreground">{a.name}</td>
                            <td className="py-3 px-4 text-muted-foreground max-w-[180px] truncate">{a.description || "—"}</td>
                            <td className="py-3 px-4 text-right font-semibold text-primary whitespace-nowrap">{vnd(a.price)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary whitespace-nowrap">
                                {ADDON_PRICE_UNIT_LABELS[a.priceUnit ?? "per_item"]}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {a.durationMinutes ? `${a.durationMinutes} phút` : "—"}
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {a.maxQuantity ?? "∞"}
                            </td>
                            <td className="py-3 px-4 text-center text-muted-foreground">
                              {a.sortOrder ?? "—"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Switch checked={a.isActive}
                                onCheckedChange={v => setAddons(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <button type="button" onClick={() => handleEditAddon(i)}
                                  className="p-1.5 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => {
                                  setAddons(prev => prev.filter((_, idx) => idx !== i));
                                  if (editingAddonIndex === i) { setEditingAddonIndex(null); resetNewAddon(); }
                                }}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
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

              {/* TAB 3: SUB-SERVICES (TÙY CHỌN DỊCH VỤ CON) */}
              <TabsContent value="subservices" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-xs font-bold text-foreground">Chọn và cấu hình giá riêng cho các dịch vụ con đi kèm trong gói này</p>
                  
                  {/* Search and Select Sub Services */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Tìm kiếm nhanh dịch vụ con..." value={searchSvc}
                      onChange={e => setSearchSvc(e.target.value)} className="h-10 rounded-xl pl-9 text-sm" />
                  </div>
                  
                  {filteredSvcs.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">
                      <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />Không tìm thấy dịch vụ con nào phù hợp.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                      {filteredSvcs.map(svc => (
                        <SubServiceCard key={svc.id} svc={svc}
                          isSelected={!!selectedSubServices.find(s => s.id === svc.id)}
                          onToggle={() => toggleSelect(svc)}
                          onPreview={() => setPreviewSubService(svc)} />
                      ))}
                    </div>
                  )}

                  {selectedSubServices.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-border/30">
                      <Label className="text-sm font-bold block">Danh sách dịch vụ con đã chọn & Bảng giá riêng biệt</Label>
                      {selectedSubServices.map((s, idx) => {
                        const fullSvc = allSubServices.find(x => x.id === s.id);
                        return (
                          <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-border/40 rounded-xl bg-muted/10">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate text-foreground">{s.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Giá mặc định: {fullSvc?.pricingConfig?.basePrice ? vnd(Number(fullSvc.pricingConfig.basePrice)) : "Chưa có"}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap shrink-0">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-xs font-semibold">Giá riêng (₫):</Label>
                                <Input
                                  type="number"
                                  value={s.price === 0 ? "" : s.price}
                                  onChange={e => updateSelected(s.id, { price: Number(e.target.value) })}
                                  className="w-28 h-8 rounded-lg text-xs"
                                  placeholder="Nhập giá riêng"
                                />
                              </div>

                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <Switch checked={s.isRequired} onCheckedChange={v => updateSelected(s.id, { isRequired: v })} />
                                <span className="text-xs font-semibold">Bắt buộc</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <Switch checked={s.isDefault} onCheckedChange={v => updateSelected(s.id, { isDefault: v })} />
                                <span className="text-xs font-semibold">Mặc định</span>
                              </label>

                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <Switch checked={s.isActive} onCheckedChange={v => updateSelected(s.id, { isActive: v })} />
                                <span className="text-xs font-semibold">Bật</span>
                              </label>

                              <button type="button" onClick={() => removeSelected(s.id)}
                                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 4: SUBSCRIPTIONS */}
              <TabsContent value="subscriptions" className="space-y-4">
                {/* Quick presets */}
                <div className="flex flex-wrap gap-2 p-3 bg-emerald-50/60 border border-emerald-200/50 rounded-xl">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide self-center mr-1">Thêm nhanh:</span>
                  {SUBSCRIPTION_PRESETS.map(preset => (
                    <button key={preset.label} type="button"
                      onClick={() => setNewSubscription(p => ({ ...p, ...preset.data }))}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-xs">
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Form */}
                <div className={cn("p-4 border rounded-2xl space-y-4 transition-colors",
                  editingSubscriptionIndex !== null
                    ? "bg-amber-50/50 border-amber-300/60"
                    : "bg-muted/10 border-border/30")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">
                      {editingSubscriptionIndex !== null
                        ? `Đang chỉnh sửa: ${subscriptions[editingSubscriptionIndex]?.name}`
                        : "Thêm cấu hình gói định kỳ mới"}
                    </p>
                    {editingSubscriptionIndex !== null && (
                      <button type="button" onClick={() => { setEditingSubscriptionIndex(null); resetNewSubscription(); }}
                        className="text-xs font-bold px-3 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80">
                        Huỷ sửa
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Field label="Tên gói định kỳ" required>
                      <Input placeholder="Gói quý (12 buổi)" value={newSubscription.name}
                        onChange={e => setNewSubscription(p => ({ ...p, name: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Chu kỳ thanh toán" tooltip="Khách sẽ được lập hóa đơn theo chu kỳ này">
                      <Select value={newSubscription.billingCycle} onValueChange={v => setNewSubscription(p => ({ ...p, billingCycle: v as SubscriptionBillingCycle }))}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Hàng tuần</SelectItem>
                          <SelectItem value="biweekly">2 tuần/lần</SelectItem>
                          <SelectItem value="monthly">Hàng tháng</SelectItem>
                          <SelectItem value="quarterly">Hàng quý (3 tháng)</SelectItem>
                          <SelectItem value="yearly">Hàng năm</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Số buổi/chu kỳ" tooltip="Tổng buổi dọn được gồm trong 1 chu kỳ">
                      <Input type="number" placeholder="12" value={newSubscription.sessionsPerCycle}
                        onChange={e => setNewSubscription(p => ({ ...p, sessionsPerCycle: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Cam kết tối thiểu (tháng)" tooltip="Số tháng khách phải duy trì gói">
                      <Input type="number" placeholder="3" value={newSubscription.commitmentMonths}
                        onChange={e => setNewSubscription(p => ({ ...p, commitmentMonths: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Field label="Giảm giá (%)" required>
                      <Input type="number" min="0" max="100" placeholder="15" value={newSubscription.discountPercent}
                        onChange={e => setNewSubscription(p => ({ ...p, discountPercent: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Thứ tự hiển thị">
                      <Input type="number" placeholder="0" value={newSubscription.sortOrder}
                        onChange={e => setNewSubscription(p => ({ ...p, sortOrder: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Phổ biến">
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={newSubscription.isPopular} onCheckedChange={v => setNewSubscription(p => ({ ...p, isPopular: v }))} />
                        <span className="text-xs font-semibold">{newSubscription.isPopular ? "Hiện badge Phổ biến" : "Không"}</span>
                      </div>
                    </Field>
                    <Field label="Trạng thái">
                      <div className="flex items-center gap-2 h-10">
                        <Switch checked={newSubscription.isActive} onCheckedChange={v => setNewSubscription(p => ({ ...p, isActive: v }))} />
                        <span className="text-xs font-semibold">{newSubscription.isActive ? "Đang bật" : "Đã tắt"}</span>
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Mô tả ưu đãi">
                      <Input placeholder="Tiết kiệm 15% khi cam kết 3 tháng dọn dẹp định kỳ..." value={newSubscription.description}
                        onChange={e => setNewSubscription(p => ({ ...p, description: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                    <Field label="Ưu đãi thêm (Bonus)" tooltip="Ví dụ: Tặng 1 buổi dọn sâu miễn phí mỗi quý">
                      <Input placeholder="Tặng 2 buổi dọn sâu miễn phí/năm..." value={newSubscription.bonusDescription}
                        onChange={e => setNewSubscription(p => ({ ...p, bonusDescription: e.target.value }))} className="h-10 rounded-xl" />
                    </Field>
                  </div>

                  <div className="flex justify-end">
                    <BaseButton type="button" onClick={handleSaveSubscription}
                      className={cn("h-10 rounded-xl font-bold text-white px-6",
                        editingSubscriptionIndex !== null ? "bg-amber-500 hover:bg-amber-600" : "bg-primary")}>
                      {editingSubscriptionIndex !== null ? "Lưu thay đổi" : "+ Thêm gói định kỳ"}
                    </BaseButton>
                  </div>
                </div>

                {subscriptions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                    Chưa có cấu hình gói tháng nào. Dùng nút thêm nhanh hoặc điền form ở trên.
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
              <TabsContent value="peakhours" className="space-y-4">
                <div className="p-4 bg-muted/10 border border-border/30 rounded-2xl space-y-4">
                  <p className="text-xs font-bold text-foreground">Thiết lập khung giờ cao điểm riêng cho gói dịch vụ này</p>
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Field label="Thứ trong tuần">
                        <Select value={newPeakHour.dayOfWeek} onValueChange={v => setNewPeakHour(p => ({ ...p, dayOfWeek: v }))}>
                          <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="1">Thứ Hai</SelectItem>
                            <SelectItem value="2">Thứ Ba</SelectItem>
                            <SelectItem value="3">Thứ Tư</SelectItem>
                            <SelectItem value="4">Thứ Năm</SelectItem>
                            <SelectItem value="5">Thứ Sáu</SelectItem>
                            <SelectItem value="6">Thứ Bảy</SelectItem>
                            <SelectItem value="0">Chủ Nhật</SelectItem>
                            <SelectItem value="7">Hàng ngày</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Giờ bắt đầu">
                        <Input type="time" value={newPeakHour.startHour}
                          onChange={e => setNewPeakHour(p => ({ ...p, startHour: e.target.value }))} className="h-10 rounded-xl text-xs" />
                      </Field>
                      <Field label="Giờ kết thúc">
                        <Input type="time" value={newPeakHour.endHour}
                          onChange={e => setNewPeakHour(p => ({ ...p, endHour: e.target.value }))} className="h-10 rounded-xl text-xs" />
                      </Field>
                      <Field label="Hệ số phụ thu" hint="1.2 = +20% giá">
                        <Input type="number" step="0.05" placeholder="1.2" value={newPeakHour.multiplier}
                          onChange={e => setNewPeakHour(p => ({ ...p, multiplier: e.target.value }))} className="h-10 rounded-xl text-xs" />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <Field label="Áp dụng từ ngày" hint="Để trống nếu muốn áp dụng cho mọi ngày">
                        <Input type="date" value={newPeakHour.startDate}
                          onChange={e => setNewPeakHour(p => ({ ...p, startDate: e.target.value }))} className="h-10 rounded-xl text-xs" />
                      </Field>
                      <Field label="Đến ngày" hint="Để trống nếu muốn áp dụng vô thời hạn">
                        <Input type="date" value={newPeakHour.endDate}
                          onChange={e => setNewPeakHour(p => ({ ...p, endDate: e.target.value }))} className="h-10 rounded-xl text-xs" />
                      </Field>
                      <BaseButton type="button" onClick={handleSavePeakHour} className="h-10 rounded-xl font-bold bg-primary text-white text-xs w-full">
                        + Thêm khung giờ
                      </BaseButton>
                    </div>
                  </div>
                </div>

                {peakHours.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                    Chưa có cấu hình khung giờ cao điểm riêng cho gói này.
                  </div>
                ) : (
                  <div className="border border-border/30 rounded-lg overflow-hidden bg-card shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/30 text-slate-800 uppercase font-extrabold tracking-wider text-[11px]">
                          <th className="py-3.5 px-4 font-bold">Ngày áp dụng</th>
                          <th className="py-3.5 px-4 font-bold">Khung giờ</th>
                          <th className="py-3.5 px-4 font-bold text-center">Hệ số tăng giá</th>
                          <th className="py-3.5 px-4 font-bold text-center">Trạng thái</th>
                          <th className="py-3.5 px-4 font-bold text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {peakHours.map((p, i) => {
                          const daysText = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Hàng ngày"];
                          return (
                            <tr key={i} className="hover:bg-muted/10 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-bold text-foreground block">{daysText[p.dayOfWeek]}</span>
                                {p.startDate || p.endDate ? (
                                  <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                                    {p.startDate ? new Date(p.startDate).toLocaleDateString("vi-VN") : "..."} - {p.endDate ? new Date(p.endDate).toLocaleDateString("vi-VN") : "..."}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">Mọi ngày</span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400">{p.startHour} - {p.endHour}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-rose-600">+{Math.round((p.multiplier - 1) * 100)}% ({p.multiplier}x)</td>
                              <td className="py-3 px-4 text-center">
                                <Switch checked={p.isActive} onCheckedChange={v => setPeakHours(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button type="button" onClick={() => setPeakHours(prev => prev.filter((_, idx) => idx !== i))}
                                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Card 1: Thông tin cơ bản */}
              <SectionCard icon={Package} title="Thông tin cơ bản">
                <div className="divide-y divide-border/20 border border-border/30 rounded-xl overflow-hidden bg-muted/5">
                  <ReviewRow label="Tên gói" value={name} />
                  <ReviewRow label="Mã gói" value={<code className="text-primary text-xs bg-primary/10 px-2 py-0.5 rounded font-mono">{packageCode}</code>} />
                  <ReviewRow label="Mô tả chính sách" value={policyDescription || "Không có"} />
                  <ReviewRow label="Thứ tự hiển thị" value={sortOrder} />
                  <ReviewRow label="Trạng thái" value={<Badge className={isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}>{isActive ? "Kích hoạt" : "Lưu nháp"}</Badge>} />
                  <ReviewRow label="Ảnh đại diện" value={iconUrl ? "Đã tải lên" : "Không có"} />
                  <ReviewRow label="Ảnh gallery" value={`${galleryUrls.filter(Boolean).length} ảnh`} />
                </div>
              </SectionCard>

              {/* Card 2: Thiết lập nâng cao */}
              <SectionCard icon={Settings2} title="Thiết lập nâng cao & Đơn giá">
                <div className="divide-y divide-border/20 border border-border/30 rounded-xl overflow-hidden bg-muted/5">
                  <ReviewRow label="Đơn giá giờ Chuẩn" value={vnd(baseHourlyRate)} />
                  <ReviewRow label="Đơn giá giờ Premium" value={vnd(premiumHourlyRate)} />
                  <ReviewRow label="Nhiều thợ cùng làm" value={allowMultipleTaskers ? "Cho phép" : "Không"} />
                  <ReviewRow label="Cho phép gói tháng" value={allowSubscription ? "Cho phép" : "Không"} />
                  <ReviewRow label="Phí ship mặc định" value="Mặc định toàn bộ Hà Nội" />
                </div>
              </SectionCard>

              {/* Phụ phí bổ sung đã ẩn/xóa */}
            </div>

            <div className="space-y-6">
              {/* Card 4: Bảng giá v2 */}
              <SectionCard icon={BarChart3} title="Các mốc giá & Tùy chọn con">
                <div className="divide-y divide-border/20 border border-border/30 rounded-xl overflow-hidden bg-muted/5">
                  <ReviewRow label="Số mốc thời lượng" value={`${durations.length} mốc`} />
                  <ReviewRow label="Số dịch vụ đi kèm (Addon)" value={`${addons.length} dịch vụ`} />
                  <ReviewRow label="Khung giờ cao điểm riêng" value={`${peakHours.length} khung giờ`} />
                  <ReviewRow label="Cấu hình chu kỳ gói tháng" value={`${subscriptions.length} chu kỳ`} />
                </div>
              </SectionCard>

              {/* Card 5: Điều khoản & Quy trình */}
              <SectionCard icon={ScrollText} title="Quy trình & Điều khoản">
                <div className="divide-y divide-border/20 border border-border/30 rounded-xl overflow-hidden bg-muted/5">
                  <ReviewRow label="Số bước quy trình thực hiện" value={`${workflowSteps.length} bước`} />
                  <ReviewRow label="Cam kết chất lượng" value={`${commitments.length} cam kết`} />
                  <ReviewRow label="Chính sách gán kèm từ thư viện" value={`${selectedPolicyIds.length} chính sách`} />
                  <ReviewRow label="Điều khoản áp dụng riêng" value={termsAndConditions ? "Đã nhập" : "Không có"} />
                  <ReviewRow label="Quy chuẩn Premium riêng" value={premiumTermsAndConditions ? "Đã nhập" : "Không có"} />
                </div>
              </SectionCard>
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t border-border/30">
            <BaseButton variant="outline" onClick={() => setStep(3)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={handleSubmit} disabled={isSubmitting}
              className="h-11 px-8 rounded-xl font-bold gap-2 flex-1 md:flex-none">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo...</> : <><CheckCircle2 className="w-4 h-4" />Tạo gói dịch vụ</>}
            </BaseButton>
          </div>
        </div>
      )}

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
                const hours = parseFloat(tempHours);
                if (isNaN(hours) || hours <= 0 || hours > 24) {
                  toast.error("Số giờ phải từ 0.1 đến 24!");
                  return;
                }
                if (editingDurationIndex !== null) {
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
                }
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
              <div className="flex gap-1.5 flex-shrink-0">
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

      {/* ── Inline table dropdowns rendered via portal to escape overflow:hidden ── */}
      {typeof window !== "undefined" && inlineDdRect && (
        <>
          {isOpenInlineHoursDropdown && createPortal(
            <div style={{ position: "fixed", top: inlineDdRect.top + 4, left: inlineDdRect.left, minWidth: 140, zIndex: 9999 }}
              className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl"
            >
              {hourOptions.filter(opt => opt.toString().includes(inlineEditValue || "")).map(opt => (
                <button key={opt} type="button"
                  onMouseDown={() => inlineEditingCell && handleInlineSave(inlineEditingCell.rowIndex, 'hours', opt.toString())}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                >
                  {opt} giờ ({opt * 60} phút)
                </button>
              ))}
            </div>,
            document.body
          )}
          {isOpenInlineAreaDropdown && createPortal(
            <div style={{ position: "fixed", top: inlineDdRect.top + 4, left: inlineDdRect.left, minWidth: 140, zIndex: 9999 }}
              className="max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl"
            >
              {areaOptions.filter(opt => opt.toString().includes(inlineEditValue || "")).map(opt => (
                <button key={opt} type="button"
                  onMouseDown={() => inlineEditingCell && handleInlineSave(inlineEditingCell.rowIndex, 'area', opt.toString())}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 font-semibold text-slate-700"
                >
                  {opt} m²
                </button>
              ))}
            </div>,
            document.body
          )}
          {isOpenInlineAdjustmentDropdown && createPortal(
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
                    onMouseDown={() => inlineEditingCell && handleInlineSave(inlineEditingCell.rowIndex, 'adjustment', opt.value)}
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