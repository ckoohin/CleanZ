"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  Loader2, MapPin, Edit, Search, Clock, ExternalLink, Calendar, Check, Plus, Sparkles, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  AdminServiceEntity, CoverageAreaEntity, ServiceDurationEntity, ServiceAddonEntity, AddonPriceUnit, ServicePeakHourEntity,
} from "@/features/admin/modules/service/services/admin-services.service";
import {
  useUpdateCoverageArea, useCreateAdminService, useUpdateAdminService, useDeleteAdminService,
} from "@/features/admin/modules/service/hooks/useAdminServices";
import { Field } from "../shared/FormField";
import { vnd } from "../shared/helpers";
import { PeakHourFormState } from "../shared/types";

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

export interface EditAddonModalState {
  idx: number;
  name: string;
  description: string;
  price: string;
  priceUnit: AddonPriceUnit;
  durationMinutes: string;
  maxQuantity: string;
  sortOrder: string;
  isActive: boolean;
}

export interface CrudFormState {
  name: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  galleryUrl1: string;
  galleryUrl2: string;
  durationHours: string;
  basePrice: string;
  includedTask: string;
  excludedTask: string;
  includedTasks: string[];
  excludedTasks: string[];
  isActive: boolean;
}

export interface StepPricingConfigModalsProps {
  baseHourlyRate: number;
  premiumHourlyRate: number;
  setDurations: React.Dispatch<React.SetStateAction<ServiceDurationEntity[]>>;
  setNewDuration: React.Dispatch<React.SetStateAction<NewDurationState>>;

  // detailSvc: Dialog chi tiết dịch vụ lẻ
  detailSvc: AdminServiceEntity | null;
  setDetailSvc: React.Dispatch<React.SetStateAction<AdminServiceEntity | null>>;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<AdminServiceEntity | null>>;
  openCrudEdit: (svc: AdminServiceEntity) => void;

  // deleteConfirm: xác nhận xoá dịch vụ lẻ
  deleteConfirm: AdminServiceEntity | null;
  deleteService: ReturnType<typeof useDeleteAdminService>;
  handleDeleteSvc: (svc: AdminServiceEntity) => Promise<void>;

  // crudModal: tạo/sửa dịch vụ lẻ
  crudModal: { open: boolean; mode: "create" | "edit"; svc?: AdminServiceEntity };
  setCrudModal: React.Dispatch<React.SetStateAction<{ open: boolean; mode: "create" | "edit"; svc?: AdminServiceEntity }>>;
  crudForm: CrudFormState;
  setCrudForm: React.Dispatch<React.SetStateAction<CrudFormState>>;
  CRUD_EMPTY: CrudFormState;
  handleCrudSubmit: () => Promise<void>;
  createService: ReturnType<typeof useCreateAdminService>;
  updateService: ReturnType<typeof useUpdateAdminService>;

  // Dead-code: editingArea dialog
  editingArea: CoverageAreaEntity | null;
  setEditingArea: React.Dispatch<React.SetStateAction<CoverageAreaEntity | null>>;
  editAreaFee: string;
  setEditAreaFee: React.Dispatch<React.SetStateAction<string>>;
  isUpdatingAreaSaving: boolean;
  setIsUpdatingAreaSaving: React.Dispatch<React.SetStateAction<boolean>>;
  updateAreaMutation: ReturnType<typeof useUpdateCoverageArea>;

  // isOpenMetaModal: full duration edit modal
  isOpenMetaModal: boolean;
  setIsOpenMetaModal: React.Dispatch<React.SetStateAction<boolean>>;
  editingDurationIndex: number | null;
  setEditingDurationIndex: React.Dispatch<React.SetStateAction<number | null>>;
  tempHours: string;
  setTempHours: React.Dispatch<React.SetStateAction<string>>;
  isOpenTempHoursDropdown: boolean;
  setIsOpenTempHoursDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  hourOptions: number[];
  tempArea: string;
  setTempArea: React.Dispatch<React.SetStateAction<string>>;
  isOpenTempAreaDropdown: boolean;
  setIsOpenTempAreaDropdown: React.Dispatch<React.SetStateAction<boolean>>;
  areaOptions: number[];
  formatHoursToMinutes: (hoursStr: string) => string;
  tempAdjustment: string;
  setTempAdjustment: React.Dispatch<React.SetStateAction<string>>;
  tempPriceMode: 'percent' | 'fixed';
  setTempPriceMode: React.Dispatch<React.SetStateAction<'percent' | 'fixed'>>;
  tempFixedPriceInput: string;
  setTempFixedPriceInput: React.Dispatch<React.SetStateAction<string>>;
  adjustmentOptions: { value: string; label: string }[];
  allowMultipleTaskers: boolean;
  tempTaskerCount: string;
  setTempTaskerCount: React.Dispatch<React.SetStateAction<string>>;
  tempIsPopular: boolean;
  setTempIsPopular: React.Dispatch<React.SetStateAction<boolean>>;
  tempIsActive: boolean;
  setTempIsActive: React.Dispatch<React.SetStateAction<boolean>>;
  tempTitle: string;
  setTempTitle: React.Dispatch<React.SetStateAction<string>>;
  tempDescription: string;
  setTempDescription: React.Dispatch<React.SetStateAction<string>>;
  maxHours: number;

