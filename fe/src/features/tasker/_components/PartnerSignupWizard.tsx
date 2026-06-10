"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StepHeader } from "./steps/StepHeader";
import { StepCreateAccount } from "./steps/StepCreateAccount";
import { StepPersonalInfo, PersonalInfoValues } from "./steps/StepPersonalInfo";
import { StepServiceSelection } from "./steps/StepServiceSelection";
import { StepIdentityVerification } from "./steps/StepIdentityVerification";
import { StepLegalAndPayment, PaymentValues } from "./steps/StepLegalAndPayment";
import { StepSuccess } from "./steps/StepSuccess";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { authApi } from "@/features/auth/services/auth.service";
import {
  useTaskerProfile,
  useApplyTasker,
  useUpdateTaskerProfile,
  useAddTaskerService,
  useUpdateTaskerDocuments,
  useAvailableServices
} from "../hooks/tasker.hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { taskerKeys } from "../hooks/tasker.hooks";
import { queryKeys } from "@/features/auth/queries/auth.query";

/**
 * Luồng đăng ký ĐỒNG THỜI tạo tài khoản mới (Hướng 2).
 * Dành cho người chưa có tài khoản. Bước 0: tạo account → tự login → tiếp tục các bước hồ sơ.
 */

const STEPS = [
  { title: "Tài khoản", description: "Đăng ký mới" },
  { title: "Cá nhân", description: "Thông tin liên hệ" },
  { title: "Dịch vụ", description: "Lĩnh vực hoạt động" },
  { title: "Xác minh", description: "Định danh điện tử" },
  { title: "Pháp lý", description: "Hồ sơ & Thanh toán" },
  { title: "Hoàn tất", description: "Đợi xét duyệt" },
];

interface PartnerSignupWizardFormData extends Partial<PersonalInfoValues>, Partial<PaymentValues> {
  citizenCard?: File[];
  idWithSelfie?: File[];
  criminalRecord?: File[];
  healthCertificate?: File[];
  certificate?: File[];
}

