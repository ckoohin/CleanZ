"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  DollarSign, Moon, PawPrint, Clock, Wrench, TrendingUp, Edit3, Save, X as XIcon, Sparkles,
  Calculator, AlertCircle, Plus, Trash2, CheckCircle2, XCircle, Pencil, Flame,
  Timer, CalendarDays, SlidersHorizontal, Tag, BarChart3, ArrowUpRight, Info,
  Layers, ChevronDown, ChevronUp, Home, Ruler, ToggleLeft, Search, HelpCircle, ScrollText, Eye, ShoppingCart
} from "lucide-react";
import {
  AdminServicePackageEntity, adminServicesApi, AdminServiceEntity,
  ServiceDurationEntity, ServiceAddonEntity, ServiceSubscriptionEntity, ServicePeakHourEntity, ServiceSubServiceEntity
} from "@/features/admin/modules/service/services/admin-services.service";
import { useUpdateAdminPackage, useAdminServices, useAddSubServicesToPackage } from "@/features/admin/modules/service/hooks/useAdminServices";
import { Input } from "@/components/ui/input";
import { BaseButton } from "@/components/ui/base/base_button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const vnd = (val: number | null | undefined) => {
  if (val === null || val === undefined || val === 0) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);
};

// ─── Local Interfaces ────────────────────────────────────────────────────────
interface MappedSubService {
  id: string;
  name: string;
  subServiceCode: string;
  price: number;
  isActive: boolean;
  isRequired: boolean;
  isDefault: boolean;
  sortOrder: number;
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SCard({ icon: Icon, title, description, action, children }: {
  icon: React.ElementType; title: string; description?: string;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border/40 bg-muted/20 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
          <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-slate-800 text-lg">{title}</h3>
          {description && <p className="text-sm font-medium text-slate-600 mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

interface PackagePricingTabProps {
  pkg: AdminServicePackageEntity;
}

export function PackagePricingTab({ pkg }: PackagePricingTabProps) {
  const queryClient = useQueryClient();
  const updateMutation = useUpdateAdminPackage();
  const addSubServicesMutation = useAddSubServicesToPackage();
  const { data: servicesData } = useAdminServices({ limit: 100 });
  const allSubServices = useMemo(() => servicesData?.items ?? [], [servicesData]);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [baseHourlyRate, setBaseHourlyRate] = useState(0);
  const [premiumHourlyRate, setPremiumHourlyRate] = useState(0);
  const [allowMultipleTaskers, setAllowMultipleTaskers] = useState(false);
  const [allowSubscription, setAllowSubscription] = useState(false);
  const [allowSingleService, setAllowSingleService] = useState(true);
  const [activeTab, setActiveTab] = useState("durations");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!allowSubscription && activeTab === "subscriptions") {
      setActiveTab("durations");
    }
    if (!allowSingleService && activeTab === "subservices") {
      setActiveTab("durations");
    }
  }, [allowSubscription, allowSingleService, activeTab]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [nightSurcharge, setNightSurcharge] = useState(0);
  const [petSurcharge, setPetSurcharge] = useState(0);
  const [waitingSurcharge, setWaitingSurcharge] = useState(0);
  const [toolFee, setToolFee] = useState(0);
  const [peakRatePercent, setPeakRatePercent] = useState(0);
  const [maxHours, setMaxHours] = useState(8);

  const [durations, setDurations] = useState<ServiceDurationEntity[]>([]);
  const [addons, setAddons] = useState<ServiceAddonEntity[]>([]);
  const [subscriptions, setSubscriptions] = useState<ServiceSubscriptionEntity[]>([]);
  const [peakHours, setPeakHours] = useState<ServicePeakHourEntity[]>([]);
  const [subServices, setSubServices] = useState<MappedSubService[]>([]);

  // Subservice selection state (for adding new ones)
  const [searchSvc, setSearchSvc] = useState("");
  const [newDuration, setNewDuration] = useState({
    durationHours: "",
    priceAdjustment: "0",
    isPopular: false,
    suggestedArea: "",
    taskerCount: "1",
    title: "",
    description: "",
  });
  const [newAddon, setNewAddon] = useState({ name: "", description: "", price: "", isActive: true });
  const [newSubscription, setNewSubscription] = useState({ name: "", description: "", discountPercent: "", isActive: true });
  const [newPeakHour, setNewPeakHour] = useState({ dayOfWeek: "1", startHour: "08:00", endHour: "22:00", multiplier: "1.1", startDate: "", endDate: "", isActive: true });

  // Dropdown visibility states for searchable select inputs
  const [isOpenAreaDropdown, setIsOpenAreaDropdown] = useState(false);
  const [isOpenHoursDropdown, setIsOpenHoursDropdown] = useState(false);
  const [isOpenAdjustmentDropdown, setIsOpenAdjustmentDropdown] = useState(false);

  // States for duration custom meta dialog modal
  const [isOpenMetaModal, setIsOpenMetaModal] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null);
  const [inlineEditingCell, setInlineEditingCell] = useState<{ rowIndex: number; field: 'hours' | 'area' | 'taskerCount' | 'adjustment' } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");
  const [isOpenInlineHoursDropdown, setIsOpenInlineHoursDropdown] = useState(false);
  const [isOpenInlineAreaDropdown, setIsOpenInlineAreaDropdown] = useState(false);
  const [isOpenInlineAdjustmentDropdown, setIsOpenInlineAdjustmentDropdown] = useState(false);
  const [viewingDuration, setViewingDuration] = useState<ServiceDurationEntity | null>(null);

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

  // Price adjustment options: sorted intuitively (0% first, then discounts -5% to -50%, then premiums +5% to +50%)
  const adjustmentOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [{ value: "0", label: "Giá gốc (0%)" }];
    // Add discounts from -5% down to -50%
    for (let val = -5; val >= -50; val -= 5) {
      opts.push({ value: val.toString(), label: `Giảm ${Math.abs(val)}% (${val}%)` });
    }
    // Add premiums from +5% up to +50%
    for (let val = 5; val <= 50; val += 5) {
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pkg) {
      setBaseHourlyRate(Number(pkg.baseHourlyRate ?? 0));
      setPremiumHourlyRate(Number(pkg.premiumHourlyRate ?? 0));
      setAllowMultipleTaskers(!!pkg.allowMultipleTaskers);
      setAllowSubscription(!!pkg.allowSubscription);
      setAllowSingleService(pkg.allowSingleService !== false);

      setNightSurcharge(Number(pkg.nightSurcharge ?? 0));
      setPetSurcharge(Number(pkg.petSurcharge ?? 0));
      setWaitingSurcharge(Number(pkg.waitingSurcharge ?? 0));
      setToolFee(Number(pkg.toolFee ?? 0));
      setPeakRatePercent(Number(pkg.peakRatePercent ?? 0));
      setMaxHours(Number(pkg.maxHours ?? 8));

      // Clone lists to avoid direct mutations
      setDurations(pkg.durations ? pkg.durations.map(d => ({ ...d })) : []);
      setAddons(pkg.addons ? pkg.addons.map(a => ({ ...a })) : []);
      setSubscriptions(pkg.subscriptions ? pkg.subscriptions.map(s => ({ ...s })) : []);
      setPeakHours(pkg.peakHours ? pkg.peakHours.map(p => ({ ...p })) : []);
      
      // Merge with packageSubServices for mapping id / names
      const mappedSubSvcs = (pkg.subServices ?? []).map(ss => {
        const joinInfo = pkg.packageSubServices?.find(x => x.subService?.id === ss.subServiceId);
        return {
          id: ss.subServiceId,
          name: ss.subService?.name || joinInfo?.subService?.name || "Dịch vụ con",
          subServiceCode: ss.subService?.subServiceCode || joinInfo?.subService?.subServiceCode || "",
          price: Number(ss.price),
          isActive: ss.isActive,
          isRequired: joinInfo?.isRequired ?? false,
          isDefault: joinInfo?.isDefault ?? false,
          sortOrder: joinInfo?.sortOrder ?? 0,
        };
      });
      setSubServices(mappedSubSvcs);
    }
  }, [pkg]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Add / edit handlers for lists in edit mode
  const handleAddDuration = () => {
    const hours = parseFloat(newDuration.durationHours);
    if (isNaN(hours) || hours <= 0) {
      toast.error("Vui lòng nhập số giờ hợp lệ");
      return;
    }
    const adj = parseFloat(newDuration.priceAdjustment) || 0;
    const mult = 1 + adj / 100;

    const area = newDuration.suggestedArea ? Number(newDuration.suggestedArea) : null;
    const taskers = allowMultipleTaskers && newDuration.taskerCount ? Number(newDuration.taskerCount) : 1;

    setDurations(prev => {
      const list = prev.map(d => newDuration.isPopular ? { ...d, isPopular: false } : d);
      return [...list, {
        durationHours: hours,
        priceMultiplier: mult,
        isPopular: newDuration.isPopular,
        isActive: true,
        suggestedArea: area,
        taskerCount: taskers,
        title: newDuration.title.trim() || undefined,
        description: newDuration.description.trim() || undefined,
      }].sort((a, b) => a.durationHours - b.durationHours);
    });
    setNewDuration({ durationHours: "", priceAdjustment: "0", isPopular: false, suggestedArea: "", taskerCount: "1", title: "", description: "" });
  };