  // viewingDuration modal
  viewingDuration: ServiceDurationEntity | null;
  setViewingDuration: React.Dispatch<React.SetStateAction<ServiceDurationEntity | null>>;

  // editAddonModal: sửa toàn bộ 1 addon
  editAddonModal: EditAddonModalState | null;
  setEditAddonModal: React.Dispatch<React.SetStateAction<EditAddonModalState | null>>;
  ADDON_PRICE_UNIT_LABELS: Record<AddonPriceUnit, string>;
  setAddons: React.Dispatch<React.SetStateAction<ServiceAddonEntity[]>>;

  // viewingAddon: xem chi tiết 1 addon
  viewingAddon: ServiceAddonEntity | null;
  setViewingAddon: React.Dispatch<React.SetStateAction<ServiceAddonEntity | null>>;
  addons: ServiceAddonEntity[];
  handleEditAddon: (i: number) => void;

  // previewSubService sheet (dead)
  previewSubService: AdminServiceEntity | null;
  setPreviewSubService: React.Dispatch<React.SetStateAction<AdminServiceEntity | null>>;

  // viewingPeakHour modal
  viewingPeakHour: ServicePeakHourEntity | null;
  setViewingPeakHour: React.Dispatch<React.SetStateAction<ServicePeakHourEntity | null>>;
  peakHours: ServicePeakHourEntity[];
  setPeakHours: React.Dispatch<React.SetStateAction<ServicePeakHourEntity[]>>;
  setEditPeakHour: React.Dispatch<React.SetStateAction<PeakHourFormState>>;
  setEditingPeakHourIdx: React.Dispatch<React.SetStateAction<number | null>>;

  // editingPeakHourIdx modal
  editingPeakHourIdx: number | null;
  editPeakHour: PeakHourFormState;

  // Inline table dropdowns rendered via portal
  inlineDdRect: { top: number; left: number; width: number } | null;
  isOpenInlineHoursDropdown: boolean;
  inlineEditValue: string;
  inlineEditingCell: { rowIndex: number; field: 'hours' | 'area' | 'taskerCount' | 'adjustment' } | null;
  handleInlineSave: (rowIndex: number, field: 'hours' | 'area' | 'taskerCount' | 'adjustment', value: string) => void;
  isOpenInlineAreaDropdown: boolean;
  isOpenInlineAdjustmentDropdown: boolean;
}

