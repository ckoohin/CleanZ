"use client";

// [UI PREVIEW ONLY] - Trang này là bản UI thuần để xem giao diện
// Sau khi check xong, restore lại TaskerRegistrationWizard thật:
//   import { TaskerRegistrationWizard } from "@/features/tasker/_components/TaskerRegistrationWizard";
//   export default function TaskerOnboardingPage() {
//     return <div className="w-full min-h-screen bg-slate-50/50"><TaskerRegistrationWizard /></div>;
//   }

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ShieldCheck,
  ArrowRight,
  Wallet,
  GraduationCap,
  FileText,
  MapPin,
  CheckCircle,
  Briefcase,
  Smartphone,
  User,
  Phone,
  AlignLeft,
  Layers,
  CreditCard,
  Camera,
  Star,
  ChevronRight,
  Check,
  Coins,
  Sparkles,
  Upload,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const WIZARD_STEPS = [
  { id: 0, title: "Cá nhân", description: "Thông tin liên hệ", icon: User },
  { id: 1, title: "Dịch vụ", description: "Lĩnh vực hoạt động", icon: Layers },
  { id: 2, title: "Xác minh", description: "Định danh điện tử", icon: Camera },
  { id: 3, title: "Pháp lý", description: "Hồ sơ & Thanh toán", icon: CreditCard },
  { id: 4, title: "Xác nhận", description: "Kiểm tra & Gửi", icon: CheckCircle },
];

const MOCK_SERVICES = [
  { id: "1", label: "Dọn dẹp nhà ở", icon: "🏠", desc: "Vệ sinh toàn bộ không gian sống" },
  { id: "2", label: "Dọn văn phòng", icon: "🏢", desc: "Vệ sinh chuyên nghiệp khu vực làm việc" },
  { id: "3", label: "Giặt ủi", icon: "👕", desc: "Giặt, sấy, ủi đồ tại nhà" },
  { id: "4", label: "Dọn sau xây dựng", icon: "🔨", desc: "Vệ sinh sau thi công, cải tạo" },
  { id: "5", label: "Bếp & Nhà tắm", icon: "🚿", desc: "Tẩy rửa chuyên sâu phòng bếp, WC" },
  { id: "6", label: "Ngoại thất & Cửa sổ", icon: "🪟", desc: "Lau kính, vệ sinh ban công, sân vườn" },
];

/* ---------- STEP COMPONENTS (UI ONLY) ---------- */

