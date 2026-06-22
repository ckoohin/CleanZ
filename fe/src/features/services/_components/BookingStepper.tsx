// src/features/services/_components/BookingStepper.tsx

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ServiceItem } from "@/features/services/types/service.type"; // corrected type
import { StepSelectService } from "./StepSelectService";
import { StepCustomerInfo } from "./StepCustomerInfo";
import { StepConfirmation } from "./StepConfirmation";
import { createBooking, BookingPayload } from "@/lib/api/booking";
import { useRouter } from "next/navigation";

interface BookingStepperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceItem | null;
}

export const BookingStepper: React.FC<BookingStepperProps> = ({ open, onOpenChange, service }) => {
  const [step, setStep] = useState(0);
  const [bookingData, setBookingData] = useState<BookingPayload>({
    serviceId: "",
    locationType: "home",
    address: "",
    bookingDate: "",
    bookingTime: "",
  });

  const { toast } = useToast();
  const router = useRouter();

  const handleNext = (data?: Partial<BookingPayload>) => {
    if (step === 0 && service) {
      onOpenChange(false);
      router.push(`/booking/${service.id}`);
      return;
    }
    if (data) {
      setBookingData((prev) => ({ ...prev, ...data }));
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    try {
      const res = await createBooking(bookingData);
      toast({
        title: "Đặt lịch thành công",
        description: `Mã đặt: ${res.bookingId}`,
        variant: "default",
      });
      // reset state & close
      setStep(0);
      onOpenChange(false);
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        toast({
          title: "Lỗi đặt lịch",
          description: err.message || "Không thể đặt lịch",
          variant: "destructive",
        });
      }
  };

  // Khi mở, khởi tạo serviceId
  React.useEffect(() => {
    if (open && service) {
      setBookingData((prev) => ({ ...prev, serviceId: String(service.id) }));
    }
  }, [open, service]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg sm:w-full">
        <DialogHeader>
          <DialogTitle>Đặt dịch vụ</DialogTitle>
          <DialogDescription>Vui lòng điền thông tin để hoàn tất đặt lịch</DialogDescription>
        </DialogHeader>
        {step === 0 && service && (
          <StepSelectService service={service} onNext={() => handleNext()} onClose={() => onOpenChange(false)} />
        )}
        {step === 1 && (
          <StepCustomerInfo onNext={(data) => handleNext(data)} onBack={handleBack} />
        )}
        {step === 2 && (
          <StepConfirmation data={bookingData} onBack={handleBack} onConfirm={handleSubmit} />
        )}
        <DialogFooter className="hidden" /> {/* Footer not used, steps render own buttons */}
      </DialogContent>
    </Dialog>
  );
};