  const handleAddAddon = () => {
    if (!newAddon.name.trim()) {
      toast.error("Vui lòng nhập tên dịch vụ thêm");
      return;
    }
    const priceVal = Number(newAddon.price);
    if (isNaN(priceVal) || priceVal < 0) {
      toast.error("Đơn giá không hợp lệ");
      return;
    }
    setAddons(prev => [...prev, { name: newAddon.name.trim(), description: newAddon.description.trim() || undefined, price: priceVal, isActive: newAddon.isActive }]);
    setNewAddon({ name: "", description: "", price: "", isActive: true });
  };

  const handleAddSubscription = () => {
    if (!newSubscription.name.trim()) {
      toast.error("Vui lòng nhập tên gói tháng");
      return;
    }
    const pct = Number(newSubscription.discountPercent);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Phần trăm chiết khấu không hợp lệ (0-100)");
      return;
    }
    setSubscriptions(prev => [...prev, { name: newSubscription.name.trim(), description: newSubscription.description.trim() || undefined, discountPercent: pct, isActive: newSubscription.isActive }]);
    setNewSubscription({ name: "", description: "", discountPercent: "", isActive: true });
  };

  const handleAddPeakHour = () => {
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
      isActive: newPeakHour.isActive
    }]);
    setNewPeakHour({ dayOfWeek: "1", startHour: "08:00", endHour: "22:00", multiplier: "1.1", startDate: "", endDate: "", isActive: true });
  };

  const toggleLinkSubService = (svc: AdminServiceEntity) => {
    const exists = subServices.find(s => s.id === svc.id);
    if (exists) {
      setSubServices(prev => prev.filter(s => s.id !== svc.id));
    } else {
      const baseP = svc.pricingConfig?.basePrice ? Number(svc.pricingConfig.basePrice) : 0;
      setSubServices(prev => [...prev, {
        id: svc.id,
        name: svc.name,
        subServiceCode: svc.subServiceCode || "",
        price: baseP,
        isActive: true,
        isRequired: false,
        isDefault: true,
        sortOrder: prev.length
      }]);
    }
  };

  // Save changes handler
  const handleSave = async () => {
    if (allowSubscription && subscriptions.length === 0) {
      toast.error("Bạn đã kích hoạt 'Cho phép gói tháng'. Vui lòng cấu hình ít nhất một chu kỳ ưu đãi gói tháng tại Tab Gói tháng!");
      return;
    }
    try {
      const payload = {
        baseHourlyRate: Number(baseHourlyRate),
        premiumHourlyRate: Number(premiumHourlyRate),
        allowMultipleTaskers,
        allowSubscription,
        allowSingleService,
        maxHours: Number(maxHours),
        nightSurcharge: Number(nightSurcharge),
        petSurcharge: Number(petSurcharge),
        waitingSurcharge: Number(waitingSurcharge),
        toolFee: Number(toolFee),
        peakRatePercent: Number(peakRatePercent),
        
        durations: durations.map(d => ({
          durationHours: Number(d.durationHours),
          priceMultiplier: Number(d.priceMultiplier),
          isPopular: !!d.isPopular,
          isActive: !!d.isActive,
          suggestedArea: d.suggestedArea ? Number(d.suggestedArea) : null,
          taskerCount: d.taskerCount ? Number(d.taskerCount) : 1,
        })),
        addons: addons.map(a => ({
          name: a.name.trim(),
          description: a.description || undefined,
          price: Number(a.price),
          isActive: !!a.isActive,
        })),
        subscriptions: subscriptions.map(s => ({
          name: s.name.trim(),
          description: s.description || undefined,
          discountPercent: Number(s.discountPercent),
          isActive: !!s.isActive,
        })),
        peakHours: peakHours.map(p => ({
          dayOfWeek: Number(p.dayOfWeek),
          startHour: p.startHour,
          endHour: p.endHour,
          multiplier: Number(p.multiplier),
          startDate: p.startDate || null,
          endDate: p.endDate || null,
          isActive: !!p.isActive,
        })),
        subServices: subServices.map(s => ({
          subServiceId: s.id,
          price: Number(s.price),
          isActive: !!s.isActive,
        })),
      };

      // 1. Update main package (this updates durations, addons, subscriptions, peakHours, subServices inside DB)
      await updateMutation.mutateAsync({ id: pkg.id, payload });

      // 2. Link sub-services in join table for backward compatibility
      if (subServices.length > 0) {
        await addSubServicesMutation.mutateAsync({
          packageId: pkg.id,
          subServices: subServices.map((s, index) => ({
            id: s.id,
            isRequired: !!s.isRequired,
            isDefault: !!s.isDefault,
            sortOrder: s.sortOrder ?? index,
          })),
        });
      } else {
        // If empty, clean them up or update
      }

      toast.success("Cập nhật toàn bộ bảng giá thành công!");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin-packages", "detail", pkg.id] });
    } catch (e: unknown) {
      const error = e as { 
        response?: { 
          data?: { 
            message?: string; 
            errors?: { message?: string } 
          } 
        } 
      };
      const errMsg = error?.response?.data?.errors?.message || error?.response?.data?.message || "Có lỗi xảy ra khi lưu bảng giá!";
      toast.error(errMsg);
    }
  };

  const handleCancel = () => {
    // Reset states to original package properties
    if (pkg) {
      setBaseHourlyRate(Number(pkg.baseHourlyRate ?? 0));
      setPremiumHourlyRate(Number(pkg.premiumHourlyRate ?? 0));
      setAllowMultipleTaskers(!!pkg.allowMultipleTaskers);
      setAllowSubscription(!!pkg.allowSubscription);
      setNightSurcharge(Number(pkg.nightSurcharge ?? 0));
      setPetSurcharge(Number(pkg.petSurcharge ?? 0));
      setWaitingSurcharge(Number(pkg.waitingSurcharge ?? 0));
      setToolFee(Number(pkg.toolFee ?? 0));
      setPeakRatePercent(Number(pkg.peakRatePercent ?? 0));
      setMaxHours(Number(pkg.maxHours ?? 8));

      setDurations(pkg.durations ? pkg.durations.map(d => ({ ...d })) : []);
      setAddons(pkg.addons ? pkg.addons.map(a => ({ ...a })) : []);
      setSubscriptions(pkg.subscriptions ? pkg.subscriptions.map(s => ({ ...s })) : []);
      setPeakHours(pkg.peakHours ? pkg.peakHours.map(p => ({ ...p })) : []);

      const mappedSubSvcs = (pkg.subServices ?? []).map(ss => {
        const joinInfo = pkg.packageSubServices?.find(x => x.subService?.id === ss.subServiceId);
        return {
          id: ss.subServiceId,
          name: ss.subService?.name || joinInfo?.subService?.name || "Dịch vụ con",
          subServiceCode: ss.subService?.subServiceCode || joinInfo?.subService?.subServiceCode || "",
          price: Number(ss.price),
          isActive: ss.isActive,
          isRequired: joinInfo?.isRequired ?? false,
          isDefault: joinInfo?.isDefault ?? false,
          sortOrder: joinInfo?.sortOrder ?? 0,
        };
      });
      setSubServices(mappedSubSvcs);
    }
    setIsEditing(false);
  };

  // Filter available sub services that are not already linked
  const availableSubServices = useMemo(() => {
    return allSubServices.filter(svc => 
      !subServices.find(s => s.id === svc.id) &&
      (svc.name.toLowerCase().includes(searchSvc.toLowerCase()) || svc.subServiceCode?.toLowerCase().includes(searchSvc.toLowerCase()))
    );
  }, [allSubServices, subServices, searchSvc]);

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex justify-between items-center bg-card border border-border/40 p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">Bảng giá & Các thông số nâng cao</h2>
          <p className="text-sm font-medium text-slate-600 mt-0.5">Quản lý mốc thời lượng, phụ phí, dịch vụ thêm và chính sách giá con</p>
        </div>
        <div className="shrink-0 flex gap-2">
          {isEditing ? (
            <>
              <BaseButton variant="outline" size="sm" onClick={handleCancel} className="rounded-xl h-9 text-xs gap-1.5 font-bold">
                <XIcon className="w-3.5 h-3.5" /> Hủy
              </BaseButton>
              <BaseButton variant="primary" size="sm" onClick={handleSave} className="rounded-xl h-9 text-xs gap-1.5 font-bold bg-primary text-white">
                <Save className="w-3.5 h-3.5" /> Lưu thay đổi
              </BaseButton>
            </>
          ) : (
            <BaseButton variant="outline" size="sm" onClick={() => setIsEditing(true)} className="rounded-xl h-9 text-xs gap-1.5 font-bold">
              <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa cấu hình giá
            </BaseButton>
          )}
        </div>
      </div>

      {/* ─── SECTION 1: Advanced settings & hourly rates ─── */}
      <SCard icon={SlidersHorizontal} title="Thiết lập nâng cao & Đơn giá giờ" description="Đơn giá chung mặc định và các chế độ phân phối dịch vụ">
        {/* BẮT BUỘC THIẾT LẬP ĐẦU TIÊN - Alert Banner */}
        <div className="mb-5 p-3.5 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-2.5 shadow-sm">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-slate-800 font-bold">
            <span className="text-primary font-black uppercase mr-1">👉 BẮT BUỘC THIẾT LẬP ĐẦU TIÊN:</span>
            Vui lòng nhập <strong className="text-slate-900 font-extrabold underline">Đơn giá giờ Chuẩn</strong> và <strong className="text-slate-900 font-extrabold underline">Đơn giá giờ Premium</strong> dưới đây trước. Hai đơn giá giờ cốt lõi này là nền tảng cơ sở dùng để nhân với số giờ phục vụ của tất cả các mốc dịch vụ tiếp theo.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label className="text-xs font-black text-slate-900">Đơn giá giờ Chuẩn</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg">
                  Giá tiền mặc định cho mỗi giờ làm việc của một thợ trong ca thường. Được dùng làm đơn giá cốt lõi để nhân với số giờ của mốc dịch vụ khi tính giá cơ bản cho khách hàng.
                </TooltipContent>
              </Tooltip>
            </div>
            {isEditing ? (
              <Input type="number" value={baseHourlyRate} onChange={e => setBaseHourlyRate(Number(e.target.value))} className="h-10 rounded-lg border-slate-300 font-bold" />
            ) : (
              <p className="text-lg font-black text-slate-900">{vnd(baseHourlyRate)} / giờ</p>
            )}
            <p className="text-xs font-medium text-slate-600">Giá cho ca dọn thường</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label className="text-xs font-black text-slate-900">Đơn giá giờ Premium</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg">
                  Đơn giá áp dụng khi khách hàng chọn dịch vụ Cao cấp (Premium) hoặc ca đặc biệt. Giá trị mang lại: (1) Chất lượng thợ tối ưu: Chỉ thợ xuất sắc (sao từ 4.8★ trở lên, thâm niên cao, ít hủy ca) mới được nhận việc; (2) VIP Matching: Đơn được đẩy lên ưu tiên hiển thị trước để thợ nhận ngay, đảm bảo 100% có người làm; (3) Làm gấp & Ngoài giờ: Áp dụng khi đặt sát giờ (dưới 2h) hoặc sáng sớm/tối muộn; (4) Dụng cụ nâng cấp: Thợ mang theo hóa chất sinh học chuyên dụng cao cấp.
                </TooltipContent>
              </Tooltip>
            </div>
            {isEditing ? (
              <Input type="number" value={premiumHourlyRate} onChange={e => setPremiumHourlyRate(Number(e.target.value))} className="h-10 rounded-lg border-slate-300 font-bold" />
            ) : (
              <p className="text-lg font-black text-slate-900">{vnd(premiumHourlyRate)} / giờ</p>
            )}
            <p className="text-xs font-medium text-slate-600">Giá cho ca premium/làm gấp</p>
          </div>

          <div className="flex flex-col gap-2 p-3 bg-muted/20 border border-border/40 rounded-xl justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-800">Nhiều thợ cùng làm</span>
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
              <Switch checked={allowMultipleTaskers} disabled={!isEditing} onCheckedChange={setAllowMultipleTaskers} />
            </div>
            <p className="text-xs font-semibold text-slate-700 leading-normal">Cho phép phân phối một ca làm cho nhiều thợ</p>
          </div>

          <div className="flex flex-col gap-2 p-3 bg-muted/20 border border-border/40 rounded-xl justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-800">Cho phép gói tháng</span>
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
              <Switch checked={allowSubscription} disabled={!isEditing} onCheckedChange={setAllowSubscription} />
            </div>
            <p className="text-xs font-semibold text-slate-700 leading-normal">Kích hoạt chế độ đặt gói dọn dẹp định kỳ</p>
          </div>

          <div className="flex flex-col gap-2 p-3 bg-muted/20 border border-border/40 rounded-xl justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-slate-800">Cho phép dịch vụ lẻ</span>
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
              <Switch checked={allowSingleService} disabled={!isEditing} onCheckedChange={setAllowSingleService} />
            </div>
            <p className="text-xs font-semibold text-slate-700 leading-normal">Kích hoạt chế độ đặt dịch vụ lẻ theo từng lần</p>
          </div>
        </div>
      </SCard>

      {/* ─── SECTION 2: 5 Pricing Tabs ─── */}
      <SCard icon={DollarSign} title="Bảng thông tin chi tiết bảng giá v2" description="Cấu hình hệ số thời lượng, dịch vụ đi kèm, tùy chọn con, các chu kỳ giảm giá và các ngày cao điểm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(
            "grid grid-cols-2 w-full bg-slate-200/60 p-1 rounded-lg mb-6 gap-1 h-auto",
            (allowSubscription && allowSingleService) ? "md:grid-cols-6"
              : (allowSubscription || allowSingleService) ? "md:grid-cols-5"
              : "md:grid-cols-4"
          )}>
            <TabsTrigger value="durations" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 transition-colors text-primary group-data-[state=active]:text-white" />
              Thời lượng
            </TabsTrigger>
            <TabsTrigger value="addons" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5 transition-colors text-primary group-data-[state=active]:text-white" />
              Dịch vụ thêm
            </TabsTrigger>
            {allowSingleService && (
              <TabsTrigger value="subservices" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group flex items-center justify-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 transition-colors text-primary group-data-[state=active]:text-white" />
                Dịch vụ lẻ
              </TabsTrigger>
            )}
            {allowSubscription && (
              <TabsTrigger value="subscriptions" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group flex items-center justify-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 transition-colors text-primary group-data-[state=active]:text-white" />
                Gói tháng
              </TabsTrigger>
            )}
            <TabsTrigger value="peakhours" className="rounded-md font-bold text-xs py-2 transition-all data-[state=active]:bg-primary data-[state=active]:text-white text-slate-800 data-[state=active]:shadow-sm group flex items-center justify-center gap-1.5">
              <Flame className="w-3.5 h-3.5 transition-colors text-primary group-data-[state=active]:text-white" />
              Cao điểm
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DURATIONS */}
          <TabsContent value="durations" className="space-y-4">
            {isEditing && (
              <div className="p-4 bg-muted/10 border border-border/30 rounded-lg space-y-4 mb-2">
                <p className="text-xs font-bold text-slate-800">Thêm mốc thời lượng làm việc mới</p>
                
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Label className="text-xs font-bold text-slate-800">Số giờ</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                            <HelpCircle className="w-3 h-3" />
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
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        max={24}
                        placeholder="2"
                        value={newDuration.durationHours}
                        onChange={e => {
                          const val = Number(e.target.value);
                          if (val <= 24) {
                            setNewDuration(p => ({ ...p, durationHours: e.target.value }));
                          }
                        }}
                        onFocus={() => setIsOpenHoursDropdown(true)}
                        onBlur={() => setTimeout(() => setIsOpenHoursDropdown(false), 200)}
                        className="h-9 text-xs rounded-lg pr-7 font-bold placeholder:text-slate-400/60 placeholder:font-normal"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Search className="w-3 h-3" />
                      </div>
                      {isOpenHoursDropdown && (
                        <div className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
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
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-bold text-slate-800">Diện tích mặc định (m²)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                          Diện tích căn hộ/nhà gợi ý phù hợp với mốc thời lượng dọn dẹp này. Giới hạn tối đa 1500m². Bạn có thể nhập tự do hoặc tìm kiếm chọn từ danh sách (bắt đầu từ 55m², tăng dần 20m²).
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="55"
                        max={1500}
                        value={newDuration.suggestedArea}
                        onChange={e => {
                          const val = Number(e.target.value);
                          if (val <= 1500) {
                            setNewDuration(p => ({ ...p, suggestedArea: e.target.value }));
                          }
                        }}
                        onFocus={() => setIsOpenAreaDropdown(true)}
                        onBlur={() => setTimeout(() => setIsOpenAreaDropdown(false), 200)}
                        className="h-9 text-xs rounded-lg pr-7 font-bold placeholder:text-slate-400/60 placeholder:font-normal"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Search className="w-3 h-3" />
                      </div>
                      {isOpenAreaDropdown && (
                        <div className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
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
                  </div>

                  {allowMultipleTaskers && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs font-bold text-slate-800">Số lượng thợ</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                              <HelpCircle className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                            Số lượng thợ dọn dẹp tối thiểu/mặc định được phân công phục vụ cho mốc thời lượng này. Mặc định là 1 thợ, cấu hình tối đa là 15 thợ.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select
                        value={newDuration.taskerCount}
                        onValueChange={v => setNewDuration(p => ({ ...p, taskerCount: v }))}
                      >
                        <SelectTrigger className="h-9 text-xs rounded-lg font-bold border-slate-300 bg-white">
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
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-bold text-slate-800">Tăng/Giảm giá (%)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                          Tỷ lệ % điều chỉnh giá so với đơn giá gốc chuẩn. Ví dụ: -5 = giảm 5% giá trị của mốc này (khuyến khích đặt mốc dài); 10 = tăng 10% giá trị của mốc này.
                        </TooltipContent>
                      </Tooltip>
                    </div>
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
                        className="h-9 text-xs rounded-lg pr-7 font-bold"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Search className="w-3 h-3" />
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
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 opacity-0 select-none">-</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Switch checked={newDuration.isPopular} onCheckedChange={v => setNewDuration(p => ({ ...p, isPopular: v }))} />
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold cursor-pointer">Phổ biến</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full transition-colors cursor-help shrink-0">
                              <HelpCircle className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] bg-slate-900 text-white p-3 text-xs leading-relaxed border border-slate-800 shadow-lg rounded-lg z-50">
                            Đánh dấu mốc thời lượng này là lựa chọn được khuyên dùng hoặc đặt nhiều nhất. Trên giao diện của khách hàng, mốc này sẽ hiển thị kèm nhãn &apos;Phổ biến&apos; và được tự động chọn sẵn để định hướng người dùng đặt lịch nhanh hơn.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-800 opacity-0 select-none">-</Label>
                    <BaseButton
                      type="button"
                      variant={newDuration.title ? "primary" : "outline"}
                      onClick={() => {
                        setTempTitle(newDuration.title || "");
                        setTempDescription(newDuration.description || "");
                        setIsOpenMetaModal(true);
                      }}
                      className={cn(
                        "h-9 text-xs font-extrabold w-full rounded-lg gap-1.5 transition-all shadow-2xs border-slate-300",
                        newDuration.title
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:text-white"
                          : "hover:bg-slate-50 text-slate-700 bg-white"
                      )}
                    >
                      <ScrollText className="w-3.5 h-3.5" />
                      {newDuration.title ? "Đã có tiêu đề" : "Tiêu đề & Mô tả"}
                    </BaseButton>
                  </div>
                </div>

                <BaseButton type="button" onClick={handleAddDuration} className="h-9 text-xs font-bold bg-primary text-white rounded-lg w-full">
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
            )}

            {durations.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs bg-muted/5 border border-dashed border-border/40 rounded-lg">
                Không có cấu hình mốc thời lượng nào.
              </div>
            ) : (
              <div className="border border-border/30 rounded-lg overflow-hidden bg-card">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/30 text-slate-800 uppercase font-bold tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Số giờ làm</th>
                      {allowMultipleTaskers && <th className="py-3.5 px-4 text-center">Số lượng thợ</th>}
                      <th className="py-3.5 px-4 text-center">Diện tích mặc định</th>
                      <th className="py-3.5 px-4 text-center">Đơn giá mốc (Ước tính)</th>
                      <th className="py-3.5 px-4 text-center">Điều chỉnh giá</th>
                      <th className="py-3.5 px-4 text-center">Phổ biến</th>
                      <th className="py-3.5 px-4 text-center">Trạng thái</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {durations.map((d, i) => (
                      <tr key={i} className="hover:bg-muted/10 transition-colors">
                        <td className="py-2.5 px-4 select-none min-w-[140px]" onDoubleClick={() => {
                          if (!isEditing) return;
                          setInlineEditingCell({ rowIndex: i, field: 'hours' });
                          setInlineEditValue(d.durationHours.toString());
                        }}>
                          {isEditing && inlineEditingCell?.rowIndex === i && inlineEditingCell.field === 'hours' ? (
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.1"
                                max={24}
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(e.target.value)}
                                onFocus={() => setIsOpenInlineHoursDropdown(true)}
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
                              {isOpenInlineHoursDropdown && (
                                <div className="absolute z-50 w-32 left-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                                  {hourOptions
                                    .filter(opt => opt.toString().includes(inlineEditValue || ""))
                                    .map(opt => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onMouseDown={() => {
                                          handleInlineSave(i, 'hours', opt.toString());
                                        }}
                                        className="w-full text-left px-2 py-1 text-[10px] hover:bg-slate-100 font-semibold text-slate-700"
                                      >
                                        {opt} giờ
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={cn("flex items-center gap-1", isEditing && "cursor-pointer group")} title={isEditing ? "Nhấp đúp chuột để sửa nhanh" : undefined}>
                              <div>
                                <div className="font-bold text-slate-800">{d.durationHours} giờ</div>
                                {d.title && <div className="text-[10px] font-extrabold text-primary mt-0.5">{d.title}</div>}
                                {d.description && <div className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5 max-w-[200px] truncate" title={d.description}>{d.description}</div>}
                              </div>
                              {isEditing && <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />}
                            </div>
                          )}
                        </td>
                        {allowMultipleTaskers && (
                          <td className="py-2.5 px-4 text-center select-none min-w-[100px]" onDoubleClick={() => {
                            if (!isEditing) return;
                            setInlineEditingCell({ rowIndex: i, field: 'taskerCount' });
                            setInlineEditValue(d.taskerCount ? d.taskerCount.toString() : "1");
                          }}>
                            {isEditing && inlineEditingCell?.rowIndex === i && inlineEditingCell.field === 'taskerCount' ? (
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
                              <div className={cn("flex items-center justify-center gap-1", isEditing && "cursor-pointer group")} title={isEditing ? "Nhấp đúp chuột để sửa nhanh" : undefined}>
                                <span>{d.taskerCount || 1} thợ</span>
                                {isEditing && <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                              </div>
                            )}
                          </td>
                        )}
                        <td className="py-2.5 px-4 text-center select-none min-w-[120px]" onDoubleClick={() => {
                          if (!isEditing) return;
                          setInlineEditingCell({ rowIndex: i, field: 'area' });
                          setInlineEditValue(d.suggestedArea ? d.suggestedArea.toString() : "");
                        }}>
                          {isEditing && inlineEditingCell?.rowIndex === i && inlineEditingCell.field === 'area' ? (
                            <div className="relative">
                              <Input
                                type="number"
                                max={1500}
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(e.target.value)}
                                onFocus={() => setIsOpenInlineAreaDropdown(true)}
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
                              {isOpenInlineAreaDropdown && (
                                <div className="absolute z-50 w-32 left-1/2 -translate-x-1/2 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                                  {areaOptions
                                    .filter(opt => opt.toString().includes(inlineEditValue || ""))
                                    .map(opt => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onMouseDown={() => {
                                          handleInlineSave(i, 'area', opt.toString());
                                        }}
                                        className="w-full text-left px-2 py-1 text-[10px] hover:bg-slate-100 font-semibold text-slate-700"
                                      >
                                        {opt} m²
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={cn("flex items-center justify-center gap-1", isEditing && "cursor-pointer group")} title={isEditing ? "Nhấp đúp chuột để sửa nhanh" : undefined}>
                              <span>{d.suggestedArea ? `${d.suggestedArea} m²` : "—"}</span>
                              {isEditing && <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-black text-slate-700">
                          {vnd(d.durationHours * baseHourlyRate * d.priceMultiplier)}
                        </td>
                        <td className="py-2.5 px-4 text-center select-none min-w-[150px]" onDoubleClick={() => {
                          if (!isEditing) return;
                          setInlineEditingCell({ rowIndex: i, field: 'adjustment' });
                          setInlineEditValue(d.priceMultiplier ? Math.round((d.priceMultiplier - 1) * 100).toString() : "0");
                        }}>
                          {isEditing && inlineEditingCell?.rowIndex === i && inlineEditingCell.field === 'adjustment' ? (
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
                                onFocus={() => setIsOpenInlineAdjustmentDropdown(true)}
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
                              {isOpenInlineAdjustmentDropdown && (
                                <div className="absolute z-50 w-44 left-1/2 -translate-x-1/2 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                                  {adjustmentOptions
                                    .filter(opt =>
                                      opt.label.toLowerCase().includes((inlineEditValue || "").toLowerCase()) ||
                                      opt.value.includes(inlineEditValue || "")
                                    )
                                    .map(opt => (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onMouseDown={() => {
                                          handleInlineSave(i, 'adjustment', opt.value);
                                        }}
                                        className="w-full text-left px-2 py-1 text-[10px] hover:bg-slate-100 font-semibold text-slate-700"
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className={cn("flex items-center justify-center gap-1", isEditing && "cursor-pointer group")} title={isEditing ? "Nhấp đúp chuột để sửa nhanh" : undefined}>
                              <span>
                                {d.priceMultiplier === 1.0 ? (
                                  <span className="text-slate-500 font-semibold">Giá gốc</span>
                                ) : d.priceMultiplier < 1.0 ? (
                                  <span className="text-emerald-600 font-black">Giảm {Math.round((1 - d.priceMultiplier) * 100)}%</span>
                                ) : (
                                  <span className="text-amber-600 font-black">Tăng {Math.round((d.priceMultiplier - 1) * 100)}%</span>
                                )}
                              </span>
                              {isEditing && <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isEditing ? (
                            <Switch checked={d.isPopular} onCheckedChange={v => setDurations(prev => prev.map((x, idx) => idx === i ? { ...x, isPopular: v } : { ...x, isPopular: v ? false : x.isPopular }))} />
                          ) : (
                            d.isPopular ? <Badge className="bg-orange-500 text-white text-[8px] rounded-sm px-1.5 py-0.5">Phổ biến</Badge> : "Không"
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Switch checked={d.isActive} disabled={!isEditing} onCheckedChange={v => setDurations(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingDuration(d)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                              title="Xem chi tiết đầy đủ thông tin"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {isEditing && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDurationIndex(i);
                                    setTempTitle(d.title || "");
                                    setTempDescription(d.description || "");
                                    setIsOpenMetaModal(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors"
                                  title="Chỉnh sửa tiêu đề & mô tả"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => setDurations(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
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
            {isEditing && (
              <div className="p-4 bg-muted/10 border border-border/30 rounded-xl space-y-3.5 mb-2">
                <p className="text-xs font-bold">Thêm dịch vụ đi kèm mới</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Tên dịch vụ đi kèm</Label>
                    <Input placeholder="Lau ban công" value={newAddon.name}
                      onChange={e => setNewAddon(p => ({ ...p, name: e.target.value }))} className="h-9 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Đơn giá phụ thu</Label>
                    <Input type="number" placeholder="50000" value={newAddon.price}
                      onChange={e => setNewAddon(p => ({ ...p, price: e.target.value }))} className="h-9 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1 md:col-span-2 flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Mô tả ngắn</Label>
                      <Input placeholder="Mô tả công việc chi tiết..." value={newAddon.description}
                        onChange={e => setNewAddon(p => ({ ...p, description: e.target.value }))} className="h-9 text-xs rounded-lg" />
                    </div>
                    <BaseButton type="button" onClick={handleAddAddon} className="h-9 text-xs font-bold bg-primary text-white rounded-lg shrink-0 px-4">Thêm</BaseButton>
                  </div>
                </div>
              </div>
            )}

            {addons.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                Không có dịch vụ thêm nào được cấu hình.
              </div>
            ) : (
              <div className="border border-border/30 rounded-lg overflow-hidden bg-card">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/30 text-slate-800 uppercase font-bold tracking-wider text-[11px]">
                      <th className="py-3 px-4">Tên dịch vụ</th>
                      <th className="py-3 px-4">Mô tả</th>
                      <th className="py-3 px-4 text-center">Đơn giá</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      {isEditing && <th className="py-3 px-4 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {addons.map((a, i) => (
                      <tr key={i} className="hover:bg-muted/10">
                        <td className="py-2.5 px-4 font-bold text-foreground">{a.name}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{a.description || "—"}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-primary">{vnd(a.price)}</td>
                        <td className="py-2.5 px-4 text-center">
                          <Switch checked={a.isActive} disabled={!isEditing} onCheckedChange={v => setAddons(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                        </td>
                        {isEditing && (
                          <td className="py-2.5 px-4 text-right">
                            <button type="button" onClick={() => setAddons(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500 p-1 hover:bg-rose-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: DỊCH VỤ LẺ (SUB-SERVICES) */}
          {allowSingleService && <TabsContent value="subservices" className="space-y-4">
            {isEditing && (
              <div className="p-4 bg-muted/10 border border-border/30 rounded-xl space-y-3 mb-2">
                <p className="text-xs font-bold text-foreground">Liên kết thêm dịch vụ con mới của hệ thống vào gói</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Tìm kiếm nhanh dịch vụ con chưa gán..." value={searchSvc}
                    onChange={e => setSearchSvc(e.target.value)} className="h-9 rounded-lg pl-9 text-xs" />
                </div>
                {availableSubServices.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">Không có dịch vụ con khả dụng hoặc khớp với từ khóa tìm kiếm</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-40 overflow-y-auto pt-1 pr-1">
                    {availableSubServices.map(svc => (
                      <div key={svc.id} onClick={() => toggleLinkSubService(svc)}
                        className="flex items-center gap-2 p-2 border border-border/40 rounded-lg hover:border-primary/40 bg-card cursor-pointer transition-colors text-xs font-bold">
                        <Plus className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{svc.name}</span>
                        {svc.pricingConfig?.basePrice && <span className="ml-auto text-primary font-bold text-[10px]">{vnd(Number(svc.pricingConfig.basePrice))}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {subServices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                Gói này hiện chưa liên kết với dịch vụ con nào.
              </div>
            ) : (
              <div className="space-y-2">
                {subServices.map((s, idx) => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 border border-border/30 rounded-xl bg-card hover:shadow-2xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate text-foreground">{s.name}</p>
                      <span className="text-[9px] font-mono text-muted-foreground uppercase">{s.subServiceCode}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">Giá (₫):</span>
                        {isEditing ? (
                          <Input type="number" value={s.price} onChange={e => setSubServices(prev => prev.map(x => x.id === s.id ? { ...x, price: Number(e.target.value) } : x))} className="w-24 h-8 rounded-lg text-xs" />
                        ) : (
                          <span className="text-xs font-extrabold text-primary">{vnd(s.price)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">Bắt buộc:</span>
                        <Switch checked={s.isRequired} disabled={!isEditing} onCheckedChange={v => setSubServices(prev => prev.map(x => x.id === s.id ? { ...x, isRequired: v } : x))} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">Mặc định:</span>
                        <Switch checked={s.isDefault} disabled={!isEditing} onCheckedChange={v => setSubServices(prev => prev.map(x => x.id === s.id ? { ...x, isDefault: v } : x))} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">Bật:</span>
                        <Switch checked={s.isActive} disabled={!isEditing} onCheckedChange={v => setSubServices(prev => prev.map(x => x.id === s.id ? { ...x, isActive: v } : x))} />
                      </div>
                      {isEditing && (
                        <button type="button" onClick={() => setSubServices(prev => prev.filter(x => x.id !== s.id))} className="text-rose-500 p-1 hover:bg-rose-50 rounded shrink-0">
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>}

          {/* TAB 4: SUBSCRIPTIONS */}
          <TabsContent value="subscriptions" className="space-y-4">
            {isEditing && (
              <div className="p-4 bg-muted/10 border border-border/30 rounded-xl space-y-3.5 mb-2">
                <p className="text-xs font-bold">Thêm cấu hình ưu đãi gói tháng</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Tên gói ưu đãi</Label>
                    <Input placeholder="Gói 3 tháng" value={newSubscription.name}
                      onChange={e => setNewSubscription(p => ({ ...p, name: e.target.value }))} className="h-9 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Chiết khấu (%)</Label>
                    <Input type="number" placeholder="10" value={newSubscription.discountPercent}
                      onChange={e => setNewSubscription(p => ({ ...p, discountPercent: e.target.value }))} className="h-9 text-xs rounded-lg" />
                  </div>
                  <div className="space-y-1 md:col-span-2 flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Mô tả ưu đãi</Label>
                      <Input placeholder="Tiết kiệm chi phí..." value={newSubscription.description}
                        onChange={e => setNewSubscription(p => ({ ...p, description: e.target.value }))} className="h-9 text-xs rounded-lg" />
                    </div>
                    <BaseButton type="button" onClick={handleAddSubscription} className="h-9 text-xs font-bold bg-primary text-white rounded-lg shrink-0 px-4">Thêm</BaseButton>
                  </div>
                </div>
              </div>
            )}

            {subscriptions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                Không có ưu đãi gói định kỳ/tháng nào.
              </div>
            ) : (
              <div className="border border-border/30 rounded-lg overflow-hidden bg-card">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/30 text-slate-800 uppercase font-bold tracking-wider text-[11px]">
                      <th className="py-3 px-4">Tên ưu đãi</th>
                      <th className="py-3 px-4">Mô tả</th>
                      <th className="py-3 px-4 text-center">Giảm giá</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      {isEditing && <th className="py-3 px-4 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {subscriptions.map((s, i) => (
                      <tr key={i} className="hover:bg-muted/10">
                        <td className="py-2.5 px-4 font-bold text-foreground">{s.name}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{s.description || "—"}</td>
                        <td className="py-2.5 px-4 text-center font-extrabold text-emerald-600">-{s.discountPercent}%</td>
                        <td className="py-2.5 px-4 text-center">
                          <Switch checked={s.isActive} disabled={!isEditing} onCheckedChange={v => setSubscriptions(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                        </td>
                        {isEditing && (
                          <td className="py-2.5 px-4 text-right">
                            <button type="button" onClick={() => setSubscriptions(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500 p-1 hover:bg-rose-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* TAB 5: PEAK HOURS */}
          <TabsContent value="peakhours" className="space-y-4">
            {isEditing && (
              <div className="p-4 bg-muted/10 border border-border/30 rounded-xl space-y-3 mb-2">
                <p className="text-xs font-bold text-foreground">Thêm khung giờ cao điểm đặc biệt cho gói</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Thứ áp dụng</Label>
                      <Select value={newPeakHour.dayOfWeek} onValueChange={v => setNewPeakHour(p => ({ ...p, dayOfWeek: v }))}>
                        <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
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
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Từ giờ</Label>
                      <Input type="time" value={newPeakHour.startHour} onChange={e => setNewPeakHour(p => ({ ...p, startHour: e.target.value }))} className="h-9 text-xs rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Đến giờ</Label>
                      <Input type="time" value={newPeakHour.endHour} onChange={e => setNewPeakHour(p => ({ ...p, endHour: e.target.value }))} className="h-9 text-xs rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hệ số nhân</Label>
                      <Input type="number" step="0.05" placeholder="1.15" value={newPeakHour.multiplier} onChange={e => setNewPeakHour(p => ({ ...p, multiplier: e.target.value }))} className="h-9 text-xs rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Áp dụng từ ngày</Label>
                      <Input type="date" value={newPeakHour.startDate} onChange={e => setNewPeakHour(p => ({ ...p, startDate: e.target.value }))} className="h-9 text-xs rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Đến ngày</Label>
                      <Input type="date" value={newPeakHour.endDate} onChange={e => setNewPeakHour(p => ({ ...p, endDate: e.target.value }))} className="h-9 text-xs rounded-lg" />
                    </div>
                    <BaseButton type="button" onClick={handleAddPeakHour} className="h-9 text-xs font-bold bg-primary text-white rounded-lg w-full">Thêm khung giờ</BaseButton>
                  </div>
                </div>
              </div>
            )}

            {peakHours.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs bg-muted/5 border border-dashed border-border/40 rounded-2xl">
                Không có cấu hình giờ cao điểm nào.
              </div>
            ) : (
              <div className="border border-border/30 rounded-lg overflow-hidden bg-card">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/30 text-slate-800 uppercase font-bold tracking-wider text-[11px]">
                      <th className="py-3 px-4">Ngày áp dụng</th>
                      <th className="py-3 px-4">Khung giờ</th>
                      <th className="py-3 px-4 text-center">Hệ số phụ thu</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      {isEditing && <th className="py-3 px-4 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {peakHours.map((p, i) => {
                      const daysText = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Hàng ngày"];
                      return (
                        <tr key={i} className="hover:bg-muted/10">
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-foreground block">{daysText[p.dayOfWeek]}</span>
                            {p.startDate || p.endDate ? (
                              <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">
                                {p.startDate ? new Date(p.startDate).toLocaleDateString("vi-VN") : "..."} - {p.endDate ? new Date(p.endDate).toLocaleDateString("vi-VN") : "..."}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-semibold block mt-0.5">Mọi ngày</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-indigo-600 dark:text-indigo-400">{p.startHour} - {p.endHour}</td>
                          <td className="py-2.5 px-4 text-center font-extrabold text-rose-600">+{Math.round((p.multiplier - 1) * 100)}% ({p.multiplier}x)</td>
                          <td className="py-2.5 px-4 text-center">
                            <Switch checked={p.isActive} disabled={!isEditing} onCheckedChange={v => setPeakHours(prev => prev.map((x, idx) => idx === i ? { ...x, isActive: v } : x))} />
                          </td>
                          {isEditing && (
                            <td className="py-2.5 px-4 text-right">
                              <button type="button" onClick={() => setPeakHours(prev => prev.filter((_, idx) => idx !== i))} className="text-rose-500 p-1 hover:bg-rose-50 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SCard>

      {/* Dialog Cấu hình Tiêu đề & Mô tả mốc thời lượng */}
      <Dialog open={isOpenMetaModal} onOpenChange={(open) => {
        setIsOpenMetaModal(open);
        if (!open) setEditingDurationIndex(null);
      }}>
        <DialogContent className="w-full sm:max-w-[480px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-slate-800">
              <ScrollText className="w-4 h-4 text-primary" />
              Cấu hình hiển thị chi tiết mốc
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Thiết lập tiêu đề và mô tả hiển thị cho khách hàng trên ứng dụng.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 border-t border-b border-border/30 my-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-800 flex items-center gap-1">
                Tiêu đề mốc <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                placeholder="Ví dụ: Căn hộ nhỏ, Dọn dẹp cơ bản..."
                value={tempTitle}
                onChange={e => setTempTitle(e.target.value)}
                className="h-10 rounded-xl text-sm font-semibold placeholder:text-slate-400 placeholder:font-normal"
              />
              <p className="text-[10px] text-slate-400 font-medium leading-normal">
                Bắt buộc nhập. Tên hiển thị đại diện cho mốc thời lượng này.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-800">
                Mô tả chi tiết (Tùy chọn)
              </Label>
              <textarea
                placeholder="Ví dụ: Thích hợp phòng trọ, căn hộ nhỏ 1 phòng ngủ..."
                value={tempDescription}
                onChange={e => setTempDescription(e.target.value)}
                rows={3}
                className="w-full min-h-[80px] text-xs font-semibold rounded-xl border border-slate-200 bg-background px-3 py-2 placeholder:text-slate-400 placeholder:font-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-400 font-medium leading-normal">
                Không bắt buộc. Chi tiết phụ trợ bổ sung giúp khách hàng dễ hình dung dịch vụ.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0 pt-2">
            <BaseButton
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpenMetaModal(false);
                setEditingDurationIndex(null);
              }}
              className="py-2.5 px-4 rounded-xl text-xs font-bold h-10 flex-1 sm:flex-none"
            >
              Hủy
            </BaseButton>
            <BaseButton
              type="button"
              variant="primary"
              onClick={() => {
                if (tempDescription.trim() && !tempTitle.trim()) {
                  toast.error("Tiêu đề là bắt buộc nhập khi có mô tả chi tiết!");
                  return;
                }
                if (!tempTitle.trim() && !tempDescription.trim()) {
                  if (editingDurationIndex !== null) {
                    setDurations(prev => prev.map((x, idx) => idx === editingDurationIndex ? { ...x, title: "", description: "" } : x));
                  } else {
                    setNewDuration(p => ({ ...p, title: "", description: "" }));
                  }
                  setIsOpenMetaModal(false);
                  setEditingDurationIndex(null);
                  return;
                }
                if (!tempTitle.trim()) {
                  toast.error("Vui lòng điền tiêu đề mốc thời lượng!");
                  return;
                }
                
                if (editingDurationIndex !== null) {
                  setDurations(prev => prev.map((x, idx) => idx === editingDurationIndex ? { ...x, title: tempTitle.trim(), description: tempDescription.trim() } : x));
                } else {
                  setNewDuration(p => ({
                    ...p,
                    title: tempTitle.trim(),
                    description: tempDescription.trim()
                  }));
                }
                setIsOpenMetaModal(false);
                setEditingDurationIndex(null);
              }}
              className="py-2.5 px-5 rounded-xl text-xs font-bold h-10 flex-1 sm:flex-none"
            >
              Xác nhận
            </BaseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Xem chi tiết mốc thời lượng */}
      <Dialog open={!!viewingDuration} onOpenChange={(open) => !open && setViewingDuration(null)}>
        <DialogContent className="w-full sm:max-w-[480px] rounded-2xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2 text-slate-800">
              <Clock className="w-4 h-4 text-primary" />
              Chi tiết mốc thời lượng
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Thông tin chi tiết cấu hình của mốc thời lượng này.
            </DialogDescription>
          </DialogHeader>

          {viewingDuration && (
            <div className="space-y-4 py-4 border-t border-b border-border/30 my-2 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span className="font-bold text-slate-500">Tiêu đề hiển thị:</span>
                  <span className="font-extrabold text-primary text-sm">{viewingDuration.title || "—"}</span>
                </div>
                <div className="flex flex-col gap-1 pb-2 border-b border-slate-200/50">
                  <span className="font-bold text-slate-500">Mô tả chi tiết:</span>
                  <p className="font-semibold text-slate-700 leading-relaxed whitespace-pre-line text-[11px] bg-white p-2 rounded-lg border border-slate-100">
                    {viewingDuration.description || "Chưa có mô tả chi tiết."}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-500">Số giờ làm việc:</span>
                    <p className="font-extrabold text-slate-800 text-sm">{viewingDuration.durationHours} giờ</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-500">Diện tích mặc định:</span>
                    <p className="font-extrabold text-slate-800 text-sm">{viewingDuration.suggestedArea ? `${viewingDuration.suggestedArea} m²` : "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-500">Số lượng thợ:</span>
                    <p className="font-extrabold text-slate-800 text-sm">{viewingDuration.taskerCount || 1} thợ</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-500">Điều chỉnh giá:</span>
                    <div>
                      {viewingDuration.priceMultiplier === 1.0 ? (
                        <span className="text-slate-500 font-extrabold">Giá gốc</span>
                      ) : viewingDuration.priceMultiplier < 1.0 ? (
                        <span className="text-emerald-600 font-black">Giảm {Math.round((1 - viewingDuration.priceMultiplier) * 100)}%</span>
                      ) : (
                        <span className="text-amber-600 font-black">Tăng {Math.round((viewingDuration.priceMultiplier - 1) * 100)}%</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                  <span className="font-bold text-slate-500">Đơn giá ước tính:</span>
                  <span className="font-black text-rose-600 text-sm">{vnd(viewingDuration.durationHours * baseHourlyRate * viewingDuration.priceMultiplier)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                  <span className="font-bold text-slate-500">Đặc trưng / Trạng thái:</span>
                  <div className="flex gap-1.5">
                    {viewingDuration.isPopular && (
                      <Badge className="bg-orange-500 text-white text-[9px] rounded-md px-2 py-0.5 font-bold">Phổ biến</Badge>
                    )}
                    <Badge className={cn("text-[9px] rounded-md px-2 py-0.5 font-bold", viewingDuration.isActive ? "bg-emerald-500 text-white" : "bg-slate-400 text-white")}>
                      {viewingDuration.isActive ? "Đang hoạt động" : "Ngưng hoạt động"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
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
    </div>
  );
}