export function StepPricingConfigModals({
  baseHourlyRate, premiumHourlyRate, setDurations, setNewDuration,
  detailSvc, setDetailSvc, setDeleteConfirm, openCrudEdit,
  deleteConfirm, deleteService, handleDeleteSvc,
  crudModal, setCrudModal, crudForm, setCrudForm, CRUD_EMPTY, handleCrudSubmit, createService, updateService,
  editingArea, setEditingArea, editAreaFee, setEditAreaFee, isUpdatingAreaSaving, setIsUpdatingAreaSaving, updateAreaMutation,
  isOpenMetaModal, setIsOpenMetaModal, editingDurationIndex, setEditingDurationIndex,
  tempHours, setTempHours, isOpenTempHoursDropdown, setIsOpenTempHoursDropdown, hourOptions,
  tempArea, setTempArea, isOpenTempAreaDropdown, setIsOpenTempAreaDropdown, areaOptions,
  formatHoursToMinutes, tempAdjustment, setTempAdjustment, tempPriceMode, setTempPriceMode,
  tempFixedPriceInput, setTempFixedPriceInput, adjustmentOptions,
  allowMultipleTaskers, tempTaskerCount, setTempTaskerCount, tempIsPopular, setTempIsPopular,
  tempIsActive, setTempIsActive, tempTitle, setTempTitle, tempDescription, setTempDescription, maxHours,
  viewingDuration, setViewingDuration,
  editAddonModal, setEditAddonModal, ADDON_PRICE_UNIT_LABELS, setAddons,
  viewingAddon, setViewingAddon, addons, handleEditAddon,
  previewSubService, setPreviewSubService,
  viewingPeakHour, setViewingPeakHour, peakHours, setPeakHours, setEditPeakHour, setEditingPeakHourIdx,
  editingPeakHourIdx, editPeakHour,
  inlineDdRect, isOpenInlineHoursDropdown, inlineEditValue, inlineEditingCell, handleInlineSave,
  isOpenInlineAreaDropdown, isOpenInlineAdjustmentDropdown,
}: StepPricingConfigModalsProps) {
  return (
    <>
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
              <Label className="text-xs font-black text-slate-800">Điều chỉnh giá</Label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/30 border border-border/30 rounded-xl">
                <button type="button" onClick={() => setTempPriceMode("percent")}
                  className={cn("h-8 rounded-lg text-xs font-bold transition-colors", tempPriceMode === "percent" ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                >
                  Theo %
                </button>
                <button type="button" onClick={() => setTempPriceMode("fixed")}
                  className={cn("h-8 rounded-lg text-xs font-bold transition-colors", tempPriceMode === "fixed" ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                >
                  Nhập giá cụ thể
                </button>
              </div>
              {tempPriceMode === "percent" ? (
                <>
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
                </>
              ) : (
                <>
                  <Input
                    inputMode="numeric"
                    placeholder="Ví dụ: 350000"
                    value={tempFixedPriceInput}
                    onChange={e => setTempFixedPriceInput(e.target.value.replace(/\D/g, ""))}
                    className="h-10 rounded-xl text-sm font-bold bg-white border-slate-300"
                  />
                  {baseHourlyRate > 0 && tempHours && Number(tempFixedPriceInput) > 0 && (
                    <p className="text-[10px] text-primary font-bold">
                      {vnd(Number(tempFixedPriceInput))} — ≈ {Math.round((Number(tempFixedPriceInput) / (Number(tempHours) * baseHourlyRate) - 1) * 100)}% so với giá chuẩn
                    </p>
                  )}
                </>
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
                    priceMode: tempPriceMode,
                    fixedPriceInput: tempFixedPriceInput,
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
                if (tempPriceMode === "fixed" && !(Number(tempFixedPriceInput) > 0)) {
                  toast.error("Vui lòng nhập giá cụ thể hợp lệ!");
                  return;
                }
                const adj = parseFloat(tempAdjustment) || 0;
                setDurations(prev => prev.map((x, idx) => idx === editingDurationIndex ? {
                  ...x,
                  durationHours: hours,
                  suggestedArea: tempArea ? Number(tempArea) : null,
                  priceMultiplier: tempPriceMode === "fixed" ? 1.0 : 1 + adj / 100,
                  priceMode: tempPriceMode,
                  fixedPrice: tempPriceMode === "fixed" ? Number(tempFixedPriceInput) : null,
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
                  viewingDuration.priceMode === "fixed"
                    ? {
                      label: "Điều chỉnh giá",
                      value: vnd(Number(viewingDuration.fixedPrice ?? 0)),
                      sub: "Giá cố định",
                      valueColor: "text-primary",
                    }
                    : {
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
                  <p className="text-sm font-extrabold text-slate-800">
                    {viewingDuration.priceMode === "fixed"
                      ? vnd(Number(viewingDuration.fixedPrice ?? 0))
                      : vnd(viewingDuration.durationHours * baseHourlyRate * viewingDuration.priceMultiplier)}
                  </p>
                </div>
                <div className="bg-primary/5 rounded-xl px-4 py-3 border border-primary/15">
                  <p className="text-[10px] text-primary/70 font-semibold mb-1">Đơn giá Premium</p>
                  <p className="text-sm font-extrabold text-primary">
                    {viewingDuration.priceMode === "fixed"
                      ? vnd(Number(viewingDuration.fixedPrice ?? 0) * (baseHourlyRate > 0 ? premiumHourlyRate / baseHourlyRate : 1))
                      : vnd(viewingDuration.durationHours * premiumHourlyRate * viewingDuration.priceMultiplier)}
                  </p>
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
    </>
  );
}
