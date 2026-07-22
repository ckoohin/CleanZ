"use client"
import React, { useEffect, useState } from 'react'
import { ImageCarousel } from '@/features/auth/_components/authv1/ImageCarousel'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, Lock, Mail, ChevronDown, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useZodValidation } from '@/features/auth/hooks/useZodValidation'
import { signin } from '@/features/auth/schemas/signup.schema'
import Link from 'next/link'
import { motion, Variants } from 'motion/react';
import { useLogin } from '@/features/auth/hooks/auth.hooks'
import { Checkbox } from '@/components/ui/checkbox'
import { SocialSignIn } from './SocialSignIn'
import { useSearchParams } from 'next/navigation'
import { useLoginContext } from '../../context/login.context'
import LogoApp from '@/components/logo/LogoApp'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/api/base-url'

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
    }),
};

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=1200", // Căn hộ hiện đại
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200", // Phòng khách ấm cúng
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=1200", // Phòng ngủ sạch sẽ
];

export const SignInFlow = () => {
    const { formData, setFormData } = useLoginContext()
    const [showPassword, setShowPassword] = useState(false);
    const [error, setErrors] = useState<Record<string, string>>({});
    const validate = useZodValidation(signin);
    const login = useLogin("/customer");
    const apiBaseUrl = getApiBaseUrl();
    
    // State cho Mobile Drawer
    const [showEmailFormMobile, setShowEmailFormMobile] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 1024;
        }
        return false;
    });
    const [bgIndex, setBgIndex] = useState(0);

    const searchParams = useSearchParams();

    useEffect(() => {
        const interval = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (searchParams.get("error") === "UnauthorizedRole") {
            toast.error("Tài khoản của bạn không có quyền truy cập vào cổng Khách hàng");
            const url = new URL(window.location.href);
            url.searchParams.delete("error");
            window.history.replaceState({}, '', url);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        if (login.isPending) return
        try {
            e.preventDefault();
            const { success, errors } = validate(formData);
            if (!success) return setErrors(errors);
            login.mutate({ ...formData, role: "CUSTOMER" });
        } catch {
            // Hook đăng nhập chịu trách nhiệm hiển thị lỗi đã được chuẩn hóa.
        }
    };

    const handleSocialClick = (provider: 'google' | 'apple') => {
        if (provider === 'google') {
            window.location.href = `${apiBaseUrl}/auth/google?state=customer`;
        }
    };

    // Hàm render nội dung form (để tái sử dụng ở PC và Mobile Drawer)
    const renderAuthForm = (isMobile = false) => {
        const fieldSuffix = isMobile ? "mobile" : "desktop";

        return (
        <div className={cn("w-full max-w-md space-y-6 mx-auto", isMobile ? "px-0" : "")}>
            {/* Heading */}
            <motion.div
                className="space-y-3 text-center lg:text-left"
                custom={0} variants={isMobile ? undefined : fadeUp} initial={isMobile ? "show" : "hidden"} animate="show"
            >
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                    Đăng nhập
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    Sử dụng tài khoản{' '}
                    <span className="font-semibold text-primary">CleanZ</span>{' '}
                    để tiếp tục dịch vụ
                </p>
            </motion.div>

            {/* Form */}
            <motion.form
                onSubmit={handleSubmit}
                className="space-y-4"
                custom={1} variants={isMobile ? undefined : fadeUp} initial={isMobile ? "show" : "hidden"} animate="show"
            >
                {/* Email */}
                <div className="space-y-2">
                    <Label htmlFor={`email-${fieldSuffix}`}>Email</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id={`email-${fieldSuffix}`}
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="name@example.com"
                            className="pl-10 bg-card border-border focus-visible:ring-primary"
                            value={formData.email}
                            onChange={(e) => {
                                const email = e.target.value;
                                setFormData((current) => ({ ...current, email }));
                                setErrors((current) => ({ ...current, email: "" }));
                            }}
                        />
                    </div>
                    {error.email && <p className="text-xs text-destructive font-medium">{error.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor={`password-${fieldSuffix}`}>Mật khẩu</Label>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id={`password-${fieldSuffix}`}
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="pl-10 pr-10 bg-card border-border focus-visible:ring-primary"
                            value={formData.password}
                            onChange={(e) => {
                                const password = e.target.value;
                                setFormData((current) => ({ ...current, password }));
                                setErrors((current) => ({ ...current, password: "" }));
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {error.password && <p className="text-xs text-destructive font-medium">{error.password}</p>}
                </div>
                <div className="space-y-2 flex flex-row items-center justify-between">
                    <div className="flex flex-row items-center gap-2">
                        <Checkbox className="mt-[2px]" />
                        <span className="text-sm text-muted-foreground">Ghi nhớ đăng nhập</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">Quên mật khẩu?</Link>
                    </div>
                </div>

                {/* Submit */}
                <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                >
                    {login.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xác thực...</>
                    ) : 'Đăng nhập'}
                </Button>
            </motion.form>

            {/* Social login (hiển thị trên cả PC và Mobile theo yêu cầu) */}
            <>
                <motion.div className="relative" custom={2} variants={isMobile ? undefined : fadeUp} initial={isMobile ? "show" : "hidden"} animate="show">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Hoặc đăng nhập với</span>
                    </div>
                </motion.div>

                <motion.div custom={3} variants={isMobile ? undefined : fadeUp} initial={isMobile ? "show" : "hidden"} animate="show">
                    <SocialSignIn
                        url_gg={`${apiBaseUrl}/auth/google?state=customer`}
                        url_facebook={`${apiBaseUrl}/auth/facebook`}
                        text_gg="Đăng nhập với Google"
                        text_facebook="Đăng nhập với Facebook"
                    />
                </motion.div>
            </>

            <motion.p className="text-center text-sm text-muted-foreground pt-4" custom={4} variants={isMobile ? undefined : fadeUp} initial={isMobile ? "show" : "hidden"} animate="show">
                Chưa có tài khoản?{' '}
                <Link href="/register" className="text-primary font-bold hover:underline underline-offset-4 cursor-pointer">Đăng ký miễn phí</Link>
            </motion.p>
        </div>
        );
    };

    return (
        <div className="relative w-full h-screen bg-slate-950 text-foreground overflow-hidden flex flex-col lg:flex-row">
            <Toaster richColors position="top-right" />

            {/* CỘT TRÁI - GIAO DIỆN PC (ImageCarousel) */}
            <div className="hidden lg:flex lg:flex-1 h-full relative">
                <ImageCarousel valueAuthType="signin" />
            </div>

            {/* CỘT PHẢI - FORM PC */}
            <div className="hidden lg:block lg:flex-1 h-full overflow-y-auto bg-background">
                <div className="min-h-full flex flex-col justify-center p-8 xl:p-12">
                    {renderAuthForm(false)}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 📱 GIAO DIỆN MOBILE CHUẨN GRAB-STYLE (MẶC ĐỊNH HIỂN THỊ TRÊN MOBILE) */}
            {/* ========================================================================= */}
            
            {/* Cinematic Background */}
            <div className="lg:hidden absolute inset-0 overflow-hidden">
                {BACKGROUND_IMAGES.map((img, idx) => (
                    <div
                        key={img}
                        className={cn(
                            "absolute inset-0 bg-cover bg-center transition-[opacity,transform] duration-[1500ms] ease-in-out will-change-transform",
                            idx === bgIndex ? "opacity-60 scale-100 z-10" : "opacity-0 scale-105 z-0"
                        )}
                        style={{ backgroundImage: `url('${img}')` }}
                    />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            </div>

            {/* Cinematic Content */}
            <div className="absolute inset-x-0 bottom-0 z-20 p-6 flex flex-col justify-end space-y-6 lg:hidden bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pt-32">
                <div className="space-y-2 text-left">
                    <span className="inline-block bg-primary/20 backdrop-blur-sm text-primary border border-primary/30 text-[9px] font-black px-2.5 py-0.5 rounded-xl uppercase tracking-wider">
                        Customer Portal
                    </span>
                    <h1 className="text-2xl font-black leading-tight text-white/70">
                        Khách hàng CleanZ
                    </h1>
                    <h2 className="text-3xl font-black leading-snug text-white">
                        Dịch vụ tại nhà <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">chuẩn 5 sao</span>.
                    </h2>
                </div>

                <div className="relative flex items-center py-1">
                    <div className="grow border-t border-white/10"></div>
                    <span className="shrink mx-3 text-white/40 text-[10px] uppercase font-black tracking-wider">
                        Đăng ký hoặc đăng nhập bằng
                    </span>
                    <div className="grow border-t border-white/10"></div>
                </div>

                <div className="space-y-3">
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

                <button
                    type="button"
                    onClick={() => setShowEmailFormMobile(true)}
                    className="w-full h-12 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl flex items-center justify-center gap-2 font-black text-sm tracking-wide transition-all duration-300 backdrop-blur-sm shadow-lg"
                >
                    <Mail className="w-4 h-4 text-primary" />
                    <span>Sử dụng Email & Mật khẩu</span>
                </button>

                <div className="flex items-center justify-between bg-black/40 border border-white/10 backdrop-blur-sm p-3 rounded-2xl shadow-xl mt-2">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                            <span className="text-primary font-black text-xs">P</span>
                        </div>
                        <div className="text-left">
                            <p className="text-[11px] font-black text-slate-200">Muốn trở thành đối tác?</p>
                            <p className="text-[9px] font-bold text-slate-400">Ứng dụng dành cho Thợ</p>
                        </div>
                    </div>
                    <Link href="/login-tasker" className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* MOBILE DRAWER */}
            <Drawer
                open={showEmailFormMobile}
                onOpenChange={setShowEmailFormMobile}
                fixed
                handleOnly
                repositionInputs={false}
            >
                <DrawerContent className="bg-background border-t border-border lg:hidden max-h-[95vh] outline-none rounded-t-[3rem] sm:max-w-[540px] md:max-w-[640px] sm:mx-auto sm:border-x">
                    <div className="px-6 pb-12 pt-2 flex flex-col overflow-y-auto w-full">
                        <DrawerHeader className="px-0 pt-2 pb-4 border-b border-border mb-4 text-left">
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-2">
                                    <LogoApp size="md" />
                                    <span className="bg-primary/10 text-primary font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-primary/20">
                                        Customer Portal
                                    </span>
                                </div>
                                <DrawerClose asChild>
                                    <button className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-all">
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </DrawerClose>
                            </div>
                        </DrawerHeader>
                        <DrawerTitle className="sr-only">Đăng nhập Khách hàng</DrawerTitle>
                        {renderAuthForm(true)}
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    )
}

export default SignInFlow
