"use client"

import React, { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff,
  ChevronDown,
  ArrowLeft,
  Activity,
  PieChart,
  Users,
  Loader2
} from "lucide-react"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useLogin } from "@/features/auth/hooks/auth.hooks"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import LogoApp from "@/components/logo/LogoApp"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

const BACKGROUND_IMAGES = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80", // Minimalist abstract dark space
  "https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=1200&q=80", // Minimalist modern architecture
]

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
})

type LoginValues = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <AdminLoginContent />
    </Suspense>
  )
}

function AdminLoginContent() {
  const [showPassword, setShowPassword] = useState(false)
  const [bgIndex, setBgIndex] = useState(0)
  const [showFormMobile, setShowFormMobile] = useState<boolean>(() => {
      if (typeof window !== 'undefined') {
          return window.innerWidth < 1024;
      }
      return false;
  });

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const login = useLogin("/admin")

  const handleLogin = (values: LoginValues) => {
    login.mutate({ email: values.email, password: values.password, role: "ADMIN" })
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const searchParams = useSearchParams()
  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'UnauthorizedRole') {
      toast.error('Tài khoản của bạn không có quyền đăng nhập vào cổng Quản trị viên')
      // Remove query param
      window.history.replaceState(null, '', '/login-admin')
    }
  }, [searchParams])

  const renderForm = (isMobile: boolean) => (
    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="w-full space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`email-${isMobile}`} className="text-sm font-medium text-foreground/80 transition-colors">
            Tài khoản Admin
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              id={`email-${isMobile}`}
              type="email" 
              placeholder="admin@cleanz.vn" 
              className="h-11 pl-10 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
              {...loginForm.register("email")}
            />
          </div>
          {loginForm.formState.errors.email && (
            <p className="text-xs text-destructive font-bold">{loginForm.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`pass-${isMobile}`} className="text-sm font-medium text-foreground/80 transition-colors">
              Mật khẩu bảo mật
            </Label>
            <Link href="/auth/forgot-password" className="text-xs font-bold text-primary hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              id={`pass-${isMobile}`}
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              className="h-11 pl-10 pr-10 rounded-xl bg-card border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground transition-all"
              {...loginForm.register("password")}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {loginForm.formState.errors.password && (
            <p className="text-xs text-destructive font-bold">{loginForm.formState.errors.password.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 px-1">
        <Checkbox id={`remember-${isMobile}`} className="rounded-md border-border/60 data-[state=checked]:bg-primary" />
        <label htmlFor={`remember-${isMobile}`} className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
          Ghi nhớ đăng nhập
        </label>
      </div>

      <Button type="submit" disabled={login.isPending} className="w-full h-12 md:h-14 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 font-extrabold text-sm tracking-wide mt-4 transition-all duration-300 flex items-center justify-center gap-2">
        {login.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Đăng nhập hệ thống <ArrowRight className="w-4 h-4" /></>}
      </Button>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink-0 mx-4 text-xs font-medium text-muted-foreground uppercase tracking-widest">Hoặc</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <Button onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google?state=admin`} type="button" variant="outline" className="w-full h-12 md:h-14 rounded-xl bg-card hover:bg-muted border-border font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3">
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          <path d="M1 1h22v22H1z" fill="none"/>
        </svg>
        Đăng nhập nhanh với Google
      </Button>

      <div className="pt-4 text-center space-y-4">
        <div className="flex items-center gap-3 justify-center opacity-30">
          <div className="h-[1px] w-12 bg-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Bảo mật SSL</span>
          <div className="h-[1px] w-12 bg-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Bạn không có quyền truy cập? <Link href="/login" className="text-primary font-bold hover:underline">Về trang khách hàng</Link>
        </p>
      </div>
    </form>
  )

  return (
    <div className="relative flex h-screen w-full bg-slate-950 text-foreground overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute inset-0 lg:relative lg:flex-1 h-full w-full bg-slate-950 overflow-hidden">
        {BACKGROUND_IMAGES.map((src, i) => (
          <div
            key={src}
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-all duration-[1500ms] ease-in-out",
              i === bgIndex
                ? "opacity-60 lg:opacity-80 scale-100 z-10"
                : "opacity-0 scale-105 z-0"
            )}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}

        {/* Lớp phủ gradient và làm mờ tăng cường tương phản */}
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />

        {/* Nút Back về trang chủ */}
        <Link 
          href="/" 
          className="absolute top-6 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        {/* NỘI DUNG SỬA ĐỔI CHO PC (Cột trái): Cung cấp thông tin nổi bật */}
        <div className="relative z-20 h-full p-10 lg:p-16 flex flex-col justify-between hidden lg:flex">
          {/* Top Logo */}
          <div className="flex items-center gap-2 group w-fit">
            <LogoApp size="lg" textClassName="text-white group-hover:text-primary transition-colors" />
            <span className="bg-primary/20 text-primary font-bold text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-primary/20">
              Admin Portal
            </span>
          </div>

          {/* Slogan & Tính năng chi tiết */}
          <div className="w-full max-w-2xl mt-auto mb-10">
            <div className="space-y-4">
              <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1] text-white drop-shadow-lg">
                Hệ thống quản trị <br />
                <span className="text-primary drop-shadow-md">trung tâm.</span>
              </h2>
              <p className="text-slate-200 text-sm xl:text-base leading-relaxed font-medium max-w-md drop-shadow">
                Nền tảng vận hành tối ưu dành cho ban điều hành CleanZ. Giám sát toàn diện, xử lý tinh gọn.
              </p>
            </div>

            {/* Feature List (Dark Glassmorphism UI for Contrast) */}
            <div className="grid grid-cols-2 gap-4 mt-10">
              {[
                { icon: <ShieldCheck className="w-5 h-5 text-primary" />, title: "Bảo mật tuyệt đối", desc: "Mã hóa chuẩn quốc tế" },
                { icon: <Activity className="w-5 h-5 text-primary" />, title: "Giám sát liên tục", desc: "Theo dõi hệ thống 24/7" },
                { icon: <PieChart className="w-5 h-5 text-primary" />, title: "Báo cáo đa chiều", desc: "Thống kê dữ liệu trực quan" },
                { icon: <Users className="w-5 h-5 text-primary" />, title: "Quản lý nhân sự", desc: "Điều phối đối tác hiệu quả" }
              ].map((item, idx) => (
                <div key={idx} className="bg-black/40 hover:bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex items-start gap-4 transition-all duration-300 shadow-xl shadow-black/20">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm mb-1">{item.title}</h4>
                    <p className="text-slate-300 text-xs font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* System Status Widget */}
            <div className="mt-8 flex items-center gap-3 bg-black/30 w-fit px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-200 font-bold text-xs tracking-wide">Hệ thống hoạt động ổn định (99.99%)</span>
            </div>
          </div>
        </div>

        {/* Giao diện Slogan trên Mobile / Tablet */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-6 sm:p-10 flex flex-col justify-end space-y-6 lg:hidden bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-40">
          <div className="space-y-3 text-left">
            <span className="inline-block bg-primary/20 text-primary border border-primary/30 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
              Hệ thống nội bộ CleanZ
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.1] drop-shadow-md">
              Hệ thống quản trị <br />
              <span className="text-primary">trung tâm.</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-[300px] sm:max-w-md drop-shadow">
              Giám sát toàn diện, xử lý tinh gọn. Nền tảng điều hành độc quyền dành cho CleanZ.
            </p>
          </div>

          {/* Mobile/Tablet Feature Grid */}
          <div className="grid grid-cols-2 gap-3 pb-2">
            {[
              { icon: <ShieldCheck className="w-4 h-4 text-primary" />, title: "Bảo mật SSL" },
              { icon: <Activity className="w-4 h-4 text-primary" />, title: "Real-time 24/7" },
              { icon: <PieChart className="w-4 h-4 text-primary" />, title: "Báo cáo số liệu" },
              { icon: <Users className="w-4 h-4 text-primary" />, title: "Quản lý đối tác" }
            ].map((item, idx) => (
              <div key={idx} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-black/40 border border-white/5 shrink-0">
                  {item.icon}
                </div>
                <span className="text-white font-bold text-xs">{item.title}</span>
              </div>
            ))}
          </div>

          {/* System Status */}
          <div className="flex items-center gap-3 bg-black/40 w-fit px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-slate-200 font-bold text-[10px] tracking-wide uppercase">Hệ thống đang hoạt động ổn định</span>
          </div>

          <Button 
            onClick={() => setShowFormMobile(true)}
            className="w-full h-14 mt-2 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 font-bold text-base transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" /> Đăng nhập hệ thống
          </Button>
        </div>
      </div>

      {/* 🔮 PANEL BOTTOM SHEET MỞ FORM CHO MOBILE */}
      <Drawer open={showFormMobile} onOpenChange={setShowFormMobile}>
        <DrawerContent className="bg-background border-t border-border lg:hidden max-h-[95vh] outline-none rounded-t-[4rem] sm:max-w-[540px] md:max-w-[640px] sm:mx-auto sm:border-x sm:rounded-t-[3rem]">
          <div className="px-6 pb-12 pt-2 flex flex-col overflow-y-auto w-full">
            <DrawerHeader className="px-0 pt-2 pb-4 border-b border-border mb-6 text-left">
              <div className="flex justify-between items-center w-full">
                <LogoApp size="md" />
                <button
                  onClick={() => setShowFormMobile(false)}
                  className="w-8 h-8 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground transition-all"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </DrawerHeader>

            <div className="space-y-4">
              <DrawerTitle className="sr-only">Đăng nhập Admin</DrawerTitle>
              {renderForm(true)}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 💻 CỘT PHẢI: FORM CHO PC */}
      <div className="relative z-30 w-full lg:w-[35%] h-full overflow-y-auto bg-background border-l border-border hidden lg:block shadow-2xl">
        <div className="min-h-full flex flex-col justify-center py-10 px-6 md:px-10 lg:px-12">
          <div className="w-full space-y-8">
            <div className="space-y-2">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 border border-primary/20">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Đăng nhập <span className="text-primary">Admin</span>
              </h1>
              <p className="text-muted-foreground text-sm">
                Đăng nhập vào hệ thống quản trị trung tâm của CleanZ để quản lý và điều hành.
              </p>
            </div>
            
            {renderForm(false)}
          </div>
        </div>
      </div>

    </div>
  )
}
