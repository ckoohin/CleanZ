"use client";

import React from "react";
import Link from "next/link";
import { 
  Search, Bell, Heart, ShoppingCart, 
  Menu, Sparkles, Phone, User, Settings, Clock,
  Wrench, Scissors, HeartPulse, BookOpen, Dumbbell, ShieldCheck,
  ChevronRight, ArrowRight
} from "lucide-react";
import LogoApp from "@/components/logo/LogoApp";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { icon: Sparkles, label: "Dọn dẹp", color: "bg-emerald-50 text-emerald-600" },
  { icon: Wrench, label: "Sửa chữa", color: "bg-amber-50 text-amber-600" },
  { icon: HeartPulse, label: "Y tế", color: "bg-rose-50 text-rose-600" },
  { icon: Scissors, label: "Làm đẹp", color: "bg-purple-50 text-purple-600" },
  { icon: BookOpen, label: "Gia sư", color: "bg-blue-50 text-blue-600" },
  { icon: Dumbbell, label: "Fitness", color: "bg-orange-50 text-orange-600" },
  { icon: ShieldCheck, label: "Bảo vệ", color: "bg-slate-100 text-slate-600" },
  { icon: ChevronRight, label: "Tất cả", color: "bg-gray-50 text-gray-600" },
];

const RECENT = [
  { title: "Dọn dẹp căn hộ", time: "Hôm qua", price: "200.000đ", icon: Clock },
  { title: "Sửa điều hòa", time: "Tuần trước", price: "150.000đ", icon: Wrench },
];

export function MobileHomeView() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50 pb-20 lg:hidden">
      {/* 1. HEADER (Cố định) */}
      <div className="sticky top-0 z-40 bg-background shadow-sm border-b border-border pb-3">
        {/* Top Orange Bar */}
        <div className="bg-[#f58220] h-8 w-full flex items-center px-4">
          <Link href="tel:18006868" className="flex items-center gap-1.5 text-white">
            <Phone className="w-3.5 h-3.5" />
            <span className="font-bold text-xs tracking-wide">1800 6868</span>
          </Link>
        </div>

        {/* Navbar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <LogoApp size="sm" />
          
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground">
              <Search className="w-4 h-4" />
            </button>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground">
              <Heart className="w-4 h-4" />
              <span className="absolute -top-1.5 -right-1.5 bg-[#f58220] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">3</span>
            </button>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1.5 -right-1.5 bg-[#f58220] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">5</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground">
              <ShoppingCart className="w-4 h-4" />
            </button>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
              Đ
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></span>
            </button>
            <ThemeToggle />
            <button className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted-foreground">
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="px-4 mt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Tìm dịch vụ, thợ hoặc mã đơn..." 
              className="w-full h-11 pl-9 pr-4 bg-gray-100 dark:bg-gray-800 rounded-full text-sm outline-none focus:ring-1 focus:ring-primary border-transparent"
            />
          </div>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="px-4 py-6 space-y-8">
        
        {/* Banner: Nhân viên đang di chuyển */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-background">
                <AvatarImage src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80" />
                <AvatarFallback>NV</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full"></span>
            </div>
            <div>
              <p className="text-[10px] font-black text-[#f58220] uppercase tracking-wider mb-0.5">Nhân viên đang di chuyển</p>
              <h3 className="text-sm font-bold text-foreground">Dọn nhà chuyên sâu</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-blue-500" /> Sẽ đến lúc 09:15
              </p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Category Grid 8 icons */}
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {CATEGORIES.map((cat, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 cursor-pointer">
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95", cat.color)}>
                <cat.icon className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold text-center text-foreground/80 leading-tight">
                {cat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Ưu đãi hôm nay */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Ưu đãi hôm nay</h2>
            <Link href="/promotions" className="text-xs font-bold text-[#f58220] hover:underline">
              Xem tất cả
            </Link>
          </div>
          
          <div className="relative w-full h-40 rounded-2xl overflow-hidden group cursor-pointer">
            <img 
              src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80" 
              alt="Promo" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <span className="bg-white/20 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded uppercase mb-1.5 inline-block">Sofa50</span>
                <h3 className="text-white font-black text-xl">Giảm 50k Sofa</h3>
              </div>
              <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Gần đây */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Gần đây</h2>
          
          <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 scrollbar-hide">
            {RECENT.map((item, i) => (
              <div key={i} className="min-w-[240px] bg-white dark:bg-slate-900 border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time} • {item.price}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
