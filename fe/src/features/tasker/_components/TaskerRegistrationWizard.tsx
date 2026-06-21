"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { StepHeader } from "./steps/StepHeader";
import { StepPersonalInfo } from "./steps/StepPersonalInfo";
import { StepServiceSelection } from "./steps/StepServiceSelection";
import { StepIdentityVerification } from "./steps/StepIdentityVerification";
import { StepLegalAndPayment } from "./steps/StepLegalAndPayment";
import { StepReview } from "./steps/StepReview";
import { StepSuccess } from "./steps/StepSuccess";
import { TaskerStatus } from "../types/tasker.type";
import {
  useTaskerProfile,
  useSubmitTaskerProfile,
  useAvailableServices,
} from "../hooks/tasker.hooks";
import { useTaskerOnboardingStore } from "../stores/useTaskerOnboardingStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Coins, Clock, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { title: "Cá nhân", description: "Thông tin liên hệ" },
  { title: "Dịch vụ", description: "Lĩnh vực hoạt động" },
  { title: "Xác minh", description: "Định danh điện tử" },
  { title: "Pháp lý", description: "Hồ sơ & Thanh toán" },
  { title: "Xác nhận", description: "Kiểm tra & Gửi" },
  { title: "Hoàn tất", description: "Đợi xét duyệt" },
];

export interface ProgressStep {
  label: string;
  status: "idle" | "loading" | "success" | "error";
}

