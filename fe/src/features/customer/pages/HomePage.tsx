'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles,
  Wrench,
  ShieldCheck,
  Zap,
  Clock,
  MapPin,
  CalendarCheck,
  HeartPulse,
  ChevronRight,
  Search,
  BookOpen,
  Dumbbell,
  ArrowRight,
  Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Container from '@/components/Container';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const MAIN_SERVICES = [
  { id: 'cleaning', label: "Dọn dẹp", icon: Sparkles, color: "bg-emerald-500", shadow: "shadow-emerald-500/20" },
  { id: 'repair', label: "Sửa chữa", icon: Wrench, color: "bg-amber-500", shadow: "shadow-amber-500/20" },
  { id: 'health', label: "Y tế", icon: HeartPulse, color: "bg-rose-500", shadow: "shadow-rose-500/20" },
  { id: 'beauty', label: "Làm đẹp", icon: Zap, color: "bg-purple-500", shadow: "shadow-purple-500/20" },
  { id: 'tutor', label: "Gia sư", icon: BookOpen, color: "bg-blue-500", shadow: "shadow-blue-500/20" },
  { id: 'fitness', label: "Fitness", icon: Dumbbell, color: "bg-orange-500", shadow: "shadow-orange-500/20" },
  { id: 'security', label: "Bảo vệ", icon: ShieldCheck, color: "bg-slate-700", shadow: "shadow-slate-700/20" },
  { id: 'more', label: "Thêm", icon: ChevronRight, color: "bg-gray-100", shadow: "shadow-gray-300/20", iconColor: "text-gray-400" },
];

