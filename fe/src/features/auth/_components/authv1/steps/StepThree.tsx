/* eslint-disable react-hooks/immutability */
"use client";

import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { type FormData } from '@/features/auth/_components/authv1/MultiStepForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useZodValidation } from '@/features/auth/hooks/useZodValidation';
import { signupStepThree } from '@/features/auth/schemas/signup.schema';
import { useRegisterContext } from '@/features/auth/context/register.context';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// interface StepThreeProps {
//   formData: FormData;
//   updateFormData: (data: Partial<FormData>) => void;
//   onSubmit: () => void;
// }

export interface SignupStepThreeProps {
  password?: string;
  confirmPassword?: string;
  checkedTerms?: string;
}

export function StepThree() {
  const { isPending, formData, updateFormData, onSubmit } = useRegisterContext()
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setErrors] = useState<SignupStepThreeProps>({});

  const passwordRequirements = [
    { label: 'Ít nhất 8 ký tự', test: (pw: string) => pw.length >= 8 },
    { label: 'Chứa ít nhất một chữ số', test: (pw: string) => /\d/.test(pw) },
    { label: 'Chứa ít nhất một chữ cái viết hoa', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'Chứa ít nhất một ký tự đặc biệt', test: (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
  ];

  const validate = useZodValidation(signupStepThree);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { success, errors } = validate(formData);

    if (!success) {
      setErrors({ ...errors });
      return;
    }

    if (!formData.confirmPassword) {
      setErrors({ confirmPassword: 'Vui lòng xác nhận mật khẩu của bạn.' });
      return;
    } else if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (!formData.checkedTerms) {
      setErrors({ checkedTerms: 'Vui lòng đồng ý với điều khoản và chính sách bảo mật.' });
      toast.error("Vui lòng đồng ý với điều khoản và chính sách bảo mật.")
      return;
    }

    setErrors({});
    onSubmit();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Thiết lập mật khẩu bảo mật để bảo vệ tài khoản của bạn.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mật khẩu */}
        <div className="space-y-2">
          <Label htmlFor="password">Mật khẩu</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => {
                updateFormData({ password: e.target.value });
                setErrors(prev => ({ ...prev, password: undefined }));
              }}
              className="pl-10 pr-10 bg-card border-border focus-visible:ring-primary"
              placeholder="Nhập mật khẩu"
              autoFocus
              aria-invalid={!!error.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error.password && (
            <p className="text-xs text-destructive font-medium">{error.password}</p>
          )}

          {/* Yêu cầu mật khẩu */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-secondary/30 p-3 rounded-lg border border-border/50">
            {passwordRequirements.map((req, index) => {
              const isMet = formData.password && req.test(formData.password);
              return (
                <div key={index} className="flex items-center gap-2 text-[11px]">
                  {isMet ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-muted-foreground/30" />
                  )}
                  <span className={isMet ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Xác nhận mật khẩu */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => {
                updateFormData({ confirmPassword: e.target.value });
                setErrors(prev => ({ ...prev, confirmPassword: undefined }));
              }}
              className="pl-10 pr-10 bg-card border-border focus-visible:ring-primary"
              placeholder="Nhập lại mật khẩu"
              aria-invalid={!!error.confirmPassword}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error.confirmPassword && (
            <p className="text-xs text-destructive font-medium">{error.confirmPassword}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:opacity-90 shadow-lg transition-all active:scale-[0.98] mt-4"
          size="lg"
        >
          {
            isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </>
            ) : "Hoàn tất đăng ký"
          }
        </Button>
        <div className="flex flex-col gap-2">

          {error.checkedTerms && (
            <p className="text-xs text-destructive font-medium ml-2">
              {error.checkedTerms}
            </p>
          )}

          <label className="flex items-start gap-3 p-3 rounded-xl 
            border border-transparent hover:border-border 
            hover:bg-muted/40 transition cursor-pointer"
          >
            <Checkbox
              className="mt-1"
              checked={formData.checkedTerms}
              onCheckedChange={(checked: boolean) => {
                updateFormData({ checkedTerms: checked });
                setErrors(prev => ({ ...prev, checkedTerms: undefined }));
              }}
            />

            <span className="text-xs text-muted-foreground leading-relaxed">
              Bằng việc nhấn đăng ký, bạn đồng ý với{" "}
              <a
                href="#"
                className="text-primary font-semibold hover:underline underline-offset-4"
              >
                Điều khoản dịch vụ
              </a>{" "}
              và{" "}
              <a
                href="#"
                className="text-primary font-semibold hover:underline underline-offset-4"
              >
                Chính sách bảo mật
              </a>{" "}
              của chúng tôi.
            </span>
          </label>
        </div>
      </form>

    </div>
  );
}