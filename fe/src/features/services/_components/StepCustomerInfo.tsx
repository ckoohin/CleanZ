// src/features/services/_components/StepCustomerInfo.tsx

import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import type { BookingPayload } from "@/lib/api/booking";

interface StepCustomerInfoProps {
  onNext: (data: Partial<BookingPayload>) => void;
  onBack: () => void;
}

// Zod schema matching the new Backend DTO
const schema = z.object({
  locationType: z.enum(["home", "at_shop"]),
  address: z.string().min(1, { message: "Địa chỉ không được để trống" }),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ (YYYY-MM-DD)"),
  bookingTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Giờ không hợp lệ (HH:mm)"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export const StepCustomerInfo: React.FC<StepCustomerInfoProps> = ({ onNext, onBack }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      locationType: "home",
      address: "",
      bookingDate: format(new Date(), "yyyy-MM-dd"), // default today
      bookingTime: "09:00", // default time
      notes: "",
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    onNext({
      locationType: data.locationType,
      address: data.address,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      notes: data.notes?.trim() ?? "",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6 flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-foreground">Thông tin đặt lịch</h3>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Nơi phục vụ</label>
          <select 
            {...register("locationType")}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="home">Tại nhà khách hàng</option>
            <option value="at_shop">Tại trung tâm CleanZ</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Địa chỉ chi tiết</label>
          <Input
            {...register("address")}
            placeholder="123 Nguyễn Huệ, Quận 1..."
            className={errors.address ? "border-destructive" : undefined}
          />
          {errors.address && (
            <p className="text-sm text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ngày thực hiện</label>
            <Input
              type="date"
              {...register("bookingDate")}
              className={errors.bookingDate ? "border-destructive" : undefined}
            />
            {errors.bookingDate && (
              <p className="text-sm text-destructive">{errors.bookingDate.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Giờ thực hiện</label>
            <Input
              type="time"
              {...register("bookingTime")}
              className={errors.bookingTime ? "border-destructive" : undefined}
            />
            {errors.bookingTime && (
              <p className="text-sm text-destructive">{errors.bookingTime.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-2">
          <label className="text-sm font-medium">Ghi chú (tuỳ chọn)</label>
          <Input {...register("notes")} placeholder="Lưu ý cho Tasker..." />
        </div>

        <div className="flex justify-between mt-4 gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Trở lại
          </Button>
          <Button onClick={handleSubmit(onSubmit)} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
            Xác nhận
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

