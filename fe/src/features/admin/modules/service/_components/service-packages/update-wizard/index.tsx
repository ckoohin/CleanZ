"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, DollarSign, ScrollText, CheckCircle2, ChevronRight, AlertCircle,
  Loader2, MapPin, Search, Check, Trash2, Star, TrendingUp, Timer, Moon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { BaseButton } from "@/components/ui/base/base_button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useUpdateAdminPackage, useAdminPackageDetail, useAdminServices, useCreateAdminService, useAddSubServicesToPackage, useCoverageAreas, useUpdateCoverageArea,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { adminPricingApi } from "@/features/admin/services/admin-pricing.service";
import { adminServicesApi } from "@/features/admin/modules/service/services/admin-services.service";
import {
  UpdateAdminPackageDto, AdminServiceEntity, CoverageAreaEntity, PricingMode,
  ServiceDurationEntity, ServiceAddonEntity, AddonPriceUnit, ServiceSubscriptionEntity, SubscriptionBillingCycle, ServicePeakHourEntity,
} from "@/features/admin/modules/service/services/admin-services.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import BaseEmptyState from "@/components/ui/base/base_empty_state";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminWorkflowService } from "@/features/admin/modules/service/services/admin-workflow.service";
import { adminPolicyService } from "@/features/admin/modules/policy/services/admin-policy.service";
import { useAdminPolicies } from "@/features/admin/modules/policy/hooks/useAdminPolicies";
import { CreateWorkflowStepDto } from "@/features/admin/modules/service/types/workflow.type";
import { vnd, slugify } from "./shared/helpers";
import { SelectedSubService } from "./shared/types";
import { SURCHARGE_ICONS } from "./steps/StepWorkflowTerms";
import { StepBasicInfo } from "./steps/StepBasicInfo";
import { StepPricingConfig, NewDurationState } from "./steps/StepPricingConfig";
import { StepWorkflowTerms } from "./steps/StepWorkflowTerms";
import { StepReviewSubmit } from "./steps/StepReviewSubmit";

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Thông tin cơ bản", icon: Package },
  { id: 2, label: "Cấu hình bảng giá", icon: DollarSign },
  { id: 3, label: "Quy trình & Điều khoản", icon: ScrollText },
  { id: 4, label: "Xem lại & Hoàn tất", icon: CheckCircle2 },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface CustomSurcharge {
  id: string;
  label: string;
  iconName: string;
  amount: number;
  hint: string;
}

