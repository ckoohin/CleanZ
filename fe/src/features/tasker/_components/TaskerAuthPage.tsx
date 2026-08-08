"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Lock, Eye, EyeOff, Mail, Loader2,
  UserPlus, LogIn, HelpCircle, ArrowLeft, ChevronDown, ArrowRight, Phone
} from "lucide-react";
import LogoApp from "@/components/logo/LogoApp";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useLogin, getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/features/auth/services/auth.service";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { getApiBaseUrl } from "@/lib/api/base-url";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().regex(/(84|0[3|5|7|8|9])+([0-9]{8})\b/, "Số điện thoại không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

interface TaskerAuthPageProps {
  forceTab?: "login" | "register";
}

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80", // Nhân viên lau dọn chuyên nghiệp
  "https://images.unsplash.com/photo-1584820927498-cafe8c12a87d?auto=format&fit=crop&w=1200&q=80", // Dụng cụ vệ sinh
  "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=1200&q=80"  // Cận cảnh lau chùi bề mặt
];

export function TaskerAuthPage({ forceTab }: TaskerAuthPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">(forceTab || "login");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(false);

  // Background Image Slider State
  const [bgIndex, setBgIndex] = useState(0);

  // State quản lý việc hiển thị Form nhập Email & Password trên Mobile (Bottom Sheet)
  const [showEmailFormMobile, setShowEmailFormMobile] = useState<boolean>(() => {
      if (typeof window !== 'undefined') {
          return window.innerWidth < 1024;
      }
      return false;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Hiển thị toast khi vừa verify email xong hoặc có lỗi
  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Đã xác thực email thành công! Vui lòng đăng nhập để tiếp tục.", { duration: 5000 });
      // Xóa params
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      window.history.replaceState({}, '', url);
    }
    
    if (searchParams.get("error") === "UnauthorizedRole") {
      toast.error("Tài khoản của bạn không có quyền truy cập vào cổng Đối tác");
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);

  // Login form
  const desktopLoginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const mobileLoginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  // Applicants remain CUSTOMER until KYC approval. Approved profiles are
  // redirected from onboarding to the Tasker dashboard after token refresh.
  const login = useLogin("/become-partner/signup");

  // Register form
  const desktopRegisterForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });
  const mobileRegisterForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });
  const apiBaseUrl = getApiBaseUrl();

  const handleLogin = (values: LoginValues) => {
    login.mutate({ email: values.email, password: values.password });
  };

  const handleRegister = async (values: RegisterValues) => {
    setIsAutoLogging(true);
    try {
      await authApi.register({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        // Backend treats this as onboarding intent only and still creates a
        // CUSTOMER account until the KYC application is approved.
        role: "TASKER",
      });
      toast.success("Tạo tài khoản thành công! Vui lòng kiểm tra email để xác thực.");
      router.push(
        `/verify-email-notice?email=${encodeURIComponent(values.email)}`
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsAutoLogging(false);
    }
  };

  const handleSocialClick = (platform: "google" | "apple") => {
    if (platform === "google") {
      window.location.href = `${apiBaseUrl}/auth/google?state=tasker`;
    } else {
      toast.info("Đăng nhập bằng Apple ID đang được tích hợp và sẽ sớm ra mắt!");
    }
  };

  const isLoadingRegister = isAutoLogging;

  // Hàm helper render Form Auth (Email/Password) dùng chung cho cả PC và Mobile Panel trượt
  const renderAuthForm = (isMobile: boolean) => {
    const loginForm = isMobile ? mobileLoginForm : desktopLoginForm;
    const registerForm = isMobile
      ? mobileRegisterForm
      : desktopRegisterForm;
    const fieldSuffix = isMobile ? "mobile" : "desktop";

    return (
      <div className="w-full space-y-4">
        {/* TAB SWITCH (ĐĂNG NHẬP / ĐĂNG KÝ) - PREMIUM PILL */}
        <div className="flex p-1 rounded-xl w-full shadow-inner border transition-all duration-300 bg-muted/50 border-border">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5",
              tab === "login" 
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20 scale-[1.01]" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <LogIn className="w-3.5 h-3.5" /> Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setTab("register")}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-1.5",
              tab === "register" 
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md shadow-primary/20 scale-[1.01]" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <UserPlus className="w-3.5 h-3.5" /> Đăng ký
          </button>
        </div>

        {/* INPUT FORM AREA */}
        <AnimatePresence mode="wait">
          {tab === "login" ? (
            <motion.form
              key="login"
              initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
              transition={isMobile ? { duration: 0 } : { duration: 0.2 }}
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label 
                  htmlFor={`tasker-email-${fieldSuffix}`}
                  className="text-sm font-medium flex items-center gap-1 text-foreground/80 transition-colors"
                >
                  Email của bạn
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id={`tasker-email-${fieldSuffix}`}
                    autoComplete="email"
                    type="email"
                    placeholder="partner@cleanz.vn"
                    className="h-12 pl-10 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                    {...loginForm.register("email")}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive font-bold">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label 
                    htmlFor={`tasker-password-${fieldSuffix}`}
                    className="text-sm font-medium flex items-center gap-1 text-foreground/80 transition-colors"
                  >
                    Mật khẩu
                  </Label>
                  <Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline">Quên mật khẩu?</Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id={`tasker-password-${fieldSuffix}`}
                    autoComplete="current-password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••••"
                    className="h-12 pl-10 pr-12 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                    {...loginForm.register("password")}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPw ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive font-bold">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={login.isPending} 
                className="w-full h-12 md:h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white hover:opacity-95 shadow-lg shadow-primary/20 font-black text-base tracking-wide mt-6 transition-all duration-300"
              >
                {login.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang xác thực đối tác...
                  </>
                ) : (
                  "Đăng nhập Cổng đối tác"
                )}
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="register"
              initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
              transition={isMobile ? { duration: 0 } : { duration: 0.2 }}
              onSubmit={registerForm.handleSubmit(handleRegister)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label 
                  htmlFor={`reg-fullname-${fieldSuffix}`}
                  className="text-sm font-medium text-foreground/80 transition-colors"
                >
                  Họ và tên của bạn
                </Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id={`reg-fullname-${fieldSuffix}`}
                    autoComplete="name"
                    placeholder="Nguyễn Văn A"
                    className="h-11 pl-10 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                    {...registerForm.register("fullName")}
                  />
                </div>
                {registerForm.formState.errors.fullName && (
                  <p className="text-xs text-destructive font-bold">{registerForm.formState.errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label 
                  htmlFor={`reg-phone-${fieldSuffix}`}
                  className="text-sm font-medium text-foreground/80 transition-colors"
                >
                  Số điện thoại
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id={`reg-phone-${fieldSuffix}`}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="0912345678"
                    className="h-11 pl-10 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                    {...registerForm.register("phone")}
                  />
                </div>
                {registerForm.formState.errors.phone && (
                  <p className="text-xs text-destructive font-bold">{registerForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label 
                  htmlFor={`reg-email-${fieldSuffix}`}
                  className="text-sm font-medium text-foreground/80 transition-colors"
                >
                  Email nhận thông báo
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id={`reg-email-${fieldSuffix}`}
                    type="email"
                    autoComplete="email"
                    placeholder="partner@cleanz.vn"
                    className="h-11 pl-10 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                    {...registerForm.register("email")}
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive font-bold">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label 
                    htmlFor={`reg-password-${fieldSuffix}`}
                    className="text-sm font-medium text-foreground/80 transition-colors"
                  >
                    Mật khẩu
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id={`reg-password-${fieldSuffix}`}
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="h-11 pl-10 pr-10 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                      {...registerForm.register("password")}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive font-bold">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label 
                    htmlFor={`reg-confirm-${fieldSuffix}`}
                    className="text-sm font-medium text-foreground/80 transition-colors"
                  >
                    Xác nhận MK
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id={`reg-confirm-${fieldSuffix}`}
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="h-11 pl-10 pr-10 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
                      {...registerForm.register("confirmPassword")}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive font-bold">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-center leading-relaxed mt-2 text-muted-foreground transition-colors">
                Bằng cách đăng ký, bạn đồng ý với{" "}
                <Link href="/terms" className="text-primary font-bold hover:underline">Điều khoản đối tác</Link>
                {" "}và{" "}
                <Link href="/privacy" className="text-primary font-bold hover:underline">Chính sách bảo mật</Link>
              </p>

              <Button 
                type="submit" 
                disabled={isLoadingRegister} 
                className="w-full h-12 md:h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white hover:opacity-95 shadow-lg shadow-primary/20 font-black text-base tracking-wide mt-6 transition-all duration-300"
              >
                {isLoadingRegister ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang thiết lập đối tác...
                  </>
                ) : (
                  "Tạo tài khoản đối tác"
                )}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 text-white overflow-hidden flex flex-col lg:flex-row">
      
      {/* NÚT CẦN HỖ TRỢ? (GÓC TRÊN CÙNG BÊN PHẢI - PREMIUM FLOATING) */}
      <a 
        href="tel:19001234" 
        className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/10 rounded-full py-2 px-4 text-[11px] font-black transition-all flex items-center gap-1.5 shadow-lg shadow-black/20"
      >
        <HelpCircle className="w-3.5 h-3.5 text-primary" />
        <span>Cần hỗ trợ?</span>
      </a>

      {/* CỘT TRÁI (HOẶC NỀN TRÊN MOBILE): CINEMATIC IMAGE CAROUSEL */}
      <div className="absolute inset-0 lg:relative lg:flex-1 h-full overflow-hidden">
        {/* Lớp phủ ảnh chuyển động chậm (Tự thích ứng độ mờ: Mobile sáng rõ, PC tối dịu để đọc chữ) */}
        {/* Tối ưu hóa: Render sẵn tất cả ảnh và dùng CSS Transition để fade mượt mà (không unmount component gây lag) */}
        {BACKGROUND_IMAGES.map((img, idx) => (
          <div
            key={img}
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-[opacity,transform] duration-[1500ms] ease-in-out will-change-transform",
              idx === bgIndex
                ? "opacity-75 lg:opacity-35 scale-100 z-10"
                : "opacity-0 scale-105 z-0"
            )}
            style={{ backgroundImage: `url('${img}')` }}
          />
        ))}

        {/* Lớp phủ gradient tối tăng cường độ tương phản */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 lg:via-slate-950/20 to-slate-950/50" />

        {/* NỘI DUNG SLOGAN TRUYỀN CẢM HỨNG TRÊN PC (HIỂN THỊ CỰC ĐẸP TRÊN MÀN HÌNH RỘNG) */}
        <div className="relative z-10 h-full p-10 lg:p-16 flex flex-col justify-between hidden lg:flex">
          {/* Logo CleanZ */}
          <div className="flex items-center gap-2 group w-fit">
            <LogoApp size="lg" textClassName="text-white group-hover:text-primary transition-colors" />
            <span className="bg-primary/20 text-primary font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-primary/20">
              Partner Portal
            </span>
          </div>

          {/* Slogan chính & stats */}
          <div className="space-y-8 max-w-lg">
            <div className="space-y-4">
              <span className="inline-block bg-primary/20 backdrop-blur-md text-primary border border-primary/30 text-xs font-black px-3.5 py-1 rounded-xl uppercase tracking-widest">
                CỔNG ĐĂNG KÝ ĐỐI TÁC CHUYÊN NGHIỆP
              </span>
              <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight">
                Dọn dẹp và <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">tăng thu nhập</span> cùng CleanZ.
              </h2>
              <p className="text-slate-300 text-sm xl:text-base leading-relaxed">
                Đăng ký ngay hôm nay để tự quyết định thời gian làm việc, nhận đơn hàng liên tục gần nhà và gia nhập đội ngũ phục vụ chuẩn 5 sao với mức thu nhập vượt trội.
              </p>
            </div>

            {/* Các thẻ thông số Glassmorphism */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[1.5rem] p-5 shadow-xl">
                <span className="text-primary font-bold text-xs uppercase tracking-wider">Thu nhập ổn định</span>
                <p className="text-xl font-black mt-1 text-white">15 - 20 Triệu/tháng</p>
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[1.5rem] p-5 shadow-xl">
                <span className="text-primary font-bold text-xs uppercase tracking-wider">Lịch trình linh hoạt</span>
                <p className="text-xl font-black mt-1 text-white">Tự do nhận ca làm</p>
              </div>
            </div>
          </div>

          {/* Footer thông tin bản quyền */}
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} CleanZ Corporation. Mọi quyền được bảo lưu.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📱 GIAO DIỆN MOBILE CHUẨN GRAB-STYLE (MẶC ĐỊNH HIỂN THỊ TRÊN MOBILE) */}
      {/* ========================================================================= */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-6 flex flex-col justify-end space-y-6 lg:hidden bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pt-32">
        
        {/* Tiêu đề & Slogan cinematic giống Grab */}
        <div className="space-y-2 text-left">
          <span className="inline-block bg-primary/20 backdrop-blur-md text-primary border border-primary/30 text-[9px] font-black px-2.5 py-0.5 rounded-xl uppercase tracking-wider">
            CleanZ Partner
          </span>
          <h1 className="text-2xl font-black leading-tight text-white/70">
            Đối tác Dịch vụ CleanZ
          </h1>
          <h2 className="text-3xl font-black leading-snug text-white">
            Dọn dẹp và <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">tăng thu nhập</span> cùng CleanZ.
          </h2>
        </div>

        {/* Divider ngăn cách mờ ảo */}
        <div className="relative flex items-center py-1">
          <div className="grow border-t border-white/10"></div>
          <span className="shrink mx-3 text-white/40 text-[10px] uppercase font-black tracking-wider">
            Đăng ký hoặc đăng nhập bằng
          </span>
          <div className="grow border-t border-white/10"></div>
        </div>

        {/* Nút Social Đăng nhập mạng xã hội to tròn chuẩn Grab */}
        <div className="space-y-3">
          {/* GOOGLE BUTTON */}
          <button
            type="button"
            onClick={() => handleSocialClick("google")}
            className="w-full h-12 bg-white text-slate-950 rounded-xl flex items-center justify-center gap-3 font-black text-sm tracking-wide shadow-lg hover:bg-slate-100 transition-all duration-300"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Đăng nhập bằng Google</span>
          </button>

          {/* APPLE BUTTON */}
          <button
            type="button"
            onClick={() => handleSocialClick("apple")}
            className="w-full h-12 bg-white text-slate-950 rounded-xl flex items-center justify-center gap-3 font-black text-sm tracking-wide shadow-lg hover:bg-slate-100 transition-all duration-300"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.51-.64.74-1.2 1.88-1.05 3 .94.07 2.1-.56 2.72-1.45" />
            </svg>
            <span>Đăng nhập bằng Apple</span>
          </button>
        </div>

        {/* Nút bấm kích hoạt mở form nhập Email/Password */}
        <button
          type="button"
          onClick={() => setShowEmailFormMobile(true)}
          className="w-full h-12 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl flex items-center justify-center gap-2 font-black text-sm tracking-wide transition-all duration-300 backdrop-blur-md shadow-lg"
        >
          <Mail className="w-4 h-4 text-primary" />
          <span>Sử dụng Email & Mật khẩu</span>
        </button>

        {/* Widget liên kết chuyển sang cổng khách hàng giống Grab (Passenger Link) */}
        <div className="flex items-center justify-between bg-black/40 border border-white/10 backdrop-blur-md p-3 rounded-2xl shadow-xl mt-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
              <span className="text-primary font-black text-xs">CZ</span>
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black text-slate-200">Bạn muốn đặt dịch vụ?</p>
              <p className="text-[9px] font-bold text-slate-400">Ứng dụng dành cho khách hàng</p>
            </div>
          </div>
          <Link 
            href="/login" 
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🔮 PANEL BOTTOM SHEET GLASSMORPHISM TRƯỢT MỞ FORM CHO MOBILE */}
      {/* ========================================================================= */}
      <Drawer
        open={showEmailFormMobile}
        onOpenChange={setShowEmailFormMobile}
        fixed
        handleOnly
        repositionInputs={false}
      >
        <DrawerContent className="bg-background border-t border-border lg:hidden max-h-[95vh] outline-none rounded-t-[4rem] sm:max-w-[540px] md:max-w-[640px] sm:mx-auto sm:border-x sm:rounded-t-[3rem]">
          <div className="px-6 pb-12 pt-2 flex flex-col overflow-y-auto w-full">
            {/* Header của Panel Bottom Sheet */}
            <DrawerHeader className="px-0 pt-2 pb-4 border-b border-border mb-4 text-left">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  <LogoApp size="md" />
                  <span className="bg-primary/10 text-primary font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-primary/20">
                    Partner Portal
                  </span>
                </div>
                <button
                  onClick={() => setShowEmailFormMobile(false)}
                  className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-all"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </DrawerHeader>

            {/* Nội dung Form đăng nhập / đăng ký di động */}
            <div className="space-y-4">
              <DrawerTitle className="sr-only">
                {tab === "login" ? "Đăng nhập đối tác" : "Đăng ký đối tác"}
              </DrawerTitle>

              {/* Render Form Helper */}
              {renderAuthForm(true)}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
 
      {/* ========================================================================= */}
      {/* 💻 CỘT PHẢI: FORM AUTHENTICATION SÁNG MÀU CHUYÊN NGHIỆP (CHỈ HIỂN THỊ TRÊN PC) */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full lg:w-[35%] h-full overflow-y-auto bg-background border-l border-border hidden lg:block">
        <div className="min-h-full flex flex-col justify-center py-10 px-6 md:px-10 lg:px-12">
          <div className="w-full space-y-8">
          
          {/* Header Slogan PC */}
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              {tab === "login" ? (
                <>Chào mừng <span className="text-primary">trở lại</span></>
              ) : (
                <>Đăng ký <span className="text-primary">đối tác</span></>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {tab === "login" 
                ? "Đăng nhập hệ thống đối tác CleanZ chuyên nghiệp." 
                : "Tạo tài khoản đối tác CleanZ chỉ trong 1 phút."}
            </p>
          </div>
 
          {/* Render Form Helper cho PC */}
          {renderAuthForm(false)}
 
          {/* DIVIDER - ĐĂNG KÝ HOẶC ĐĂNG NHẬP BẰNG */}
          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center pt-4">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase pt-4">
              <span className="bg-background px-3 text-muted-foreground font-bold tracking-wider text-[11px]">
                Đăng ký hoặc đăng nhập bằng
              </span>
            </div>
          </div>
 
          {/* GOOGLE & APPLE SIGN IN BUTTONS TRÊN PC */}
          <div className="space-y-3 pt-2">
            
            {/* GOOGLE BUTTON - PC */}
            <button
              type="button"
              onClick={() => handleSocialClick("google")}
              className="w-full h-12 bg-card text-foreground border border-border rounded-xl flex items-center justify-center gap-3 font-black text-sm tracking-wide shadow-sm hover:bg-muted hover:border-primary hover:scale-[1.01] transition-all duration-300"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Đăng nhập bằng Google</span>
            </button>
 
            {/* APPLE BUTTON - PC */}
            <button
              type="button"
              onClick={() => handleSocialClick("apple")}
              className="w-full h-12 bg-foreground text-background rounded-xl flex items-center justify-center gap-3 font-black text-sm tracking-wide shadow-md hover:opacity-90 hover:scale-[1.01] transition-all duration-300 border border-border"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.51-.64.74-1.2 1.88-1.05 3 .94.07 2.1-.56 2.72-1.45" />
              </svg>
              <span>Đăng nhập bằng Apple</span>
            </button>
 
          </div>
 
          {/* CHUYỂN SANG ĐĂNG NHẬP KHÁCH HÀNG / FOOTER LINKS */}
          <div className="text-center pt-4 border-t border-border space-y-2">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Đăng nhập tài khoản khách hàng
            </Link>
          </div>
 
        </div>
        </div>
      </div>
    </div>
  );
}
