"use client"

import React from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { 
  Users, 
  Smartphone, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Sparkles,
  ChevronLeft,
  Wrench,
  Trophy
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import LogoApp from "@/components/logo/LogoApp"

export default function WorkerLoginPage() {
  const [showPassword, setShowPassword] = React.useState(false)
  const [loginMethod, setLoginMethod] = React.useState<"email" | "phone">("phone")

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Dynamic Background Decor */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -mr-48 -mt-48 animate-pulse" />
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -ml-48 -mb-48 animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px] relative z-10"
      >
        <Card className="border-border/40 bg-card/60 backdrop-blur-2xl shadow-2xl rounded-[3rem] overflow-hidden">
          <div className="p-8 md:p-12 space-y-10">
            {/* Header */}
            <div className="space-y-4 text-center">
              <div className="flex justify-center mb-6">
                 <LogoApp />
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                 <Trophy className="w-3.5 h-3.5" /> Đối tác chuyên nghiệp
              </div>
              <h1 className="text-3xl md:text-5xl font-light leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Bắt đầu <span className="italic text-primary">công việc</span>
              </h1>
              <p className="text-muted-foreground font-light text-sm md:text-base">Đăng nhập để nhận đơn và quản lý thu nhập của bạn.</p>
            </div>

            {/* Login Method Toggle */}
            <div className="flex bg-muted/50 p-1.5 rounded-[1.5rem] md:rounded-[2rem]">
               <button 
                 onClick={() => setLoginMethod("phone")}
                 className={cn(
                   "flex-1 py-3 px-4 rounded-[1.2rem] md:rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
                   loginMethod === "phone" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/20"
                 )}
               >
                 Số điện thoại
               </button>
               <button 
                 onClick={() => setLoginMethod("email")}
                 className={cn(
                   "flex-1 py-3 px-4 rounded-[1.2rem] md:rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all",
                   loginMethod === "email" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/20"
                 )}
               >
                 Email cá nhân
               </button>
            </div>

            {/* Form */}
            <form className="space-y-6">
               <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                      {loginMethod === "phone" ? "Nhập số điện thoại" : "Địa chỉ Email"}
                    </Label>
                    <div className="relative group">
                       <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                          {loginMethod === "phone" ? <Smartphone className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" /> : <Users className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />}
                       </div>
                       <Input 
                         type={loginMethod === "phone" ? "tel" : "email"}
                         placeholder={loginMethod === "phone" ? "Ví dụ: 0988xxxxxx" : "worker@kingofservice.com"}
                         className="h-16 pl-14 rounded-3xl bg-muted/30 border-border/20 focus:bg-background transition-all outline-none text-base"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mật khẩu</Label>
                       <Link href="/auth/forgot-password" className="text-[10px] font-bold text-primary hover:underline">Quên mật khẩu?</Link>
                    </div>
                    <div className="relative group">
                       <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                          <Lock className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                       </div>
                       <Input 
                         type={showPassword ? "text" : "password"}
                         placeholder="••••••••••••"
                         className="h-16 pl-14 pr-14 rounded-3xl bg-muted/30 border-border/20 focus:bg-background transition-all outline-none text-base"
                       />
                       <button 
                         type="button"
                         onClick={() => setShowPassword(!showPassword)}
                         className="absolute inset-y-0 right-5 flex items-center text-muted-foreground hover:text-primary transition-colors"
                       >
                         {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                       </button>
                    </div>
                  </div>
               </div>

               <Button className="w-full h-16 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all group overflow-hidden relative">
                  <span className="relative z-10 flex items-center gap-2">
                    Đăng nhập tài khoản <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
               </Button>
            </form>

            {/* Footer */}
            <div className="pt-6 text-center space-y-4">
                <p className="text-xs text-muted-foreground">
                   Bạn chưa là đối tác? <Link href="/auth/register" className="text-emerald-600 font-bold hover:underline">Đăng ký làm thợ ngay</Link>
                </p>
                <div className="flex items-center justify-center gap-4 text-muted-foreground/30">
                   <div className="h-[1px] flex-1 bg-border" />
                   <Sparkles className="w-4 h-4" />
                   <div className="h-[1px] flex-1 bg-border" />
                </div>
                <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                  Đăng nhập Khách hàng
                </Link>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  )
}
