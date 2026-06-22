"use client";

import React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/features/booking/types/booking.types";

export interface StepperStep {
  id: BookingStatus;
  label: string;
  description?: string;
}

const STEPS: StepperStep[] = [
  { id: "CONFIRMED", label: "Đã xác nhận", description: "Chuẩn bị di chuyển" },
  { id: "TASKER_ON_THE_WAY", label: "Đang di chuyển", description: "Đang tới chỗ khách" },
  { id: "CHECKED_IN", label: "Đã đến nơi", description: "Sẵn sàng làm việc" },
  { id: "IN_PROGRESS", label: "Đang làm việc", description: "Đang thực hiện dịch vụ" },
  { id: "COMPLETED", label: "Hoàn thành", description: "Đã hoàn thành công việc" },
];

interface BookingStatusStepperProps {
  currentStatus: BookingStatus;
}

export function BookingStatusStepper({ currentStatus }: BookingStatusStepperProps) {
  // Tìm index của step hiện tại
  let currentIdx = STEPS.findIndex((s) => s.id === currentStatus);
  
  // Nếu status không nằm trong luồng chính (như PENDING_PAYMENT, POSTED, CANCELLED...)
  // thì mặc định không active step nào hoặc xử lý riêng.
  if (currentIdx === -1) {
    if (currentStatus === "COMPLETED") currentIdx = STEPS.length - 1;
    else currentIdx = 0; // Fallback
  }

  return (
    <div className="relative pl-4 space-y-6">
      {/* Đường gạch nối dọc (Track) */}
      <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-border rounded-full" />
      
      {/* Đường gạch nối dọc đã complete (Progress) */}
      <div
        className="absolute left-[27px] top-4 w-0.5 bg-primary rounded-full transition-all duration-500"
        style={{
          height: `calc(${(currentIdx / (STEPS.length - 1)) * 100}% - 32px)`,
        }}
      />

      {STEPS.map((step, index) => {
        const isCompleted = index < currentIdx;
        const isActive = index === currentIdx;
        const isPending = index > currentIdx;

        return (
          <div key={step.id} className="relative flex items-start gap-4">
            {/* Step Icon */}
            <div
              className={cn(
                "relative z-10 flex w-7 h-7 items-center justify-center rounded-full border-2 transition-colors duration-300",
                isCompleted
                  ? "bg-primary border-primary text-primary-foreground"
                  : isActive
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-background border-border text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              ) : isActive ? (
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
              ) : (
                <Circle className="w-3.5 h-3.5" />
              )}
            </div>

            {/* Step Info */}
            <div className="flex-1 pb-1">
              <p
                className={cn(
                  "font-bold text-sm transition-colors",
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
