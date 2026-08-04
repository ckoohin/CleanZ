"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StepHeader } from "./steps/StepHeader";
import { StepCreateAccount } from "./steps/StepCreateAccount";
import { StepPersonalInfo, PersonalInfoValues } from "./steps/StepPersonalInfo";
import { StepIdentityVerification } from "./steps/StepIdentityVerification";
import {
  StepLegalAndPayment,
  PaymentValues,
} from "./steps/StepLegalAndPayment";
import { StepSuccess } from "./steps/StepSuccess";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import { authApi } from "@/features/auth/services/auth.service";
import {
  useTaskerProfile,
  useSubmitTaskerProfile,
} from "../hooks/tasker.hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/toast";
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
  { title: "Xác minh", description: "Định danh điện tử" },
  { title: "Pháp lý", description: "Hồ sơ & Thanh toán" },
  { title: "Hoàn tất", description: "Đợi xét duyệt" },
];

interface PartnerSignupWizardFormData
  extends Partial<PersonalInfoValues>, Partial<PaymentValues> {
  docIdNumber?: string;
  citizenCard?: File[];
  idWithSelfie?: File[];
  criminalRecord?: File[];
  healthCertificate?: File[];
  certificate?: File[];
}

export const PartnerSignupWizard: React.FC = () => {
  const { data: user, isLoading: isUserLoading } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useTaskerProfile();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [hasInitializedStep, setHasInitializedStep] = useState(false);
  const [formData, setFormData] = useState<PartnerSignupWizardFormData>({});
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const submitMutation = useSubmitTaskerProfile();

  // Sync initial step when user auth finishes loading
  useEffect(() => {
    if (!isUserLoading && !hasInitializedStep) {
      if (user) {
        setCurrentStep(0);
        setMaxStepReached(0);
      } else {
        setCurrentStep(0);
        setMaxStepReached(0);
      }
      setHasInitializedStep(true);
    }
  }, [user, isUserLoading, hasInitializedStep]);

  // Sync existing profile data into form if available
  useEffect(() => {
    if (isProfileLoading || !profile) return;
    setFormData((prev) => {
      const updated = { ...prev };
      if (!updated.phone && profile.phone) updated.phone = profile.phone;
      if (!updated.bio && profile.bio) updated.bio = profile.bio;
      if (!updated.experience && profile.experience) {
        updated.experience = profile.experience;
      }
      if (!updated.skills && profile.skills) {
        updated.skills = profile.skills;
      }
      if (!updated.addressResident && profile.addressResident) {
        updated.addressResident = profile.addressResident;
      }
      if (!updated.addressCurrent && profile.addressCurrent) {
        updated.addressCurrent = profile.addressCurrent;
      }
      if (!updated.bankBin && profile.bankBin)
        updated.bankBin = profile.bankBin;
      if (!updated.bankName && profile.bankName)
        updated.bankName = profile.bankName;
      if (!updated.bankAccountNumber && profile.bankAccountNumber) {
        updated.bankAccountNumber = profile.bankAccountNumber;
      }
      if (!updated.bankAccountName && profile.bankAccountName) {
        updated.bankAccountName = profile.bankAccountName;
      }
      return updated;
    });
  }, [profile, isProfileLoading]);

  // Bước 0: Tạo tài khoản
  const handleCreateAccount = async (data: {
    fullName: string;
    email: string;
    password: string;
  }) => {
    setIsCreatingAccount(true);
    try {
      // 1. Đăng ký tài khoản
      await authApi.register({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      // 2. Đăng nhập tự động
      await authApi.login({ email: data.email, password: data.password });
      // 3. Invalidate cache để lấy user mới
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      await queryClient.invalidateQueries({ queryKey: taskerKeys.profile() });
      toast.success("Tạo tài khoản thành công! Tiếp tục hoàn thiện hồ sơ.");
      setCurrentStep(1);
      setMaxStepReached(1);
    } catch {
      toast.error("Đã xảy ra lỗi khi tạo tài khoản, vui lòng thử lại.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleNext = async (stepData: Partial<PartnerSignupWizardFormData>) => {
    const updatedData = { ...formData, ...stepData };
    setFormData(updatedData);

    const isLastStep = user ? currentStep === 2 : currentStep === 3;

    if (isLastStep) {
      await handleSubmitAll(updatedData);
    } else {
      setCurrentStep((prev) => {
        const next = prev + 1;
        setMaxStepReached((max) => Math.max(max, next));
        return next;
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmitAll = async (finalData: PartnerSignupWizardFormData) => {
    if (!finalData.phone) {
      toast.error("Thiếu thông tin: Số điện thoại");
      return;
    }
    const hasCitizenCard =
      (finalData.citizenCard && finalData.citizenCard.length >= 2) ||
      profile?.hasCitizenCardImage;
    if (!hasCitizenCard) {
      toast.error("Vui lòng tải lên đủ ảnh CCCD (mặt trước và sau)");
      return;
    }
    const hasSelfie =
      (finalData.idWithSelfie && finalData.idWithSelfie.length >= 1) ||
      profile?.hasIdWithSelfieImage;
    if (!hasSelfie) {
      toast.error("Vui lòng tải lên ảnh selfie cầm CCCD (avatar)");
      return;
    }
    const hasCriminalRecord =
      (finalData.criminalRecord && finalData.criminalRecord.length >= 1) ||
      profile?.hasCriminalRecordImage;
    if (!hasCriminalRecord) {
      toast.error(
        "Vui lòng tải lên Lý lịch tư pháp hoặc Giấy xác nhận hạnh kiểm",
      );
      return;
    }

    try {
      const payload = new FormData();

      // ── Thông tin văn bản ────────────────────────────────────────
      payload.append("phone", finalData.phone ?? "");
      if (finalData.bio) payload.append("bio", finalData.bio);
      if (finalData.experience)
        payload.append("experience", finalData.experience);
      if (finalData.skills) payload.append("skills", finalData.skills);
      if (finalData.addressCurrent)
        payload.append("workingAddress", finalData.addressCurrent);

      // docType & docIdNumber — BE bắt buộc
      payload.append("docType", "CITIZEN_ID");
      if (finalData.docIdNumber)
        payload.append("docIdNumber", finalData.docIdNumber);

      if (finalData.bankBin) payload.append("bankBin", finalData.bankBin);
      if (finalData.bankName) payload.append("bankName", finalData.bankName);
      if (finalData.bankAccountNumber)
        payload.append("bankAccountNumber", finalData.bankAccountNumber);
      if (finalData.bankAccountName)
        payload.append("bankAccountName", finalData.bankAccountName);

      // ── Files ────────────────────────────────────────────────────
      if (finalData.idWithSelfie && finalData.idWithSelfie.length > 0) {
        payload.append("avatar", finalData.idWithSelfie[0]);
      }
      if (finalData.citizenCard && finalData.citizenCard.length >= 1) {
        payload.append("docFront", finalData.citizenCard[0]);
      }
      if (finalData.citizenCard && finalData.citizenCard.length >= 2) {
        payload.append("docBack", finalData.citizenCard[1]);
      }
      if (finalData.criminalRecord && finalData.criminalRecord.length > 0) {
        payload.append("criminalRecord", finalData.criminalRecord[0]);
      }
      if (
        finalData.healthCertificate &&
        finalData.healthCertificate.length > 0
      ) {
        payload.append("healthCertificate", finalData.healthCertificate[0]);
      }
      if (finalData.certificate && finalData.certificate.length > 0) {
        payload.append("certificate", finalData.certificate[0]);
      }

      await submitMutation.mutateAsync(payload);
      setCurrentStep(user ? 3 : 4);
    } catch {
      toast.error(
        "Gửi hồ sơ thất bại. Vui lòng kiểm tra thông tin và thử lại!",
      );
    }
  };

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
          <h1 className="mb-4 text-4xl font-bold text-primary md:text-5xl">
            Trở thành Đối tác CleanZ
          </h1>
          <p className="text-muted-foreground text-lg">
            {user
              ? `Xin chào ${user.fullName}! Hãy hoàn thiện hồ sơ để bắt đầu nhận việc.`
              : "Tạo tài khoản và hoàn thiện hồ sơ để tăng thu nhập cùng CleanZ."}
          </p>
        </div>

        {/* Chỉ hiển thị StepHeader nếu chưa phải bước cuối */}
        {currentStep < displaySteps.length - 1 && (
          <StepHeader
            currentStep={currentStep}
            steps={displaySteps}
            onStepClick={setCurrentStep}
            maxStepReached={maxStepReached}
          />
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
              {((currentStep === 1 && !user) ||
                (currentStep === 0 && user)) && (
                <StepPersonalInfo
                  initialValues={{
                    bio: formData.bio || profile?.bio || "",
                    experience:
                      formData.experience || profile?.experience || "",
                    phone: formData.phone || profile?.phone || "",
                    skills: formData.skills || profile?.skills || "",
                    addressResident:
                      formData.addressResident ||
                      profile?.addressResident ||
                      "",
                    addressCurrent:
                      formData.addressCurrent || profile?.addressCurrent || "",
                  }}
                  onNext={handleNext}
                  isSubmitting={false}
                />
              )}

              {/* Bước 3: Xác minh danh tính */}
              {((currentStep === 2 && !user) ||
                (currentStep === 1 && user)) && (
                <StepIdentityVerification
                  initialDocIdNumber={formData.docIdNumber || ""}
                  initialCitizenCardFiles={formData.citizenCard || []}
                  initialSelfieFiles={formData.idWithSelfie || []}
                  initialDocuments={[]}
                  onBack={handleBack}
                  onNext={handleNext}
                  isSubmitting={false}
                />
              )}

              {/* Bước 4: Pháp lý & Thanh toán */}
              {((currentStep === 3 && !user) ||
                (currentStep === 2 && user)) && (
                <StepLegalAndPayment
                  initialValues={{
                    bankBin: formData.bankBin || profile?.bankBin || "",
                    bankName: formData.bankName || profile?.bankName || "",
                    bankAccountNumber:
                      formData.bankAccountNumber ||
                      profile?.bankAccountNumber ||
                      "",
                    bankAccountName:
                      formData.bankAccountName ||
                      profile?.bankAccountName ||
                      "",
                  }}
                  initialCriminalRecord={formData.criminalRecord || []}
                  initialHealthCert={formData.healthCertificate || []}
                  initialCertificate={formData.certificate || []}
                  initialDocuments={[]}
                  onBack={handleBack}
                  onNext={handleNext}
                  isSubmitting={submitMutation.isPending}
                />
              )}

              {/* Bước 5: Hoàn tất */}
              {((currentStep === 4 && !user) ||
                (currentStep === 3 && user)) && <StepSuccess />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
