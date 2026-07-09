"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package, DollarSign, ScrollText, CheckCircle2, ChevronRight } from "lucide-react";
import { BaseButton } from "@/components/ui/base/base_button";
import {
  useCreateAdminPackage, useAdminServices, useCreateAdminService, useUpdateAdminService, useDeleteAdminService,
  useAddSubServicesToPackage, useCoverageAreas, useUpdateCoverageArea,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import {
  CreateAdminPackageDto, AdminServiceEntity, CoverageAreaEntity, PricingMode,
  ServiceDurationEntity, ServiceAddonEntity, AddonPriceUnit, ServiceSubscriptionEntity, SubscriptionBillingCycle, ServicePeakHourEntity,
} from "@/features/admin/modules/service/services/admin-services.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ROUTES } from "@/constants/routes";
import { useQueryClient } from "@tanstack/react-query";
import { adminWorkflowService } from "@/features/admin/modules/service/services/admin-workflow.service";
import { adminPolicyService } from "@/features/admin/modules/policy/services/admin-policy.service";
import { useAdminPolicies } from "@/features/admin/modules/policy/hooks/useAdminPolicies";
import { StepBasicInfo } from "./steps/StepBasicInfo";
import { CreateWorkflowStepDto } from "@/features/admin/modules/service/types/workflow.type";
import { StepPricingConfig } from "./steps/StepPricingConfig";
import { StepWorkflowTerms } from "./steps/StepWorkflowTerms";
import { StepReviewSubmit } from "./steps/StepReviewSubmit";
import { SelectedSubService, PeakHourFormState } from "./shared/types";
import { NewDurationState, EditAddonModalState, CrudFormState } from "./steps/StepPricingConfig.modals";

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Thông tin cơ bản", icon: Package },
  { id: 2, label: "Cấu hình bảng giá", icon: DollarSign },
  { id: 3, label: "Quy trình & Điều khoản", icon: ScrollText },
  { id: 4, label: "Xem lại & Hoàn tất", icon: CheckCircle2 },
] as const;

