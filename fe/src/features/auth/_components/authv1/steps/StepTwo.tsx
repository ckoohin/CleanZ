"use client";

import { useState, useEffect } from 'react';
import { User, UserCircle, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { signupStepTowSchema } from '@/features/auth/schemas/signup.schema';
import { useZodValidation } from '@/features/auth/hooks/useZodValidation';
import { useRegisterContext } from '@/features/auth/context/register.context';
import { TErrorStepTwo } from '@/features/auth/types/step.type';
import { format, parse } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUi } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// interface StepTwoProps {
//   formData: FormData;
//   updateFormData: (data: Partial<FormData>) => void;
//   onNext: () => void;
// }

export function StepTwo() {
  const { formData, updateFormData, nextStep } = useRegisterContext()
  const [errors, setErrors] = useState<TErrorStepTwo>({});
  const validate = useZodValidation(signupStepTowSchema);

  const [dateInput, setDateInput] = useState("");

  // Đồng bộ giá trị input khi formData.dateOfBirth thay đổi (do pick lịch)
  useEffect(() => {
    if (formData.dateOfBirth) {
      setDateInput(format(new Date(formData.dateOfBirth), "dd/MM/yyyy"));
    } else {
      setDateInput("");
    }
  }, [formData.dateOfBirth]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, ""); // Chỉ cho phép số
    
    // Auto format dd/MM/yyyy
    if (value.length > 2 && value.length <= 4) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    } else if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4, 8)}`;
    }
    
    setDateInput(value);

    // Validate và update formData nếu đủ 10 ký tự
    if (value.length === 10) {
      const parsedDate = parse(value, "dd/MM/yyyy", new Date());
      // Kiểm tra hợp lệ
      if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900 && parsedDate <= new Date()) {
        updateFormData({ dateOfBirth: format(parsedDate, "yyyy-MM-dd") });
        setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
      }
    } else if (value.length === 0) {
      updateFormData({ dateOfBirth: "" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { success, errors } = validate(formData);
    if (!success) {
      setErrors(errors);
      return;
    }
    setErrors({});
    nextStep();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Hãy cho chúng mình biết một chút thông tin về bạn nhé.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Họ và tên đệm */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Họ và tên đệm</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => {
                  updateFormData({ lastName: e.target.value });
                  setErrors((prev) => ({ ...prev, lastName: undefined }));
                }}
                className="pl-10 bg-card border-border focus-visible:ring-primary"
                placeholder="Ngô Đức"
                autoFocus
                aria-invalid={!!errors.lastName}
              />
            </div>
            {errors.lastName && (
              <p className="text-xs text-destructive font-medium">{errors.lastName}</p>
            )}
          </div>

          {/* Tên */}
          <div className="space-y-2">
            <Label htmlFor="firstName">Tên</Label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => {
                  updateFormData({ firstName: e.target.value });
                  setErrors((prev) => ({ ...prev, firstName: undefined }));
                }}
                className="pl-10 bg-card border-border focus-visible:ring-primary"
                placeholder="Duy"
                aria-invalid={!!errors.firstName}
              />
            </div>
            {errors.firstName && (
              <p className="text-xs text-destructive font-medium">{errors.firstName}</p>
            )}
          </div>
        </div>

        {/* Ngày sinh */}
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Ngày tháng năm sinh</Label>
          <div className="flex gap-2">
            <Input
              id="dateOfBirth"
              type="text"
              placeholder="dd/mm/yyyy"
              value={dateInput}
              onChange={handleDateChange}
              className={cn(
                "h-10 bg-card border-border rounded-md",
                !!errors.dateOfBirth && "border-destructive text-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={!!errors.dateOfBirth}
              maxLength={10}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 w-10 p-0 shrink-0 border-border bg-card rounded-md hover:bg-accent" type="button">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarUi
                  mode="single"
                  defaultMonth={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date(2000, 0)}
                  selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      updateFormData({ dateOfBirth: format(date, "yyyy-MM-dd") });
                      setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
                    }
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {errors.dateOfBirth && (
            <p className="text-xs text-destructive font-medium">{errors.dateOfBirth}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:opacity-90 shadow-md transition-all active:scale-[0.98] mt-2"
          size="lg"
        >
          Tiếp tục
        </Button>
      </form>
    </div>
  );
}