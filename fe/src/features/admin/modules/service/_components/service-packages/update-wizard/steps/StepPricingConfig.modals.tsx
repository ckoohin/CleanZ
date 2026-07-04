"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  Loader2, MapPin, Edit, Search, Clock, ExternalLink, Calendar, Check,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  AdminServiceEntity, CoverageAreaEntity, ServiceDurationEntity, ServicePeakHourEntity,
} from "@/features/admin/modules/service/services/admin-services.service";
import { useUpdateCoverageArea } from "@/features/admin/modules/service/hooks/useAdminServices";
import { Field } from "../shared/FormField";
import { vnd } from "../shared/helpers";
import { PeakHourFormState } from "../shared/types";

export interface StepPricingConfigModalsProps {
  baseHourlyRate: number;
  premiumHourlyRate: number;
  setDurations: React.Dispatch<React.SetStateAction<ServiceDurationEntity[]>>;

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

  // previewSubService sheet
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
  baseHourlyRate, premiumHourlyRate, setDurations,
  editingArea, setEditingArea, editAreaFee, setEditAreaFee, isUpdatingAreaSaving, setIsUpdatingAreaSaving, updateAreaMutation,
  isOpenMetaModal, setIsOpenMetaModal, editingDurationIndex, setEditingDurationIndex,
  tempHours, setTempHours, isOpenTempHoursDropdown, setIsOpenTempHoursDropdown, hourOptions,
  tempArea, setTempArea, isOpenTempAreaDropdown, setIsOpenTempAreaDropdown, areaOptions,
  formatHoursToMinutes, tempAdjustment, setTempAdjustment, adjustmentOptions,
  allowMultipleTaskers, tempTaskerCount, setTempTaskerCount, tempIsPopular, setTempIsPopular,
  tempIsActive, setTempIsActive, tempTitle, setTempTitle, tempDescription, setTempDescription, maxHours,
  viewingDuration, setViewingDuration,
  previewSubService, setPreviewSubService,
  viewingPeakHour, setViewingPeakHour, peakHours, setPeakHours, setEditPeakHour, setEditingPeakHourIdx,
  editingPeakHourIdx, editPeakHour,
  inlineDdRect, isOpenInlineHoursDropdown, inlineEditValue, inlineEditingCell, handleInlineSave,
  isOpenInlineAreaDropdown, isOpenInlineAdjustmentDropdown,
}: StepPricingConfigModalsProps) {
  return (
    <>
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
                if (isNaN(hours) || hours <= 0) {
                  toast.error("Số giờ không hợp lệ!");
                  return;
                }
                if (hours > maxHours) {
                  toast.error(`Không được thiết lập giờ vượt quá giờ phục vụ tối đa của gói (${maxHours} giờ). Muốn tăng khung giờ hơn thì hãy đổi giờ phục vụ tối đa cao hơn.`);
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
      <Dialog open={!!viewingPeakHour} onOpenChange={(open) => !open && setViewingPeakHour(null)}>
        <DialogContent className="w-full sm:max-w-[420px] rounded-2xl p-0 overflow-hidden bg-card border border-border">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-4.5 h-4.5 text-primary" />
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
    </>
  );
}
