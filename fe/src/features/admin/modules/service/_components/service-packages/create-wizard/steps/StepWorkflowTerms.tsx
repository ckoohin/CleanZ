"use client";

import React from "react";
import {
  Layers, ScrollText, Shield, Zap, Plus, Trash2, Edit, Check, ChevronRight, Search, Sparkles, X,
  Moon, PawPrint, Timer, Hammer, Package, Info, Star, Heart,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BaseButton } from "@/components/ui/base/base_button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { POLICY_CATEGORY_META, PolicyCategory, Policy } from "@/features/admin/modules/policy/types/policy.type";
import { CreateWorkflowStepDto } from "@/features/admin/modules/service/types/workflow.type";
import { SectionCard } from "../shared/SectionCard";
import { Field } from "../shared/FormField";

export const SURCHARGE_ICONS = [
  { name: "Moon", icon: Moon, label: "Đêm/Sáng sớm" },
  { name: "PawPrint", icon: PawPrint, label: "Thú cưng" },
  { name: "Timer", icon: Timer, label: "Chờ đợi" },
  { name: "Hammer", icon: Hammer, label: "Công cụ mang theo" },
  { name: "Zap", icon: Zap, label: "Phụ thu nhanh" },
  { name: "Shield", icon: Shield, label: "Bảo hiểm" },
  { name: "Sparkles", icon: Sparkles, label: "Dọn dẹp sâu" },
  { name: "Heart", icon: Heart, label: "Ưu tiên" },
];

export const getIconByName = (name: string): React.ElementType => {
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

// ─── Step 3: Quy trình & Điều khoản ─────────────────────────────────────────
export function StepWorkflowTerms({
  termsAndConditions, setTermsAndConditions,
  premiumTermsAndConditions, setPremiumTermsAndConditions,
  commitments, setCommitments,
  newCommitmentTitle, setNewCommitmentTitle,
  newCommitmentContent, setNewCommitmentContent,
  newCommitmentIcon, setNewCommitmentIcon,
  showAddCommitment, setShowAddCommitment,
  workflowSteps, setWorkflowSteps,
  editingWorkflowStepIndex, setEditingWorkflowStepIndex,
  stepTitle, setStepTitle,
  stepDesc, setStepDesc,
  stepDuration, setStepDuration,
  stepRequired, setStepRequired,
  stepChecklist, setStepChecklist,
  newChecklistVal, setNewChecklistVal,
  policiesData,
  selectedPolicyIds, setSelectedPolicyIds,
  policySearch, setPolicySearch,
  filteredPolicies,
  setStep,
}: {
  termsAndConditions: string;
  setTermsAndConditions: (v: string) => void;
  premiumTermsAndConditions: string;
  setPremiumTermsAndConditions: (v: string) => void;
  commitments: { id: string; title: string; content: string; iconName: string }[];
  setCommitments: React.Dispatch<React.SetStateAction<{ id: string; title: string; content: string; iconName: string }[]>>;
  newCommitmentTitle: string;
  setNewCommitmentTitle: (v: string) => void;
  newCommitmentContent: string;
  setNewCommitmentContent: (v: string) => void;
  newCommitmentIcon: string;
  setNewCommitmentIcon: (v: string) => void;
  showAddCommitment: boolean;
  setShowAddCommitment: (v: boolean) => void;
  workflowSteps: CreateWorkflowStepDto[];
  setWorkflowSteps: React.Dispatch<React.SetStateAction<CreateWorkflowStepDto[]>>;
  editingWorkflowStepIndex: number | null;
  setEditingWorkflowStepIndex: (v: number | null) => void;
  stepTitle: string;
  setStepTitle: (v: string) => void;
  stepDesc: string;
  setStepDesc: (v: string) => void;
  stepDuration: string;
  setStepDuration: (v: string) => void;
  stepRequired: boolean;
  setStepRequired: (v: boolean) => void;
  stepChecklist: string[];
  setStepChecklist: React.Dispatch<React.SetStateAction<string[]>>;
  newChecklistVal: string;
  setNewChecklistVal: (v: string) => void;
  policiesData: Policy[];
  selectedPolicyIds: string[];
  setSelectedPolicyIds: React.Dispatch<React.SetStateAction<string[]>>;
  policySearch: string;
  setPolicySearch: (v: string) => void;
  filteredPolicies: Policy[];
  setStep: (v: number) => void;
}) {
  return (
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
                      <Textarea placeholder="1. Chỉ bàn giao thợ đạt đánh giá từ 4.8★ trở lên.&#10;2. Đi kèm trọn bộ nước dọn dẹp thảo mộc hữu cơ premium.&#10;3. Cam kết đền bù đổ vỡ tài sản tối đa lên tới 15.000.000đ."
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
  );
}
