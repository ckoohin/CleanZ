"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { StepHeader } from "./steps/StepHeader";
import { StepPersonalInfo } from "./steps/StepPersonalInfo";
import { StepServiceSelection } from "./steps/StepServiceSelection";
import { StepIdentityVerification } from "./steps/StepIdentityVerification";
import { StepLegalAndPayment } from "./steps/StepLegalAndPayment";
import { StepReview } from "./steps/StepReview";
import { StepSuccess } from "./steps/StepSuccess";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { StaffStatus } from "../types/staff.type";
import { parseAdminNotes } from "@/features/admin-staff/_components/AdminRequestInfoModal";
import {
  useStaffProfile,
  useApplyStaff,
  useUpdateStaffProfile,
  useAddStaffService,
  useUpdateStaffDocuments,
  useAvailableServices,
  useMyStaffServices,
  useMyDocuments,
} from "../hooks/staff.hooks";
import { useStaffOnboardingStore } from "../stores/useStaffOnboardingStore";
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

/**
 * Tính toán step cần resume dựa trên data server.
 */
function computeResumeStep(
  profile: { 
    phone?: string; 
    bio?: string;
    hasCitizenCardImage?: boolean;
    hasIdWithSelfieImage?: boolean;
    hasCriminalRecordImage?: boolean;
    hasHealthCertificateImage?: boolean;
    bankName?: string;
    approvalStatus?: string;
    adminNotes?: string;
  } | undefined | null,
  hasRegisteredServices: boolean,
): number {
  if (!profile) return 0;

  if (profile.approvalStatus === StaffStatus.NEED_INFO && profile.adminNotes) {
    const parsed = parseAdminNotes(profile.adminNotes);
    if (parsed && parsed.itemLabels.length > 0) {
      if (parsed.itemLabels.includes("Ảnh CCCD") || parsed.itemLabels.includes("Selfie + CCCD") || parsed.itemLabels.includes("CCCD / CMND")) return 2;
      if (parsed.itemLabels.includes("Lý lịch tư pháp") || parsed.itemLabels.includes("Giấy khám sức khỏe")) return 3;
      if (parsed.itemLabels.includes("Thông tin cá nhân")) return 0;
      if (parsed.itemLabels.includes("Dịch vụ")) return 1;
    }
  }

  if (!profile.phone || !profile.bio) return 0;
  if (!hasRegisteredServices) return 1;
  if (!profile.hasCitizenCardImage || !profile.hasIdWithSelfieImage) return 2;
  if (!profile.hasCriminalRecordImage || !profile.hasHealthCertificateImage || !profile.bankName) {
    return 3;
  }

  // Đã có đầy đủ thông tin cơ bản -> Cho phép đến bước Xác nhận (Review)
  return 4;
}