export const PartnerSignupWizard: React.FC = () => {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useTaskerProfile();
  const { data: services } = useAvailableServices();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PartnerSignupWizardFormData>({});
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const applyMutation = useApplyTasker();
  const updateProfileMutation = useUpdateTaskerProfile();
  const addServiceMutation = useAddTaskerService();
  const updateDocsMutation = useUpdateTaskerDocuments();

  // Bước 0: Tạo tài khoản + Auto-apply Tasker Profile
  const handleCreateAccount = async (data: { fullName: string; email: string; password: string }) => {
    setIsCreatingAccount(true);
    try {
      // 1. Đăng ký tài khoản
      await authApi.register({ fullName: data.fullName, email: data.email, password: data.password });
      // 2. Đăng nhập tự động
      await authApi.login({ email: data.email, password: data.password });
      // 3. Invalidate cache để lấy user mới
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      await queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      toast.success("Tạo tài khoản thành công! Tiếp tục hoàn thiện hồ sơ.");
      setCurrentStep(1);
    } catch {
      toast.error("Đã xảy ra lỗi khi tạo tài khoản, vui lòng thử lại.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleNext = async (stepData: Partial<PartnerSignupWizardFormData> | string[]) => {
    // Bước 2: Service selection (truyền string[])
    if (currentStep === 2 && Array.isArray(stepData)) {
      if (profile?.id && services?.data) {
        const promises = stepData.map((serviceId: string) => {
          const service = services.data.find(
            (s: { id: string; supportedLocationTypes?: string[] }) => s.id === serviceId
          );
          if (service) {
            return addServiceMutation.mutateAsync({
              id: profile.id,
              data: {
                serviceId,
                locationTypes: service.supportedLocationTypes || ["home"],
                shopAddress: service.supportedLocationTypes?.includes("at_shop")
                  ? "Địa chỉ mặc định"
                  : undefined,
              },
            });
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
      }
      setCurrentStep(3);
      return;
    }

    const currentStepData = stepData as Partial<PartnerSignupWizardFormData>;
    const updatedData = { ...formData, ...currentStepData };
    setFormData(updatedData);

    if (currentStep === 1) {
      // Bước 1: Cá nhân - Apply profile nếu chưa có
      let currentProfileId = profile?.id;
      if (!currentProfileId && user?.id) {
        const newProfile = await applyMutation.mutateAsync(user.id);
        currentProfileId = newProfile.id;
      }
      if (currentProfileId) {
        await updateProfileMutation.mutateAsync({
          id: currentProfileId,
          data: {
            bio: currentStepData.bio,
            experience: currentStepData.experience,
            phone: currentStepData.phone,
            skills: currentStepData.skills,
            addressResident: currentStepData.addressResident,
            addressCurrent: currentStepData.addressCurrent,
          },
        });
      }
      setCurrentStep(2);
    } else if (currentStep === 3) {
      // Bước 3: Xác minh danh tính
      if (profile?.id) {
        const payload = new FormData();
        if (currentStepData.citizenCard) {
          currentStepData.citizenCard.forEach((file: File) => payload.append("citizenCard", file));
        }
        if (currentStepData.idWithSelfie) {
          currentStepData.idWithSelfie.forEach((file: File) => payload.append("idWithSelfie", file));
        }
        await updateDocsMutation.mutateAsync({ id: profile.id, formData: payload });
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Bước 4: Pháp lý & Thanh toán
      if (profile?.id) {
        if (currentStepData.bankName) {
          await updateProfileMutation.mutateAsync({
            id: profile.id,
            data: {
              bankName: currentStepData.bankName,
              bankAccountNumber: currentStepData.bankAccountNumber,
              bankAccountName: currentStepData.bankAccountName,
            },
          });
        }
        const payload = new FormData();
        if (currentStepData.criminalRecord) {
          currentStepData.criminalRecord.forEach((file: File) => payload.append("criminalRecord", file));
        }
        if (currentStepData.healthCertificate) {
          currentStepData.healthCertificate.forEach((file: File) => payload.append("healthCertificate", file));
        }
        if (currentStepData.certificate) {
          currentStepData.certificate.forEach((file: File) => payload.append("certificate", file));
        }
        await updateDocsMutation.mutateAsync({ id: profile.id, formData: payload });
      }
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // Nếu user đã đăng nhập (đến từ flow customer), bỏ qua bước tạo tài khoản
  const displayStep = user ? currentStep + 1 : currentStep;
  const displaySteps = user ? STEPS.slice(1) : STEPS;

  if (isUserLoading || (user && isProfileLoading)) {
    return (
      <div className="container mx-auto py-20">
        <Skeleton className="h-10 w-64 mb-10 mx-auto" />
        <Skeleton className="h-[500px] w-full rounded-[3rem]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-primary">Trở thành Đối tác CleanZ</h1>
          <p className="text-muted-foreground text-lg">
            {user
              ? `Xin chào ${user.fullName}! Hãy hoàn thiện hồ sơ để bắt đầu nhận việc.`
              : "Tạo tài khoản và hoàn thiện hồ sơ để tăng thu nhập cùng CleanZ."}
          </p>
        </div>

        {/* Chỉ hiển thị StepHeader nếu chưa phải bước cuối */}
        {displayStep < displaySteps.length - 1 && (
          <StepHeader currentStep={displayStep} steps={displaySteps} />
        )}

        <div className="relative mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Bước 0: Tạo tài khoản (chỉ khi chưa login) */}
              {currentStep === 0 && !user && (
                <StepCreateAccount
                  onNext={handleCreateAccount}
                  isSubmitting={isCreatingAccount}
                />
              )}

              {/* Bước 1: Thông tin cá nhân */}
              {((currentStep === 1 && !user) || (currentStep === 0 && user)) && (
                <StepPersonalInfo
                  initialValues={profile ? {
                    bio: profile.bio,
                    experience: profile.experience,
                    phone: profile.phone,
                    skills: profile.skills,
                    addressResident: profile.addressResident,
                    addressCurrent: profile.addressCurrent,
                  } : {}}
                  onNext={handleNext}
                  isSubmitting={updateProfileMutation.isPending || applyMutation.isPending}
                />
              )}

              {/* Bước 2: Chọn dịch vụ */}
              {((currentStep === 2 && !user) || (currentStep === 1 && user)) && (
                <StepServiceSelection
                  onBack={handleBack}
                  onNext={handleNext}
                  isSubmitting={addServiceMutation.isPending}
                />
              )}

              {/* Bước 3: Xác minh danh tính */}
              {((currentStep === 3 && !user) || (currentStep === 2 && user)) && (
                <StepIdentityVerification
                  onBack={handleBack}
                  onNext={handleNext}
                  isSubmitting={updateDocsMutation.isPending}
                />
              )}

              {/* Bước 4: Pháp lý & Thanh toán */}
              {((currentStep === 4 && !user) || (currentStep === 3 && user)) && (
                <StepLegalAndPayment
                  initialValues={profile ? {
                    bankName: profile.bankName,
                    bankAccountNumber: profile.bankAccountNumber,
                    bankAccountName: profile.bankAccountName,
                  } : {}}
                  onBack={handleBack}
                  onNext={handleNext}
                  isSubmitting={updateDocsMutation.isPending || updateProfileMutation.isPending}
                />
              )}

              {/* Bước 5: Hoàn tất */}
              {((currentStep === 5 && !user) || (currentStep === 4 && user)) && (
                <StepSuccess />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
