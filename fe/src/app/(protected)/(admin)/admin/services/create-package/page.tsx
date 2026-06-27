"use client";

import React, { useState, useMemo, useCallback, useRef, KeyboardEvent } from "react";
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
  Ruler, ClipboardList,
  Shuffle
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
  useCreateAdminPackage, useAdminServices, useCreateAdminService, useAddSubServicesToPackage, useCoverageAreas, useUpdateCoverageArea,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { usePricingConfigs, usePeakDays, useCreatePeakDay } from "@/features/admin/hooks/useAdminPricing";
import { adminPricingApi, CreatePeakDayConfigDto } from "@/features/admin/services/admin-pricing.service";
import { adminServicesApi } from "@/features/admin/modules/service/services/admin-services.service";
import {
  CreateAdminPackageDto, AdminServiceEntity, CoverageAreaEntity, PricingMode,
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
  { id: 7, label: "Xem lại & Tạo",   icon: CheckCircle2 },
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
    <div className={cn(
      "rounded-2xl border-2 overflow-hidden transition-all",
      isIncluded ? "border-[#0E9F6E]/70 dark:border-[#0E9F6E]/50 bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]"
                 : "border-[#E11D48]/70 dark:border-[#E11D48]/50 bg-[rgba(225,29,72,0.12)] dark:bg-[rgba(225,29,72,0.12)]",
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3 border-b",
        isIncluded ? "border-[#0E9F6E]/50 bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)]"
                   : "border-[#E11D48]/50 bg-[rgba(225,29,72,0.12)] dark:bg-[rgba(225,29,72,0.12)]",
      )}>
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
          isIncluded ? "bg-[#0E9F6E]" : "bg-[#E11D48]",
        )}>
          {isIncluded
            ? <Check className="w-3 h-3 text-white" aria-hidden="true" />
            : <X className="w-3 h-3 text-white" aria-hidden="true" />}
        </div>
        <span className={cn(
          "text-xs font-black uppercase tracking-widest",
          isIncluded ? "text-[#0E9F6E] dark:text-[#0E9F6E]" : "text-[#E11D48] dark:text-[#E11D48]",
        )}>
          {isIncluded ? "Công việc bao gồm" : "Không bao gồm"}
        </span>
        <span className={cn(
          "ml-auto text-xs font-bold rounded-full px-2 py-0.5",
          isIncluded ? "bg-[#0E9F6E] text-[#0E9F6E]" : "bg-[#E11D48] text-[#E11D48]",
        )}>
          {value.length} mục
        </span>
      </div>
      <div className="min-h-[72px] p-3 flex flex-wrap gap-2 cursor-text" onClick={() => inputRef.current?.focus()}>
        {value.map((tag, i) => (
          <span key={i} className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all group",
            isIncluded
              ? "bg-[#0E9F6E] text-[#0E9F6E] dark:text-[#0E9F6E] border border-[#0E9F6E]/50 hover:border-[#0E9F6E]"
              : "bg-[#E11D48] text-[#E11D48] dark:text-[#E11D48] border border-[#E11D48]/50 hover:border-[#E11D48]",
          )}>
            <GripVertical className="w-3 h-3 opacity-30" aria-hidden="true" />
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(i); }}
              className={cn(
                "rounded-full w-4 h-4 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity",
                isIncluded ? "hover:bg-[#0E9F6E]" : "hover:bg-[#E11D48]",
              )}
            >
              <X className="w-2.5 h-2.5" aria-hidden="true" />
            </button>
          </span>
        ))}

        {/* Inline input */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={value.length === 0 ? placeholder : "Thêm mục..."}
            className="flex-1 bg-transparent outline-none text-xs text-[var(--c-ink)] placeholder:text-[var(--c-muted)] py-1"
          />
          {input.trim() && (
            <button
              type="button"
              onClick={add}
              className={cn(
                "text-xs font-bold px-2 py-1 rounded-lg transition-colors shrink-0",
                isIncluded ? "bg-[#0E9F6E] text-[#0E9F6E] hover:bg-[#0E9F6E]"
                           : "bg-[#E11D48] text-[#E11D48] hover:bg-[#E11D48]",
              )}
            >
              + Thêm
            </button>
          )}
        </div>
      </div>

      <div className={cn(
        "px-4 py-2 border-t text-[10px]",
        isIncluded ? "border-[#0E9F6E]/40 text-[#0E9F6E]" : "border-[#E11D48]/40 text-[#E11D48]",
      )}>
        Enter hoặc dấu phẩy để thêm · Backspace để xoá mục cuối
      </div>
    </div>
  );
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, description, headerAction, children }: {
  icon: React.ElementType; title: string; description?: string; headerAction?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><Icon className="w-4 h-4 text-primary" /></div>
          <div>
            <h3 className="font-bold text-foreground text-base">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-bold">
        {label}{required && <span className="text-[#E11D48] ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-[var(--c-muted)]">{hint}</p>}
    </div>
  );
}

// ─── PricingTypeForm ──────────────────────────────────────────────────────────

function PricingTypeForm({
  pricingType, value, onChange,
}: {
  pricingType: string;
  value: QuickCreateSubService;
  onChange: (v: QuickCreateSubService) => void;
}) {
  const set = (k: keyof QuickCreateSubService, v: string) => onChange({ ...value, [k]: v });

  if (pricingType === "FIXED") {
    return (
      <div className="rounded-xl border border-[#0E9F6E]/60 bg-[rgba(14,159,110,0.12)] dark:bg-[rgba(14,159,110,0.12)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#0E9F6E]" aria-hidden="true" />
          <span className="text-sm font-black text-[#0E9F6E] dark:text-[#0E9F6E]">FIXED — Giá cố định</span>
        </div>
        <p className="text-xs text-[var(--c-muted)]">Khách hàng trả một mức giá cố định, không phụ thuộc vào thời gian thực tế.</p>
        <Field label="Giá cố định" required hint="Giá niêm yết hiển thị cho khách hàng">
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric" placeholder="VD: 150000"
              value={value.fixedPrice}
              onChange={(e) => set("fixedPrice", e.target.value.replace(/\D/g, ""))}
              className="h-10 rounded-xl flex-1"
            />
            <span className="text-sm font-bold text-[var(--c-muted)] shrink-0">₫</span>
          </div>
          {value.fixedPrice && Number(value.fixedPrice) > 0 && (
            <p className="text-xs font-bold text-[#0E9F6E] mt-1">{vnd(Number(value.fixedPrice))}</p>
          )}
        </Field>
      </div>
    );
  }

  if (pricingType === "HOURLY") {
    return (
      <div className="rounded-xl border border-[#2563EB]/60 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
          <span className="text-sm font-black text-[#2563EB] dark:text-[#2563EB]">HOURLY — Tính theo giờ</span>
        </div>
        <p className="text-xs text-[var(--c-muted)]">Giá tính theo số giờ làm việc thực tế, nhân viên báo cáo giờ vào/ra.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Giá mỗi giờ" required>
            <div className="flex items-center gap-2">
              <Input
                inputMode="numeric" placeholder="VD: 80000"
                value={value.hourlyRate}
                onChange={(e) => set("hourlyRate", e.target.value.replace(/\D/g, ""))}
                className="h-10 rounded-xl"
              />
              <span className="text-sm font-bold text-[var(--c-muted)] shrink-0">₫/h</span>
            </div>
            {value.hourlyRate && Number(value.hourlyRate) > 0 && (
              <p className="text-xs font-bold text-[#2563EB] mt-1">{vnd(Number(value.hourlyRate))}/giờ</p>
            )}
          </Field>
          <Field label="Số giờ tối thiểu" hint="Để 0 nếu không giới hạn">
            <div className="flex items-center gap-2">
              <Input
                inputMode="decimal" placeholder="VD: 2"
                value={value.minHours}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^\d*\.?\d*$/.test(v)) set("minHours", v);
                }}
                className="h-10 rounded-xl"
              />
              <span className="text-sm font-bold text-[var(--c-muted)] shrink-0">giờ</span>
            </div>
          </Field>
        </div>
        {value.hourlyRate && value.minHours && Number(value.hourlyRate) > 0 && Number(value.minHours) > 0 && (
          <div className="bg-[#2563EB] rounded-lg p-2.5 text-xs text-[#2563EB] dark:text-[#2563EB]">
            💡 Đơn tối thiểu: <strong>{vnd(Number(value.hourlyRate) * Number(value.minHours))}</strong>
            {" "}({value.minHours} giờ × {vnd(Number(value.hourlyRate))}/giờ)
          </div>
        )}
      </div>
    );
  }

  if (pricingType === "CUSTOM") {
    return (
      <div className="rounded-xl border border-[#7C3AED]/60 bg-[rgba(124,58,237,0.12)] dark:bg-[rgba(124,58,237,0.12)] p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shuffle className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
          <span className="text-sm font-black text-[#7C3AED] dark:text-[#7C3AED]">CUSTOM — Tuỳ chỉnh</span>
        </div>
        <p className="text-xs text-[var(--c-muted)]">
          Cấu trúc giá tùy chỉnh — VD: tính theo diện tích, số phòng, gói combo...
        </p>
        <Field label="Mô tả cấu trúc giá" hint="Nhân viên và khách hàng sẽ thấy mô tả này">
          <Textarea
            placeholder={"VD: Giá tính theo diện tích:\n• Dưới 50m²: 150.000đ\n• 50–80m²: 220.000đ\n• 80–120m²: 320.000đ\n• Trên 120m²: Liên hệ báo giá"}
            value={value.pricingNote}
            onChange={(e) => set("pricingNote", e.target.value)}
            rows={5}
            className="rounded-xl text-sm resize-none font-mono"
          />
        </Field>
      </div>
    );
  }

  return null;
}

// ─── SubServiceCard ───────────────────────────────────────────────────────────