export const TaskerRegistrationWizard: React.FC = () => {
  const router = useRouter();
  const { data: profile, isLoading: isProfileLoading } = useTaskerProfile();
  const { data: services } = useAvailableServices();

  const submitMutation = useSubmitTaskerProfile();

  const {
    personalInfo,
    serviceIds,
    docIdNumber,
    bankInfo,
    currentStep,
    maxStepReached,
    citizenCard,
    idWithSelfie,
    criminalRecord,
    healthCertificate,
    certificate,
    setPersonalInfo,
    setServiceIds,
    setDocIdNumber,
    setBankInfo,
    setCurrentStep,
    setMaxStepReached,
    setFiles,
    resetStore,
  } = useTaskerOnboardingStore();

  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<ProgressStep[]>([
    { label: "Nộp hồ sơ & tải lên giấy tờ", status: "idle" },
  ]);

  // Redirect về /tasker nếu hồ sơ đang PENDING hoặc đã APPROVED
  useEffect(() => {
    if (isProfileLoading || !profile) return;
    if (
      profile.approvalStatus === TaskerStatus.PENDING ||
      profile.approvalStatus === TaskerStatus.APPROVED
    ) {
      router.replace("/tasker");
    }
  }, [profile, isProfileLoading, router]);

  // Đồng bộ dữ liệu cũ từ server vào Zustand nếu chưa có local
  useEffect(() => {
    if (isProfileLoading || !profile) return;
    if (Object.keys(personalInfo).length === 0 && profile.phone) {
      setPersonalInfo({
        bio: profile.bio || "",
        experience: (profile as { experience?: string }).experience || "",
        phone: profile.phone || "",
        skills: (profile as { skills?: string }).skills || "",
        addressResident: (profile as { addressResident?: string }).addressResident || "",
        addressCurrent: (profile as { addressCurrent?: string }).addressCurrent || "",
      });
    }
    if (Object.keys(bankInfo).length === 0 && profile.bankName) {
      setBankInfo({
        bankName: profile.bankName || "",
        bankAccountNumber: profile.bankAccountNumber || "",
        bankAccountName: profile.bankAccountName || "",
      });
    }
  }, [profile, isProfileLoading]);

  // Handlers chuyển step (chỉ lưu local, không gọi API)
  const handleNext = (stepData: unknown) => {
    if (currentStep === 0) {
      setPersonalInfo(stepData as typeof personalInfo);
      goToStep(1);
    } else if (currentStep === 1) {
      setServiceIds(stepData as string[]);
      goToStep(2);
    } else if (currentStep === 2) {
      const data = stepData as { citizenCard: File[]; idWithSelfie: File[]; docIdNumber: string };
      setDocIdNumber(data.docIdNumber);
      setFiles("citizenCard", data.citizenCard || []);
      setFiles("idWithSelfie", data.idWithSelfie || []);
      goToStep(3);
    } else if (currentStep === 3) {
      const data = stepData as {
        bankName: string;
        bankAccountNumber: string;
        bankAccountName: string;
        criminalRecord: File[];
        healthCertificate: File[];
        certificate: File[];
      };
      setBankInfo({
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankAccountName: data.bankAccountName,
      });
      setFiles("criminalRecord", data.criminalRecord || []);
      setFiles("healthCertificate", data.healthCertificate || []);
      setFiles("certificate", data.certificate || []);
      goToStep(4);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setMaxStepReached(step);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  /**
   * FINAL SUBMIT — Gom tất cả data thành 1 FormData và gọi POST /tasker/profile
   * BE nhận: phone, bio, workingAddress, docType, docIdNumber, bankName, bankAccountNumber,
   *          bankAccountName, + files: avatar, docFront, docBack, criminalRecord, healthCertificate, certificate
   */
  const handleSubmitAll = async () => {
    if (!personalInfo.phone) {
      toast.error("Thiếu thông tin: Số điện thoại");
      return;
    }
    if (citizenCard.length < 2 && !profile?.hasCitizenCardImage) {
      toast.error("Vui lòng tải lên đủ ảnh CCCD (mặt trước và sau)");
      return;
    }
    if (idWithSelfie.length < 1 && !profile?.hasIdWithSelfieImage) {
      toast.error("Vui lòng tải lên ảnh selfie cầm CCCD (avatar)");
      return;
    }

    setIsSubmittingAll(true);
    setSubmitProgress([{ label: "Nộp hồ sơ & tải lên giấy tờ", status: "loading" }]);

    try {
      const formData = new FormData();

      // ── Thông tin văn bản ────────────────────────────────────────
      formData.append("phone", personalInfo.phone ?? "");
      if (personalInfo.bio) formData.append("bio", personalInfo.bio);
      if (personalInfo.addressCurrent) formData.append("workingAddress", personalInfo.addressCurrent);

      // docType & docIdNumber — BE bắt buộc
      formData.append("docType", "CITIZEN_ID");
      formData.append("docIdNumber", docIdNumber);

      if (bankInfo.bankName) formData.append("bankName", bankInfo.bankName);
      if (bankInfo.bankAccountNumber) formData.append("bankAccountNumber", bankInfo.bankAccountNumber);
      if (bankInfo.bankAccountName) formData.append("bankAccountName", bankInfo.bankAccountName);

      // ── Files ────────────────────────────────────────────────────
      // avatar = ảnh selfie cầm CCCD (mặt người)
      if (idWithSelfie.length > 0) {
        formData.append("avatar", idWithSelfie[0]);
      }
      // docFront + docBack = 2 ảnh CCCD
      if (citizenCard.length >= 1) formData.append("docFront", citizenCard[0]);
      if (citizenCard.length >= 2) formData.append("docBack", citizenCard[1]);
      if (criminalRecord.length > 0) formData.append("criminalRecord", criminalRecord[0]);
      if (healthCertificate.length > 0) formData.append("healthCertificate", healthCertificate[0]);
      if (certificate.length > 0) formData.append("certificate", certificate[0]);

      await submitMutation.mutateAsync(formData);

      setSubmitProgress([{ label: "Nộp hồ sơ & tải lên giấy tờ", status: "success" }]);
      resetStore();
      setCurrentStep(5); // Bước thành công
    } catch {
      setSubmitProgress([{ label: "Nộp hồ sơ & tải lên giấy tờ", status: "error" }]);
      toast.error("Gửi hồ sơ thất bại. Vui lòng kiểm tra thông tin và thử lại!");
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const isLoading = isProfileLoading || currentStep === null;
  const isRedirecting =
    !isProfileLoading &&
    (profile?.approvalStatus === TaskerStatus.PENDING ||
      profile?.approvalStatus === TaskerStatus.APPROVED);

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-20 space-y-4 max-w-5xl">
        <Skeleton className="h-10 w-64 mb-10 mx-auto" />
        <Skeleton className="h-4 w-96 mx-auto" />
        <Skeleton className="h-[500px] w-full rounded-[3rem] mt-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-0 py-4 md:py-16 md:px-8 lg:px-16 flex items-center justify-center bg-slate-50/50 dark:bg-transparent">
      <div className="w-full max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* CỘT TRÁI: GIỚI THIỆU (PC Only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col space-y-8 sticky top-16">
            <div className="relative overflow-hidden rounded-[2.5rem] p-10 min-h-[420px] flex flex-col justify-end text-white bg-slate-900 shadow-2xl group border border-white/10">
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
                  Trở thành đối tác dọn dẹp chuyên nghiệp chuẩn 5 sao để nhận lịch làm việc ổn định, thu nhập cao và tự quyết định thời gian của riêng bạn.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[2rem] p-6 shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                <Coins className="w-8 h-8 text-primary mb-2 block" />
                <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Thu nhập hấp dẫn</h4>
                <p className="text-lg font-black mt-1 text-slate-800 dark:text-white">15 - 20 Triệu/tháng</p>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[2rem] p-6 shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                <Clock className="w-8 h-8 text-primary mb-2 block" />
                <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Thời gian tự do</h4>
                <p className="text-lg font-black mt-1 text-slate-800 dark:text-white">Tự chọn ca làm</p>
              </div>
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[2rem] p-6 shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 col-span-2 flex items-center gap-4">
                <GraduationCap className="w-10 h-10 text-primary shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Đào tạo chuẩn 5 sao</h4>
                  <p className="text-base font-bold mt-0.5 text-slate-800 dark:text-white">Miễn phí 100% tài liệu & thực hành nghiệp vụ</p>
                </div>
              </div>
            </div>

            <div className="bg-white/45 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl">
              <h3 className="text-lg font-black font-serif mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <Sparkles className="w-5 h-5 text-primary shrink-0" /> Sự khác biệt vượt trội
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-12 items-center text-[10px] pb-2 border-b border-black/10 dark:border-white/10 text-muted-foreground font-bold uppercase tracking-wider">
                  <div className="col-span-4">Quyền lợi</div>
                  <div className="col-span-4 text-primary">CleanZ Partner</div>
                  <div className="col-span-4 text-right">Lao động tự do</div>
                </div>
                {[
                  ["Khách hàng", "Đơn đều mỗi ngày", "Tự tìm kiếm vất vả"],
                  ["Mức thu nhập", "80K - 120K / giờ", "Bấp bênh không ổn định"],
                  ["An toàn", "Hỗ trợ & Bảo hiểm", "Chịu rủi ro một mình"],
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

          {/* CỘT PHẢI: FORM WIZARD */}
          <div className="col-span-12 lg:col-span-7 flex flex-col space-y-8">
            <div className="lg:hidden text-center mb-6">
              <span className="bg-primary/20 backdrop-blur-md text-primary font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider border border-primary/30 inline-block mb-3">
                Cổng Đối Tác
              </span>
              <h1 className="text-3xl font-black font-serif mb-2 text-slate-800 dark:text-white">
                Trở thành đối tác CleanZ
              </h1>
              <p className="text-muted-foreground text-sm">
                Gia nhập đội ngũ đối tác dọn dẹp chuẩn 5 sao và tối ưu hóa thu nhập ngay hôm nay.
              </p>
            </div>

            {currentStep < 5 && (
              <StepHeader
                currentStep={currentStep}
                steps={STEPS}
                onStepClick={setCurrentStep}
                maxStepReached={maxStepReached}
              />
            )}

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStep === 0 && (
                    <StepPersonalInfo
                      initialValues={personalInfo}
                      onNext={handleNext}
                      isSubmitting={false}
                    />
                  )}
                  {currentStep === 1 && (
                    <StepServiceSelection
                      initialSelectedIds={serviceIds}
                      onBack={handleBack}
                      onNext={handleNext}
                      isSubmitting={false}
                    />
                  )}
                  {currentStep === 2 && (
                    <StepIdentityVerification 
                      initialDocuments={[]}
                      initialDocIdNumber={docIdNumber}
                      initialCitizenCardFiles={citizenCard}
                      initialSelfieFiles={idWithSelfie}
                      onBack={handleBack} 
                      onNext={handleNext} 
                    />
                  )}
                  {currentStep === 3 && (
                    <StepLegalAndPayment
                      initialValues={bankInfo}
                      initialDocuments={[]}
                      initialCriminalRecord={criminalRecord}
                      initialHealthCert={healthCertificate}
                      initialCertificate={certificate}
                      onBack={handleBack}
                      onNext={handleNext}
                      isSubmitting={false}
                    />
                  )}
                  {currentStep === 4 && (
                    <StepReview
                      personalInfo={personalInfo}
                      serviceIds={serviceIds}
                      availableServices={services?.data || []}
                      bankInfo={bankInfo}
                      files={{
                        citizenCard,
                        idWithSelfie,
                        criminalRecord,
                        healthCertificate,
                        certificate,
                      }}
                      existingDocs={[]}
                      onBack={handleBack}
                      onSubmit={handleSubmitAll}
                      isSubmitting={isSubmittingAll}
                      submitProgress={submitProgress}
                    />
                  )}
                  {currentStep === 5 && <StepSuccess />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