function StepPersonalInfo({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Thông tin cá nhân</h2>
        <p className="text-muted-foreground text-sm">Điền đầy đủ để chúng tôi xác minh danh tính của bạn.</p>
      </div>
      <div className="grid grid-cols-1 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Số điện thoại</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="phone" placeholder="0901 234 567" className="pl-10 h-12 rounded-xl" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Giới thiệu bản thân</Label>
          <div className="relative">
            <AlignLeft className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
            <Textarea
              id="bio"
              placeholder="Mô tả ngắn về bản thân, kỹ năng và kinh nghiệm của bạn..."
              className="pl-10 min-h-[100px] rounded-xl resize-none"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="experience" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kinh nghiệm làm việc</Label>
          <Input id="experience" placeholder="VD: 2 năm kinh nghiệm dọn dẹp khách sạn 4 sao" className="h-12 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Địa chỉ thường trú</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Quận / Huyện, Tỉnh / TP" className="pl-10 h-12 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Địa chỉ hiện tại</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Quận / Huyện, Tỉnh / TP" className="pl-10 h-12 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
      <Button onClick={onNext} className="w-full h-13 rounded-xl font-bold text-base bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group">
        Tiếp tục <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
}

function StepServiceSelection({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Lĩnh vực dịch vụ</h2>
        <p className="text-muted-foreground text-sm">Chọn tất cả dịch vụ bạn có thể thực hiện tốt.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MOCK_SERVICES.map((svc) => {
          const isSelected = selected.includes(svc.id);
          return (
            <button
              key={svc.id}
              onClick={() => toggle(svc.id)}
              className={cn(
                "relative flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border bg-white dark:bg-slate-900/40 hover:border-primary/40"
              )}
            >
              <span className="text-2xl shrink-0 mt-0.5">{svc.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-slate-900 dark:text-white text-sm">{svc.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{svc.desc}</p>
              </div>
              {isSelected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl font-bold">Trước</Button>
        <Button onClick={onNext} disabled={selected.length === 0} className="flex-2 flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white group">
          Tiếp tục <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}

function StepIdentityVerification({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Xác minh danh tính</h2>
        <p className="text-muted-foreground text-sm">Tải lên ảnh CCCD / CMND để xác minh danh tính của bạn.</p>
      </div>
      <div className="space-y-4">
        {[
          { label: "Ảnh CCCD / CMND (mặt trước & sau)", icon: FileText, hint: "Ảnh rõ nét, đủ 4 góc, không bị mờ" },
          { label: "Ảnh Selfie cầm CCCD", icon: Camera, hint: "Khuôn mặt nhìn thẳng, ánh sáng đủ" },
        ].map((item, idx) => (
          <div key={idx} className="border-2 border-dashed border-border rounded-2xl p-6 hover:border-primary/50 transition-colors group cursor-pointer">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <item.icon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.hint}</p>
              </div>
              <div className="flex items-center gap-2 text-primary text-xs font-bold">
                <Upload className="w-3.5 h-3.5" /> Chọn ảnh hoặc kéo thả vào đây
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl font-bold">Trước</Button>
        <Button onClick={onNext} className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white group">
          Tiếp tục <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}

function StepLegalAndPayment({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Pháp lý & Thanh toán</h2>
        <p className="text-muted-foreground text-sm">Tải giấy tờ pháp lý và điền thông tin ngân hàng nhận tiền.</p>
      </div>

      {/* Tài liệu pháp lý */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tài liệu pháp lý</p>
        {[
          { label: "Lý lịch tư pháp / Hạnh kiểm", icon: ShieldCheck },
          { label: "Giấy khám sức khỏe", icon: FileText },
          { label: "Chứng chỉ / Bằng cấp (nếu có)", icon: GraduationCap },
        ].map((doc, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-dashed border-border hover:border-primary/50 cursor-pointer group transition-colors">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <doc.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-slate-900 dark:text-white">{doc.label}</p>
              <p className="text-xs text-muted-foreground">PDF, JPG, PNG — tối đa 5MB</p>
            </div>
            <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        ))}
      </div>

      {/* Thông tin ngân hàng */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tài khoản ngân hàng nhận tiền</p>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 space-y-4 border border-border">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ngân hàng</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="VD: Vietcombank, Techcombank..." className="pl-10 h-12 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Số tài khoản</Label>
              <Input placeholder="1234567890" className="h-12 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chủ tài khoản</Label>
              <Input placeholder="NGUYEN VAN A" className="h-12 rounded-xl uppercase" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl font-bold">Trước</Button>
        <Button onClick={onNext} className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white group">
          Tiếp tục <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}

function StepReview({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Xác nhận & Gửi hồ sơ</h2>
        <p className="text-muted-foreground text-sm">Kiểm tra lại thông tin trước khi gửi cho đội ngũ CleanZ xét duyệt.</p>
      </div>
      <div className="space-y-3">
        {[
          { title: "Thông tin cá nhân", desc: "Số điện thoại, địa chỉ, giới thiệu", icon: User, status: "✅ Hoàn tất" },
          { title: "Dịch vụ đăng ký", desc: "2 lĩnh vực được chọn", icon: Layers, status: "✅ Hoàn tất" },
          { title: "Định danh điện tử", desc: "CCCD & Selfie đã tải lên", icon: Camera, status: "✅ Hoàn tất" },
          { title: "Pháp lý & Ngân hàng", desc: "Hồ sơ pháp lý & tài khoản nhận tiền", icon: CreditCard, status: "✅ Hoàn tất" },
        ].map((section, idx) => (
          <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <section.icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm text-slate-900 dark:text-white">{section.title}</p>
              <p className="text-xs text-muted-foreground">{section.desc}</p>
            </div>
            <span className="text-xs font-bold text-emerald-600">{section.status}</span>
          </div>
        ))}
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
          Sau khi gửi, hồ sơ của bạn sẽ được xét duyệt trong vòng 24–48 giờ. Bạn sẽ nhận thông báo qua email khi có kết quả.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl font-bold">Trước</Button>
        <Button onClick={onSubmit} className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
          Gửi hồ sơ ngay 🚀
        </Button>
      </div>
    </div>
  );
}

function StepSuccess() {
  return (
    <div className="flex flex-col items-center text-center py-12 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
      >
        <Check className="w-12 h-12 text-emerald-600" />
      </motion.div>
      <div>
        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Nộp hồ sơ thành công!</h2>
        <p className="text-muted-foreground max-w-sm leading-relaxed">
          Đội ngũ CleanZ sẽ xét duyệt hồ sơ của bạn trong vòng <strong>24–48 giờ</strong>. Hãy để ý email để nhận kết quả sớm nhất.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
        {[
          { icon: Clock, label: "Xét duyệt", value: "24–48h" },
          { icon: Star, label: "Xếp hạng ban đầu", value: "★ 4.5" },
          { icon: Coins, label: "Thu nhập dự kiến", value: "15–20tr" },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-border">
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- STEP HEADER ---------- */

function StepperHeader({
  currentStep,
  onStepClick,
  maxStep,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
  maxStep: number;
}) {
  return (
    <div className="flex items-center gap-1 bg-white dark:bg-slate-900/50 rounded-2xl p-2 border border-border shadow-sm">
      {WIZARD_STEPS.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isLocked = idx > maxStep;
        return (
          <button
            key={step.id}
            onClick={() => !isLocked && onStepClick(idx)}
            disabled={isLocked}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all text-center",
              isCurrent && "bg-primary/10",
              isCompleted && !isCurrent && "hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer",
              isLocked && "opacity-40 cursor-not-allowed"
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black",
                isCompleted ? "bg-primary text-white" : isCurrent ? "bg-primary/20 text-primary border-2 border-primary" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
              )}
            >
              {isCompleted ? <Check className="w-3.5 h-3.5" /> : <step.icon className="w-3.5 h-3.5" />}
            </div>
            <p className={cn("text-[9px] font-bold uppercase tracking-wide leading-none hidden sm:block", isCurrent ? "text-primary" : isCompleted ? "text-slate-600 dark:text-slate-300" : "text-muted-foreground")}>
              {step.title}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- MAIN PAGE ---------- */

export default function TaskerOnboardingUIPreview() {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  const goNext = () => {
    const next = Math.min(currentStep + 1, WIZARD_STEPS.length - 1);
    setCurrentStep(next);
    setMaxStep((prev) => Math.max(prev, next));
  };

  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const goToStep = (s: number) => { if (s <= maxStep) setCurrentStep(s); };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <StepPersonalInfo onNext={goNext} />;
      case 1: return <StepServiceSelection onNext={goNext} onBack={goBack} />;
      case 2: return <StepIdentityVerification onNext={goNext} onBack={goBack} />;
      case 3: return <StepLegalAndPayment onNext={goNext} onBack={goBack} />;
      case 4: return <StepReview onBack={goBack} onSubmit={goNext} />;
      case 5: return <StepSuccess />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen w-full px-4 py-8 md:py-16 md:px-8 lg:px-16 flex items-start justify-center bg-slate-50/50 dark:bg-transparent">
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* CỘT TRÁI: Giới thiệu (Desktop only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col space-y-6 sticky top-20">
            {/* Hero card */}
            <div className="relative overflow-hidden rounded-[2.5rem] p-10 min-h-[400px] flex flex-col justify-end text-white bg-slate-900 shadow-2xl group border border-white/10">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700 ease-out"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=80')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
              <div className="relative z-10 space-y-4">
                <span className="bg-primary/20 backdrop-blur-md text-primary font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider border border-primary/30 inline-block">
                  Cổng Đối Tác CleanZ
                </span>
                <h2 className="text-3xl font-black font-serif leading-tight">
                  Tự chủ cuộc sống, tối đa hóa thu nhập cùng CleanZ.
                </h2>
                <p className="text-slate-200 text-sm leading-relaxed">
                  Trở thành đối tác dọn dẹp chuyên nghiệp để nhận lịch làm việc ổn định, thu nhập cao và tự quyết định thời gian của riêng bạn.
                </p>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Coins, label: "Thu nhập hấp dẫn", value: "15 – 20 Triệu/tháng" },
                { icon: Clock, label: "Thời gian tự do", value: "Tự chọn ca làm" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[2rem] p-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  <stat.icon className="w-8 h-8 text-primary mb-2 block" />
                  <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</h4>
                  <p className="text-lg font-black mt-1 text-slate-800 dark:text-white">{stat.value}</p>
                </div>
              ))}
              <div className="col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[2rem] p-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4">
                <GraduationCap className="w-10 h-10 text-primary shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Đào tạo chuẩn 5 sao</h4>
                  <p className="text-base font-bold mt-0.5 text-slate-800 dark:text-white">Miễn phí 100% tài liệu & thực hành</p>
                </div>
              </div>
            </div>

            {/* Comparison table */}
            <div className="bg-white/45 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl">
              <h3 className="text-lg font-black font-serif mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <Sparkles className="w-5 h-5 text-primary shrink-0" /> Sự khác biệt vượt trội
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-12 text-[10px] pb-2 border-b border-black/10 dark:border-white/10 text-muted-foreground font-bold uppercase tracking-wider">
                  <div className="col-span-4">Quyền lợi</div>
                  <div className="col-span-4 text-primary">CleanZ Partner</div>
                  <div className="col-span-4 text-right">Lao động tự do</div>
                </div>
                {[
                  ["Khách hàng", "Đơn đều mỗi ngày", "Tự tìm kiếm vất vả"],
                  ["Mức thu nhập", "80K – 120K / giờ", "Bấp bênh"],
                  ["Bảo hiểm", "Hỗ trợ & Bảo hiểm", "Chịu rủi ro một mình"],
                ].map(([label, good, bad], i) => (
                  <div key={i} className="grid grid-cols-12 items-center py-1">
                    <div className="col-span-4 font-bold text-xs text-slate-700 dark:text-slate-300">{label}</div>
                    <div className="col-span-4 text-primary font-bold text-xs">{good}</div>
                    <div className="col-span-4 text-right text-xs text-muted-foreground">{bad}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Form wizard */}
          <div className="col-span-12 lg:col-span-7 flex flex-col space-y-6">
            {/* Mobile heading */}
            <div className="lg:hidden text-center">
              <span className="bg-primary/20 text-primary font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider border border-primary/30 inline-block mb-3">
                Cổng Đối Tác
              </span>
              <h1 className="text-3xl font-black font-serif mb-2 text-slate-800 dark:text-white">Trở thành đối tác CleanZ</h1>
              <p className="text-muted-foreground text-sm">Gia nhập đội ngũ đối tác dọn dẹp chuẩn 5 sao.</p>
            </div>

            {/* Stepper header */}
            {currentStep < WIZARD_STEPS.length && (
              <StepperHeader currentStep={currentStep} onStepClick={goToStep} maxStep={maxStep} />
            )}

            {/* Step content */}
            <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-7 md:p-9 border border-border shadow-lg">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Progress indicator */}
            {currentStep < WIZARD_STEPS.length && (
              <p className="text-center text-xs text-muted-foreground">
                Bước {currentStep + 1} / {WIZARD_STEPS.length} &nbsp;—&nbsp; Không thu bất kỳ phí đăng ký nào.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
