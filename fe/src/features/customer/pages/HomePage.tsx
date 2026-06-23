'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Wind, Home, Shirt, Bug, Armchair, Briefcase, Clock, MapPin, ChevronRight, Search, ArrowRight, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Container from '@/components/Container';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { adminServicesApi } from '@/features/admin/modules/service/services/admin-services.service';

// Mock Categories for beautiful frontend design (Backend doesn't manage categories directly in DB)
const mockCategories = [
  { id: "cat-1", name: "Dọn nhà", slug: "don-nha", iconUrl: null },
  { id: "cat-2", name: "Giặt là", slug: "giat-la", iconUrl: null },
  { id: "cat-3", name: "Sửa chữa", slug: "sua-chua", iconUrl: null },
  { id: "cat-4", name: "Khử khuẩn", slug: "khu-khuan", iconUrl: null },
  { id: "cat-5", name: "Vệ sinh đệm", slug: "ve-sinh-dem", iconUrl: null },
  { id: "cat-6", name: "Vệ sinh sofa", slug: "ve-sinh-sofa", iconUrl: null },
  { id: "cat-7", name: "Trông trẻ", slug: "trong-tre", iconUrl: null },
];

// Predefined palette for categories
const CATEGORY_PALETTE = [
  { color: "text-emerald-600", bg: "bg-emerald-500/10", icon: Sparkles },
  { color: "text-cyan-600", bg: "bg-cyan-500/10", icon: Wind },
  { color: "text-indigo-600", bg: "bg-indigo-500/10", icon: Home },
  { color: "text-blue-600", bg: "bg-blue-500/10", icon: Shirt },
  { color: "text-red-600", bg: "bg-red-500/10", icon: Bug },
  { color: "text-amber-600", bg: "bg-amber-500/10", icon: Armchair },
  { color: "text-foreground/90", bg: "bg-muted/10", icon: Briefcase },
];

