"use client";

import { useState } from 'react';
import { User, UserCircle, Calendar } from 'lucide-react';
import { type FormData } from '@/features/auth/_components/authv1/MultiStepForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { signupStepTowSchema } from '@/features/auth/schemas/signup.schema';
import { useZodValidation } from '@/features/auth/hooks/useZodValidation';
import { useRegisterContext } from '@/features/auth/context/register.context';

// interface StepTwoProps {
//   formData: FormData;
//   updateFormData: (data: Partial<FormData>) => void;
//   onNext: () => void;
// }

export interface TErrorStepTwo {
  lastName?: string;
  firstName?: string;
  dateOfBirth?: string;
}

export function StepTwo() {
  const { formData, updateFormData, nextStep } = useRegisterContext()
  const [errors, setErrors] = useState<TErrorStepTwo>({});
  const validate = useZodValidation(signupStepTowSchema);

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
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => {
                updateFormData({ dateOfBirth: e.target.value });
                setErrors((prev) => ({ ...prev, dateOfBirth: undefined }));
              }}
              className="pl-10 bg-card border-border focus-visible:ring-primary appearance-none"
              aria-invalid={!!errors.dateOfBirth}
            />
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