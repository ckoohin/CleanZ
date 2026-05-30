"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Lock, ArrowLeft, CheckCircle2, Loader2, Eye, EyeOff, XCircle, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useResetPassword } from "@/features/auth/hooks/auth.hooks";
import PasswordRequired from "@/features/auth/_components/PasswordRequired";

const PASSWORD_RULES = [
  { label: "Ít nhất 8 ký tự", test: (p: string) => p.length >= 8 },
  { label: "Có chữ hoa", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Có chữ số", test: (p: string) => /\d/.test(p) },
  { label: "Có ký tự đặc biệt", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .trim()
      .min(1, "Mật khẩu không được để trống")
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa")
      .regex(/\d/, "Mật khẩu phải có ít nhất 1 chữ số")
      .regex(/[^A-Za-z0-9]/, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt"),
    confirmPassword: z
      .string()
      .trim()
      .min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
type SubmitStatus = "idle" | "loading" | "success" | "error";


export default function ResetPasswordPage() {
  const resetPassword = useResetPassword();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [apiError, setApiError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  const newPasswordValue = form.watch("newPassword");
  const confirmPasswordValue = form.watch("confirmPassword");
  const passedRules = PASSWORD_RULES.filter((r) => r.test(newPasswordValue));

  useEffect(() => {
    if (submitStatus !== "success") return;
    const t = setTimeout(() => router.replace("/login"), 3000);
    return () => clearTimeout(t);
  }, [submitStatus, router]);

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) return;
    setSubmitStatus("loading");
    setApiError("");

    try {
      const res = await resetPassword.mutateAsync({
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });

      setSubmitStatus("success");
    } catch {
      setSubmitStatus("error");
      setApiError("Có lỗi xảy ra, vui lòng thử lại.");
    }
  };


  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5 ">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm w-full sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
            <div className="h-1 bg-destructive" />
            <div className="p-7 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground">Link không hợp lệ</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Link đặt lại mật khẩu đã hết hạn hoặc không tồn tại.
                </p>
              </div>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-11" asChild>
                <Link href="/forgot-password">Yêu cầu link mới</Link>
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">© 2025 King Of Service</p>
        </motion.div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#0D47A1]/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

          <div className="h-1 bg-primary" />

          <div className="p-7 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Đăng nhập
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">K</span>
                </div>
                <span className="text-xs font-semibold text-foreground">King Of Service</span>
              </div>
            </div>

            {/* Icon + Title */}
            <div className="flex flex-col items-center text-center gap-3">
              <AnimatePresence mode="wait">
                {submitStatus === "success" ? (
                  <motion.div
                    key="s-icon"
                    className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="i-icon"
                    className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <ShieldCheck className="w-7 h-7 text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {submitStatus === "success" ? (
                  <motion.div key="s-title" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                    <p className="text-base font-bold text-foreground">Đổi mật khẩu thành công!</p>
                    <p className="text-xs text-muted-foreground">Đang chuyển về trang đăng nhập...</p>
                  </motion.div>
                ) : (
                  <motion.div key="i-title" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                    <p className="text-base font-bold text-foreground">Đặt lại mật khẩu</p>
                    <p className="text-xs text-muted-foreground">Tạo mật khẩu mới cho tài khoản của bạn.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {submitStatus === "success" ? (

                <motion.div
                  key="success-content"
                  className="space-y-3 w-full"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="space-y-1.5">
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 3, ease: "linear" }}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      Tự động chuyển hướng sau 3 giây
                    </p>
                  </div>
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-11"
                    onClick={() => router.replace("/login")}
                  >
                    Đăng nhập ngay
                  </Button>
                </motion.div>

              ) : (

                <motion.div
                  key="form-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                      {/* New password */}
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-medium">Mật khẩu mới</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  type={showNew ? "text" : "password"}
                                  placeholder="••••••••"
                                  autoFocus
                                  disabled={submitStatus === "loading"}
                                  className="pl-10 pr-10 bg-background border-border focus-visible:ring-primary"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNew((v) => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </FormControl>

                            {/* Strength indicator */}
                            {/* <AnimatePresence>
                              {newPasswordValue.length > 0 && (
                                <motion.div
                                  className="space-y-2"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <div className="flex gap-1">
                                    {PASSWORD_RULES.map((_, i) => (
                                      <div
                                        key={i}
                                        className={cn(
                                          "flex-1 h-1 rounded-full transition-colors duration-300",
                                          i < passedRules.length
                                            ? passedRules.length === 1 ? "bg-destructive"
                                              : passedRules.length === 2 ? "bg-amber-400"
                                              : passedRules.length === 3 ? "bg-yellow-400"
                                              : "bg-emerald-500"
                                            : "bg-muted"
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {PASSWORD_RULES.map((rule) => {
                                      const passed = rule.test(newPasswordValue);
                                      return (
                                        <div key={rule.label} className="flex items-center gap-1.5">
                                          <div className={cn(
                                            "w-3 h-3 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200",
                                            passed ? "bg-emerald-500" : "bg-muted"
                                          )}>
                                            {passed && (
                                              <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                                                <path d="M1 3L2.5 4.5L5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            )}
                                          </div>
                                          <span className={cn(
                                            "text-[10px] transition-colors duration-200",
                                            passed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                                          )}>
                                            {rule.label}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence> */}
                            <PasswordRequired
                              password={form.watch("newPassword")}
                            />

                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Confirm password */}
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-medium">Xác nhận mật khẩu</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  type={showConfirm ? "text" : "password"}
                                  placeholder="••••••••"
                                  disabled={submitStatus === "loading"}
                                  className={cn(
                                    "pl-10 pr-10 bg-background border-border focus-visible:ring-primary",
                                    confirmPasswordValue.length > 0 && form.formState.errors.confirmPassword
                                    && "border-destructive focus-visible:ring-destructive/30",
                                    confirmPasswordValue.length > 0
                                    && !form.formState.errors.confirmPassword
                                    && confirmPasswordValue === newPasswordValue
                                    && "border-emerald-500 focus-visible:ring-emerald-500/30"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirm((v) => !v)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* API Error */}
                      <AnimatePresence>
                        {apiError && (
                          <motion.div
                            className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-xl px-3 py-2.5 text-xs font-medium"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                          >
                            <XCircle className="w-4 h-4 shrink-0" />
                            {apiError}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit */}
                      <Button
                        type="submit"
                        disabled={!form.formState.isValid || submitStatus === "loading"}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-11 gap-2"
                      >
                        {submitStatus === "loading" ? (
                          <><Loader2 className="w-4 h-4 animate-spin" />Đang xử lý...</>
                        ) : (
                          <><ShieldCheck className="w-4 h-4" />Đổi mật khẩu</>
                        )}
                      </Button>

                    </form>
                  </Form>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          © 2025 King Of Service
        </p>
      </motion.div>
    </div>
  );
}