const PROMOS = [
  { title: "Giảm 30% dọn dẹp", code: "CLEAN30", img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80" },
  { title: "Vệ sinh máy lạnh 199k", code: "AC199", img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80" },
  { title: "Giảm 50k giặt Sofa", code: "SOFA50", img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80" },
];

const ONGOING_SERVICE = {
  id: "#B0982",
  label: "Nhân viên đang di chuyển",
  time: "Sẽ đến lúc 09:15",
  service: "Dọn nhà chuyên sâu",
  avatar: "https://i.pravatar.cc/150?u=hang"
};

export default function AppleStyleHomePage() {
  const categories = mockCategories;
  const isCategoriesLoading = false;

  const { data, isLoading: isServicesLoading } = useQuery({
    queryKey: ["services", "customer-active-list-home"],
    queryFn: () => adminServicesApi.getServices({ isActive: true, limit: 10 }),
  });
  
  const services = data?.items || [];

  return (
    <div className="bg-background min-h-screen pb-safe font-sans selection:bg-primary/20">
      
      {/* 1. Header & Search - Glassmorphism Sticky Bar */}
      <div className="sticky top-[64px] z-30 transition-all bg-background/70 backdrop-blur-xl border-b border-border/30">
        <Container className="py-4 md:py-6">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-0">
            <h1 className="hidden md:block text-2xl lg:text-3xl font-bold text-center mb-6 tracking-tight text-foreground">
               Xin chào, bạn cần dịch vụ gì hôm nay?
            </h1>
            <div className="relative group">
               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
               </div>
               <input 
                 type="text" 
                 placeholder="Tìm dịch vụ, thợ hoặc mã đơn..." 
                 className="w-full h-12 md:h-14 pl-12 pr-4 bg-muted/50 border border-transparent rounded-[1.25rem] text-sm md:text-base focus:bg-background focus:ring-[3px] focus:ring-primary/20 focus:border-primary/30 transition-all outline-none shadow-sm placeholder:text-muted-foreground/60"
               />
            </div>
          </div>
        </Container>
      </div>

      <Container className="space-y-10 md:space-y-14 px-4 md:px-8 lg:px-0 mt-6">
        
        {/* 2. Live Activity - iOS Dynamic Island Inspired Widget */}
        {ONGOING_SERVICE && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto"
          >
            <Link href="/customer/activity/1">
              <div className="relative bg-card border border-border/40 rounded-[2rem] p-4 md:p-5 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer group overflow-hidden">
                {/* Subtle Pulse Background */}
                <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="relative shrink-0">
                    <img src={ONGOING_SERVICE.avatar} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="Tasker" />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-[3px] border-card" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5 truncate">{ONGOING_SERVICE.label}</p>
                    <p className="text-base md:text-lg font-semibold truncate text-foreground">{ONGOING_SERVICE.service}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-medium">
                       <Clock className="w-3.5 h-3.5 text-primary/80" />
                       {ONGOING_SERVICE.time}
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0 relative z-10">
                   <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* 3. Main Services Grid - Apple Control Center Style */}
        <section className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-y-6 gap-x-3 md:gap-x-6">
            {isCategoriesLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <Skeleton className="w-[4.25rem] h-[4.25rem] md:w-20 md:h-20 rounded-[1.5rem] md:rounded-[1.75rem]" />
                  <Skeleton className="w-16 h-3" />
                </div>
              ))
            ) : (
              categories?.map((cat, index) => {
                const palette = CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
                const Icon = palette.icon;
                
                return (
                  <Link key={cat.id} href="/customer/catalog" className="group flex flex-col items-center gap-3">
                    <motion.div 
                      whileTap={{ scale: 0.92 }}
                      className={cn(
                        "w-[4.25rem] h-[4.25rem] md:w-20 md:h-20 bg-card rounded-[1.5rem] md:rounded-[1.75rem] flex items-center justify-center border border-border/30 shadow-sm transition-all group-hover:shadow-md"
                      )}
                    >
                      <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors", palette.bg, palette.color)}>
                        {cat.iconUrl ? (
                          <img src={cat.iconUrl} alt={cat.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                        )}
                      </div>
                    </motion.div>
                    <span className="text-[11px] md:text-xs font-semibold text-center leading-tight text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2 px-1">
                      {cat.name}
                    </span>
                  </Link>
                );
              })
            )}
            
            {/* View All Button */}
            <Link href="/customer/catalog" className="group flex flex-col items-center gap-3">
               <motion.div 
                 whileTap={{ scale: 0.92 }}
                 className="w-[4.25rem] h-[4.25rem] md:w-20 md:h-20 bg-card rounded-[1.5rem] md:rounded-[1.75rem] flex items-center justify-center border border-border/30 shadow-sm transition-all group-hover:shadow-md"
               >
                 <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors bg-gray-500/10 text-gray-500">
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                 </div>
               </motion.div>
               <span className="text-[11px] md:text-xs font-semibold text-center leading-tight text-foreground/80 group-hover:text-foreground transition-colors line-clamp-2 px-1">
                 Tất cả
               </span>
            </Link>
          </div>
        </section>

        {/* 4. Promos - App Store Editorial Style */}
        <section className="w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Ưu đãi hôm nay</h2>
            </div>
            <Link href="/promos" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Xem tất cả</Link>
          </div>
          
          <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0">
             {PROMOS.map((promo) => (
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  key={promo.title} 
                  className="min-w-[85vw] md:min-w-[320px] h-[220px] rounded-[2rem] relative overflow-hidden snap-center flex flex-col justify-end p-6 group cursor-pointer shadow-sm"
                >
                   {/* Background Image */}
                   <img src={promo.img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                   
                   {/* Gradient Overlay for Text Readability */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                   
                   <div className="relative z-10 flex items-end justify-between w-full">
                      <div>
                        <Badge className="bg-card/20 text-white hover:bg-card/30 backdrop-blur-md mb-3 text-[10px] uppercase tracking-wider font-bold border-none">
                          {promo.code}
                        </Badge>
                        <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">{promo.title}</h3>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-card/20 backdrop-blur-md flex items-center justify-center shrink-0">
                         <ArrowRight className="w-5 h-5 text-white" />
                      </div>
                   </div>
                </motion.div>
             ))}
          </div>
        </section>

        {/* Popular Services Section */}
        <section className="w-full max-w-7xl mx-auto mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Dịch vụ phổ biến</h2>
              <p className="text-sm text-muted-foreground mt-1">Các dịch vụ được đặt nhiều nhất</p>
            </div>
            <Link href="/customer/catalog" className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Xem tất cả</Link>
          </div>
          
          <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0">
             {isServicesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="min-w-[80vw] md:min-w-[280px] h-[160px] rounded-[1.5rem] snap-center shrink-0" />
                ))
             ) : (
                services?.map((srv) => (
                  <motion.div 
                    whileTap={{ scale: 0.98 }}
                    key={srv.id} 
                    className="min-w-[80vw] md:min-w-[280px] bg-card border border-border/40 rounded-[1.5rem] p-5 flex flex-col justify-between snap-center group cursor-pointer shadow-sm hover:shadow-md transition-all shrink-0"
                  >
                     <div className="flex items-start gap-4 mb-4">
                       <div className="w-14 h-14 rounded-2xl bg-muted overflow-hidden shrink-0">
                         {srv.thumbnailUrl ? (
                           <img src={srv.thumbnailUrl} className="w-full h-full object-cover" alt={srv.name} />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                             <Sparkles className="w-6 h-6" />
                           </div>
                         )}
                       </div>
                       <div>
                         <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">{srv.name}</h3>
                         {srv.baseDurationHours && (
                           <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                             <Clock className="w-3.5 h-3.5" />
                             {srv.baseDurationHours} giờ
                           </div>
                         )}
                       </div>
                     </div>
                     <Link href={`/booking/${srv.id}`}>
                       <Button variant="secondary" className="w-full rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all font-semibold h-10 text-sm">
                          Đặt ngay
                       </Button>
                     </Link>
                  </motion.div>
                ))
             )}
          </div>
        </section>

        {/* 5. Activity & Locations - iOS Settings Style Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pb-24 max-w-6xl mx-auto">
            
            {/* History */}
            <section>
                <h2 className="text-lg font-bold mb-4 tracking-tight px-2">Gần đây</h2>
                <div className="bg-card border border-border/40 rounded-[2rem] p-2 shadow-sm">
                  {[
                    { label: "Dọn dẹp căn hộ", time: "Hôm qua", price: "200.000đ", isLast: false },
                    { label: "Sửa máy giặt", time: "2 ngày trước", price: "350.000đ", isLast: true },
                  ].map(act => (
                    <div key={act.label} className="relative">
                      <div className="p-3 md:p-4 rounded-[1.5rem] flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[1.1rem] bg-muted flex items-center justify-center text-muted-foreground">
                               <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-[15px]">{act.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{act.time} • {act.price}</p>
                            </div>
                         </div>
                         <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                      </div>
                      {/* Divider */}
                      {!act.isLast && <div className="absolute bottom-0 left-[4.5rem] right-4 h-[1px] bg-border/40" />}
                    </div>
                  ))}
                </div>
            </section>

            {/* Locations */}
            <section>
                <h2 className="text-lg font-bold mb-4 tracking-tight px-2">Địa chỉ đã lưu</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "Nhà riêng", desc: "Đường số 1", icon: MapPin },
                    { name: "Công ty", desc: "Quận 1", icon: MapPin },
                  ].map(loc => (
                    <motion.div 
                      whileTap={{ scale: 0.96 }}
                      key={loc.name} 
                      className="p-5 rounded-[2rem] bg-card border border-border/40 hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                           <loc.icon className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-[15px]">{loc.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{loc.desc}</p>
                    </motion.div>
                  ))}
                </div>
            </section>

        </div>
      </Container>
    </div>
  );
}
