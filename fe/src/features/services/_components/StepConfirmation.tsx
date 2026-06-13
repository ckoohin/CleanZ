// src/features/services/_components/StepConfirmation.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookingPayload } from "@/lib/api/booking";
import { ServiceItem } from "@/features/services/types/service.type";

interface StepConfirmationProps {
  data: BookingPayload;
  onBack: () => void;
  onConfirm: () => void;
}

export const StepConfirmation: React.FC<StepConfirmationProps> = ({ data, onBack, onConfirm }) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-foreground">Xác nhận đặt lịch</h3>
        <div className="space-y-2">
          <p className="text-sm"><strong>Dịch vụ ID:</strong> {data.serviceId}</p>
          <p className="text-sm"><strong>Nơi phục vụ:</strong> {data.locationType === 'home' ? 'Tại nhà khách hàng' : 'Tại trung tâm CleanZ'}</p>
          <p className="text-sm"><strong>Địa chỉ:</strong> {data.address}</p>
          <p className="text-sm"><strong>Ngày giờ:</strong> {data.bookingTime} - {data.bookingDate}</p>
          {data.notes && (
            <p className="text-sm"><strong>Ghi chú:</strong> {data.notes}</p>
          )}
        </div>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={onBack} className="flex-1 mr-2">
            Trở lại
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
            Xác nhận
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
