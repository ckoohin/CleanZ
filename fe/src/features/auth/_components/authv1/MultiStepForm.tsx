"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterContext } from "../../context/register.context";
import { signupSchema } from "../../schemas/signup.schema";
import type { FormData } from "../../types/form.type";
import { SocialSignIn } from "./SocialSignIn";

type FormErrors = Partial<Record<keyof FormData, string>>;

const passwordRequirements = [
  { label: "Ít nhất 8 ký tự", test: (value: string) => value.length >= 8 },
  { label: "Có chữ thường", test: (value: string) => /[a-z]/.test(value) },
  { label: "Có chữ hoa", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Có chữ số", test: (value: string) => /\d/.test(value) },
  { label: "Có ký tự @$!%*?&", test: (value: string) => /[@$!%*?&]/.test(value) },
];

export function MultiStepForm() {
  const { formData, updateFormData, onSubmit, isPending } = useRegisterContext();
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    updateFormData({ [key]: value } as Pick<FormData, K>);
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = signupSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0]]),
        ) as FormErrors,
      );
      return;
    }
    setErrors({});
    await onSubmit();
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="fullName">Họ và tên</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fullName"
              autoComplete="name"
              value={formData.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              className="bg-card pl-10"
              placeholder="Nguyễn Văn A"
              aria-invalid={Boolean(errors.fullName)}
              autoFocus
            />
          </div>
          {errors.fullName && <p className="text-xs font-medium text-destructive">{errors.fullName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="registerEmail">Địa chỉ email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="registerEmail"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(event) => updateField("email", event.target.value)}
              className="bg-card pl-10"
              placeholder="email@example.com"
              aria-invalid={Boolean(errors.email)}
            />
          </div>
          {errors.email && <p className="text-xs font-medium text-destructive">{errors.email}</p>}
        </div>

        {([
          ["password", "Mật khẩu", showPassword, setShowPassword, "new-password"],
          ["confirmPassword", "Xác nhận mật khẩu", showConfirmPassword, setShowConfirmPassword, "new-password"],
        ] as const).map(([key, label, visible, setVisible, autoComplete]) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={key}
                type={visible ? "text" : "password"}
                autoComplete={autoComplete}
                value={formData[key]}
                onChange={(event) => updateField(key, event.target.value)}
                onFocus={() => {
                  if (key === "password") setShowPasswordRequirements(true);
                }}
                onBlur={() => {
                  if (key === "password") setShowPasswordRequirements(false);
                }}
                className="bg-card pl-10 pr-10"
                placeholder={key === "password" ? "Nhập mật khẩu" : "Nhập lại mật khẩu"}
                aria-invalid={Boolean(errors[key])}
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {key === "password" && showPasswordRequirements && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-0 right-0 top-[calc(100%+8px)] z-30 grid grid-cols-1 gap-2 rounded-xl border border-primary/20 bg-popover p-3 text-popover-foreground shadow-lg sm:grid-cols-2 lg:left-[calc(100%+12px)] lg:right-auto lg:top-0 lg:w-64 lg:grid-cols-1"
                >
                  {passwordRequirements.map((requirement) => {
                    const met = requirement.test(formData.password);
                    return (
                      <div key={requirement.label} className="flex items-center gap-2 text-[11px]">
                        {met ? <CheckCircle2 className="size-3.5 text-primary" /> : <Circle className="size-3.5 text-muted-foreground/50" />}
                        <span className={met ? "font-medium text-foreground" : "text-muted-foreground"}>{requirement.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {errors[key] && <p className="text-xs font-medium text-destructive">{errors[key]}</p>}
          </div>
        ))}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-3 transition hover:border-border hover:bg-muted/40">
          <Checkbox
            className="mt-0.5"
            checked={formData.checkedTerms}
            onCheckedChange={(checked) => updateField("checkedTerms", checked === true)}
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            Tôi đồng ý với <Link href="/terms" className="font-semibold text-primary hover:underline">Điều khoản dịch vụ</Link> và <Link href="/privacy" className="font-semibold text-primary hover:underline">Chính sách bảo mật</Link>.
          </span>
        </label>
        {errors.checkedTerms && <p className="text-xs font-medium text-destructive">{errors.checkedTerms}</p>}

        <Button type="submit" size="lg" disabled={isPending} className="w-full shadow-lg active:scale-[0.98]">
          {isPending ? <><Loader2 className="size-4 animate-spin" /> Đang xử lý...</> : "Đăng ký tài khoản"}
        </Button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 text-muted-foreground">Hoặc đăng ký nhanh qua</span></div>
      </div>
      <SocialSignIn
        url_gg={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
        url_facebook={`${process.env.NEXT_PUBLIC_API_URL}/auth/facebook`}
        text_gg="Tạo tài khoản với Google"
        text_facebook="Tạo tài khoản với Facebook"
      />
    </div>
  );
}