const PROMOS = [
  { title: "Giảm 30% dọn dẹp", code: "KOS30", bg: "bg-gradient-to-r from-emerald-600 to-teal-500", img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80" },
  { title: "Y tế tại nhà 199k", code: "CARE24", bg: "bg-gradient-to-r from-rose-600 to-pink-500", img: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80" },
  { title: "Giảm 50k Sofa", code: "SOFA50", bg: "bg-gradient-to-r from-blue-600 to-indigo-500", img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80" },
];

const ONGOING_SERVICE = {
  id: "#B0982",
  label: "Nhân viên đang di chuyển",
  time: "Sẽ đến lúc 09:15",
  service: "Dọn nhà chuyên sâu",
  avatar: "https://i.pravatar.cc/150?u=hang"
};

export default function GrabStyleHomePage() {
  return (
    <div className="bg-background min-h-screen pb-safe">
      {/* 1. Header & Search - Cải thiện Sticky và Spacing cho Tablet */}
      <div className="bg-background/95 backdrop-blur-md sticky top-[64px] z-30 transition-all border-b border-transparent data-[scrolled=true]:border-border/40">
        <Container className="py-4 md:py-6">
          <div className="max-w-2xl lg:max-w-3xl mx-auto w-full px-2 md:px-0">
            <h1 className="hidden md:block text-2xl lg:text-4xl font-black text-center mb-6 leading-tight italic" style={{ fontFamily: "'Playfair Display', serif" }}>
               KingOfService có thể giúp gì cho bạn?
            </h1>
            <div className="relative group">
               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary" />
               </div>
               <input 
                 type="text" 
                 placeholder="Tìm dịch vụ, thợ hoặc mã đơn..." 
                 className="w-full h-14 md:h-16 pl-12 pr-4 bg-muted/40 border border-border/20 rounded-2xl text-sm md:text-base focus:bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
               />
            </div>
          </div>
        </Container>
      </div>

      <Container className="space-y-10 md:space-y-16 px-4 md:px-8 lg:px-0 mt-4">
        {/* 2. Live Activity - Tối ưu cho Tablet */}
        {ONGOING_SERVICE && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl mx-auto"
          >
            <Link href="/customer/activity/1">
              <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-4 md:p-6 flex items-center justify-between hover:bg-primary/10 hover:border-primary/30 transition-all cursor-pointer shadow-lg shadow-primary/5">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="relative shrink-0">
                    <img src={ONGOING_SERVICE.avatar} className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover border-2 border-primary/20" alt="Staff" />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-background" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.15em] mb-1 truncate">{ONGOING_SERVICE.label}</p>
                    <p className="text-sm md:text-lg font-bold truncate">{ONGOING_SERVICE.service}</p>
                    <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-muted-foreground mt-1">
                       <Clock className="w-3.5 h-3.5 text-primary opacity-70" />
                       {ONGOING_SERVICE.time}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary opacity-30 md:opacity-100 shrink-0" />
              </div>
            </Link>
          </motion.div>
        )}

        {/* 3. Main Services Grid - Quan trọng cho Tablet */}
        <section className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-y-8 md:gap-y-12 gap-x-2 md:gap-x-8">
            {MAIN_SERVICES.map((srv) => (
              <Link key={srv.id} href={`/services/${srv.id}`} className="group flex flex-col items-center gap-2.5 md:gap-4">
                <motion.div 
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "w-14 h-14 md:w-20 md:h-20 rounded-[1.8rem] md:rounded-[2.2rem] flex items-center justify-center transition-all",
                    srv.color, srv.shadow,
                    "shadow-lg"
                  )}
                >
                  <srv.icon className={cn("w-6 h-6 md:w-9 md:h-9 text-white", srv.id==='more' && "text-gray-400")} />
                </motion.div>
                <span className="text-[10px] md:text-xs font-black uppercase tracking-tight text-center leading-tight opacity-70 group-hover:opacity-100 transition-opacity">{srv.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Promos - Sửa tràn lề cho Tablet */}
        <section className="w-full max-w-7xl mx-auto overflow-hidden">
          <div className="flex items-center justify-between mb-8 px-2 md:px-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-light font-serif italic italic leading-none">Ưu đãi độc quyền</h2>
              <p className="text-xs text-muted-foreground opacity-60 mt-2">Dành riêng cho khách hàng thân thiết</p>
            </div>
            <Link href="/promos" className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">Tất cả <ArrowRight className="w-4 h-4" /></Link>
          </div>
          
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible scrollbar-hide snap-x px-2 md:px-0 pb-4">
             {PROMOS.map((promo) => (
                <div key={promo.title} className={cn(
                  "min-w-[280px] md:min-w-0 h-44 md:h-52 rounded-[2.5rem] relative overflow-hidden snap-center p-6 md:p-8 flex flex-col justify-between group",
                  promo.bg, "shadow-xl shadow-black/5"
                )}>
                   <div className="absolute -top-6 -right-6 w-36 h-36 md:w-44 md:h-44 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                      <img src={promo.img} className="w-full h-full object-cover rounded-full" alt="" />
                   </div>
                   <div className="relative z-10">
                      <Badge className="bg-white/20 text-white border-none backdrop-blur-md mb-2 text-[9px]">Mã: {promo.code}</Badge>
                      <h3 className="text-xl md:text-2xl font-black text-white leading-tight">{promo.title}</h3>
                   </div>
                   <Button variant="outline" className="w-fit border-white/30 text-white bg-white/10 backdrop-blur-md hover:bg-white hover:text-primary transition-all rounded-2xl h-10 px-6 text-[10px] font-black uppercase tracking-widest">Dùng ngay</Button>
                </div>
             ))}
          </div>
        </section>

        {/* 5. Activity & Locations - Split Grid trên Tablet+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-8 lg:gap-16 pb-24 max-w-6xl mx-auto">
            {/* History */}
            <section className="space-y-6">
                <h2 className="text-2xl font-light font-serif italic italic px-1">Gần đây</h2>
                <div className="space-y-4">
                  {[
                    { label: "Dọn dẹp căn hộ", time: "Hôm qua", price: "200k" },
                    { label: "Sửa máy giặt", time: "2 ngày trước", price: "350k" },
                  ].map(act => (
                    <div key={act.label} className="p-4 md:p-5 rounded-3xl bg-muted/20 border border-border/5 flex items-center justify-between hover:bg-muted/40 transition-all cursor-pointer">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-muted-foreground/40">
                             <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{act.label}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">{act.time} • {act.price}</p>
                          </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-muted-foreground/20" />
                    </div>
                  ))}
                </div>
            </section>

            {/* Locations */}
            <section className="space-y-6">
                <h2 className="text-2xl font-light font-serif italic italic px-1">Địa chỉ</h2>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {[
                    { name: "Nhà", icon: MapPin },
                    { name: "Công ty", icon: MapPin },
                  ].map(loc => (
                    <div key={loc.name} className="p-4 md:p-6 rounded-[2.5rem] bg-muted/40 hover:bg-muted transition-all cursor-pointer group text-center flex flex-col items-center gap-3 border border-transparent hover:border-primary/20">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-all shadow-sm">
                           <loc.icon className="w-5 h-5 md:w-6 md:h-6" />
                        </div>
                        <p className="font-black text-[10px] md:text-xs uppercase tracking-widest">{loc.name}</p>
                    </div>
                  ))}
                </div>
            </section>
        </div>
      </Container>
    </div>
  );
}
