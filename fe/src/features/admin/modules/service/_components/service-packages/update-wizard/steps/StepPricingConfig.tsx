"use client";

import React from "react";
import {
  DollarSign, Settings2, Clock, Plus, ShoppingCart, Calendar, Zap, Sparkles, Info, HelpCircle,
  Search, Edit, Eye, Trash2, Layers, ScrollText, ChevronRight, Package, ImageIcon, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import {
  AdminServiceEntity, CoverageAreaEntity, ServiceDurationEntity, ServiceAddonEntity, AddonPriceUnit,
  ServiceSubscriptionEntity, SubscriptionBillingCycle, ServicePeakHourEntity,
} from "@/features/admin/modules/service/services/admin-services.service";
import { useUpdateCoverageArea } from "@/features/admin/modules/service/hooks/useAdminServices";
import { SectionCard } from "../shared/SectionCard";
import { Field } from "../shared/FormField";
import { vnd } from "../shared/helpers";
import { SelectedSubService, PeakHourFormState } from "../shared/types";
import { StepPricingConfigModals } from "./StepPricingConfig.modals";

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

export interface NewDurationState {
  durationHours: string;
  priceAdjustment: string;
  priceMode: 'percent' | 'fixed';
  fixedPriceInput: string;
  isPopular: boolean;
  suggestedArea: string;
  taskerCount: string;
  title: string;
  description: string;
}

interface NewAddonState {
  name: string;
  description: string;
  price: string;
  priceUnit: AddonPriceUnit;
  durationMinutes: string;
  maxQuantity: string;
  sortOrder: string;
  isActive: boolean;
}

interface NewSubscriptionState {
  name: string;
  description: string;
  bonusDescription: string;
  discountPercent: string;
  billingCycle: SubscriptionBillingCycle;
  sessionsPerCycle: string;
  commitmentMonths: string;
  isPopular: boolean;
  sortOrder: string;
  isActive: boolean;
}

export interface StepPricingConfigProps {
  baseHourlyRate: number;
  setBaseHourlyRate: React.Dispatch<React.SetStateAction<number>>;
  premiumHourlyRate: number;
  setPremiumHourlyRate: React.Dispatch<React.SetStateAction<number>>;
  maxHours: number;
  setMaxHours: React.Dispatch<React.SetStateAction<number>>;
  allowMultipleTaskers: boolean;
  setAllowMultipleTaskers: React.Dispatch<React.SetStateAction<boolean>>;
  allowSubscription: boolean;
  setAllowSubscription: React.Dispatch<React.SetStateAction<boolean>>;
  allowSingleService: boolean;
  setAllowSingleService: React.Dispatch<React.SetStateAction<boolean>>;
  applyTemplate: (type: "hourly" | "deep" | "specialized") => void;
  activeTab: string;
  setActiveTab: (v: string) => void;

  newDuration: NewDurationState;
  setNewDuration: React.Dispatch<React.SetStateAction<NewDurationState>>;
  isOpenHoursDropdown: boolean;
  setIsOpenHoursDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  hourOptions: number[];
  isOpenAreaDropdown: boolean;
  setIsOpenAreaDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  areaOptions: number[];
  isOpenAdjustmentDropdown: boolean;
  setIsOpenAdjustmentDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  adjustmentOptions: { value: string; label: string }[];
  formatHoursToMinutes: (hoursStr: string) => string;
  setTempTitle: React.Dispatch<React.SetStateAction<string>>;
  setTempDescription: React.Dispatch<React.SetStateAction<string>>;
  setIsOpenMetaModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveDuration: () => void;
  durations: ServiceDurationEntity[];
  setDurations: React.Dispatch<React.SetStateAction<ServiceDurationEntity[]>>;
  inlineEditingCell: { rowIndex: number; field: 'hours' | 'area' | 'taskerCount' | 'adjustment' } | null;
  setInlineEditingCell: React.Dispatch<React.SetStateAction<{ rowIndex: number; field: 'hours' | 'area' | 'taskerCount' | 'adjustment' } | null>>;
  inlineEditValue: string;
  setInlineEditValue: React.Dispatch<React.SetStateAction<string>>;
  captureInlineRect: (e: React.FocusEvent<HTMLInputElement>) => void;
  setIsOpenInlineHoursDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleInlineSave: (rowIndex: number, field: 'hours' | 'area' | 'taskerCount' | 'adjustment', value: string) => void;
  setIsOpenInlineAreaDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  isOpenInlineAdjustmentDropdown: boolean;
  setIsOpenInlineAdjustmentDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingDurationIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setTempHours: React.Dispatch<React.SetStateAction<string>>;
  setTempArea: React.Dispatch<React.SetStateAction<string>>;
  setTempAdjustment: React.Dispatch<React.SetStateAction<string>>;
  tempPriceMode: 'percent' | 'fixed';
  setTempPriceMode: React.Dispatch<React.SetStateAction<'percent' | 'fixed'>>;
  tempFixedPriceInput: string;
  setTempFixedPriceInput: React.Dispatch<React.SetStateAction<string>>;
  setTempIsPopular: React.Dispatch<React.SetStateAction<boolean>>;
  setTempIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  setTempTaskerCount: React.Dispatch<React.SetStateAction<string>>;
  setViewingDuration: React.Dispatch<React.SetStateAction<ServiceDurationEntity | null>>;

  editingAddonIndex: number | null;
  setEditingAddonIndex: React.Dispatch<React.SetStateAction<number | null>>;
  addons: ServiceAddonEntity[];
  setAddons: React.Dispatch<React.SetStateAction<ServiceAddonEntity[]>>;
  resetNewAddon: () => void;
  newAddon: NewAddonState;
  setNewAddon: React.Dispatch<React.SetStateAction<NewAddonState>>;
  handleSaveAddon: () => void;
  handleEditAddon: (i: number) => void;
  ADDON_PRICE_UNIT_LABELS: Record<AddonPriceUnit, string>;

  searchSvc: string;
  setSearchSvc: React.Dispatch<React.SetStateAction<string>>;
  filteredSvcs: AdminServiceEntity[];
  selectedSubServices: SelectedSubService[];
  toggleSelect: (svc: AdminServiceEntity) => void;
  setPreviewSubService: React.Dispatch<React.SetStateAction<AdminServiceEntity | null>>;
  allSubServices: AdminServiceEntity[];
  updateSelected: (id: string, patch: Partial<SelectedSubService>) => void;
  removeSelected: (id: string) => void;

  SUBSCRIPTION_PRESETS: { label: string; data: Partial<NewSubscriptionState> }[];
  editingSubscriptionIndex: number | null;
  setEditingSubscriptionIndex: React.Dispatch<React.SetStateAction<number | null>>;
  subscriptions: ServiceSubscriptionEntity[];
  setSubscriptions: React.Dispatch<React.SetStateAction<ServiceSubscriptionEntity[]>>;
  resetNewSubscription: () => void;
  newSubscription: NewSubscriptionState;
  setNewSubscription: React.Dispatch<React.SetStateAction<NewSubscriptionState>>;
  handleSaveSubscription: () => void;
  handleEditSubscription: (i: number) => void;
  BILLING_CYCLE_LABELS: Record<SubscriptionBillingCycle, string>;

  PEAK_HOUR_QUICK_PRESETS: {
    label: string; icon: React.ElementType; multiplier: string;
    entries?: ServicePeakHourEntity[];
    dayOfWeek?: string; startHour?: string; endHour?: string;
  }[];
  peakHours: ServicePeakHourEntity[];
  setPeakHours: React.Dispatch<React.SetStateAction<ServicePeakHourEntity[]>>;
  newPeakHour: PeakHourFormState;
  setNewPeakHour: React.Dispatch<React.SetStateAction<PeakHourFormState>>;
  handleSavePeakHour: () => void;
  setViewingPeakHour: React.Dispatch<React.SetStateAction<ServicePeakHourEntity | null>>;
  setEditPeakHour: React.Dispatch<React.SetStateAction<PeakHourFormState>>;
  setEditingPeakHourIdx: React.Dispatch<React.SetStateAction<number | null>>;

  setStep: (v: number) => void;

  // Passthrough-only props forwarded to <StepPricingConfigModals />
  editingArea: CoverageAreaEntity | null;
  setEditingArea: React.Dispatch<React.SetStateAction<CoverageAreaEntity | null>>;
  editAreaFee: string;
  setEditAreaFee: React.Dispatch<React.SetStateAction<string>>;
  isUpdatingAreaSaving: boolean;
  setIsUpdatingAreaSaving: React.Dispatch<React.SetStateAction<boolean>>;
  updateAreaMutation: ReturnType<typeof useUpdateCoverageArea>;
  isOpenMetaModal: boolean;
  editingDurationIndex: number | null;
  tempHours: string;
  tempArea: string;
  tempAdjustment: string;
  tempIsPopular: boolean;
  tempIsActive: boolean;
  tempTaskerCount: string;
  tempTitle: string;
  tempDescription: string;
  isOpenTempHoursDropdown: boolean;
  setIsOpenTempHoursDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  isOpenTempAreaDropdown: boolean;
  setIsOpenTempAreaDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  viewingDuration: ServiceDurationEntity | null;
  previewSubService: AdminServiceEntity | null;
  viewingPeakHour: ServicePeakHourEntity | null;
  editingPeakHourIdx: number | null;
  editPeakHour: PeakHourFormState;
  inlineDdRect: { top: number; left: number; width: number } | null;
  isOpenInlineHoursDropdown: boolean;
  isOpenInlineAreaDropdown: boolean;
}

export function StepPricingConfig({
  baseHourlyRate, setBaseHourlyRate, premiumHourlyRate, setPremiumHourlyRate, maxHours, setMaxHours,
  allowMultipleTaskers, setAllowMultipleTaskers, allowSubscription, setAllowSubscription,
  allowSingleService, setAllowSingleService, applyTemplate, activeTab, setActiveTab,
  newDuration, setNewDuration, isOpenHoursDropdown, setIsOpenHoursDropdown, hourOptions,
  isOpenAreaDropdown, setIsOpenAreaDropdown, areaOptions, isOpenAdjustmentDropdown, setIsOpenAdjustmentDropdown,
  adjustmentOptions, formatHoursToMinutes, setTempTitle, setTempDescription, setIsOpenMetaModal,
  handleSaveDuration, durations, setDurations, inlineEditingCell, setInlineEditingCell,
  inlineEditValue, setInlineEditValue, captureInlineRect, setIsOpenInlineHoursDropdown, handleInlineSave,
  setIsOpenInlineAreaDropdown, isOpenInlineAdjustmentDropdown, setIsOpenInlineAdjustmentDropdown,
  setEditingDurationIndex, setTempHours, setTempArea, setTempAdjustment,
  tempPriceMode, setTempPriceMode, tempFixedPriceInput, setTempFixedPriceInput,
  setTempIsPopular, setTempIsActive,
  setTempTaskerCount, setViewingDuration,
  editingAddonIndex, setEditingAddonIndex, addons, setAddons, resetNewAddon, newAddon, setNewAddon,
  handleSaveAddon, handleEditAddon, ADDON_PRICE_UNIT_LABELS,
  searchSvc, setSearchSvc, filteredSvcs, selectedSubServices, toggleSelect, setPreviewSubService,
  allSubServices, updateSelected, removeSelected,
  SUBSCRIPTION_PRESETS, editingSubscriptionIndex, setEditingSubscriptionIndex, subscriptions, setSubscriptions,
  resetNewSubscription, newSubscription, setNewSubscription, handleSaveSubscription, handleEditSubscription,
  BILLING_CYCLE_LABELS,
  PEAK_HOUR_QUICK_PRESETS, peakHours, setPeakHours, newPeakHour, setNewPeakHour, handleSavePeakHour,
  setViewingPeakHour, setEditPeakHour, setEditingPeakHourIdx,
  setStep,
  editingArea, setEditingArea, editAreaFee, setEditAreaFee, isUpdatingAreaSaving, setIsUpdatingAreaSaving, updateAreaMutation,
  isOpenMetaModal, editingDurationIndex, tempHours, tempArea, tempAdjustment, tempIsPopular, tempIsActive,
  tempTaskerCount, tempTitle, tempDescription, isOpenTempHoursDropdown, setIsOpenTempHoursDropdown,
  isOpenTempAreaDropdown, setIsOpenTempAreaDropdown,
  viewingDuration, previewSubService, viewingPeakHour, editingPeakHourIdx, editPeakHour, inlineDdRect,
  isOpenInlineHoursDropdown, isOpenInlineAreaDropdown,
}: StepPricingConfigProps) {
  return (
    <>
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
                          <span>Điều chỉnh giá</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                              Chọn điều chỉnh theo % so với đơn giá gốc chuẩn, hoặc nhập thẳng một mức giá cụ thể cho mốc thời lượng này.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      }
                      required
                      hint={newDuration.priceMode === "fixed" ? "Nhập số tiền cụ thể (VNĐ) cho mốc này" : "Chọn hoặc nhập phần trăm tăng/giảm giá"}
                    >
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1 p-1 bg-muted/30 border border-border/30 rounded-lg">
                          <button type="button" onClick={() => setNewDuration(p => ({ ...p, priceMode: "percent" }))}
                            className={cn("h-8 rounded-md text-xs font-bold transition-colors", newDuration.priceMode !== "fixed" ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                          >
                            Theo %
                          </button>
                          <button type="button" onClick={() => setNewDuration(p => ({ ...p, priceMode: "fixed" }))}
                            className={cn("h-8 rounded-md text-xs font-bold transition-colors", newDuration.priceMode === "fixed" ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                          >
                            Nhập giá cụ thể
                          </button>
                        </div>
                        {newDuration.priceMode === "fixed" ? (
                          <Input
                            inputMode="numeric"
                            placeholder="Ví dụ: 350000"
                            value={newDuration.fixedPriceInput}
                            onChange={e => setNewDuration(p => ({ ...p, fixedPriceInput: e.target.value.replace(/\D/g, "") }))}
                            className="h-10 rounded-lg font-bold"
                          />
                        ) : (
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
                            {newDuration.priceMode === "fixed"
                              ? vnd(Number(newDuration.fixedPriceInput) || 0)
                              : vnd(Number(newDuration.durationHours) * baseHourlyRate * (1 + (Number(newDuration.priceAdjustment) || 0) / 100))}
                          </p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 p-2.5 rounded-lg">
                          <p className="text-[10px] text-primary font-bold uppercase mb-0.5">Cao cấp (Premium)</p>
                          <p className="text-sm font-black text-primary">
                            {newDuration.priceMode === "fixed"
                              ? vnd((Number(newDuration.fixedPriceInput) || 0) * (baseHourlyRate > 0 ? premiumHourlyRate / baseHourlyRate : 1))
                              : vnd(Number(newDuration.durationHours) * premiumHourlyRate * (1 + (Number(newDuration.priceAdjustment) || 0) / 100))}
                          </p>
                        </div>
                      </div>
                      {newDuration.priceMode !== "fixed" && Number(newDuration.priceAdjustment) !== 0 && (
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
                              {d.priceMode === "fixed" ? (
                                <>
                                  <p className="font-black text-slate-700 text-xs">{vnd(Number(d.fixedPrice ?? 0))}</p>
                                  <p className="text-[10px] text-primary font-bold mt-0.5">{vnd(Number(d.fixedPrice ?? 0) * (baseHourlyRate > 0 ? premiumHourlyRate / baseHourlyRate : 1))} <span className="text-primary/60 font-semibold">Premium</span></p>
                                </>
                              ) : (
                                <>
                                  <p className="font-black text-slate-700 text-xs">{vnd(d.durationHours * baseHourlyRate * d.priceMultiplier)}</p>
                                  <p className="text-[10px] text-primary font-bold mt-0.5">{vnd(d.durationHours * premiumHourlyRate * d.priceMultiplier)} <span className="text-primary/60 font-semibold">Premium</span></p>
                                </>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center select-none min-w-[150px]" onDoubleClick={() => {
                              if (d.priceMode === "fixed") return;
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
                                <div className="cursor-pointer group flex items-center justify-center gap-1" title={d.priceMode === "fixed" ? "Nhấp vào biểu tượng Sửa để thay đổi" : "Nhấp đúp chuột để sửa nhanh"}>
                                  <span>
                                    {d.priceMode === "fixed" ? (
                                      <span className="text-primary font-black">{vnd(Number(d.fixedPrice ?? 0))}</span>
                                    ) : d.priceMultiplier === 1.0 ? (
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
                                     setTempPriceMode(d.priceMode || "percent");
                                     setTempFixedPriceInput(d.fixedPrice ? String(d.fixedPrice) : "");
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

              {/* TAB 3: DỊCH VỤ LẺ */}
              {allowSingleService && <TabsContent value="subservices" className="space-y-4">
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
              </TabsContent>}

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
                            <tr key={i} className="hover:bg-primary/2 transition-colors group">
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
      <StepPricingConfigModals
        baseHourlyRate={baseHourlyRate}
        premiumHourlyRate={premiumHourlyRate}
        setDurations={setDurations}
        editingArea={editingArea}
        setEditingArea={setEditingArea}
        editAreaFee={editAreaFee}
        setEditAreaFee={setEditAreaFee}
        isUpdatingAreaSaving={isUpdatingAreaSaving}
        setIsUpdatingAreaSaving={setIsUpdatingAreaSaving}
        updateAreaMutation={updateAreaMutation}
        isOpenMetaModal={isOpenMetaModal}
        setIsOpenMetaModal={setIsOpenMetaModal}
        editingDurationIndex={editingDurationIndex}
        setEditingDurationIndex={setEditingDurationIndex}
        tempHours={tempHours}
        setTempHours={setTempHours}
        isOpenTempHoursDropdown={isOpenTempHoursDropdown}
        setIsOpenTempHoursDropdown={setIsOpenTempHoursDropdown}
        hourOptions={hourOptions}
        tempArea={tempArea}
        setTempArea={setTempArea}
        isOpenTempAreaDropdown={isOpenTempAreaDropdown}
        setIsOpenTempAreaDropdown={setIsOpenTempAreaDropdown}
        areaOptions={areaOptions}
        formatHoursToMinutes={formatHoursToMinutes}
        tempAdjustment={tempAdjustment}
        setTempAdjustment={setTempAdjustment}
        tempPriceMode={tempPriceMode}
        setTempPriceMode={setTempPriceMode}
        tempFixedPriceInput={tempFixedPriceInput}
        setTempFixedPriceInput={setTempFixedPriceInput}
        adjustmentOptions={adjustmentOptions}
        allowMultipleTaskers={allowMultipleTaskers}
        tempTaskerCount={tempTaskerCount}
        setTempTaskerCount={setTempTaskerCount}
        tempIsPopular={tempIsPopular}
        setTempIsPopular={setTempIsPopular}
        tempIsActive={tempIsActive}
        setTempIsActive={setTempIsActive}
        tempTitle={tempTitle}
        setTempTitle={setTempTitle}
        tempDescription={tempDescription}
        setTempDescription={setTempDescription}
        maxHours={maxHours}
        viewingDuration={viewingDuration}
        setViewingDuration={setViewingDuration}
        previewSubService={previewSubService}
        setPreviewSubService={setPreviewSubService}
        viewingPeakHour={viewingPeakHour}
        setViewingPeakHour={setViewingPeakHour}
        peakHours={peakHours}
        setPeakHours={setPeakHours}
        setEditPeakHour={setEditPeakHour}
        setEditingPeakHourIdx={setEditingPeakHourIdx}
        editingPeakHourIdx={editingPeakHourIdx}
        editPeakHour={editPeakHour}
        inlineDdRect={inlineDdRect}
        isOpenInlineHoursDropdown={isOpenInlineHoursDropdown}
        inlineEditValue={inlineEditValue}
        inlineEditingCell={inlineEditingCell}
        handleInlineSave={handleInlineSave}
        isOpenInlineAreaDropdown={isOpenInlineAreaDropdown}
        isOpenInlineAdjustmentDropdown={isOpenInlineAdjustmentDropdown}
      />
    </>
  );
}
