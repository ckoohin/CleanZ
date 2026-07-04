"use client";

import React from "react";
import {
  Package, Settings2, BarChart3, ScrollText, MapPin, Clock, Zap, Shield, Check, X,
  ImageIcon, AlertCircle, Loader2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  CoverageAreaEntity, ServiceDurationEntity, ServiceAddonEntity, ServicePeakHourEntity, ServiceSubscriptionEntity,
} from "@/features/admin/modules/service/services/admin-services.service";
import { CreateWorkflowStepDto } from "@/features/admin/modules/service/types/workflow.type";
import { Policy } from "@/features/admin/modules/policy/types/policy.type";
import { SectionCard } from "../shared/SectionCard";
import { vnd } from "../shared/helpers";
import { SelectedSubService } from "../shared/types";

export interface StepReviewSubmitProps {
  iconUrl: string;
  name: string;
  isActive: boolean;
  packageCode: string;
  sortOrder: number;
  policyDescription: string;
  galleryUrls: string[];
  baseHourlyRate: number;
  premiumHourlyRate: number;
  allowMultipleTaskers: boolean;
  allowSubscription: boolean;
  selectedAreaIds: string[];
  coverageAreas: CoverageAreaEntity[];
  durations: ServiceDurationEntity[];
  selectedSubServices: SelectedSubService[];
  addons: ServiceAddonEntity[];
  peakHours: ServicePeakHourEntity[];
  subscriptions: ServiceSubscriptionEntity[];
  workflowSteps: CreateWorkflowStepDto[];
  commitments: { id: string; title: string; content: string; iconName: string }[];
  selectedPolicyIds: string[];
  policiesData: Policy[];
  termsAndConditions: string;
  premiumTermsAndConditions: string;
  setStep: (v: number) => void;
  isSubmitting: boolean;

  // Confirm submit dialog
  showConfirmModal: boolean;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedAreaNames: string;
  handleSubmit: () => Promise<void>;
}

export function StepReviewSubmit({
  iconUrl, name, isActive, packageCode, sortOrder, policyDescription, galleryUrls,
  baseHourlyRate, premiumHourlyRate, allowMultipleTaskers, allowSubscription,
  selectedAreaIds, coverageAreas, durations, selectedSubServices, addons, peakHours, subscriptions,
  workflowSteps, commitments, selectedPolicyIds, policiesData, termsAndConditions, premiumTermsAndConditions,
  setStep, isSubmitting,
  showConfirmModal, setShowConfirmModal, selectedAreaNames, handleSubmit,
}: StepReviewSubmitProps) {
  return (
    <>
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
    </>
  );
}