function StepIndicator({
  current,
  onStepClick,
  validations,
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
            <button
              type="button"
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-extrabold shadow-2xs",
                active
                  ? "bg-primary text-white cursor-default"
                  : hasError
                  ? "bg-rose-50 text-rose-700 hover:bg-rose-100/80 cursor-pointer border border-rose-200"
                  : done
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 cursor-pointer"
                  : "text-slate-800 hover:bg-slate-200/50 cursor-pointer"
              )}
            >
              {hasError ? (
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-white">!</span>
                </div>
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

// ─── Custom Surcharge Interface for legacy dead code preservation ───────────
interface CustomSurcharge {
  id: string;
  label: string;
  iconName: string;
  amount: number;
  hint: string;
}

export function ServicePackageCreateWizard() {
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
  const [isSaving, setIsSaving] = useState(false);

  // ── STEP 2: Cấu hình giá & Phụ phí ──
  const [pricingMode, setPricingMode] = useState<PricingMode>("HOURLY");
  const [maxHours, setMaxHours] = useState(8);
  const [peakRatePercent, setPeakRatePercent] = useState(20);
  const [nightSurcharge, setNightSurcharge] = useState(30000);
  const [petSurcharge, setPetSurcharge] = useState(50000);
  const [waitingSurcharge, setWaitingSurcharge] = useState(15000);
  const [toolFee, setToolFee] = useState(0);

  // Dead-code states preserved verbatim from before this refactor
  const [customSurcharges, setCustomSurcharges] = useState<CustomSurcharge[]>([]);

  // ── Tab Pricing Structure States ──
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

  const handleAllowSubscriptionChange = (val: boolean) => {
    setAllowSubscription(val);
    if (!val && activeTab === "subscriptions") {
      setActiveTab("durations");
    }
  };

  const handleAllowSingleServiceChange = (val: boolean) => {
    setAllowSingleService(val);
    if (!val && activeTab === "subservices") {
      setActiveTab("durations");
    }
  };

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
  const [editAddonModal, setEditAddonModal] = useState<EditAddonModalState | null>(null);
  const [isOpenAddonDetailModal, setIsOpenAddonDetailModal] = useState(false);
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
  const [viewingAddon, setViewingAddon] = useState<ServiceAddonEntity | null>(null);
  const [detailSvc, setDetailSvc] = useState<AdminServiceEntity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminServiceEntity | null>(null);
  const [crudModal, setCrudModal] = useState<{ open: boolean; mode: "create" | "edit"; svc?: AdminServiceEntity }>({ open: false, mode: "create" });

  const CRUD_EMPTY: CrudFormState = {
    name: "", shortDescription: "", description: "", thumbnailUrl: "",
    galleryUrl1: "", galleryUrl2: "", durationHours: "", basePrice: "",
    includedTask: "", excludedTask: "", includedTasks: [], excludedTasks: [],
    isActive: true
  };
  const [crudForm, setCrudForm] = useState<CrudFormState>(CRUD_EMPTY);

  const [newPeakHour, setNewPeakHour] = useState<PeakHourFormState>({
    dayOfWeek: "1", selectedDays: ["1"], startHour: "08:00", endHour: "22:00", multiplier: "1.1",
    startDate: "", endDate: "", isActive: true
  });
  const [editingPeakHourIdx, setEditingPeakHourIdx] = useState<number | null>(null);
  const [editPeakHour, setEditPeakHour] = useState<PeakHourFormState>({
    dayOfWeek: "1", startHour: "08:00", endHour: "22:00", multiplier: "1.1",
    startDate: "", endDate: "", isActive: true
  });
  const [viewingPeakHour, setViewingPeakHour] = useState<ServicePeakHourEntity | null>(null);
  const [isOpenPeakHourDetailModal, setIsOpenPeakHourDetailModal] = useState(false);

  // Dropdown visibility states for searchable select inputs
  const [isOpenAreaDropdown, setIsOpenAreaDropdown] = useState(false);
  const [isOpenHoursDropdown, setIsOpenHoursDropdown] = useState(false);
  const [isOpenAdjustmentDropdown, setIsOpenAdjustmentDropdown] = useState(false);

  // States for duration full-edit modal
  const [isOpenMetaModal, setIsOpenMetaModal] = useState(false);
  const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null);
  const [tempHours, setTempHours] = useState("");
  const [isOpenTempHoursDropdown, setIsOpenTempHoursDropdown] = useState(false);
  const [tempArea, setTempArea] = useState("");
  const [isOpenTempAreaDropdown, setIsOpenTempAreaDropdown] = useState(false);
  const [tempAdjustment, setTempAdjustment] = useState("0");
  const [tempPriceMode, setTempPriceMode] = useState<'percent' | 'fixed'>("percent");
  const [tempFixedPriceInput, setTempFixedPriceInput] = useState("");
  const [tempIsPopular, setTempIsPopular] = useState(false);
  const [tempIsActive, setTempIsActive] = useState(true);
  const [tempTaskerCount, setTempTaskerCount] = useState("1");
  const [tempTitle, setTempTitle] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [viewingDuration, setViewingDuration] = useState<ServiceDurationEntity | null>(null);

  // Dead-code states
  const [editingArea, setEditingArea] = useState<CoverageAreaEntity | null>(null);
  const [editAreaFee, setEditAreaFee] = useState("");
  const [isUpdatingAreaSaving, setIsUpdatingAreaSaving] = useState(false);
  const updateAreaMutation = useUpdateCoverageArea();
  const [previewSubService, setPreviewSubService] = useState<AdminServiceEntity | null>(null);

  // Inline cell edit states for duration table
  const [inlineEditingCell, setInlineEditingCell] = useState<{ rowIndex: number; field: 'hours' | 'area' | 'taskerCount' | 'adjustment' } | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState("");
  const [inlineDdRect, setInlineDdRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isOpenInlineHoursDropdown, setIsOpenInlineHoursDropdown] = useState(false);
  const [isOpenInlineAreaDropdown, setIsOpenInlineAreaDropdown] = useState(false);
  const [isOpenInlineAdjustmentDropdown, setIsOpenInlineAdjustmentDropdown] = useState(false);

  // ── STEP 3: Workflow, Policies, Terms ──
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [premiumTermsAndConditions, setPremiumTermsAndConditions] = useState("");
  const [commitments, setCommitments] = useState<{ id: string; title: string; content: string; iconName: string }[]>([
    { id: "1", title: "Thợ chuẩn 5 sao", content: "100% người làm được đào tạo bài bản, kiểm tra hồ sơ lý lịch hình sự.", iconName: "Star" },
    { id: "2", title: "Bảo hiểm đổ vỡ", content: "Đền bù hư hỏng hoặc mất mát tài sản trong quá trình thực hiện lên tới 10.000.000đ.", iconName: "Shield" },
  ]);

  const [newCommitmentTitle, setNewCommitmentTitle] = useState("");
  const [newCommitmentContent, setNewCommitmentContent] = useState("");
  const [newCommitmentIcon, setNewCommitmentIcon] = useState("Star");
  const [showAddCommitment, setShowAddCommitment] = useState(false);

  const [workflowSteps, setWorkflowSteps] = useState<CreateWorkflowStepDto[]>([]);
  const [editingWorkflowStepIndex, setEditingWorkflowStepIndex] = useState<number | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [stepDesc, setStepDesc] = useState("");
  const [stepDuration, setStepDuration] = useState("15");
  const [stepRequired, setStepRequired] = useState(true);
  const [stepChecklist, setStepChecklist] = useState<string[]>([]);
  const [newChecklistVal, setNewChecklistVal] = useState("");

  const { data: policiesData = [] } = useAdminPolicies();
  const [selectedPolicyIds, setSelectedPolicyIds] = useState<string[]>([]);
  const [policySearch, setPolicySearch] = useState("");

  const filteredPolicies = useMemo(() => {
    return policiesData.filter(p => p.title.toLowerCase().includes(policySearch.toLowerCase()) || p.content?.toLowerCase().includes(policySearch.toLowerCase()));
  }, [policiesData, policySearch]);

  // ── Sub-service search & filter ──
  const [searchSvc, setSearchSvc] = useState("");
  const filteredSvcs = useMemo(() => {
    return allSubServices.filter(s => s.name.toLowerCase().includes(searchSvc.toLowerCase()) || s.subServiceCode.toLowerCase().includes(searchSvc.toLowerCase()));
  }, [allSubServices, searchSvc]);

  // ── Validations ──
  const slugify = (text: string) => {
    return "PKG-" +
      text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/).join("-").toUpperCase();
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!packageCode) setPackageCode(slugify(val));
  };

  const canProceedStep1 = name.trim().length > 0 && packageCode.trim().length > 0;
  const canProceedStep2 = durations.length > 0 && (!allowSubscription || subscriptions.length > 0);
  const canProceedStep3 = true; // optional setup

  const validations = useMemo(() => ({
    1: canProceedStep1,
    2: canProceedStep2,
    3: canProceedStep3,
    4: true,
  }), [canProceedStep1, canProceedStep2, canProceedStep3]);

  // ── Handlers ──

  const applyTemplate = (type: "hourly" | "deep" | "specialized") => {
    if (type === "hourly") {
      setBaseHourlyRate(80000); setPremiumHourlyRate(120000);
      setDurations([
        { durationHours: 2, priceMultiplier: 1.0, isPopular: true, isActive: true, suggestedArea: 55, title: "Căn hộ nhỏ" },
        { durationHours: 3, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 85, title: "Căn hộ trung bình" },
        { durationHours: 4, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 105, title: "Căn hộ lớn" },
      ]);
      toast.success("Đã áp dụng mẫu dọn dẹp theo giờ");
    } else if (type === "deep") {
      setBaseHourlyRate(120000); setPremiumHourlyRate(160000);
      setDurations([
        { durationHours: 4, priceMultiplier: 1.0, isPopular: true, isActive: true, suggestedArea: 80, title: "Căn hộ nhỏ (Làm sâu)" },
        { durationHours: 6, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 120, title: "Căn hộ vừa (Làm sâu)" },
        { durationHours: 8, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 160, title: "Biệt thự/Nhà phố" },
      ]);
      toast.success("Đã áp dụng mẫu tổng vệ sinh chuyên sâu");
    } else if (type === "specialized") {
      setBaseHourlyRate(150000); setPremiumHourlyRate(200000);
      setDurations([
        { durationHours: 3, priceMultiplier: 1.0, isPopular: true, isActive: true, suggestedArea: 50, title: "Giặt sofa/Đệm" },
        { durationHours: 5, priceMultiplier: 1.0, isPopular: false, isActive: true, suggestedArea: 100, title: "Vệ sinh máy lạnh toàn bộ" },
      ]);
      toast.success("Đã áp dụng mẫu dịch vụ chuyên biệt");
    }
  };

  const handleSaveDuration = () => {
    const hours = Number(newDuration.durationHours);
    const adj = Number(newDuration.priceAdjustment);
    const area = newDuration.suggestedArea ? Number(newDuration.suggestedArea) : null;
    const tasker = Number(newDuration.taskerCount);

    if (isNaN(hours) || hours <= 0 || hours > maxHours) {
      toast.error(`Số giờ làm việc phải lớn hơn 0 và không vượt quá số giờ tối đa (${maxHours}h)`);
      return;
    }
    if (durations.some(d => d.durationHours === hours)) {
      toast.error("Mốc thời lượng này đã tồn tại!");
      return;
    }
    if (newDuration.priceMode === "fixed" && !(Number(newDuration.fixedPriceInput) > 0)) {
      toast.error("Vui lòng nhập giá cụ thể hợp lệ!");
      return;
    }
    const multiplier = newDuration.priceMode === "fixed" ? 1.0 : 1 + (adj / 100);

    const newEntity: ServiceDurationEntity = {
      durationHours: hours,
      priceMultiplier: multiplier,
      priceMode: newDuration.priceMode,
      fixedPrice: newDuration.priceMode === "fixed" ? Number(newDuration.fixedPriceInput) : null,
      isPopular: newDuration.isPopular,
      suggestedArea: area,
      taskerCount: tasker,
      title: newDuration.title.trim() || undefined,
      description: newDuration.description.trim() || undefined,
      isActive: true,
    };

    setDurations(prev => [...prev, newEntity].sort((a, b) => a.durationHours - b.durationHours));
    setNewDuration({ durationHours: "", priceAdjustment: "0", priceMode: "percent", fixedPriceInput: "", isPopular: false, suggestedArea: "", taskerCount: "1", title: "", description: "" });
    toast.success("Đã thêm mốc thời lượng mới");
  };

  const handleSaveAddon = () => {
    if (!newAddon.name.trim()) { toast.error("Vui lòng nhập tên dịch vụ đi kèm"); return; }
    const priceVal = Number(newAddon.price);
    if (isNaN(priceVal) || priceVal < 0) { toast.error("Đơn giá không hợp lệ"); return; }

    const newAddonEntity: ServiceAddonEntity = {
      name: newAddon.name.trim(),
      description: newAddon.description.trim() || undefined,
      price: priceVal,
      priceUnit: newAddon.priceUnit,
      durationMinutes: newAddon.durationMinutes ? Number(newAddon.durationMinutes) : 0,
      maxQuantity: newAddon.maxQuantity ? Number(newAddon.maxQuantity) : 1,
      sortOrder: newAddon.sortOrder ? Number(newAddon.sortOrder) : 0,
      isActive: newAddon.isActive,
    };

    if (editingAddonIndex !== null) {
      setAddons(prev => prev.map((a, i) => i === editingAddonIndex ? newAddonEntity : a));
      setEditingAddonIndex(null);
      toast.success("Đã cập nhật dịch vụ đi kèm");
    } else {
      setAddons(prev => [...prev, newAddonEntity]);
      toast.success("Đã thêm dịch vụ đi kèm");
    }

    setNewAddon({ name: "", description: "", price: "", priceUnit: "per_item", durationMinutes: "", maxQuantity: "", sortOrder: "", isActive: true });
  };

  const handleEditAddon = (i: number) => {
    const item = addons[i];
    setNewAddon({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      priceUnit: item.priceUnit || "per_item",
      durationMinutes: item.durationMinutes != null ? String(item.durationMinutes) : "",
      maxQuantity: item.maxQuantity != null ? String(item.maxQuantity) : "",
      sortOrder: item.sortOrder != null ? String(item.sortOrder) : "",
      isActive: item.isActive,
    });
    setEditingAddonIndex(i);
  };

  const handleSaveSubscription = () => {
    if (!newSubscription.name.trim()) { toast.error("Vui lòng nhập tên chu kỳ"); return; }
    const discount = Number(newSubscription.discountPercent);
    const sessions = Number(newSubscription.sessionsPerCycle);
    const commit = Number(newSubscription.commitmentMonths);
    if (isNaN(discount) || discount < 0 || discount > 100) { toast.error("Phần trăm giảm giá phải từ 0 đến 100%"); return; }
    if (isNaN(sessions) || sessions <= 0) { toast.error("Số buổi làm việc phải lớn hơn 0"); return; }
    if (isNaN(commit) || commit < 0) { toast.error("Số tháng cam kết không hợp lệ"); return; }

    const newSubEntity: ServiceSubscriptionEntity = {
      name: newSubscription.name.trim(),
      description: newSubscription.description.trim() || undefined,
      bonusDescription: newSubscription.bonusDescription.trim() || undefined,
      discountPercent: discount,
      billingCycle: newSubscription.billingCycle,
      sessionsPerCycle: sessions,
      commitmentMonths: commit,
      isPopular: newSubscription.isPopular,
      sortOrder: newSubscription.sortOrder ? Number(newSubscription.sortOrder) : 0,
      isActive: newSubscription.isActive,
    };

    if (editingSubscriptionIndex !== null) {
      setSubscriptions(prev => prev.map((s, i) => i === editingSubscriptionIndex ? newSubEntity : s));
      setEditingSubscriptionIndex(null);
      toast.success("Đã cập nhật gói tháng");
    } else {
      setSubscriptions(prev => [...prev, newSubEntity]);
      toast.success("Đã thêm gói tháng mới");
    }

    setNewSubscription({ name: "", description: "", bonusDescription: "", discountPercent: "", billingCycle: "monthly", sessionsPerCycle: "", commitmentMonths: "", isPopular: false, sortOrder: "", isActive: true });
    setShowSubscriptionModal(false);
  };

  const handleEditSubscription = (i: number) => {
    const s = subscriptions[i];
    setNewSubscription({
      name: s.name,
      description: s.description ?? "",
      bonusDescription: s.bonusDescription ?? "",
      discountPercent: String(s.discountPercent),
      billingCycle: s.billingCycle || "monthly",
      sessionsPerCycle: String(s.sessionsPerCycle),
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
      setSelectedSubServices(prev => [...prev, { id: created.id, name: created.name, price: priceVal, isRequired: false, isDefault: false, sortOrder: 0, isActive: true }]);
    } else if (crudModal.svc) {
      await updateService.mutateAsync({ id: crudModal.svc.id, payload });
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
    const days = newPeakHour.selectedDays ?? [];
    if (days.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ngày áp dụng");
      return;
    }
    const mult = parseFloat(newPeakHour.multiplier);
    if (isNaN(mult) || mult < 1) {
      toast.error("Hệ số nhân phải từ 1.0 trở lên");
      return;
    }
    if (!newPeakHour.startHour || !newPeakHour.endHour) {
      toast.error("Vui lòng chọn khung giờ");
      return;
    }

    const newEntries = days
      .map(Number)
      .filter(day => !peakHours.some(p => p.dayOfWeek === day && p.startHour === newPeakHour.startHour && p.endHour === newPeakHour.endHour))
      .map(day => ({
        dayOfWeek: day,
        startHour: newPeakHour.startHour,
        endHour: newPeakHour.endHour,
        multiplier: mult,
        startDate: newPeakHour.startDate || null,
        endDate: newPeakHour.endDate || null,
        isActive: newPeakHour.isActive,
        title: newPeakHour.title?.trim() || null,
        description: newPeakHour.description?.trim() || null,
      }));

    if (newEntries.length === 0) {
      toast.info("Các ngày đã chọn đều đã có cấu hình khung giờ này rồi");
      return;
    }

    setPeakHours(prev => [...prev, ...newEntries]);
    setNewPeakHour({ dayOfWeek: "1", selectedDays: ["1"], startHour: "08:00", endHour: "22:00", multiplier: "1.1", startDate: "", endDate: "", isActive: true, title: "", description: "" });
    toast.success(newEntries.length > 1 ? `Đã thêm ${newEntries.length} khung giờ cao điểm` : "Đã thêm khung giờ cao điểm");
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
          title: p.title || undefined,
          description: p.description || undefined,
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
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
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
    } finally {
      setIsSaving(false);
    }
  };

  const isSubmitting = createPackage.isPending || addSubServices.isPending || isSaving;

  const selectedAreaNames = useMemo(() => {
    return coverageAreas.map(a => a.name).join(", ");
  }, [coverageAreas]);

  // Handle inline grid editing in Step 2 duration table
  const hourOptions = Array.from({ length: maxHours - 1 }, (_, i) => i + 2); // 2h -> maxHours
  const areaOptions = [30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 250];
  const adjustmentOptions = [
    { value: "-30", label: "Giảm 30%" },
    { value: "-25", label: "Giảm 25%" },
    { value: "-20", label: "Giảm 20%" },
    { value: "-15", label: "Giảm 15%" },
    { value: "-10", label: "Giảm 10%" },
    { value: "-5", label: "Giảm 5%" },
    { value: "0", label: "Mặc định (Không tăng/giảm)" },
    { value: "5", label: "Tăng 5%" },
    { value: "10", label: "Tăng 10%" },
    { value: "15", label: "Tăng 15%" },
    { value: "20", label: "Tăng 20%" },
    { value: "25", label: "Tăng 25%" },
    { value: "30", label: "Tăng 30%" },
    { value: "35", label: "Tăng 35%" },
    { value: "40", label: "Tăng 40%" },
    { value: "45", label: "Tăng 45%" },
    { value: "50", label: "Tăng 50%" },
  ];

  const formatHoursToMinutes = (hoursStr: string) => {
    const h = parseFloat(hoursStr);
    if (isNaN(h)) return "—";
    return `${Math.round(h * 60)} phút`;
  };

  const captureInlineRect = (e: React.FocusEvent<HTMLInputElement>) => {
    const parentCell = e.target.closest("td");
    if (parentCell) {
      const rect = parentCell.getBoundingClientRect();
      setInlineDdRect({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  const handleInlineSave = (rowIndex: number, field: 'hours' | 'area' | 'taskerCount' | 'adjustment', value: string) => {
    const num = Number(value);
    setDurations(prev => prev.map((d, i) => {
      if (i !== rowIndex) return d;
      const updated = { ...d };
      if (field === 'hours' && !isNaN(num) && num > 0 && num <= maxHours) {
        updated.durationHours = num;
      } else if (field === 'area' && !isNaN(num) && num >= 0) {
        updated.suggestedArea = num === 0 ? null : num;
      } else if (field === 'taskerCount' && !isNaN(num) && num > 0) {
        updated.taskerCount = num;
      } else if (field === 'adjustment' && !isNaN(num)) {
        updated.priceMultiplier = 1 + (num / 100);
      }
      return updated;
    }));
  };

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

  const BILLING_CYCLE_LABELS: Record<SubscriptionBillingCycle, string> = {
    weekly: "Tuần",
    biweekly: "2 tuần",
    monthly: "Tháng",
    quarterly: "Quý",
    yearly: "Năm",
  };

  const resetNewSubscription = () => {
    setNewSubscription({ name: "", description: "", bonusDescription: "", discountPercent: "", billingCycle: "monthly", sessionsPerCycle: "", commitmentMonths: "", isPopular: false, sortOrder: "", isActive: true });
  };

  const SUBSCRIPTION_PRESETS = [
    { label: "Gói 4 buổi/Tháng (Giảm 5%)", data: { name: "Gói Định Kỳ 4 Buổi", discountPercent: "5", billingCycle: "monthly" as SubscriptionBillingCycle, sessionsPerCycle: "4", commitmentMonths: "1" } },
    { label: "Gói 8 buổi/Tháng (Giảm 10%)", data: { name: "Gói Định Kỳ 8 Buổi", discountPercent: "10", billingCycle: "monthly" as SubscriptionBillingCycle, sessionsPerCycle: "8", commitmentMonths: "3", isPopular: true } },
    { label: "Gói 12 buổi/Tháng (Giảm 15%)", data: { name: "Gói Định Kỳ 12 Buổi", discountPercent: "15", billingCycle: "monthly" as SubscriptionBillingCycle, sessionsPerCycle: "12", commitmentMonths: "6" } },
  ];

  const toggleSelect = (svc: AdminServiceEntity) => {
    setSelectedSubServices(prev => {
      const exists = prev.some(s => s.id === svc.id);
      if (exists) return prev.filter(s => s.id !== svc.id);
      const basePrice = svc.pricingConfig?.basePrice ? Number(svc.pricingConfig.basePrice) : 0;
      return [...prev, { id: svc.id, name: svc.name, price: basePrice, isRequired: false, isDefault: false, sortOrder: 0, isActive: true }];
    });
  };

  const updateSelected = (id: string, patch: Partial<SelectedSubService>) => {
    setSelectedSubServices(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  return (
    <div className="space-y-6 w-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BaseButton
          variant="outline"
          size="icon"
          onClick={() => router.push(ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.BASE)}
          className="rounded-full h-10 w-10 shrink-0"
        >
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

      {/* Steps Rendering */}
      {step === 1 && (
        <StepBasicInfo
          name={name}
          handleNameChange={handleNameChange}
          packageCode={packageCode}
          setPackageCode={setPackageCode}
          iconUrl={iconUrl}
          setIconUrl={setIconUrl}
          galleryUrls={galleryUrls}
          setGalleryUrls={setGalleryUrls}
          policyDescription={policyDescription}
          setPolicyDescription={setPolicyDescription}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          isActive={isActive}
          setIsActive={setIsActive}
          canProceedStep1={canProceedStep1}
          setStep={setStep}
        />
      )}

      {step === 2 && (
        <StepPricingConfig
          baseHourlyRate={baseHourlyRate}
          setBaseHourlyRate={setBaseHourlyRate}
          premiumHourlyRate={premiumHourlyRate}
          setPremiumHourlyRate={setPremiumHourlyRate}
          maxHours={maxHours}
          setMaxHours={setMaxHours}
          allowMultipleTaskers={allowMultipleTaskers}
          setAllowMultipleTaskers={setAllowMultipleTaskers}
          allowSubscription={allowSubscription}
          setAllowSubscription={handleAllowSubscriptionChange}
          allowSingleService={allowSingleService}
          setAllowSingleService={handleAllowSingleServiceChange}
          applyTemplate={applyTemplate}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          newDuration={newDuration}
          setNewDuration={setNewDuration}
          isOpenHoursDropdown={isOpenHoursDropdown}
          setIsOpenHoursDropdown={setIsOpenHoursDropdown}
          hourOptions={hourOptions}
          isOpenAreaDropdown={isOpenAreaDropdown}
          setIsOpenAreaDropdown={setIsOpenAreaDropdown}
          areaOptions={areaOptions}
          isOpenAdjustmentDropdown={isOpenAdjustmentDropdown}
          setIsOpenAdjustmentDropdown={setIsOpenAdjustmentDropdown}
          adjustmentOptions={adjustmentOptions}
          formatHoursToMinutes={formatHoursToMinutes}
          setTempTitle={setTempTitle}
          setTempDescription={setTempDescription}
          setTempHours={setTempHours}
          setTempArea={setTempArea}
          setTempAdjustment={setTempAdjustment}
          tempPriceMode={tempPriceMode}
          setTempPriceMode={setTempPriceMode}
          tempFixedPriceInput={tempFixedPriceInput}
          setTempFixedPriceInput={setTempFixedPriceInput}
          setTempIsPopular={setTempIsPopular}
          setTempTaskerCount={setTempTaskerCount}
          setIsOpenMetaModal={setIsOpenMetaModal}
          handleSaveDuration={handleSaveDuration}
          durations={durations}
          setDurations={setDurations}
          inlineEditingCell={inlineEditingCell}
          setInlineEditingCell={setInlineEditingCell}
          inlineEditValue={inlineEditValue}
          setInlineEditValue={setInlineEditValue}
          captureInlineRect={captureInlineRect}
          setIsOpenInlineHoursDropdown={setIsOpenInlineHoursDropdown}
          handleInlineSave={handleInlineSave}
          setIsOpenInlineAreaDropdown={setIsOpenInlineAreaDropdown}
          isOpenInlineAdjustmentDropdown={isOpenInlineAdjustmentDropdown}
          setIsOpenInlineAdjustmentDropdown={setIsOpenInlineAdjustmentDropdown}
          setEditingDurationIndex={setEditingDurationIndex}
          setViewingDuration={setViewingDuration}
          addons={addons}
          setAddons={setAddons}
          ADDON_PRICE_UNIT_LABELS={ADDON_PRICE_UNIT_LABELS}
          newAddon={newAddon}
          setNewAddon={setNewAddon}
          handleSaveAddon={handleSaveAddon}
          handleEditAddon={handleEditAddon}
          editAddonModal={editAddonModal}
          setEditAddonModal={setEditAddonModal}
          isOpenAddonDetailModal={isOpenAddonDetailModal}
          setIsOpenAddonDetailModal={setIsOpenAddonDetailModal}
          setViewingAddon={setViewingAddon}
          searchSvc={searchSvc}
          setSearchSvc={setSearchSvc}
          filteredSvcs={filteredSvcs}
          selectedSubServices={selectedSubServices}
          toggleSelect={toggleSelect}
          updateSelected={updateSelected}
          openCrudCreate={openCrudCreate}
          setDetailSvc={setDetailSvc}
          SUBSCRIPTION_PRESETS={SUBSCRIPTION_PRESETS}
          editingSubscriptionIndex={editingSubscriptionIndex}
          setEditingSubscriptionIndex={setEditingSubscriptionIndex}
          subscriptions={subscriptions}
          setSubscriptions={setSubscriptions}
          resetNewSubscription={resetNewSubscription}
          newSubscription={newSubscription}
          setNewSubscription={setNewSubscription}
          handleSaveSubscription={handleSaveSubscription}
          handleEditSubscription={handleEditSubscription}
          BILLING_CYCLE_LABELS={BILLING_CYCLE_LABELS}
          showSubscriptionModal={showSubscriptionModal}
          setShowSubscriptionModal={setShowSubscriptionModal}
          peakHours={peakHours}
          setPeakHours={setPeakHours}
          newPeakHour={newPeakHour}
          setNewPeakHour={setNewPeakHour}
          handleSavePeakHour={handleSavePeakHour}
          setViewingPeakHour={setViewingPeakHour}
          setEditPeakHour={setEditPeakHour}
          setEditingPeakHourIdx={setEditingPeakHourIdx}
          isOpenPeakHourDetailModal={isOpenPeakHourDetailModal}
          setIsOpenPeakHourDetailModal={setIsOpenPeakHourDetailModal}
          setStep={setStep}
          detailSvc={detailSvc}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
          deleteService={deleteService}
          handleDeleteSvc={handleDeleteSvc}
          crudModal={crudModal}
          setCrudModal={setCrudModal}
          crudForm={crudForm}
          setCrudForm={setCrudForm}
          CRUD_EMPTY={CRUD_EMPTY}
          handleCrudSubmit={handleCrudSubmit}
          createService={createService}
          updateService={updateService}
          openCrudEdit={openCrudEdit}
          editingArea={editingArea}
          setEditingArea={setEditingArea}
          editAreaFee={editAreaFee}
          setEditAreaFee={setEditAreaFee}
          isUpdatingAreaSaving={isUpdatingAreaSaving}
          setIsUpdatingAreaSaving={setIsUpdatingAreaSaving}
          updateAreaMutation={updateAreaMutation}
          isOpenMetaModal={isOpenMetaModal}
          editingDurationIndex={editingDurationIndex}
          tempHours={tempHours}
          tempArea={tempArea}
          tempAdjustment={tempAdjustment}
          tempIsPopular={tempIsPopular}
          tempIsActive={tempIsActive}
          setTempIsActive={setTempIsActive}
          tempTaskerCount={tempTaskerCount}
          tempTitle={tempTitle}
          tempDescription={tempDescription}
          isOpenTempHoursDropdown={isOpenTempHoursDropdown}
          setIsOpenTempHoursDropdown={setIsOpenTempHoursDropdown}
          isOpenTempAreaDropdown={isOpenTempAreaDropdown}
          setIsOpenTempAreaDropdown={setIsOpenTempAreaDropdown}
          viewingDuration={viewingDuration}
          viewingAddon={viewingAddon}
          previewSubService={previewSubService}
          setPreviewSubService={setPreviewSubService}
          viewingPeakHour={viewingPeakHour}
          editingPeakHourIdx={editingPeakHourIdx}
          editPeakHour={editPeakHour}
          inlineDdRect={inlineDdRect}
          isOpenInlineHoursDropdown={isOpenInlineHoursDropdown}
          isOpenInlineAreaDropdown={isOpenInlineAreaDropdown}
        />
      )}

      {step === 3 && (
        <StepWorkflowTerms
          termsAndConditions={termsAndConditions}
          setTermsAndConditions={setTermsAndConditions}
          premiumTermsAndConditions={premiumTermsAndConditions}
          setPremiumTermsAndConditions={setPremiumTermsAndConditions}
          commitments={commitments}
          setCommitments={setCommitments}
          newCommitmentTitle={newCommitmentTitle}
          setNewCommitmentTitle={setNewCommitmentTitle}
          newCommitmentContent={newCommitmentContent}
          setNewCommitmentContent={setNewCommitmentContent}
          newCommitmentIcon={newCommitmentIcon}
          setNewCommitmentIcon={setNewCommitmentIcon}
          showAddCommitment={showAddCommitment}
          setShowAddCommitment={setShowAddCommitment}
          workflowSteps={workflowSteps}
          setWorkflowSteps={setWorkflowSteps}
          editingWorkflowStepIndex={editingWorkflowStepIndex}
          setEditingWorkflowStepIndex={setEditingWorkflowStepIndex}
          stepTitle={stepTitle}
          setStepTitle={setStepTitle}
          stepDesc={stepDesc}
          setStepDesc={setStepDesc}
          stepDuration={stepDuration}
          setStepDuration={setStepDuration}
          stepRequired={stepRequired}
          setStepRequired={setStepRequired}
          stepChecklist={stepChecklist}
          setStepChecklist={setStepChecklist}
          newChecklistVal={newChecklistVal}
          setNewChecklistVal={setNewChecklistVal}
          policiesData={policiesData}
          selectedPolicyIds={selectedPolicyIds}
          setSelectedPolicyIds={setSelectedPolicyIds}
          policySearch={policySearch}
          setPolicySearch={setPolicySearch}
          filteredPolicies={filteredPolicies}
          setStep={setStep}
        />
      )}

      {step === 4 && (
        <StepReviewSubmit
          iconUrl={iconUrl}
          name={name}
          isActive={isActive}
          packageCode={packageCode}
          sortOrder={sortOrder}
          policyDescription={policyDescription}
          galleryUrls={galleryUrls}
          baseHourlyRate={baseHourlyRate}
          premiumHourlyRate={premiumHourlyRate}
          allowMultipleTaskers={allowMultipleTaskers}
          allowSubscription={allowSubscription}
          selectedAreaIds={coverageAreas.map(a => a.id)}
          coverageAreas={coverageAreas}
          durations={durations}
          selectedSubServices={selectedSubServices}
          addons={addons}
          peakHours={peakHours}
          subscriptions={subscriptions}
          workflowSteps={workflowSteps}
          commitments={commitments}
          selectedPolicyIds={selectedPolicyIds}
          policiesData={policiesData}
          termsAndConditions={termsAndConditions}
          premiumTermsAndConditions={premiumTermsAndConditions}
          setStep={setStep}
          isSubmitting={isSubmitting}
          showConfirmModal={showConfirmModal}
          setShowConfirmModal={setShowConfirmModal}
          selectedAreaNames={selectedAreaNames}
          handleSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
