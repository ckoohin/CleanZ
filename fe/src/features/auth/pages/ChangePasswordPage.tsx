"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Lock, Loader2, Eye, EyeOff, XCircle, ShieldCheck, KeyRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import PasswordRequired from "@/features/auth/_components/PasswordRequired";
import {
  useAuth,
  useChangePassword,
  useLogout,
} from "@/features/auth/hooks/auth.hooks";
import { ROUTES } from "@/constants/routes";

// Khớp với ChangePasswordDto của backend: 8–32 ký tự, có hoa/thường/số/ký tự đặc biệt.
const changePasswordSchema = z
  .object({
    currentPassword: z.string().trim().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .trim()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .max(32, "Mật khẩu không vượt quá 32 ký tự")
      .regex(/[a-z]/, "Mật khẩu phải có ít nhất 1 chữ thường")
      .regex(/[A-Z]/, "Mật khẩu phải có ít nhất 1 chữ hoa")
      .regex(/\d/, "Mật khẩu phải có ít nhất 1 chữ số")
      .regex(/[@$!%*?&]/, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt (@$!%*?&)"),
    confirmPassword: z.string().trim().min(1, "Vui lòng xác nhận mật khẩu"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: user, isLoading } = useAuth();
  const changePassword = useChangePassword();
  const logout = useLogout();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    mode: "onChange",
  });

  // Chưa đăng nhập → về trang đăng nhập (không thể đổi mật khẩu khi chưa có phiên).
  useEffect(() => {
    if (!isLoading && !user) router.replace(ROUTES.AUTH.LOGIN);
  }, [isLoading, user, router]);

  const onSubmit = (values: ChangePasswordValues) => {
    changePassword.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
    });
  };

  const isForced = !!user?.mustChangePassword;
  const submitting = changePassword.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-5">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#0D47A1]/8 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-sm md:max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="h-1 bg-primary" />

          <div className="p-7 space-y-6">
            {/* Header brand */}
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">K</span>
                </div>
                <span className="text-xs font-semibold text-foreground">CleanZ</span>
              </div>
            </div>

            {/* Icon + Title */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-foreground">
                  {isForced ? "Đổi mật khẩu lần đầu" : "Đổi mật khẩu"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isForced
                    ? "Vì lý do bảo mật, bạn cần đặt mật khẩu mới trước khi tiếp tục."
                    : "Cập nhật mật khẩu cho tài khoản của bạn."}
                </p>
                {user?.email && (
                  <p className="text-xs font-semibold text-foreground/80">{user.email}</p>
                )}
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Current password */}
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">
                        {isForced ? "Mật khẩu tạm (trong email)" : "Mật khẩu hiện tại"}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showCurrent ? "text" : "password"}
                            placeholder="••••••••"
                            autoFocus
                            disabled={submitting}
                            className="pl-10 pr-10 bg-background border-border focus-visible:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrent((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

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
                            disabled={submitting}
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
                      <PasswordRequired password={form.watch("newPassword")} />
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
                            disabled={submitting}
                            className={cn(
                              "pl-10 pr-10 bg-background border-border focus-visible:ring-primary",
                              form.formState.errors.confirmPassword &&
                                "border-destructive focus-visible:ring-destructive/30",
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

                <Button
                  type="submit"
                  disabled={!form.formState.isValid || submitting}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl h-11 gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Đổi mật khẩu
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Đăng xuất
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">© 2025 CleanZ</p>
      </motion.div>
    </div>
  );
}
