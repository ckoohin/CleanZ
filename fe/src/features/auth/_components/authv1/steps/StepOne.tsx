"use client";

import { useState } from 'react';
import { Mail, User } from 'lucide-react'; // Thêm User icon cho trực quan
import { type FormData } from '@/features/auth/_components/authv1/MultiStepForm';
import { SocialSignIn } from '@/features/auth/_components/authv1/SocialSignIn';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { signupStepOne } from "@/features/auth/schemas/signup.schema";
import { useZodValidation } from '@/features/auth/hooks/useZodValidation';
import { useRegisterContext } from '@/features/auth/context/register.context';

// interface StepOneProps {
//   formData: FormData;
//   updateFormData: (data: Partial<FormData>) => void;
//   onNext: () => void;
// }

export interface TErrorStepOne {
  username?: string;
  email?: string;
}

export function StepOne() {
  const { updateFormData, nextStep, formData } = useRegisterContext()
  const [error, setErrors] = useState<TErrorStepOne>({});

  const validate = useZodValidation(signupStepOne);
  
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
          Chào mừng bạn! Hãy bắt đầu bằng tên đăng nhập và email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Tên đăng nhập</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) => updateFormData({ username: e.target.value })}
              className="pl-10 bg-card border-border focus-visible:ring-primary"
              placeholder="ví dụ: ngoducduy"
              autoFocus
              aria-invalid={!!error.username}
            />
          </div>
          {error.username && (
            <p className="text-xs text-destructive font-medium">{error.username}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Địa chỉ Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              className="pl-10 bg-card border-border focus-visible:ring-primary"
              placeholder="duy.ngo@example.com"
              aria-invalid={!!error.email}
            />
          </div>
          {error.email && (
            <p className="text-xs text-destructive font-medium">{error.email}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:opacity-90 shadow-md transition-all active:scale-[0.98]"
          size="lg"
        >
          Tiếp tục
        </Button>
      </form>
      
    </div>
  );
}