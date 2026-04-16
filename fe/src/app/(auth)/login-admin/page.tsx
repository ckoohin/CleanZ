"use client"

import React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Sparkles,
  ChevronLeft
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import LogoApp from "@/components/logo/LogoApp"

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background overflow-hidden">
      {/* 1. Left Side: Branding & Visuals (Visible on Desktop) */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-[#0D1B3E] text-white">
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-20">
           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[120px] animate-pulse" />
           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10">
           <LogoApp textClassName="text-white" />
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8 }}
           >
              <Badge className="bg-primary/20 text-primary border-none mb-4 px-4 py-1.5 rounded-full font-bold tracking-widest uppercase text-[10px]">
                Hệ thống nội bộ
              </Badge>
              <h1 className="text-5xl xl:text-7xl font-light mb-6 leading-[1.1]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Nền tảng quản trị <br />
                <span className="italic text-primary">chuyên sâu.</span>
              </h1>
              <p className="text-white/60 text-lg font-light leading-relaxed">
                Chào mừng bạn trở lại trung tâm điều hành KingOfService. Đăng nhập để tiếp tục quản lý và tối ưu hóa trải nghiệm khách hàng.
              </p>
           </motion.div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-white/40 text-xs font-black uppercase tracking-widest">
           <span>KingOfService Admin Portal</span>
           <span>v2.4.0</span>
        </div>
      </div>

      {/* 2. Right Side: Login Form */}
      <div className="flex items-center justify-center p-6 md:p-12 relative">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
           <ChevronLeft className="w-4 h-4" /> Về trang chủ
        </Link>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-[440px] space-y-10"
        >
          <div className="space-y-3">
             <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
                <ShieldCheck className="w-8 h-8" />
             </div>
             <h2 className="text-3xl md:text-4xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
               Đăng nhập <span className="italic text-primary">Hệ thống</span>
             </h2>
             <p className="text-muted-foreground font-light">Vui lòng nhập thông tin xác thực admin của bạn.</p>
          </div>

          <form className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Tài khoản Email</Label>
                <div className="relative group">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                   </div>
                   <Input 
                     id="email" 
                     type="email" 
                     placeholder="admin@kingofservice.com" 
                     className="h-14 pl-12 rounded-2xl bg-muted/30 border-border/40 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                   />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                   <Label htmlFor="pass" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Mật khẩu bảo mật</Label>
                   <Link href="/auth/forgot-password" className="text-[10px] font-bold text-primary hover:underline">Quên mật khẩu?</Link>
                </div>
                <div className="relative group">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                   </div>
                   <Input 
                     id="pass" 
                     type={showPassword ? "text" : "password"} 
                     placeholder="••••••••••••" 
                     className="h-14 pl-12 pr-12 rounded-2xl bg-muted/30 border-border/40 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                   />
                   <button 
                     type="button"
                     onClick={() => setShowPassword(!showPassword)}
                     className="absolute inset-y-0 right-4 flex items-center text-muted-foreground hover:text-primary transition-colors"
                   >
                     {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                   </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-1">
               <Checkbox id="remember" className="rounded-md border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
               <label htmlFor="remember" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">Ghi nhớ phiên đăng nhập trong 30 ngày</label>
            </div>

            <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 transition-all group overflow-hidden relative">
               <span className="relative z-10 flex items-center gap-2">
                 Xác thực đăng nhập <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
               </span>
               <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </form>

          <div className="pt-8 text-center space-y-4">
             <div className="flex items-center gap-3 justify-center opacity-30">
                <div className="h-[1px] w-12 bg-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Bảo mật bởi CleanZ SSL</span>
                <div className="h-[1px] w-12 bg-muted-foreground" />
             </div>
             <p className="text-xs text-muted-foreground">
               Không phải Admin? <Link href="/login" className="text-primary font-black hover:underline underline-offset-4">Đăng nhập Khách hàng</Link>
             </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </div>
  )
}
