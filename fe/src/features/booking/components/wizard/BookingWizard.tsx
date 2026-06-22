import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StepLocation } from "./StepLocation";
import { StepDateTime } from "./StepDateTime";
import { StepNotes } from "./StepNotes";
import { StepCheckout } from "./StepCheckout";
import { ServiceItem } from "@/features/services/types/service.type";
import type { PaymentMethod, BookingFormState } from "@/features/booking/types/booking.types";
import { PublicService } from "@/features/public/hooks/usePublicData";

interface BookingWizardProps {
  serviceId: string;
  serviceDetail?: PublicService | null; // We'll pass the fetched service info
}

const STEPS = [
  { id: "location", title: "Địa điểm" },
  { id: "datetime", title: "Thời gian" },
  { id: "notes", title: "Ghi chú" },
  { id: "checkout", title: "Thanh toán" },
];

export const BookingWizard: React.FC<BookingWizardProps> = ({ serviceId, serviceDetail }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<BookingFormState>({
    serviceId,
    addressId: "",
    address: "",
    provinceCode: "HN",
    scheduledDate: "",
    scheduledTime: "",
    note: "",
    paymentMethod: "CASH",
    voucherCode: "",
  });

  const updateForm = (data: Partial<BookingFormState>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));
  const goToStep = (step: number) => setCurrentStep(step);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepLocation formData={formData} updateForm={updateForm} onNext={nextStep} />;
      case 1:
        return <StepDateTime formData={formData} updateForm={updateForm} onNext={nextStep} onBack={prevStep} />;
      case 2:
        return <StepNotes formData={formData} updateForm={updateForm} onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <StepCheckout formData={formData} updateForm={updateForm} onBack={prevStep} serviceDetail={serviceDetail} onGoToStep={goToStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col min-h-screen md:min-h-[600px] bg-card rounded-none md:rounded-2xl border-0 md:border md:border-border/40 md:shadow-sm overflow-hidden">
      {/* Stepper Header - Apple Segmented Control Style */}
      <div className="bg-background px-4 py-4 md:px-12 md:py-6 border-b border-border/30">
        <div className="w-full max-w-4xl mx-auto bg-muted/40 p-1.5 rounded-xl md:rounded-2xl flex items-center justify-between gap-1 sm:gap-2 shadow-inner border border-border/10">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <button
                type="button"
                key={step.id}
                onClick={() => (isCompleted || isActive) && goToStep(index)}
                className={`flex-1 py-2 sm:py-3 px-1 rounded-lg md:rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 select-none text-[9px] md:text-xs font-bold uppercase tracking-wider
                  ${isActive ? "bg-gradient-to-br from-primary to-amber-500 text-white shadow-md shadow-primary/20 scale-[1.02] font-black active:scale-95 cursor-pointer" : 
                    isCompleted ? "bg-transparent text-foreground/80 hover:text-primary active:scale-95 cursor-pointer" : 
                    "bg-transparent text-foreground/60 border border-transparent cursor-not-allowed pointer-events-none"}
                `}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] md:text-xs font-extrabold border transition-all duration-300
                  ${isActive ? "bg-white/20 border-white/40 text-white" : 
                    isCompleted ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-400" : 
                    "bg-muted border-border/60 text-muted-foreground/90 font-bold"}
                `}>
                  {isCompleted ? (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : index + 1}
                </span>
                <span className="hidden min-[450px]:inline">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 p-4 py-8 md:p-12 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