function SubServiceCard({ svc, isSelected, onToggle, onPreview }: {
  svc: AdminServiceEntity;
  isSelected: boolean;
  onToggle: () => void;
  onPreview?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  return (
    <div className={cn(
      "rounded-xl border-2 transition-all duration-200 overflow-hidden",
      isSelected
        ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)] shadow-sm shadow-primary/20"
        : "border-[var(--c-line)]/40 bg-[var(--c-card)] hover:border-[var(--c-primary)]/30",
    )}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
            isSelected ? "border-[var(--c-primary)] bg-[var(--c-primary)]" : "border-[var(--c-muted)]",
          )}
        >
          {isSelected && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
        </button>

        {/* Thumbnail */}
        <button type="button" onClick={onToggle} className="relative h-11 w-11 rounded-xl overflow-hidden bg-[var(--c-card-2)] border border-[var(--c-line)]/40 shrink-0">
          {svc.thumbnailUrl
            ? <img src={svc.thumbnailUrl} alt={svc.name} className="w-full h-full object-cover" />
            : <div className="flex h-full items-center justify-center"><ImageIcon className="w-5 h-5 text-[var(--c-muted)]" /></div>}
        </button>

        {/* Info */}
        <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-[var(--c-ink)] truncate">{svc.name}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] font-bold shrink-0">
              {svc.subServiceCode}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {svc.durationHours && (
              <span className="flex items-center gap-1 text-xs text-[var(--c-muted)]">
                <Clock className="w-3 h-3" aria-hidden="true" />{svc.durationHours}h
              </span>
            )}
            {svc.pricingConfig?.basePrice && (
              <span className="text-xs text-[var(--c-primary-strong)] font-bold">
                {vnd(Number(svc.pricingConfig.basePrice))}
              </span>
            )}
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
              svc.isActive ? "bg-[rgba(14,159,110,0.12)] text-[#0E9F6E]" : "bg-[rgba(225,29,72,0.12)] text-[#E11D48]",
            )}>
              {svc.isActive ? "Bật" : "Tắt"}
            </span>
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Toggle expand info */}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-[var(--c-card-2)] transition-colors text-[var(--c-muted)] hover:text-[var(--c-ink)]"
            title="Xem thông tin cơ bản"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
          {/* Preview sheet */}
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="p-1.5 rounded-lg hover:bg-[rgba(14,159,110,0.12)] transition-colors text-[var(--c-muted)] hover:text-[#0E9F6E]"
              title="Xem chi tiết"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          {/* Open detail page */}
          <button
            type="button"
            onClick={() => router.push(`/admin/services/${svc.id}`)}
            className="p-1.5 rounded-lg hover:bg-[rgba(37,99,235,0.12)] dark:hover:bg-[rgba(37,99,235,0.12)] transition-colors text-[var(--c-muted)] hover:text-[#2563EB]"
            title="Xem trang chi tiết"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Expanded info panel */}
      {expanded && (
        <div className="border-t border-[var(--c-line)]/30 bg-[var(--c-card-2)] px-4 py-3 space-y-2">
          {svc.shortDescription && (
            <p className="text-xs text-[var(--c-muted)] leading-relaxed">{svc.shortDescription}</p>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {svc.coverageArea && (
              <span className="text-[var(--c-muted)]">🗺️ <strong>Khu vực:</strong> {svc.coverageArea}</span>
            )}
            {svc.pricingType && (
              <span className="text-[var(--c-muted)]">💱 <strong>Loại giá:</strong> {svc.pricingType}</span>
            )}
          </div>
          {((svc.includedTasks?.length ?? 0) > 0 || (svc.excludedTasks?.length ?? 0) > 0) && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {(svc.includedTasks?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[9px] font-black text-[#0E9F6E] uppercase tracking-wider mb-1">Bao gồm</p>
                  <ul className="space-y-0.5">
                    {(svc.includedTasks ?? []).slice(0, 3).map((t: string, i: number) => (
                      <li key={i} className="flex items-start gap-1 text-xs text-[#0E9F6E] dark:text-[#0E9F6E]">
                        <Check className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />{t}
                      </li>
                    ))}
                    {(svc.includedTasks?.length ?? 0) > 3 && (
                      <li className="text-xs text-[var(--c-muted)] italic">+{(svc.includedTasks?.length ?? 0) - 3} nữa...</li>
                    )}
                  </ul>
                </div>
              )}
              {(svc.excludedTasks?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[9px] font-black text-[#E11D48] uppercase tracking-wider mb-1">Không gồm</p>
                  <ul className="space-y-0.5">
                    {(svc.excludedTasks ?? []).slice(0, 3).map((t: string, i: number) => (
                      <li key={i} className="flex items-start gap-1 text-xs text-[#E11D48] dark:text-[#E11D48]">
                        <X className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />{t}
                      </li>
                    ))}
                    {(svc.excludedTasks?.length ?? 0) > 3 && (
                      <li className="text-xs text-[var(--c-muted)] italic">+{(svc.excludedTasks?.length ?? 0) - 3} nữa...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── QuickCreateForm ──────────────────────────────────────────────────────────

function QuickCreateForm({
  value, onChange, pricingConfigs,
}: {
  value: QuickCreateSubService;
  onChange: (v: QuickCreateSubService) => void;
  pricingConfigs: { id: string; name: string; basePrice?: number }[];
}) {
  const set = (k: keyof QuickCreateSubService, v: QuickCreateSubService[keyof QuickCreateSubService]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-5">
      {/* Tên + Thời lượng */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Tên dịch vụ con" required>
          <Input placeholder="VD: Dọn dẹp căn hộ 1 phòng ngủ" value={value.name}
            onChange={(e) => set("name", e.target.value)} className="h-10 rounded-xl" />
        </Field>
        <Field label="Thời lượng" hint="Giờ">
          <Select value={value.durationHours} onValueChange={(v) => set("durationHours", v)}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Chọn thời lượng..." />
            </SelectTrigger>
            <SelectContent className="cz-admin">
              {["0.5","1","1.5","2","2.5","3","4","5","6","8"].map(h => (
                <SelectItem key={h} value={h}>{h} giờ</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Mô tả ngắn" hint="Hiển thị trong danh sách, tối đa 120 ký tự">
        <Input placeholder="Dịch vụ dọn dẹp tiêu chuẩn cho căn hộ nhỏ..."
          value={value.shortDescription} onChange={(e) => set("shortDescription", e.target.value)}
          className="h-10 rounded-xl" maxLength={120} />
      </Field>

      <Field label="Mô tả chi tiết">
        <Textarea placeholder="Mô tả đầy đủ về công việc, yêu cầu, lưu ý..." rows={3}
          value={value.description} onChange={(e) => set("description", e.target.value)}
          className="rounded-xl text-sm resize-none" />
      </Field>

      {/* Khu vực */}
      <Field label="Khu vực phục vụ">
        <Select value={value.coverageArea} onValueChange={(v) => set("coverageArea", v)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Chọn khu vực..." />
          </SelectTrigger>
          <SelectContent className="cz-admin">
            {["Toàn quốc","Hà Nội","TP. Hồ Chí Minh","Đà Nẵng","Hải Phòng","Cần Thơ"].map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Loại tính giá */}
      <div className="space-y-3">
        <Field label="Loại tính giá">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "FIXED",  label: "Cố định",   icon: Zap,     desc: "Một mức giá" },
              { v: "HOURLY", label: "Theo giờ",   icon: Clock,   desc: "Tính mỗi giờ" },
              { v: "CUSTOM", label: "Tuỳ chỉnh",  icon: Shuffle, desc: "Tự định nghĩa" },
            ].map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => set("pricingType", opt.v)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center",
                  value.pricingType === opt.v
                    ? "border-[var(--c-primary)] bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)]"
                    : "border-[var(--c-line)]/40 hover:border-[var(--c-primary)]/30 text-[var(--c-muted)] hover:text-[var(--c-ink)]",
                )}
              >
                <opt.icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-xs font-bold">{opt.label}</span>
                <span className="text-[10px] opacity-70">{opt.desc}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Dynamic pricing form */}
        <PricingTypeForm pricingType={value.pricingType} value={value} onChange={onChange} />
      </div>

      {/* Bảng giá liên kết */}
      <Field label="Bảng giá liên kết" hint="Tùy chọn — dùng bảng giá đã cấu hình sẵn">
        <Select value={value.pricingConfigId} onValueChange={(v) => set("pricingConfigId", v)}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Chọn bảng giá có sẵn..." />
          </SelectTrigger>
          <SelectContent className="cz-admin">
            <SelectItem value="none">-- Không liên kết --</SelectItem>
            {pricingConfigs.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.basePrice ? ` (${vnd(c.basePrice)})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Thumbnail + Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-sm font-bold">
            Ảnh đại diện
            <span className="text-xs text-[var(--c-muted)] font-normal ml-2">Thumbnail card</span>
          </Label>
          <ImageUpload
            value={value.thumbnailUrl}
            onChange={(url) => set("thumbnailUrl", url)}
            onRemove={() => set("thumbnailUrl", "")}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-bold">
            Ảnh gallery
            <span className="text-xs text-[var(--c-muted)] font-normal ml-2">Nhiều ảnh trang chi tiết</span>
          </Label>
          <MultipleImageUpload
            value={(value.galleryUrls ?? []).filter(Boolean)}
            onChange={(urls) => set("galleryUrls", urls ?? [])}
          />
        </div>
      </div>

      {/* Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TaskTagInput
          value={value.includedTasks}
          onChange={(v) => set("includedTasks", v)}
          placeholder="VD: Lau sàn, quét nhà, lau bếp..."
          variant="included"
        />
        <TaskTagInput
          value={value.excludedTasks}
          onChange={(v) => set("excludedTasks", v)}
          placeholder="VD: Không giặt thảm, không leo cao..."
          variant="excluded"
        />
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3 p-3 bg-[var(--c-card-2)] rounded-xl border border-[var(--c-line)]/40">
        <Switch checked={value.isActive} onCheckedChange={(v) => set("isActive", v)} />
        <span className={cn("text-sm font-semibold", value.isActive ? "text-[#0E9F6E]" : "text-[var(--c-muted)]")}>
          {value.isActive ? "Kích hoạt ngay sau khi tạo" : "Lưu nháp"}
        </span>
      </div>
    </div>
  );
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

function StepIndicator({ current, onStepClick }: { current: number; onStepClick: (id: number) => void }) {
  return (
    <div className="flex items-center gap-0 flex-wrap">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < current;
        const isCurrent = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                isCurrent
                  ? "bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] cursor-default"
                  : isCompleted
                    ? "text-[#0E9F6E] hover:bg-[rgba(14,159,110,0.12)] dark:hover:bg-[rgba(14,159,110,0.12)] cursor-pointer"
                    : "text-[var(--c-muted)] hover:bg-[var(--c-card-2)] cursor-pointer",
              )}
            >
              {isCompleted
                ? <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                : <step.icon className="w-4 h-4" aria-hidden="true" />}
              <span className={cn("text-xs font-bold hidden sm:block", isCurrent ? "text-[var(--c-primary-strong)]" : "")}>
                {step.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-[var(--c-muted)] shrink-0" aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ReviewRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 px-4 border-b border-[var(--c-line)]/30 last:border-0">
      <span className="text-sm text-[var(--c-muted)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--c-ink)] text-right">{value || "—"}</span>
    </div>
  );
}

// ─── SurchargeField ───────────────────────────────────────────────────────────

function SurchargeField({ icon: Icon, label, hint, value, onChange, suffix = "VND", iconColor = "text-[var(--c-primary-strong)]" }: {
  icon: React.ElementType; label: string; hint: string;
  value: number; onChange: (v: number) => void; suffix?: string; iconColor?: string;
}) {
  return (
    <div className="flex flex-col gap-2 bg-[var(--c-card-2)] border border-[var(--c-line)]/40 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4 shrink-0", iconColor)} aria-hidden="true" />
        <span className="text-sm font-bold text-[var(--c-ink)]">{label}</span>
      </div>
      <p className="text-xs text-[var(--c-muted)]">{hint}</p>
      <div className="flex items-center gap-2 mt-1">
        <Input inputMode="numeric" value={value === 0 ? "" : String(value)}
          onChange={e => { const d = e.target.value.replace(/\D/g, ""); onChange(d ? Number(d) : 0); }}
          className="h-9 rounded-xl text-sm flex-1" />
        <span className="text-xs text-[var(--c-muted)] font-semibold shrink-0">{suffix}</span>
      </div>
      {value > 0 && <p className="text-xs font-bold text-[var(--c-primary-strong)]">{vnd(value)}</p>}
    </div>
  );
}

// ─── PricingTierCard ──────────────────────────────────────────────────────────
function PricingTierCard({ tier, onUpdate, onRemove }: {
  tier: PricingTierForm;
  onUpdate: (t: PricingTierForm) => void;
  onRemove: () => void;
}) {
  const set = (k: keyof PricingTierForm, v: string | boolean | number) => onUpdate({ ...tier, [k]: v });
  const num = (v: string) => v.replace(/\D/g, "");

  const modeColors: Record<PricingMode, string> = {
    HOURLY: "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10",
    AREA_HOURLY: "border-violet-200 bg-violet-50/50 dark:bg-violet-900/10",
    FIXED: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10",
  };

  return (
    <div className={cn("rounded-2xl border-2 p-5 space-y-4 relative", modeColors[tier.pricingMode])}>
      <button type="button" onClick={onRemove}
        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
        <Field label="Tên mức giá" required>
          <Input value={tier.name} onChange={e => set("name", e.target.value)}
            placeholder={tier.pricingMode === "HOURLY" ? "VD: 2 giờ cơ bản" : tier.pricingMode === "AREA_HOURLY" ? "VD: Căn hộ 30–60m²" : "VD: Gói tiêu chuẩn"}
            className="h-10 rounded-xl" />
        </Field>
        <Field label="Mô tả ngắn">
          <Input value={tier.description} onChange={e => set("description", e.target.value)}
            placeholder="Mô tả cho khách hàng..." className="h-10 rounded-xl" />
        </Field>
      </div>

      {tier.pricingMode === "HOURLY" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Giá/giờ" required hint="VND/giờ">
            <div className="flex items-center gap-1">
              <Input inputMode="numeric" value={tier.pricePerHour} onChange={e => set("pricePerHour", num(e.target.value))}
                placeholder="80000" className="h-9 rounded-xl text-sm" />
              <span className="text-xs text-muted-foreground shrink-0">₫/h</span>
            </div>
            {tier.pricePerHour && <p className="text-xs font-bold text-blue-600">{vnd(Number(tier.pricePerHour))}/h</p>}
          </Field>
          <Field label="Giờ tối thiểu">
            <Input inputMode="numeric" value={tier.minHours} onChange={e => set("minHours", num(e.target.value))}
              placeholder="2" className="h-9 rounded-xl text-sm" />
          </Field>
          <Field label="Giờ tối đa">
            <Input inputMode="numeric" value={tier.maxHours} onChange={e => set("maxHours", num(e.target.value))}
              placeholder="8" className="h-9 rounded-xl text-sm" />
          </Field>
          <Field label="Giờ mặc định">
            <Input inputMode="numeric" value={tier.defaultHours} onChange={e => set("defaultHours", num(e.target.value))}
              placeholder="3" className="h-9 rounded-xl text-sm" />
          </Field>
          {tier.pricePerHour && tier.minHours && (
            <div className="col-span-4 bg-blue-500/5 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
              💡 Đơn tối thiểu: <strong>{vnd(Number(tier.pricePerHour) * Number(tier.minHours))}</strong>
              {" "}({tier.minHours}h × {vnd(Number(tier.pricePerHour))}/h)
            </div>
          )}
        </div>
      )}

      {tier.pricingMode === "AREA_HOURLY" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Diện tích từ (m²)" required>
            <Input inputMode="numeric" value={tier.areaMinM2} onChange={e => set("areaMinM2", num(e.target.value))}
              placeholder="30" className="h-9 rounded-xl text-sm" />
          </Field>
          <Field label="Diện tích đến (m²)" required>
            <Input inputMode="numeric" value={tier.areaMaxM2} onChange={e => set("areaMaxM2", num(e.target.value))}
              placeholder="60" className="h-9 rounded-xl text-sm" />
          </Field>
          <Field label="Giá/m²/giờ" required hint="VND mỗi m² mỗi giờ">
            <div className="flex items-center gap-1">
              <Input inputMode="numeric" value={tier.pricePerM2} onChange={e => set("pricePerM2", num(e.target.value))}
                placeholder="15000" className="h-9 rounded-xl text-sm" />
              <span className="text-xs text-muted-foreground shrink-0">₫/m²/h</span>
            </div>
          </Field>
          <Field label="Giờ tối thiểu">
            <Input inputMode="numeric" value={tier.minHours} onChange={e => set("minHours", num(e.target.value))}
              placeholder="2" className="h-9 rounded-xl text-sm" />
          </Field>
          <Field label="Giờ tối đa">
            <Input inputMode="numeric" value={tier.maxHours} onChange={e => set("maxHours", num(e.target.value))}
              placeholder="8" className="h-9 rounded-xl text-sm" />
          </Field>
          <Field label="Giờ mặc định">
            <Input inputMode="numeric" value={tier.defaultHours} onChange={e => set("defaultHours", num(e.target.value))}
              placeholder="3" className="h-9 rounded-xl text-sm" />
          </Field>
          {tier.pricePerM2 && tier.areaMinM2 && tier.areaMaxM2 && (
            <div className="col-span-3 bg-violet-500/5 rounded-xl p-3 text-xs text-violet-700 dark:text-violet-300">
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

// ─── AreaChip (outside component to avoid recreate-during-render) ─────────────
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

// ─── AreaGroup (outside component) ───────────────────────────────────────────
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
  const someGroupSelected = groupIds.some(id => selected.includes(id));

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

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function CreatePackagePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createPackage = useCreateAdminPackage();
  const createService = useCreateAdminService();
  const addSubServices = useAddSubServicesToPackage();

  const { data: servicesData } = useAdminServices({ limit: 100 });
  const { data: pricingData } = usePricingConfigs({ limit: 100 });
  const { data: coverageAreas = [] } = useCoverageAreas("Hà Nội");
  const allSubServices = useMemo(() => servicesData?.items ?? [], [servicesData]);
  const pricingConfigs = useMemo(() => pricingData?.items ?? [], [pricingData]);

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

  // ── STEP 3: Pricing Tiers ──
  const [tiers, setTiers] = useState<PricingTierForm[]>([]);

  // ── STEP 4: Dịch vụ con ──
  const [searchSvc, setSearchSvc] = useState("");
  const [selectedSubServices, setSelectedSubServices] = useState<SelectedSubService[]>([]);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreate, setQuickCreate] = useState<QuickCreateSubService>(defaultQuickCreate);

  // ── STEP 5: Khu vực phục vụ ──
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  // Chỉnh sửa phí vận chuyển quận huyện
  const updateAreaMutation = useUpdateCoverageArea();
  const [editingArea, setEditingArea] = useState<CoverageAreaEntity | null>(null);
  const [editAreaFee, setEditAreaFee] = useState("");
  const [isUpdatingAreaSaving, setIsUpdatingAreaSaving] = useState(false);

  // ── STEP 6: Điều khoản ──
  const [termsAndConditions, setTermsAndConditions] = useState("");

  // Cấu hình Khung giờ cao điểm hệ thống
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

  // Cam kết chất lượng
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

  // ── QUICK PRICING DIALOG FOR SUB-SERVICES ──
  const [subServiceToEditPrice, setSubServiceToEditPrice] = useState<AdminServiceEntity | null>(null);
  const [previewSubService, setPreviewSubService] = useState<AdminServiceEntity | null>(null);
  const [quickPriceType, setQuickPriceType] = useState<"FIXED" | "HOURLY">("FIXED");
  const [quickPriceVal, setQuickPriceVal] = useState("");
  const [quickPricingNote, setQuickPricingNote] = useState("");
  const [isEditingPriceSaving, setIsEditingPriceSaving] = useState(false);

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

  const updateSelected = (id: string, patch: Partial<SelectedSubService>) =>
    setSelectedSubServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));

  const removeSelected = (id: string) => setSelectedSubServices(prev => prev.filter(s => s.id !== id));

  const addTier = () => setTiers(prev => [...prev, newTier(pricingMode, prev.length)]);
  const updateTier = (id: string, t: PricingTierForm) => setTiers(prev => prev.map(x => x.id === id ? t : x));
  const removeTier = (id: string) => setTiers(prev => prev.filter(x => x.id !== id));

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
        // Cập nhật pricing config hiện tại
        await adminPricingApi.updatePricingConfig({
          id: pricingConfigId,
          payload: {
            name: configName,
            basePrice: basePriceVal,
          }
        });
        toast.success("Đã cập nhật bảng giá dịch vụ con thành công!");
      } else {
        // Tạo mới pricing config
        const newConfig = await adminPricingApi.createPricingConfig({
          name: configName,
          basePrice: basePriceVal,
          description: `Tạo nhanh từ cấu hình dịch vụ con`,
        } as Parameters<typeof adminPricingApi.createPricingConfig>[0]);
        pricingConfigId = newConfig.id;

        // Cập nhật lại dịch vụ con để liên kết pricingConfigId mới
        await adminServicesApi.updateService({
          id: subServiceToEditPrice.id,
          payload: {
            pricingConfigId,
            pricingType: quickPriceType,
          }
        });
        toast.success("Đã tạo và gán bảng giá mới cho dịch vụ con!");
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });

      // Đóng Dialog
      setSubServiceToEditPrice(null);
    } catch (err) {
      toast.error("Có lỗi xảy ra khi cập nhật giá!");
      console.error(err);
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
    try {
      // 1. Tạo gói chính
      const payload: CreateAdminPackageDto = {
        name: name.trim(),
        packageCode: packageCode.trim().toUpperCase(),
        iconUrl: iconUrl || undefined,
        galleryUrls: galleryUrls.filter(Boolean),
        sortOrder, isActive, maxHours, pricingMode,
        nightSurcharge, petSurcharge, waitingSurcharge, toolFee, peakRatePercent,
        termsAndConditions: termsAndConditions.trim() || undefined,
        policyDescription: policyDescription.trim() || undefined,
        coverageAreaIds: selectedAreaIds.length > 0 ? selectedAreaIds : undefined,
      };
      const pkg = await createPackage.mutateAsync(payload);

      // 2. Tạo pricing tiers
      const validTiers = tiers.filter(t => t.name.trim());
      if (validTiers.length > 0) {
        await Promise.all(validTiers.map((t, idx) =>
          adminPricingApi.createTier({
            packageId: pkg.id,
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

      // 3. Tạo nhanh dịch vụ con (nếu có)
      let newSvcId: string | null = null;
      if (quickCreate.name.trim()) {
        // Xác định pricingConfigId từ loại giá
        let resolvedPricingConfigId: string | undefined = undefined;
        const finalPricingType = quickCreate.pricingType || "FIXED";

        if (finalPricingType === "CONFIG" && quickCreate.pricingConfigId && quickCreate.pricingConfigId !== "none") {
          // Dùng pricing config có sẵn
          resolvedPricingConfigId = quickCreate.pricingConfigId;
        } else if (finalPricingType === "FIXED" && quickCreate.fixedPrice) {
          // Tạo pricing config mới với giá cố định
          try {
            const newConfig = await adminPricingApi.createPricingConfig({
              name: `${quickCreate.name.trim()} — Giá cố định`,
              basePrice: Number(quickCreate.fixedPrice),
              description: quickCreate.pricingNote || undefined,
            } as Parameters<typeof adminPricingApi.createPricingConfig>[0]);
            resolvedPricingConfigId = newConfig.id;
          } catch { /* bỏ qua nếu config không tạo được */ }
        } else if (finalPricingType === "HOURLY" && quickCreate.hourlyRate) {
          // Tạo pricing config mới với giá theo giờ
          try {
            const newConfig = await adminPricingApi.createPricingConfig({
              name: `${quickCreate.name.trim()} — Theo giờ`,
              basePrice: Number(quickCreate.hourlyRate),
              description: quickCreate.pricingNote || undefined,
            } as Parameters<typeof adminPricingApi.createPricingConfig>[0]);
            resolvedPricingConfigId = newConfig.id;
          } catch { /* bỏ qua nếu config không tạo được */ }
        }

        const newSvc = await createService.mutateAsync({
          name: quickCreate.name.trim(),
          shortDescription: quickCreate.shortDescription || undefined,
          description: quickCreate.description || undefined,
          durationHours: quickCreate.durationHours ? Number(quickCreate.durationHours) : undefined,
          coverageArea: quickCreate.coverageArea || undefined,
          pricingConfigId: resolvedPricingConfigId,
          pricingType: finalPricingType,
          thumbnailUrl: quickCreate.thumbnailUrl || undefined,
          galleryUrls: quickCreate.galleryUrls?.length ? quickCreate.galleryUrls : undefined,
          includedTasks: quickCreate.includedTasks.length ? quickCreate.includedTasks : undefined,
          excludedTasks: quickCreate.excludedTasks.length ? quickCreate.excludedTasks : undefined,
          isActive: quickCreate.isActive,
        });
        newSvcId = newSvc.id;
      }

      // 4. Link dịch vụ con
      const allToLink = [
        ...selectedSubServices,
        ...(newSvcId ? [{ id: newSvcId, name: quickCreate.name, isRequired: false, isDefault: true, sortOrder: selectedSubServices.length }] : []),
      ];
      if (allToLink.length > 0) {
        await addSubServices.mutateAsync({
          packageId: pkg.id,
          subServices: allToLink.map(s => ({ id: s.id, isRequired: s.isRequired, isDefault: s.isDefault, sortOrder: s.sortOrder })),
        });
      }

      // 5. Tạo Workflow cho gói dịch vụ mới
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

      // 6. Gán các chính sách thư viện đã chọn
      if (selectedPolicyIds.length > 0) {
        await adminPolicyService.assignToPackage(pkg.id, selectedPolicyIds);
      }

      toast.success("Tạo gói dịch vụ thành công!");
      router.push(`/admin/services/${pkg.id}`);
    } catch {
      // handled by mutations
    }
  };


  const isSubmitting = createPackage.isPending || createService.isPending || addSubServices.isPending;

  // ── Render ──
  return (
    <div className="space-y-6 w-full pb-24">

      {/* Header */}
      <div className="flex items-center gap-4">
        <BaseButton variant="outline" size="icon" onClick={() => router.push("/admin/services")}
          className="rounded-full h-10 w-10 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </BaseButton>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--c-muted)] font-medium">Quản lý Gói Dịch vụ</p>
          <h1 className="text-2xl font-black text-[var(--c-ink)] leading-tight">Tạo gói dịch vụ mới</h1>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="bg-[var(--c-card)] border border-[var(--c-line)]/50 rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <StepIndicator current={step} onStepClick={setStep} />
        <span className="text-xs text-[var(--c-muted)] font-semibold">Bước {step} / {STEPS.length}</span>
      </div>

      {/* ══════════════ STEP 1: Thông tin cơ bản ══════════════ */}
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
                <Label className="text-sm font-bold">
                  Ảnh đại diện gói
                  <span className="text-xs text-[var(--c-muted)] font-normal ml-2">Thumbnail hiển thị trên card</span>
                </Label>
                <ImageUpload value={iconUrl} onChange={setIconUrl} onRemove={() => setIconUrl("")} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">
                  Ảnh gallery phụ
                  <span className="text-xs text-[var(--c-muted)] font-normal ml-2">Nhiều ảnh cho trang chi tiết</span>
                </Label>
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
                    <span className={cn("text-sm font-semibold", isActive ? "text-[#0E9F6E]" : "text-[var(--c-muted)]")}>
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
              Tiếp theo — Cấu hình giá <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 2: Cấu hình giá & Phụ phí ══════════════ */}
      {step === 2 && (
        <div className="space-y-5">
          <SectionCard icon={DollarSign} title="Chế độ tính giá" description="Chọn cách tính giá cho gói này">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { v: "HOURLY" as PricingMode, label: "Theo giờ", icon: Clock, desc: "Giá × số giờ", color: "border-blue-300 bg-blue-50 dark:bg-blue-900/20 text-blue-700" },
                { v: "AREA_HOURLY" as PricingMode, label: "Diện tích × Giờ", icon: Layers, desc: "Giá/m² × giờ", color: "border-violet-300 bg-violet-50 dark:bg-violet-900/20 text-violet-700" },
                { v: "FIXED" as PricingMode, label: "Cố định", icon: Zap, desc: "Một mức giá", color: "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700" },
              ] as { v: PricingMode; label: string; icon: React.ElementType; desc: string; color: string }[]).map(opt => (
                <button key={opt.v} type="button" onClick={() => { setPricingMode(opt.v); setTiers([]); }}
                  className={cn("flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all",
                    pricingMode === opt.v ? opt.color + " shadow-sm" : "border-border/40 hover:border-primary/30 text-muted-foreground")}>
                  <opt.icon className="w-6 h-6" />
                  <span className="text-sm font-black">{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.desc}</span>
                  {pricingMode === opt.v && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={Clock} title="Cấu hình thời gian & Giờ cao điểm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Số giờ tối đa" required hint="Thời lượng tối đa cho một đơn hàng">
                <div className="flex items-center gap-3">
                  <Input inputMode="decimal" value={String(maxHours)}
                    onChange={e => { const v = e.target.value; if (/^\d*\.?\d*$/.test(v)) { const n = parseFloat(v); setMaxHours(isNaN(n) ? 1 : Math.min(24, Math.max(1, n))); } }}
                    className="h-11 rounded-xl flex-1" />
                  <span className="text-sm text-[var(--c-muted)] font-semibold">giờ</span>
                </div>
              </Field>
              <Field label="% Phụ phí giờ cao điểm" hint="Tỷ lệ tăng thêm so với giá gốc">
                <div className="flex items-center gap-3">
                  <Input inputMode="numeric" value={peakRatePercent === 0 ? "" : String(peakRatePercent)}
                    onChange={e => { const d = e.target.value.replace(/\D/g, ""); setPeakRatePercent(d ? Math.min(200, Number(d)) : 0); }}
                    className="h-11 rounded-xl flex-1" />
                  <span className="text-sm text-[var(--c-muted)] font-semibold">%</span>
                </div>
                {peakRatePercent > 0 && (
                  <p className="text-xs text-[#D97706] font-semibold mt-1">
                    → Giá 100.000đ + {peakRatePercent}% = {vnd(100000 * (1 + peakRatePercent / 100))}
                  </p>
                )}
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={DollarSign} title="Bảng phụ phí" description="Áp dụng cho tất cả dịch vụ trong gói">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SurchargeField icon={Moon} label="Phụ thu Đêm / Sáng sớm"
                  hint="22:00–06:00. Tính cộng thêm vào tổng tiền."
                  value={nightSurcharge} onChange={setNightSurcharge} iconColor="text-[#2563EB]" />
                <SurchargeField icon={PawPrint} label="Phụ thu Thú cưng"
                  hint="Có chó/mèo tại địa chỉ. Gồm dọn lông, khử mùi."
                  value={petSurcharge} onChange={setPetSurcharge} iconColor="text-[#D97706]" />
                <SurchargeField icon={Timer} label="Phụ thu Chờ đợi (mỗi 15p)"
                  hint="Tính thêm khi nhân viên phải chờ vào cửa, thang máy..."
                  value={waitingSurcharge} onChange={setWaitingSurcharge} iconColor="text-[#E11D48]" />
                <SurchargeField icon={Hammer} label="Phí Công cụ mang theo"
                  hint="Đơn yêu cầu máy hút bụi, máy phun khử khuẩn chuyên biệt."
                  value={toolFee} onChange={setToolFee} iconColor="text-[var(--c-muted)]" />
              </div>

              {customSurcharges.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[var(--c-muted)] uppercase tracking-wider">Phụ phí tuỳ chỉnh</p>
                  {customSurcharges.map(cs => (
                    <CustomSurchargeRow key={cs.id} item={cs}
                      onChange={v => updateCustomSurcharge(cs.id, v)}
                      onRemove={() => removeCustomSurcharge(cs.id)} />
                  ))}
                </div>
              )}

              {/* Add custom button */}
              <button
                type="button"
                onClick={addCustomSurcharge}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-[var(--c-line)]/40 rounded-xl hover:border-[var(--c-primary)]/40 hover:bg-[var(--c-primary-soft)] transition-all text-[var(--c-muted)] hover:text-[var(--c-primary-strong)] text-sm font-semibold"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Thêm loại phụ phí tùy chỉnh
              </button>
            </div>
          </SectionCard>

          <SectionCard
            icon={TrendingUp}
            title="Cấu hình khung giờ cao điểm"
            description="Phụ thu tự động áp dụng khi booking rơi vào khung giờ cao điểm (tỷ lệ 0.1 = +10%)"
            headerAction={
              <BaseButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowAddPeakDay(true)}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" /> Thêm cao điểm
              </BaseButton>
            }
          >
            <div className="space-y-4">
              {/* Thống kê */}
              <div className="flex flex-wrap gap-2.5">
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-none font-bold text-xs py-1 px-2.5 rounded-lg gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {peakDaysData.length} cấu hình
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-xs py-1 px-2.5 rounded-lg gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {peakDaysData.filter(p => p.isActive).length} đang hoạt động
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none font-bold text-xs py-1 px-2.5 rounded-lg gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 animate-pulse" />
                  TB +{(peakDaysData.reduce((acc, p) => acc + (p.peakRate || 0) * 100, 0) / (peakDaysData.length || 1)).toFixed(0)}%
                </Badge>
              </div>
              {/* Preview bar */}
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 bg-[var(--c-primary-soft)] border border-[var(--c-primary)]/20 rounded-xl p-4">
                {[
                  { label: "Cao điểm", value: `+${peakRatePercent}%`, icon: TrendingUp, color: "text-[#D97706]" },
                  { label: "Ban đêm", value: vnd(nightSurcharge), icon: Moon, color: "text-[#2563EB]" },
                  { label: "Thú cưng", value: vnd(petSurcharge), icon: PawPrint, color: "text-[#D97706]" },
                  { label: "Chờ 15p", value: vnd(waitingSurcharge), icon: Timer, color: "text-[#E11D48]" },
                  ...customSurcharges.filter(cs => cs.label && cs.amount > 0).map(cs => ({
                    label: cs.label, value: vnd(cs.amount), icon: Star, color: "text-[#7C3AED]",
                  })),
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <item.icon className={cn("w-4 h-4 mx-auto mb-1", item.color)} aria-hidden="true" />
                    <p className={cn("text-sm font-black", item.color)}>{item.value}</p>
                    <p className="text-[10px] text-[var(--c-muted)]">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Bảng dữ liệu */}
              {peakDaysData.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                  Chưa có cấu hình khung giờ cao điểm nào trong hệ thống.
                </div>
              ) : (
                <div className="border border-border/30 rounded-2xl overflow-hidden bg-card shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border/30 text-muted-foreground uppercase font-black tracking-wider text-[10px]">
                          <th className="py-3.5 px-4 font-bold">Tên cấu hình</th>
                          <th className="py-3.5 px-4 font-bold text-center">Phụ thu</th>
                          <th className="py-3.5 px-4 font-bold">Từ ngày ➜ Đến ngày</th>
                          <th className="py-3.5 px-4 font-bold">Khung giờ</th>
                          <th className="py-3.5 px-4 font-bold text-center">Trạng thái</th>
                          <th className="py-3.5 px-4 font-bold text-right">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {peakDaysData.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground">{p.name}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-extrabold text-rose-600">+{((p.peakRate || 0) * 100).toFixed(0)}%</span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {p.startAt ? new Date(p.startAt).toLocaleDateString("vi-VN") : "--"} {p.endAt ? `➜ ${new Date(p.endAt).toLocaleDateString("vi-VN")}` : ""}
                            </td>
                            <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400">
                              {p.startTime && p.endTime ? `${p.startTime} - ${p.endTime}` : "Cả ngày"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={cn("border-none text-[9px] px-2 py-0.5 rounded-full font-bold", 
                                p.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
                                {p.isActive ? "Hoạt động" : "Tạm dừng"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString("vi-VN") : "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="py-2.5 px-4 bg-muted/20 border-t border-border/25 text-[10px] text-muted-foreground font-semibold">
                    Hiển thị 1-{peakDaysData.length} trong {peakDaysData.length} bản ghi
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(1)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(3)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Mức giá chi tiết <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 3: Pricing Tiers ══════════════ */}
      {step === 3 && (
        <div className="space-y-5">
          <SectionCard icon={BarChart3} title="Mức giá chi tiết (Pricing Tiers)"
            description={`Chế độ: ${pricingMode === "HOURLY" ? "Tính theo giờ" : pricingMode === "AREA_HOURLY" ? "Tính theo diện tích × giờ" : "Giá cố định"} · ${tiers.length} mức đã tạo`}>
            <div className="space-y-4">
              {/* Mode info banner */}
              <div className={cn("flex items-start gap-3 p-4 rounded-xl border text-sm",
                pricingMode === "HOURLY" ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20"
                : pricingMode === "AREA_HOURLY" ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20"
                : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20")}>
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  {pricingMode === "HOURLY" && <p>Mỗi mức giá = một lựa chọn số giờ khác nhau. VD: 2h = 200k, 3h = 270k, 4h = 320k.</p>}
                  {pricingMode === "AREA_HOURLY" && <p>Mỗi mức giá = một dải diện tích. VD: 30–60m² = 15.000đ/m²/h, 60–90m² = 13.000đ/m²/h.</p>}
                  {pricingMode === "FIXED" && <p>Mỗi mức giá = một gói cố định. VD: Gói cơ bản 300k, Gói nâng cao 500k.</p>}
                </div>
              </div>

              {tiers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Chưa có mức giá nào</p>
                  <p className="text-xs mt-1">Bấm nút bên dưới để thêm mức giá đầu tiên</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tiers.map(t => (
                    <PricingTierCard key={t.id} tier={t}
                      onUpdate={updated => updateTier(t.id, updated)}
                      onRemove={() => removeTier(t.id)} />
                  ))}
                </div>
              )}

              <button type="button" onClick={addTier}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border/40 rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary font-semibold">
                <Plus className="w-5 h-5" />
                Thêm mức giá {pricingMode === "HOURLY" ? "theo giờ" : pricingMode === "AREA_HOURLY" ? "theo diện tích" : "cố định"}
              </button>

              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Có thể để trống và cài đặt sau trong tab <strong>Mức giá</strong> của gói. Tuy nhiên nên có ít nhất 1 mức giá để khách hàng có thể đặt đơn.
                </p>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(2)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(4)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Dịch vụ con <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 4: Dịch vụ con ══════════════ */}
      {step === 4 && (
        <div className="space-y-5">
          <SectionCard icon={List} title="Chọn dịch vụ con ăn theo"
            description={`Chọn từ ${allSubServices.length} dịch vụ con hiện có · Đã chọn: ${selectedSubServices.length}`}>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--c-muted)]" aria-hidden="true" />
                <Input
                  placeholder="Tìm kiếm dịch vụ con..."
                  value={searchSvc}
                  onChange={(e) => setSearchSvc(e.target.value)}
                  className="h-10 rounded-xl pl-9 text-sm"
                />
              </div>
              {filteredSvcs.length === 0 ? (
                <div className="py-10 text-center text-[var(--c-muted)] text-sm">
                  <Package className="w-8 h-8 mx-auto mb-3 opacity-30" aria-hidden="true" />
                  Không tìm thấy dịch vụ con nào
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {filteredSvcs.map(svc => (
                    <SubServiceCard key={svc.id} svc={svc}
                      isSelected={!!selectedSubServices.find(s => s.id === svc.id)}
                      onToggle={() => toggleSelect(svc)}
                      onPreview={() => setPreviewSubService(svc)} />
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {selectedSubServices.length > 0 && (
            <SectionCard icon={Settings2} title="Cấu hình dịch vụ đã chọn" description="Thiết lập vai trò từng dịch vụ trong gói">
              <div className="space-y-3">
                {selectedSubServices.map((s, idx) => (
                  <div key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-[var(--c-line)]/40 rounded-xl bg-[var(--c-card-2)]">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[var(--c-ink)]">{s.name}</p>
                      <p className="text-xs text-[var(--c-muted)]">Vị trí #{idx + 1}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={s.isRequired} onCheckedChange={(v) => updateSelected(s.id, { isRequired: v })} />
                        <span className="text-xs font-semibold text-[var(--c-ink)]">Bắt buộc</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Switch checked={s.isDefault} onCheckedChange={(v) => updateSelected(s.id, { isDefault: v })} />
                        <span className="text-xs font-semibold text-[var(--c-ink)]">Mặc định</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeSelected(s.id)}
                        className="p-1.5 rounded-lg hover:bg-[rgba(225,29,72,0.12)] text-[var(--c-muted)] hover:text-[#E11D48] transition-colors"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          <SectionCard icon={Plus} title="Tạo nhanh dịch vụ con mới">
            {!showQuickCreate ? (
              <button
                type="button"
                onClick={() => setShowQuickCreate(true)}
                className="w-full flex items-center justify-center gap-3 py-8 border-2 border-dashed border-[var(--c-line)]/40 rounded-xl hover:border-[var(--c-primary)]/40 hover:bg-[var(--c-primary-soft)] transition-all text-[var(--c-muted)] hover:text-[var(--c-primary-strong)]"
              >
                <Plus className="w-5 h-5" aria-hidden="true" />
                <span className="font-semibold">Thêm dịch vụ con mới</span>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-[var(--c-ink)]">Điền thông tin dịch vụ con</p>
                  <button
                    type="button"
                    onClick={() => { setShowQuickCreate(false); setQuickCreate(defaultQuickCreate); }}
                    className="p-1.5 rounded-lg hover:bg-[var(--c-card-2)] text-[var(--c-muted)] hover:text-[var(--c-ink)] transition-colors"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <QuickCreateForm
                  value={quickCreate}
                  onChange={setQuickCreate}
                  pricingConfigs={pricingConfigs.map(c => ({
                    id: c.id,
                    name: c.name,
                    basePrice: c.basePrice ? Number(c.basePrice) : undefined,
                  }))}
                />
                <div className="flex items-start gap-3 p-3 bg-[rgba(37,99,235,0.12)] dark:bg-[rgba(37,99,235,0.12)] border border-[#2563EB]/60 rounded-xl">
                  <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-[#2563EB] dark:text-[#2563EB]">
                    Dịch vụ này sẽ được tạo và tự động liên kết vào gói sau khi bấm <strong>Tạo gói dịch vụ</strong>.
                  </p>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(3)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(5)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Khu vực phục vụ <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 5: Khu vực phục vụ ══════════════ */}
      {step === 5 && (
        <div className="space-y-5">
          <SectionCard icon={ScrollText} title="Điều khoản & Quy định"
            description="Hiển thị cho khách hàng trước khi đặt dịch vụ">
            <div className="space-y-4">
              <Field label="Điều khoản sử dụng" hint="Mỗi dòng = 1 điều khoản">
                <Textarea
                  placeholder={"1. Khách hàng cần có mặt hoặc người đại diện.\n2. Không áp dụng cho không gian hơn 100m².\n3. Vui lòng cất đồ vật giá trị trước khi nhân viên đến.\n4. Thú cưng phải nhốt trong phòng riêng.\n5. Nhân viên có quyền từ chối nếu môi trường mất an toàn."}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={10}
                  className="rounded-xl text-sm resize-none font-mono"
                />
              </Field>
              {termsAndConditions && (
                <div className="bg-[var(--c-card-2)] border border-[var(--c-line)]/40 rounded-xl p-4">
                  <p className="text-xs font-black text-[var(--c-muted)] uppercase tracking-widest mb-3">Xem trước</p>
                  <div className="space-y-1.5">
                    {termsAndConditions.split("\n").filter(Boolean).map((line, i) => (
                      <p key={i} className="text-sm">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <div className="flex items-start gap-3 p-4 bg-[rgba(217,119,6,0.14)] dark:bg-[rgba(217,119,6,0.14)] border border-[#D97706]/60 rounded-2xl">
            <Info className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-[#D97706] dark:text-[#D97706]">
              Điều khoản có thể để trống và cập nhật sau trong tab <strong>Điều khoản</strong>.
            </p>
          </div>

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(4)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(6)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Điều khoản <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 6: Điều khoản ══════════════ */}
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

            {/* TAB 1: QUY TRÌNH THỰC HIỆN (WORKFLOW) */}
            <TabsContent value="workflow" className="mt-4 space-y-5">
              {/* Thêm nhanh quy trình mẫu */}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div>
                  <p className="text-sm font-black text-primary flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-primary fill-primary animate-bounce" />
                    Thêm nhanh quy trình mẫu chuẩn
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Tiết kiệm thời gian bằng cách chèn nhanh các quy trình dọn dẹp đã được thiết lập sẵn</p>
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
                  {/* Cột trái: Giao diện thêm/sửa bước */}
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

                      {/* Checklist items */}
                      <div className="space-y-2 pt-1">
                        <Label className="text-xs font-black text-foreground/90">Checklist đầu việc nhỏ</Label>
                        <div className="flex gap-2">
                          <Input value={newChecklistVal} onChange={e => setNewChecklistVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newChecklistVal.trim()) { setStepChecklist([...stepChecklist, newChecklistVal.trim()]); setNewChecklistVal(""); } } }}
                            placeholder="Nhập việc nhỏ và gõ Enter..." className="h-9 text-xs rounded-xl flex-1" />
                          <BaseButton type="button" size="sm" onClick={() => { if (newChecklistVal.trim()) { setStepChecklist([...stepChecklist, newChecklistVal.trim()]); setNewChecklistVal(""); } }} className="h-9 rounded-xl px-3 text-xs font-bold">Thêm</BaseButton>
                        </div>
                        {stepChecklist.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-border/30 rounded-xl bg-card">
                            {stepChecklist.map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] gap-1 px-2.5 py-0.5 rounded-lg font-semibold bg-muted text-muted-foreground border-border/20">
                                {item}
                                <button type="button" onClick={() => setStepChecklist(stepChecklist.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-border/30">
                        <BaseButton type="button" variant="primary" onClick={() => {
                          if (!stepTitle.trim()) {
                            toast.error("Vui lòng điền tiêu đề bước quy trình!");
                            return;
                          }
                          const newStepObj: CreateWorkflowStepDto = {
                            title: stepTitle.trim(),
                            description: stepDesc.trim() || undefined,
                            durationMinutes: Number(stepDuration) || 15,
                            isRequired: stepRequired,
                            checklistItems: stepChecklist.length > 0 ? stepChecklist : undefined,
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
                          // Reset form
                          setStepTitle("");
                          setStepDesc("");
                          setStepDuration("15");
                          setStepRequired(true);
                          setStepChecklist([]);
                        }} className="flex-1 h-10 text-xs rounded-xl font-black">
                          {editingWorkflowStepIndex !== null ? "Cập nhật bước" : "Thêm vào quy trình"}
                        </BaseButton>
                        {editingWorkflowStepIndex !== null && (
                          <BaseButton type="button" variant="outline" onClick={() => {
                            setEditingWorkflowStepIndex(null);
                            setStepTitle("");
                            setStepDesc("");
                            setStepDuration("15");
                            setStepRequired(true);
                            setStepChecklist([]);
                          }} className="h-10 text-xs rounded-xl font-bold">Hủy</BaseButton>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cột phải: Danh sách các bước workflow đã thêm dạng Vertical Timeline */}
                  <div className="lg:col-span-2 space-y-4">
                    <p className="font-bold text-sm text-foreground mb-1 flex items-center gap-2">
                      <span>Cấu trúc quy trình thực tế</span>
                      <Badge className="bg-primary text-white font-mono text-[10px] px-2 py-0.5 rounded-full">{workflowSteps.length} bước</Badge>
                    </p>
                    {workflowSteps.length === 0 ? (
                      <div className="py-16 border-2 border-dashed border-border/40 rounded-2xl text-center text-muted-foreground text-xs bg-muted/5">
                        <Layers className="w-10 h-10 mx-auto mb-3 opacity-25 text-primary" />
                        Chưa cấu hình bước quy trình nào. Vui lòng thêm ở cột bên trái hoặc chọn mẫu thêm nhanh phía trên.
                      </div>
                    ) : (
                      <div className="pl-5 pr-1">
                        <div className="relative border-l-2 border-primary/20 space-y-6 ml-3 py-2">
                          {workflowSteps.map((w, idx) => {
                            const StepIcon = getIconByName(w.icon || "CheckSquare");
                            return (
                              <div key={idx} className="relative group pl-7 animate-in fade-in slide-in-from-left-3 duration-250">
                                {/* Vòng tròn Timeline đầu dòng */}
                                <div className="absolute -left-[14px] top-1 w-6.5 h-6.5 rounded-full border-2 border-primary bg-background flex items-center justify-center font-black text-xs text-primary shadow-xs z-10">
                                  {idx + 1}
                                </div>

                                {/* Card nội dung bước */}
                                <div className="bg-card border border-border/40 hover:border-primary/30 rounded-2xl p-4.5 hover:shadow-xs transition-all relative">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                          <StepIcon className="w-4 h-4 text-primary shrink-0" />
                                          {w.title}
                                        </h4>
                                        {w.isRequired && (
                                          <Badge className="bg-rose-500/10 text-rose-600 border-none text-[9px] px-2.5 py-0.5 rounded-full font-bold">Bắt buộc</Badge>
                                        )}
                                        {w.durationMinutes && (
                                          <Badge variant="secondary" className="bg-muted text-muted-foreground text-[9px] px-2.5 py-0.5 rounded-full font-bold">
                                            {w.durationMinutes} phút
                                          </Badge>
                                        )}
                                      </div>
                                      {w.description && <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{w.description}</p>}
                                      {w.checklistItems && w.checklistItems.length > 0 && (
                                        <div className="mt-3 bg-muted/20 border border-border/20 rounded-xl p-3 space-y-2">
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Đầu việc chi tiết:</p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {w.checklistItems.map((item, cIdx) => (
                                              <div key={cIdx} className="flex items-center gap-2 text-xs text-foreground/80">
                                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                <span className="truncate">{item}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Bộ nút thao tác sửa xóa dịch chuyển */}
                                    <div className="flex items-center gap-0.5 shrink-0 self-start bg-muted/40 border border-border/40 rounded-xl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button type="button" disabled={idx === 0} onClick={() => {
                                        const copy = [...workflowSteps];
                                        const temp = copy[idx];
                                        copy[idx] = copy[idx - 1];
                                        copy[idx - 1] = temp;
                                        setWorkflowSteps(copy);
                                      }} className="p-1.5 rounded-lg hover:bg-background text-muted-foreground disabled:opacity-30">
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" disabled={idx === workflowSteps.length - 1} onClick={() => {
                                        const copy = [...workflowSteps];
                                        const temp = copy[idx];
                                        copy[idx] = copy[idx + 1];
                                        copy[idx + 1] = temp;
                                        setWorkflowSteps(copy);
                                      }} className="p-1.5 rounded-lg hover:bg-background text-muted-foreground disabled:opacity-30">
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" onClick={() => {
                                        setEditingWorkflowStepIndex(idx);
                                        setStepTitle(w.title);
                                        setStepDesc(w.description || "");
                                        setStepDuration(String(w.durationMinutes || 15));
                                        setStepRequired(!!w.isRequired);
                                        setStepChecklist(w.checklistItems || []);
                                      }} className="p-1.5 rounded-lg hover:bg-background text-blue-600">
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button type="button" onClick={() => {
                                        setWorkflowSteps(workflowSteps.filter((_, i) => i !== idx));
                                        if (editingWorkflowStepIndex === idx) setEditingWorkflowStepIndex(null);
                                        toast.success("Đã xóa bước quy trình!");
                                      }} className="p-1.5 rounded-lg hover:bg-background text-rose-600">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </TabsContent>

            {/* TAB 2: ĐIỀU KHOẢN & CAM KẾT */}
            <TabsContent value="terms-commitments" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bên trái: Textarea nhập điều khoản tự do */}
                <SectionCard icon={ScrollText} title="Điều khoản sử dụng dịch vụ" description="Các điều khoản quy định bắt buộc đối với khách hàng trước khi đặt dịch vụ">
                  <div className="space-y-4">
                    <Field label="Điều khoản sử dụng" hint="Mỗi dòng đại diện cho một điều khoản">
                      <Textarea
                        placeholder={"1. Khách hàng cần có mặt hoặc người đại diện bàn giao căn hộ.\n2. Không áp dụng cho không gian diện tích lớn hơn 100m².\n3. Vui lòng cất giữ cẩn thận đồ vật giá trị cao trước khi nhân viên đến.\n4. Thú cưng cần được nhốt trong phòng riêng trong suốt ca làm việc."}
                        value={termsAndConditions} onChange={e => setTermsAndConditions(e.target.value)}
                        rows={10} className="rounded-2xl text-sm resize-none font-mono leading-relaxed" />
                    </Field>
                    {termsAndConditions && (
                      <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 max-h-36 overflow-y-auto shadow-2xs">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Xem trước giao diện</p>
                        <div className="space-y-1.5">
                          {termsAndConditions.split("\n").filter(Boolean).map((line, i) => (
                            <p key={i} className="text-xs text-muted-foreground flex gap-1.5 items-start">
                              <span className="text-primary font-bold shrink-0">•</span>
                              <span>{line.replace(/^\d+\.\s*/, "")}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                {/* Bên phải: Cam kết chất lượng */}
                <SectionCard icon={Star} title="Cam kết vàng của dịch vụ" description="Các cam kết về chất lượng và đền bù giúp khách hàng hoàn toàn tin tưởng">
                  <div className="space-y-5">
                    {/* List commitments */}
                    <div className="space-y-3">
                      {commitments.map((c) => {
                        const CIcon = getIconByName(c.iconName);
                        return (
                          <div key={c.id} className="flex gap-3.5 p-4 bg-card border border-border/40 hover:border-primary/20 rounded-2xl relative group shadow-2xs hover:shadow-xs transition-all">
                            <div className="p-2.5 bg-primary/10 rounded-xl self-start text-primary">
                              <CIcon className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-foreground">{c.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                            </div>
                            <button type="button" onClick={() => setCommitments(commitments.filter(x => x.id !== c.id))}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Thêm cam kết mới (Card bo tròn shadow chuẩn) */}
                    {showAddCommitment ? (
                      <div className="border border-border/40 p-5 rounded-2xl bg-card space-y-4 shadow-sm animate-in zoom-in-95 duration-200">
                        <p className="text-xs font-black text-foreground flex items-center gap-1.5 border-b border-border/30 pb-2">
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          Tạo cam kết chất lượng mới
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label="Tiêu đề cam kết" required>
                            <Input value={newCommitmentTitle} onChange={e => setNewCommitmentTitle(e.target.value)} placeholder="VD: Bảo hành 24 giờ" className="h-9.5 text-xs rounded-xl" />
                          </Field>
                          <Field label="Biểu tượng (Icon)">
                            <div className="grid grid-cols-5 gap-1 border border-border/30 rounded-xl p-1.5 bg-muted/20">
                              {SURCHARGE_ICONS.map(i => {
                                const IconComp = i.icon;
                                const isSelected = newCommitmentIcon === i.name;
                                return (
                                  <button
                                    key={i.name}
                                    type="button"
                                    onClick={() => setNewCommitmentIcon(i.name)}
                                    className={cn(
                                      "h-7 flex flex-col items-center justify-center rounded-lg border transition-all text-xs",
                                      isSelected
                                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                                        : "border-border/30 hover:border-primary/20 text-muted-foreground hover:text-foreground"
                                    )}
                                    title={i.label}
                                  >
                                    <IconComp className="w-3.5 h-3.5" />
                                  </button>
                                );
                              })}
                            </div>
                          </Field>
                        </div>
                        <Field label="Nội dung cam kết" required>
                          <Textarea value={newCommitmentContent} onChange={e => setNewCommitmentContent(e.target.value)} placeholder="Mô tả chi tiết nội dung cam kết..." rows={3} className="text-xs rounded-xl resize-none leading-relaxed" />
                        </Field>
                        <div className="flex justify-end gap-2 pt-2">
                          <BaseButton type="button" variant="outline" size="sm" onClick={() => {
                            setShowAddCommitment(false);
                            setNewCommitmentTitle("");
                            setNewCommitmentContent("");
                          }} className="h-9 rounded-xl text-xs">Hủy</BaseButton>
                          <BaseButton type="button" variant="primary" size="sm" onClick={() => {
                            if (!newCommitmentTitle.trim() || !newCommitmentContent.trim()) {
                              toast.error("Vui lòng nhập đầy đủ Tiêu đề và Nội dung cam kết!");
                              return;
                            }
                            setCommitments([...commitments, {
                              id: crypto.randomUUID(),
                              title: newCommitmentTitle.trim(),
                              content: newCommitmentContent.trim(),
                              iconName: newCommitmentIcon,
                            }]);
                            setNewCommitmentTitle("");
                            setNewCommitmentContent("");
                            setShowAddCommitment(false);
                            toast.success("Đã thêm cam kết mới!");
                          }} className="h-8 rounded-xl text-xs">Thêm cam kết</BaseButton>
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

            {/* TAB 3: CHÍNH SÁCH GÁN KÈM */}
            <TabsContent value="policies" className="mt-4 space-y-4">
              <SectionCard icon={Shield} title="Lựa chọn chính sách áp dụng từ thư viện" description="Gán kèm các chính sách tiêu chuẩn của CleanZ để hiển thị công khai trên gói dịch vụ này">
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
                        {policySearch && (
                          <button
                            type="button"
                            onClick={() => setPolicySearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground text-muted-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                      /* Nhóm chính sách theo category để trực quan hơn */
                      (Object.keys(POLICY_CATEGORY_META) as PolicyCategory[]).map(cat => {
                        const catPolicies = filteredPolicies.filter(p => p.category === cat);
                        if (catPolicies.length === 0) return null;
                        const CatMeta = POLICY_CATEGORY_META[cat];
                        const CatIcon = CatMeta.icon;
                        return (
                          <div key={cat} className="space-y-3 bg-muted/10 border border-border/25 rounded-2xl p-4 shadow-2xs">
                            <p className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-2", CatMeta.color.split(" ")[0])}>
                              <CatIcon className="w-4.5 h-4.5" />
                              {CatMeta.label}
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
                                    {selectedPolicyIds.includes(p.id) && <Check className="w-3 h-3 animate-in zoom-in-50" />}
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

          <div className="flex justify-between">
            <BaseButton variant="outline" onClick={() => setStep(5)} className="h-11 px-6 rounded-xl font-bold">← Quay lại</BaseButton>
            <BaseButton variant="primary" onClick={() => setStep(7)} className="h-11 px-8 rounded-xl font-bold gap-2">
              Tiếp theo — Xem lại & Tạo <ChevronRight className="w-4 h-4" />
            </BaseButton>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 7: Xem lại & Tạo ══════════════ */}
      {step === 7 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Cột trái: Cấu trúc gói dịch vụ & Giá cả */}
            <div className="space-y-6">
              <SectionCard icon={Package} title="Xem lại — Thông tin gói">
                <div className="divide-y divide-border/30">
                  <ReviewRow label="Tên gói" value={name} />
                  <ReviewRow label="Mã gói" value={<code className="text-primary text-xs bg-primary/10 px-2 py-0.5 rounded font-mono">{packageCode}</code>} />
                  <ReviewRow label="Trạng thái" value={<Badge className={isActive ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}>{isActive ? "Kích hoạt ngay" : "Lưu nháp"}</Badge>} />
                  <ReviewRow label="Chế độ giá" value={<Badge className="bg-primary/10 text-primary">{pricingMode}</Badge>} />
                  {policyDescription && <ReviewRow label="Mô tả" value={policyDescription} />}
                  {iconUrl && <ReviewRow label="Ảnh đại diện" value="✓ Đã thêm" />}
                </div>
              </SectionCard>

              {tiers.length > 0 && (
                <SectionCard icon={BarChart3} title={`Xem lại — Mức giá (${tiers.length} mức)`}>
                  <div className="divide-y divide-border/30">
                    {tiers.filter(t => t.name).map((t, i) => (
                      <ReviewRow key={t.id} label={`${i + 1}. ${t.name}`} value={
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Badge className="bg-primary/10 text-primary text-[10px]">{t.pricingMode}</Badge>
                          {t.pricingMode === "HOURLY" && t.pricePerHour && <span className="text-xs font-bold text-blue-600">{vnd(Number(t.pricePerHour))}/h</span>}
                          {t.pricingMode === "AREA_HOURLY" && t.pricePerM2 && <span className="text-xs font-bold text-violet-600">{vnd(Number(t.pricePerM2))}/m²/h</span>}
                          {t.pricingMode === "FIXED" && t.fixedPrice && <span className="text-xs font-bold text-emerald-600">{vnd(Number(t.fixedPrice))}</span>}
                          {!t.isActive && <Badge className="bg-muted text-muted-foreground text-[10px]">Ẩn</Badge>}
                        </div>
                      } />
                    ))}
                  </div>
                </SectionCard>
              )}

              {(selectedSubServices.length > 0 || quickCreate.name.trim()) && (
                <SectionCard icon={Wrench} title={`Xem lại — Dịch vụ con (${selectedSubServices.length + (quickCreate.name.trim() ? 1 : 0)})`}>
                  <div className="divide-y divide-border/30">
                    {selectedSubServices.map(s => (
                      <ReviewRow key={s.id} label={s.name} value={
                        <div className="flex gap-1">
                          {s.isRequired && <Badge className="text-[9px] bg-rose-100 text-rose-700">Bắt buộc</Badge>}
                          {s.isDefault && <Badge className="text-[9px] bg-blue-100 text-blue-700">Mặc định</Badge>}
                        </div>
                      } />
                    ))}
                    {quickCreate.name.trim() && (
                      <ReviewRow label={`🆕 ${quickCreate.name}`} value={<Badge className="text-[9px] bg-emerald-100 text-emerald-700">Sẽ tạo mới</Badge>} />
                    )}
                  </div>
                </SectionCard>
              )}

              {selectedAreaIds.length > 0 && (
                <SectionCard icon={MapPin} title={`Xem lại — Khu vực phục vụ (${selectedAreaIds.length} khu vực)`}>
                  <div className="flex flex-wrap gap-2">
                    {coverageAreas.filter(a => selectedAreaIds.includes(a.id)).map(a => (
                      <span key={a.id} className="flex items-center gap-1 px-2.5 py-1 bg-primary/5 border border-primary/20 rounded-lg text-xs font-semibold">
                        <MapPin className="w-3 h-3 text-primary" />{a.name}
                      </span>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Cột phải: Phụ phí & Quy chế, Cam kết */}
            <div className="space-y-6">
              <SectionCard icon={DollarSign} title="Xem lại — Cấu hình giá & Phụ phí">
                <div className="divide-y divide-border/30">
                  <ReviewRow label="Giờ tối đa" value={`${maxHours} giờ`} />
                  <ReviewRow label="Giờ cao điểm" value={`+${peakRatePercent}%`} />
                  <ReviewRow label="Phụ thu ban đêm" value={vnd(nightSurcharge)} />
                  <ReviewRow label="Phụ thu thú cưng" value={vnd(petSurcharge)} />
                  <ReviewRow label="Phụ thu chờ đợi" value={vnd(waitingSurcharge)} />
                  <ReviewRow label="Phí công cụ" value={toolFee > 0 ? vnd(toolFee) : "Miễn phí"} />
                  {customSurcharges.filter(cs => cs.label).map(cs => {
                    const SvgIcon = getIconByName(cs.iconName);
                    return (
                      <ReviewRow key={cs.id} label={
                        <span className="flex items-center gap-1.5">
                          <SvgIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                          {cs.label}
                        </span>
                      } value={vnd(cs.amount)} />
                    );
                  })}
                </div>
              </SectionCard>

              {/* Xem lại Cam kết & Chính sách */}
              {(termsAndConditions || commitments.length > 0 || selectedPolicyIds.length > 0) && (
                <SectionCard icon={ScrollText} title="Xem lại — Điều khoản & Cam kết & Chính sách">
                  <div className="space-y-5">
                    {termsAndConditions && (
                      <div className="space-y-2">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Điều khoản sử dụng</p>
                        <div className="bg-muted/20 border border-border/30 rounded-2xl p-3 max-h-32 overflow-y-auto space-y-1 shadow-2xs">
                          {termsAndConditions.split("\n").filter(Boolean).map((line, i) => (
                            <p key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-1.5 items-start">
                              <span className="text-primary font-bold shrink-0">•</span>
                              <span>{line.replace(/^\d+\.\s*/, "")}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {commitments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Cam kết chất lượng vàng</p>
                        <div className="grid grid-cols-1 gap-2.5">
                          {commitments.map((c) => {
                            const CIcon = getIconByName(c.iconName);
                            return (
                              <div key={c.id} className="flex gap-2.5 p-3.5 bg-primary/5 border border-primary/10 rounded-2xl shadow-2xs">
                                <CIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="font-bold text-[11px] text-foreground">{c.title}</p>
                                  <p className="text-[10px] text-muted-foreground/90 mt-0.5 leading-normal">{c.content}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(selectedPolicyIds.length > 0) && (
                      <div className="space-y-2 pt-3 border-t border-border/30">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Chính sách gán kèm từ thư viện</p>
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                          {selectedPolicyIds.map((id, i) => {
                            const pol = policiesData.find(p => p.id === id);
                            if (!pol) return null;
                            const CatMeta = POLICY_CATEGORY_META[pol.category];
                            const CatIcon = CatMeta?.icon || Shield;
                            return (
                              <div key={i} className="flex items-center justify-between p-3 bg-muted/20 border border-border/30 rounded-xl shadow-2xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CatIcon className={cn("w-3.5 h-3.5 shrink-0", CatMeta?.color.split(" ")[0])} />
                                  <span className="text-xs font-bold text-foreground truncate">{pol.title}</span>
                                </div>
                                <Badge variant="outline" className="text-[8px] px-1.5 py-0 rounded bg-muted shrink-0 ml-2">
                                  {CatMeta?.label || pol.category}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>
              )}
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
                      {/* Vòng tròn Timeline dọc */}
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
            <BaseButton variant="primary" onClick={handleSubmit} disabled={isSubmitting}
              className="h-11 px-8 rounded-xl font-bold gap-2 flex-1 md:flex-none">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Đang tạo...</> : <><CheckCircle2 className="w-4 h-4" />Tạo gói dịch vụ</>}
            </BaseButton>
          </div>
        </div>
      )}

      {/* Dialog Cấu hình giá nhanh cho dịch vụ con */}
      <Dialog open={!!subServiceToEditPrice} onOpenChange={open => { if (!open) setSubServiceToEditPrice(null); }}>
        <DialogContent className="w-full sm:max-w-[420px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Edit className="w-4 h-4 text-primary" />
              Cấu hình giá: {subServiceToEditPrice?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thay đổi loại giá và thiết lập giá cơ bản nhanh cho dịch vụ con này.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
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
              Lưu cấu hình giá
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
                setShowAddPeakDay(false);
                setPeakDayName("");
                setPeakDayRate("10");
                setPeakDayStartAt("");
                setPeakDayEndAt("");
                setPeakDayStartTime("");
                setPeakDayEndTime("");
                setPeakDayActive(true);
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
                if (!peakDayName.trim()) {
                  toast.error("Vui lòng điền tên cấu hình giờ cao điểm!");
                  return;
                }
                if (!peakDayRate || isNaN(Number(peakDayRate)) || Number(peakDayRate) <= 0) {
                  toast.error("Vui lòng điền mức phụ thu hợp lệ!");
                  return;
                }

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
                  
                  // Reset form & close
                  setPeakDayName("");
                  setPeakDayRate("10");
                  setPeakDayStartAt("");
                  setPeakDayEndAt("");
                  setPeakDayStartTime("");
                  setPeakDayEndTime("");
                  setPeakDayActive(true);
                  setShowAddPeakDay(false);
                } catch {
                  // Lỗi đã được mutate handler xử lý và hiển thị toast
                }
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
                  // Mutation handler đã xử lý toast
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