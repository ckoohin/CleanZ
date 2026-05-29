import React from "react";
import { Check, User, Briefcase, ShieldCheck, FileText, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepHeaderProps {
  currentStep: number;
  steps: { title: string; description: string }[];
  onStepClick?: (stepIndex: number) => void;
  maxStepReached?: number;
}

const STEP_ICONS = [
  User,          // Step 0: Cá nhân
  Briefcase,     // Step 1: Dịch vụ
  ShieldCheck,   // Step 2: Xác minh
  FileText,      // Step 3: Pháp lý & Thanh toán
  CheckCircle2,  // Step 4: Hoàn tất
];

export const StepHeader: React.FC<StepHeaderProps> = ({ 
  currentStep, 
  steps,
  onStepClick,
  maxStepReached = 0
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-6 md:mb-10">
      <div className="relative flex justify-between items-center px-1 md:px-2">
        
        {/* PROGRESS LINE BACKGROUND */}
        <div className="absolute top-5 md:top-6 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -z-10 rounded-full mx-4 md:mx-6" />
        
        {/* ACTIVE PROGRESS LINE (GRADIENT TRƯỢT MƯỢT MÀ) */}
        <div 
          className="absolute top-5 md:top-6 left-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-primary/60 transition-all duration-500 ease-in-out -z-10 rounded-full mx-4 md:mx-6" 
          style={{ width: `${(Math.min(currentStep, steps.length - 1) / (steps.length - 1)) * 92}%` }}
        />

        {steps.map((step, index) => {
          const IconComponent = STEP_ICONS[index] || User;
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isUnlocked = index <= maxStepReached;
          const isLocked = !isUnlocked && index > currentStep;

          return (
            <div 
              key={index} 
              className={cn(
                "flex flex-col items-center group relative",
                isUnlocked && index !== currentStep ? "cursor-pointer" : "cursor-default"
              )}
              onClick={() => {
                if (isUnlocked && onStepClick && index !== currentStep) {
                  onStepClick(index);
                }
              }}
            >
              {/* STEP ICON / BADGE WITH DUAL-GLOW EFFECT */}
              <div
                className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 relative",
                  
                  // Đã hoàn thành (Màu xanh ngọc Emerald)
                  isCompleted && "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:scale-105",
                  
                  // Đang hoạt động (Màu cam ấm Dual-Glow rực rỡ)
                  isActive && "bg-primary border-primary text-white ring-4 ring-primary/20 shadow-[0_0_20px_rgba(253,126,20,0.5)] scale-110",
                  
                  // Đã qua nhưng quay lại sửa (Màu trắng viền cam nhạt, clickable)
                  isUnlocked && !isActive && !isCompleted && "bg-background border-primary/60 text-primary hover:bg-primary/5 hover:border-primary shadow-md group-hover:scale-105",
                  
                  // Bị khóa (Màu xám mờ)
                  isLocked && "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
                )}
              >
                {/* Hiệu ứng bóng phát sáng viền siêu mỏng cho active step */}
                {isActive && (
                  <span className="absolute inset-0 rounded-full border border-white/30 animate-pulse" />
                )}

                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[3px] animate-in zoom-in duration-300" />
                ) : isLocked ? (
                  <Lock className="w-4 h-4 opacity-70" />
                ) : (
                  <IconComponent className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                )}
              </div>

              {/* STEP LABEL (RESPONSIVE TEXT) */}
              <div className="mt-4 text-center hidden md:block max-w-[120px]">
                <p className={cn(
                  "text-xs font-black tracking-wide uppercase transition-colors duration-300",
                  isActive && "text-primary font-black",
                  isCompleted && "text-emerald-600 dark:text-emerald-500 font-bold",
                  isUnlocked && !isActive && !isCompleted && "text-slate-700 dark:text-slate-300 hover:text-primary",
                  isLocked && "text-slate-400"
                )}>
                  {step.title}
                </p>
                <p className={cn(
                  "text-[10px] leading-tight mt-1 transition-colors duration-300",
                  isActive ? "text-slate-600 dark:text-slate-300 font-medium" : "text-slate-400 dark:text-slate-500"
                )}>
                  {step.description}
                </p>
              </div>

              {/* Tooltip hiển thị trên Mobile khi hover */}
              <div className="absolute top-14 bg-slate-950 text-white text-[10px] px-2 py-1 rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-50 md:hidden shadow-lg border border-white/10">
                {step.title} {isLocked && " (Bị khóa)"}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