export const StaffRegistrationWizard: React.FC = () => {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useStaffProfile();
  const { data: services } = useAvailableServices();
  const { data: myServices, isLoading: isServicesLoading } = useMyStaffServices(profile?.id);
  const { data: myDocsData, isLoading: isDocsLoading } = useMyDocuments(profile?.id);

  const applyMutation = useApplyStaff();
  const updateProfileMutation = useUpdateStaffProfile();
  const addServiceMutation = useAddStaffService();
  const updateDocsMutation = useUpdateStaffDocuments();

  // Zustand Store
  const {
    personalInfo,
    serviceIds,
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
    setBankInfo,
    setCurrentStep,
    setMaxStepReached,
    setFiles,
    resetStore,
  } = useStaffOnboardingStore();

  // Loading tổng hợp khi nộp toàn bộ thông tin ở cuối
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<ProgressStep[]>([
    { label: "Khởi tạo tài khoản đối tác", status: "idle" },
    { label: "Cập nhật thông tin cá nhân & ngân hàng", status: "idle" },
    { label: "Đăng ký lĩnh vực hoạt động", status: "idle" },
    { label: "Tải lên tài liệu pháp lý xác minh", status: "idle" },
  ]);

  // Redirect về /staff nếu hồ sơ đang chờ hoặc đã được duyệt
  useEffect(() => {
    if (isProfileLoading || !profile) return;
    if (
      profile.approvalStatus === StaffStatus.PENDING ||
      profile.approvalStatus === StaffStatus.APPROVED
    ) {
      router.replace("/staff");
    }
  }, [profile, isProfileLoading, router]);

  // Tính toán resume step từ server data để khởi tạo maxStepReached
  const resumeStep = useMemo(() => {
    if (isProfileLoading) return null;
    if (!profile) return 0;
    if (isServicesLoading) return null;
    const hasServices = Array.isArray(myServices) && myServices.length > 0;
    return computeResumeStep(profile, hasServices);
  }, [profile, myServices, isProfileLoading, isServicesLoading]);

  // Thiết lập step bắt đầu hoặc nạp lại step cũ khi vào trang lần đầu
  useEffect(() => {
    if (resumeStep !== null) {
      // Ưu tiên nạp step hiện tại trong Zustand (nếu có lưu từ LocalStorage), 
      // nhưng giới hạn bởi resumeStep từ server để đảm bảo không nhảy cóc trái phép
      if (currentStep === 0 && resumeStep > 0) {
        setCurrentStep(resumeStep);
        setMaxStepReached(resumeStep);
      } else {
        setMaxStepReached(resumeStep);
      }
    }
  }, [resumeStep]);

  // ĐỒNG BỘ DỮ LIỆU CŨ TỪ SERVER VÀO ZUSTAND
  useEffect(() => {
    if (isProfileLoading || !profile) return;
    
    // Chỉ nạp dữ liệu từ server nếu Zustand store cục bộ chưa có dữ liệu (tránh ghi đè dữ liệu mới đang gõ)
    if (Object.keys(personalInfo).length === 0 && profile.phone) {
      setPersonalInfo({
        bio: profile.bio || "",
        experience: profile.experience || "",
        phone: profile.phone || "",
        skills: profile.skills || "",
        addressResident: profile.addressResident || "",
        addressCurrent: profile.addressCurrent || "",
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

  useEffect(() => {
    if (isServicesLoading || !myServices) return;

    if (serviceIds.length === 0 && myServices.length > 0) {
      setServiceIds(myServices.map(s => s.serviceId));
    }
  }, [myServices, isServicesLoading]);

  // Xử lý chuyển step linh hoạt (Chỉ lưu vào Zustand, hoàn toàn không gọi API)
  const handleNext = (stepData: any) => {
    if (currentStep === null) return;

    if (currentStep === 0) {
      // Step 0: Cá nhân
      setPersonalInfo(stepData);
      const nextStep = 1;
      setCurrentStep(nextStep);
      setMaxStepReached(nextStep);
    } else if (currentStep === 1) {
      // Step 1: Dịch vụ (dạng mảng ID)
      setServiceIds(stepData);
      const nextStep = 2;
      setCurrentStep(nextStep);
      setMaxStepReached(nextStep);
    } else if (currentStep === 2) {
      // Step 2: Xác minh (CCCD & Selfie files)
      setFiles("citizenCard", stepData.citizenCard || []);
      setFiles("idWithSelfie", stepData.idWithSelfie || []);
      const nextStep = 3;
      setCurrentStep(nextStep);
      setMaxStepReached(nextStep);
    } else if (currentStep === 3) {
      // Step 3: Pháp lý & Thanh toán
      setBankInfo({
        bankName: stepData.bankName,
        bankAccountNumber: stepData.bankAccountNumber,
        bankAccountName: stepData.bankAccountName,
      });
      setFiles("criminalRecord", stepData.criminalRecord || []);
      setFiles("healthCertificate", stepData.healthCertificate || []);
      setFiles("certificate", stepData.certificate || []);
      
      const nextStep = 4; // Sang Step 4 (Review)
      setCurrentStep(nextStep);
      setMaxStepReached(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep !== null && currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // NỘP TOÀN BỘ HỒ SƠ TUẦN TỰ LÊN SERVER (FINAL SUBMIT PROGRESS)
  const handleSubmitAll = async () => {
    if (!user?.id) {
      toast.error("Phiên đăng nhập không hợp lệ!");
      return;
    }

    setIsSubmittingAll(true);
    let currentProfileId = profile?.id;

    // Reset trạng thái tiến trình
    setSubmitProgress([
      { label: "Khởi tạo tài khoản đối tác", status: "idle" },
      { label: "Cập nhật thông tin cá nhân & ngân hàng", status: "idle" },
      { label: "Đăng ký lĩnh vực hoạt động", status: "idle" },
      { label: "Tải lên tài liệu pháp lý xác minh", status: "idle" },
    ]);

    try {
      // BƯỚC 1: Khởi tạo tài khoản
      setSubmitProgress(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: "loading" } : s));
      if (!currentProfileId) {
        const newProfile = await applyMutation.mutateAsync(user.id);
        currentProfileId = newProfile.id;
      }
      setSubmitProgress(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: "success" } : s));

      // BƯỚC 2: Cập nhật profile & Bank
      setSubmitProgress(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: "loading" } : s));
      await updateProfileMutation.mutateAsync({
        id: currentProfileId,
        data: {
          bio: personalInfo.bio,
          experience: personalInfo.experience,
          phone: personalInfo.phone,
          skills: personalInfo.skills,
          addressResident: personalInfo.addressResident,
          addressCurrent: personalInfo.addressCurrent,
          bankName: bankInfo.bankName,
          bankAccountNumber: bankInfo.bankAccountNumber,
          bankAccountName: bankInfo.bankAccountName,
        }
      });
      setSubmitProgress(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: "success" } : s));

      // BƯỚC 3: Đăng ký dịch vụ (Chỉ đăng ký những dịch vụ mới chưa có trên server)
      setSubmitProgress(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: "loading" } : s));
      if (services?.data) {
        const servicesToAdd = serviceIds.filter(
          id => !myServices?.some(ms => String(ms.serviceId) === String(id))
        );

        const promises = servicesToAdd.map((serviceId: string) => {
          const service = services.data.find((s: any) => String(s.id) === String(serviceId));
          if (service) {
            return addServiceMutation.mutateAsync({
              id: currentProfileId!,
              data: {
                serviceId,
                locationTypes: service.supportedLocationTypes || ["home"],
                shopAddress: service.supportedLocationTypes?.includes("at_shop") ? "Địa chỉ mặc định" : undefined
              }
            });
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
      }
      setSubmitProgress(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: "success" } : s));

      // BƯỚC 4: Tải tài liệu định danh & pháp lý lên Cloudinary (Chỉ gọi API nếu thực sự chọn thêm file mới)
      setSubmitProgress(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: "loading" } : s));
      const payload = new FormData();
      let hasNewFiles = false;

      if (citizenCard && citizenCard.length > 0) {
        citizenCard.forEach((file: File) => payload.append("citizenCard", file));
        hasNewFiles = true;
      }
      if (idWithSelfie && idWithSelfie.length > 0) {
        idWithSelfie.forEach((file: File) => payload.append("idWithSelfie", file));
        hasNewFiles = true;
      }
      if (criminalRecord && criminalRecord.length > 0) {
        criminalRecord.forEach((file: File) => payload.append("criminalRecord", file));
        hasNewFiles = true;
      }
      if (healthCertificate && healthCertificate.length > 0) {
        healthCertificate.forEach((file: File) => payload.append("healthCertificate", file));
        hasNewFiles = true;
      }
      if (certificate && certificate.length > 0) {
        certificate.forEach((file: File) => payload.append("certificate", file));
        hasNewFiles = true;
      }

      if (hasNewFiles) {
        await updateDocsMutation.mutateAsync({ id: currentProfileId, formData: payload });
      }
      setSubmitProgress(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: "success" } : s));

      // HOÀN TẤT
      toast.success("Nộp hồ sơ đối tác thành công!");
      resetStore(); // Xóa sạch LocalStorage/Zustand sau khi gửi thành công
      setCurrentStep(5); // Chuyển sang Step Success (Màn hình 5)
    } catch (error) {
      console.error("Lỗi khi nộp hồ sơ:", error);
      const activeIdx = submitProgress.findIndex(s => s.status === "loading");
      if (activeIdx !== -1) {
        setSubmitProgress(prev => prev.map((s, idx) => idx === activeIdx ? { ...s, status: "error" } : s));
      }
      toast.error("Gửi hồ sơ thất bại. Vui lòng kiểm tra thông tin và nộp lại!");
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const isLoading =
    isUserLoading ||
    isProfileLoading ||
    (!!profile?.id && isServicesLoading) ||
    (!!profile?.id && isDocsLoading) ||
    currentStep === null;

  const isRedirecting =
    !isProfileLoading &&
    (
      profile?.approvalStatus === StaffStatus.PENDING ||
      profile?.approvalStatus === StaffStatus.APPROVED
    );

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
          
          {/* CỘT TRÁI: GIỚI THIỆU & TRUYỀN CẢM HỨNG (PC Only - KHÔNG DÙNG EMOJI) */}
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

            {/* Thống số nổi bật (Glassmorphism Cards với Lucide Icons) */}
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

            {/* Bảng so sánh quyền lợi với Lucide Sparkles */}
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
                <div className="grid grid-cols-12 items-center py-1">
                  <div className="col-span-4 font-bold text-xs text-slate-700 dark:text-slate-300">Khách hàng</div>
                  <div className="col-span-4 text-primary font-bold text-xs">Đơn đều mỗi ngày</div>
                  <div className="col-span-4 text-right text-xs text-muted-foreground">Tự tìm kiếm vất vả</div>
                </div>
                <div className="grid grid-cols-12 items-center py-1">
                  <div className="col-span-4 font-bold text-xs text-slate-700 dark:text-slate-300">Mức thu nhập</div>
                  <div className="col-span-4 text-primary font-bold text-xs">80K - 120K / giờ</div>
                  <div className="col-span-4 text-right text-xs text-muted-foreground">Bấp bênh không ổn định</div>
                </div>
                <div className="grid grid-cols-12 items-center py-1">
                  <div className="col-span-4 font-bold text-xs text-slate-700 dark:text-slate-300">An toàn</div>
                  <div className="col-span-4 text-primary font-bold text-xs">Hỗ trợ & Bảo hiểm</div>
                  <div className="col-span-4 text-right text-xs text-muted-foreground">Chịu rủi ro một mình</div>
                </div>
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

            {/* Stepper Header chuyên nghiệp, hỗ trợ click di chuyển linh hoạt giữa các bước đã mở khóa */}
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
                      isSubmitting={false} // Lưu local nên chạy ngay tức thì không cần quay loading
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
                      initialDocuments={myDocsData?.documents || []}
                      onBack={handleBack}
                      onNext={handleNext}
                      isSubmitting={false}
                    />
                  )}
                  {currentStep === 3 && (
                    <StepLegalAndPayment
                      initialValues={bankInfo}
                      initialDocuments={myDocsData?.documents || []}
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
                        certificate
                      }}
                      existingDocs={myDocsData?.documents || []}
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