// ─── Legacy dead code preserved verbatim from before this refactor ───────────
// The following components/handlers/state have zero call sites anywhere in
// this wizard. They are kept as-is to preserve 100% behavior parity with the
// pre-refactor monolith — do not wire them up or delete them as part of an
// FSD extraction; that would be a behavior change, not a pure move.
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
// ─── Main Wizard ──────────────────────────────────────────────────────────────
export function ServicePackageUpdateWizard({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
  const [newDuration, setNewDuration] = useState<NewDurationState>({
    durationHours: "",
    priceAdjustment: "0",
    priceMode: "percent",
    fixedPriceInput: "",
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
  const [tempPriceMode, setTempPriceMode] = useState<'percent' | 'fixed'>("percent");
  const [tempFixedPriceInput, setTempFixedPriceInput] = useState("");
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
      setAllowSingleService(pkg.allowSingleService !== false);
      
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
          priceMode: d.priceMode || "percent",
          fixedPrice: d.fixedPrice !== null && d.fixedPrice !== undefined ? Number(d.fixedPrice) : null,
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
    if (hours > maxHours) {
      toast.error(`Không được thiết lập giờ vượt quá giờ phục vụ tối đa của gói (${maxHours} giờ). Muốn tăng khung giờ hơn thì hãy đổi giờ phục vụ tối đa cao hơn.`);
      return;
    }
    if (newDuration.priceMode === "fixed" && !(Number(newDuration.fixedPriceInput) > 0)) {
      toast.error("Vui lòng nhập giá cụ thể hợp lệ!");
      return;
    }
    const adj = parseFloat(newDuration.priceAdjustment) || 0;
    const multi = newDuration.priceMode === "fixed" ? 1.0 : 1 + adj / 100;

    const area = newDuration.suggestedArea ? Number(newDuration.suggestedArea) : null;
    const taskers = allowMultipleTaskers && newDuration.taskerCount ? Number(newDuration.taskerCount) : 1;

    setDurations(prev => {
      const list = prev.map(d => newDuration.isPopular ? { ...d, isPopular: false } : d);
      return [...list, {
        durationHours: hours,
        priceMultiplier: multi,
        priceMode: newDuration.priceMode,
        fixedPrice: newDuration.priceMode === "fixed" ? Number(newDuration.fixedPriceInput) : null,
        isPopular: newDuration.isPopular,
        isActive: true,
        suggestedArea: area,
        taskerCount: taskers,
        title: newDuration.title.trim() || undefined,
        description: newDuration.description.trim() || undefined,
      }].sort((a, b) => a.durationHours - b.durationHours);
    });

    setNewDuration({ durationHours: "", priceAdjustment: "0", priceMode: "percent", fixedPriceInput: "", isPopular: false, suggestedArea: "", taskerCount: "1", title: "", description: "" });
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
        allowSingleService,

        durations: durations.map(d => ({
          durationHours: d.durationHours,
          priceMultiplier: d.priceMultiplier,
          priceMode: d.priceMode ?? "percent",
          fixedPrice: d.fixedPrice ?? null,
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

      {step === 1 && (
        <StepBasicInfo
          name={name} handleNameChange={handleNameChange} packageCode={packageCode} setPackageCode={setPackageCode}
          iconUrl={iconUrl} setIconUrl={setIconUrl} galleryUrls={galleryUrls} setGalleryUrls={setGalleryUrls}
          policyDescription={policyDescription} setPolicyDescription={setPolicyDescription}
          sortOrder={sortOrder} setSortOrder={setSortOrder} isActive={isActive} setIsActive={setIsActive}
          canProceedStep1={canProceedStep1} setStep={setStep}
        />
      )}

      {step === 2 && (
        <StepPricingConfig
          baseHourlyRate={baseHourlyRate} setBaseHourlyRate={setBaseHourlyRate}
          premiumHourlyRate={premiumHourlyRate} setPremiumHourlyRate={setPremiumHourlyRate}
          maxHours={maxHours} setMaxHours={setMaxHours}
          allowMultipleTaskers={allowMultipleTaskers} setAllowMultipleTaskers={setAllowMultipleTaskers}
          allowSubscription={allowSubscription} setAllowSubscription={setAllowSubscription}
          allowSingleService={allowSingleService} setAllowSingleService={setAllowSingleService}
          applyTemplate={applyTemplate} activeTab={activeTab} setActiveTab={setActiveTab}
          newDuration={newDuration} setNewDuration={setNewDuration}
          isOpenHoursDropdown={isOpenHoursDropdown} setIsOpenHoursDropdown={setIsOpenHoursDropdown} hourOptions={hourOptions}
          isOpenAreaDropdown={isOpenAreaDropdown} setIsOpenAreaDropdown={setIsOpenAreaDropdown} areaOptions={areaOptions}
          isOpenAdjustmentDropdown={isOpenAdjustmentDropdown} setIsOpenAdjustmentDropdown={setIsOpenAdjustmentDropdown}
          adjustmentOptions={adjustmentOptions} formatHoursToMinutes={formatHoursToMinutes}
          setTempTitle={setTempTitle} setTempDescription={setTempDescription} setIsOpenMetaModal={setIsOpenMetaModal}
          handleSaveDuration={handleSaveDuration} durations={durations} setDurations={setDurations}
          inlineEditingCell={inlineEditingCell} setInlineEditingCell={setInlineEditingCell}
          inlineEditValue={inlineEditValue} setInlineEditValue={setInlineEditValue}
          captureInlineRect={captureInlineRect} setIsOpenInlineHoursDropdown={setIsOpenInlineHoursDropdown}
          handleInlineSave={handleInlineSave} setIsOpenInlineAreaDropdown={setIsOpenInlineAreaDropdown}
          isOpenInlineAdjustmentDropdown={isOpenInlineAdjustmentDropdown} setIsOpenInlineAdjustmentDropdown={setIsOpenInlineAdjustmentDropdown}
          setEditingDurationIndex={setEditingDurationIndex} setTempHours={setTempHours} setTempArea={setTempArea}
          setTempAdjustment={setTempAdjustment}
          tempPriceMode={tempPriceMode} setTempPriceMode={setTempPriceMode}
          tempFixedPriceInput={tempFixedPriceInput} setTempFixedPriceInput={setTempFixedPriceInput}
          setTempIsPopular={setTempIsPopular} setTempIsActive={setTempIsActive}
          setTempTaskerCount={setTempTaskerCount} setViewingDuration={setViewingDuration}
          editingAddonIndex={editingAddonIndex} setEditingAddonIndex={setEditingAddonIndex}
          addons={addons} setAddons={setAddons} resetNewAddon={resetNewAddon} newAddon={newAddon} setNewAddon={setNewAddon}
          handleSaveAddon={handleSaveAddon} handleEditAddon={handleEditAddon} ADDON_PRICE_UNIT_LABELS={ADDON_PRICE_UNIT_LABELS}
          searchSvc={searchSvc} setSearchSvc={setSearchSvc} filteredSvcs={filteredSvcs} selectedSubServices={selectedSubServices}
          toggleSelect={toggleSelect} setPreviewSubService={setPreviewSubService} allSubServices={allSubServices}
          updateSelected={updateSelected} removeSelected={removeSelected}
          SUBSCRIPTION_PRESETS={SUBSCRIPTION_PRESETS} editingSubscriptionIndex={editingSubscriptionIndex}
          setEditingSubscriptionIndex={setEditingSubscriptionIndex} subscriptions={subscriptions} setSubscriptions={setSubscriptions}
          resetNewSubscription={resetNewSubscription} newSubscription={newSubscription} setNewSubscription={setNewSubscription}
          handleSaveSubscription={handleSaveSubscription} handleEditSubscription={handleEditSubscription}
          BILLING_CYCLE_LABELS={BILLING_CYCLE_LABELS}
          PEAK_HOUR_QUICK_PRESETS={PEAK_HOUR_QUICK_PRESETS} peakHours={peakHours} setPeakHours={setPeakHours}
          newPeakHour={newPeakHour} setNewPeakHour={setNewPeakHour} handleSavePeakHour={handleSavePeakHour}
          setViewingPeakHour={setViewingPeakHour} setEditPeakHour={setEditPeakHour} setEditingPeakHourIdx={setEditingPeakHourIdx}
          setStep={setStep}
          editingArea={editingArea} setEditingArea={setEditingArea} editAreaFee={editAreaFee} setEditAreaFee={setEditAreaFee}
          isUpdatingAreaSaving={isUpdatingAreaSaving} setIsUpdatingAreaSaving={setIsUpdatingAreaSaving} updateAreaMutation={updateAreaMutation}
          isOpenMetaModal={isOpenMetaModal} editingDurationIndex={editingDurationIndex} tempHours={tempHours} tempArea={tempArea}
          tempAdjustment={tempAdjustment} tempIsPopular={tempIsPopular} tempIsActive={tempIsActive} tempTaskerCount={tempTaskerCount}
          tempTitle={tempTitle} tempDescription={tempDescription} isOpenTempHoursDropdown={isOpenTempHoursDropdown}
          setIsOpenTempHoursDropdown={setIsOpenTempHoursDropdown}
          isOpenTempAreaDropdown={isOpenTempAreaDropdown} setIsOpenTempAreaDropdown={setIsOpenTempAreaDropdown}
          viewingDuration={viewingDuration} previewSubService={previewSubService}
          viewingPeakHour={viewingPeakHour} editingPeakHourIdx={editingPeakHourIdx} editPeakHour={editPeakHour} inlineDdRect={inlineDdRect}
          isOpenInlineHoursDropdown={isOpenInlineHoursDropdown} isOpenInlineAreaDropdown={isOpenInlineAreaDropdown}
        />
      )}

      {step === 3 && (
        <StepWorkflowTerms
          termsAndConditions={termsAndConditions} setTermsAndConditions={setTermsAndConditions}
          premiumTermsAndConditions={premiumTermsAndConditions} setPremiumTermsAndConditions={setPremiumTermsAndConditions}
          commitments={commitments} setCommitments={setCommitments}
          newCommitmentTitle={newCommitmentTitle} setNewCommitmentTitle={setNewCommitmentTitle}
          newCommitmentContent={newCommitmentContent} setNewCommitmentContent={setNewCommitmentContent}
          newCommitmentIcon={newCommitmentIcon} setNewCommitmentIcon={setNewCommitmentIcon}
          showAddCommitment={showAddCommitment} setShowAddCommitment={setShowAddCommitment}
          workflowSteps={workflowSteps} setWorkflowSteps={setWorkflowSteps}
          editingWorkflowStepIndex={editingWorkflowStepIndex} setEditingWorkflowStepIndex={setEditingWorkflowStepIndex}
          stepTitle={stepTitle} setStepTitle={setStepTitle} stepDesc={stepDesc} setStepDesc={setStepDesc}
          stepDuration={stepDuration} setStepDuration={setStepDuration} stepRequired={stepRequired} setStepRequired={setStepRequired}
          stepChecklist={stepChecklist} setStepChecklist={setStepChecklist}
          newChecklistVal={newChecklistVal} setNewChecklistVal={setNewChecklistVal}
          policiesData={policiesData} selectedPolicyIds={selectedPolicyIds} setSelectedPolicyIds={setSelectedPolicyIds}
          policySearch={policySearch} setPolicySearch={setPolicySearch} filteredPolicies={filteredPolicies}
          setStep={setStep}
        />
      )}

      {step === 4 && (
        <StepReviewSubmit
          iconUrl={iconUrl} name={name} isActive={isActive} packageCode={packageCode} sortOrder={sortOrder}
          policyDescription={policyDescription} galleryUrls={galleryUrls}
          baseHourlyRate={baseHourlyRate} premiumHourlyRate={premiumHourlyRate}
          allowMultipleTaskers={allowMultipleTaskers} allowSubscription={allowSubscription}
          selectedAreaIds={selectedAreaIds} coverageAreas={coverageAreas} durations={durations}
          selectedSubServices={selectedSubServices} addons={addons} peakHours={peakHours} subscriptions={subscriptions}
          workflowSteps={workflowSteps} commitments={commitments} selectedPolicyIds={selectedPolicyIds} policiesData={policiesData}
          termsAndConditions={termsAndConditions} premiumTermsAndConditions={premiumTermsAndConditions}
          setStep={setStep} isSubmitting={isSubmitting}
          showConfirmModal={showConfirmModal} setShowConfirmModal={setShowConfirmModal}
          selectedAreaNames={selectedAreaNames} handleSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
