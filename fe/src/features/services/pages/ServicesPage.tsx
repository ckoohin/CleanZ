'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ChevronDown, 
  LayoutGrid, 
  List, 
  Sparkles, 
  Wrench, 
  HeartPulse, 
  Shirt, 
  Zap,
  Clock,
  ArrowUpDown,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Container from '@/components/Container';
import ServiceCard from '../_components/ServiceCard';
import { ServiceItem } from '@/features/home/types/service.type';
import { cn } from '@/lib/utils';
import { headingVariants, containerVariants } from '../motions/service.motion';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: LayoutGrid },
  { id: 'cleaning', label: 'Dọn dẹp', icon: Sparkles },
  { id: 'repair', label: 'Sửa chữa', icon: Wrench },
  { id: 'health', label: 'Y tế', icon: HeartPulse },
  { id: 'laundry', label: 'Giặt ủi', icon: Shirt },
  { id: 'beauty', label: 'Làm đẹp', icon: Zap },
];

const MOCK_SERVICES: ServiceItem[] = [
  {
    id: 1,
    title: "Dọn nhà chuyên sâu (Deep Cleaning)",
    desc: "Vệ sinh toàn bộ ngóc ngách, trần nhà, tường, và các vết bẩn cứng đầu lâu ngày.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800",
    tag: "Dọn dẹp",
    rating: "4.9",
    reviews: "1.2k",
    price: "450k",
    unit: "6 giờ",
    duration: "6h",
  },
  {
    id: 2,
    title: "Sửa máy lạnh & Nạp gas",
    desc: "Kiểm tra hệ thống, vệ sinh lưới lọc và nạp gas chuẩn R32/R410A cho mọi dòng máy.",
    image: "https://images.unsplash.com/photo-1621905252507-b354bcadc0d6?q=80&w=800",
    tag: "Sửa chữa",
    rating: "4.8",
    reviews: "850",
    price: "250k",
    unit: "máy",
    duration: "1.5h",
  },
  {
    id: 3,
    title: "Chăm sóc sức khỏe tại nhà",
    desc: "Bác sĩ, điều dưỡng thăm khám, thay băng, cắt chỉ và tư vấn sức khỏe định kỳ.",
    image: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?q=80&w=800",
    tag: "Y tế",
    rating: "5.0",
    reviews: "450",
    price: "500k",
    unit: "visit",
    duration: "2h",
  },
  {
    id: 4,
    title: "Giặt sấy Cao cấp (Premium Laundry)",
    desc: "Giặt riêng biệt, sấy khô và ủi phẳng. Phù hợp cho đồ vest, váy lụa và đồ hiệu.",
    image: "https://images.unsplash.com/photo-1545173153-5353591bb722?q=80&w=800",
    tag: "Giặt ủi",
    rating: "4.7",
    reviews: "2.1k",
    price: "150k",
    unit: "5kg",
    duration: "24h",
  },
  {
    id: 5,
    title: "Massage thư giãn & Spa",
    desc: "Liệu trình 90 phút tinh dầu sả chanh, đá nóng giúp giảm căng thẳng mệt mỏi.",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800",
    tag: "Làm đẹp",
    rating: "4.9",
    reviews: "920",
    price: "350k",
    unit: "90p",
    duration: "1.5h",
  },
  {
    id: 6,
    title: "Sửa đồ gia dụng (Tivi, Tủ lạnh)",
    desc: "Đội ngũ kỹ thuật viên tay nghề cao, linh kiện thay thế chính hãng có bảo hành.",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800",
    tag: "Sửa chữa",
    rating: "4.6",
    reviews: "600",
    price: "300k",
    unit: "mục",
    duration: "1h",
  },
];

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* 1. Header Section */}
      <section className="relative pt-12 md:pt-20 pb-8 md:pb-16 overflow-hidden">
        {/* Background Depth Decor */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-full pointer-events-none opacity-20">
           <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -mr-48 -mt-24" />
           <div className="absolute top-1/2 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] -ml-40" />
        </div>

        <Container>
          <motion.div
            variants={headingVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center space-y-4 md:space-y-6"
          >
             <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 px-4 py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest leading-none">
                Dịch vụ xuất sắc
             </Badge>
             <h1 className="text-4xl md:text-6xl lg:text-7xl font-light leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Mang lại <span className="italic text-primary underline underline-offset-8 decoration-primary/20">sự hài lòng</span><br className="hidden md:block"/> cho ngôi nhà của bạn
             </h1>
             <p className="text-muted-foreground font-light text-base md:text-xl max-w-2xl px-4">
                Khám phá hàng trăm dịch vụ dọn dẹp và sửa chữa chuyên nghiệp được cá nhân hóa theo yêu cầu của bạn.
             </p>

             {/* Main Search Bar */}
             <div className="w-full max-w-3xl mt-8 md:mt-12 group">
                <div className="relative p-1.5 bg-card/60 backdrop-blur-xl border border-border/60 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl shadow-primary/5 flex items-center group-focus-within:border-primary/40 transition-all duration-300">
                   <div className="flex-1 flex items-center pl-4 md:pl-6">
                      <Search className="w-4 md:w-5 h-4 md:h-5 text-muted-foreground/60 mr-3 md:mr-4 shrink-0" />
                      <input 
                        type="text" 
                        placeholder="Hôm nay bạn cần hỗ trợ gì?" 
                        className="w-full bg-transparent border-none outline-none text-sm md:text-lg font-medium text-foreground placeholder:text-muted-foreground/40 h-10 md:h-14"
                      />
                   </div>
                   <Button className="hidden md:flex h-14 px-10 rounded-[2rem] bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95">
                      Tìm kiếm ngay
                   </Button>
                   <Button size="icon" className="md:hidden w-12 h-12 rounded-2xl bg-primary text-primary-foreground">
                      <Search className="w-5 h-5" />
                   </Button>
                </div>
             </div>
          </motion.div>
        </Container>
      </section>

      {/* 2. Navigation & Filter Bar */}
      <section className="sticky top-16 z-30 bg-background/80 backdrop-blur-md border-b border-border/40 py-4 md:py-6">
        <Container>
          <div className="flex items-center justify-between gap-4">
             {/* Category Chips - Auto Horizontal Scroll for Mobile */}
             <div className="flex-1 flex overflow-x-auto scrollbar-hide gap-2 md:gap-4 pr-4">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeTab === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 z-10" 
                          : "bg-muted/30 text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/60"
                      )}
                    >
                      <Icon className={cn("w-3 md:w-4 h-3 md:h-4", isActive ? "animate-pulse" : "opacity-60")} />
                      {cat.label}
                    </button>
                  )
                })}
             </div>

             <Separator orientation="vertical" className="h-8 hidden md:block" />

             {/* Filter & Sort */}
             <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  className={cn(
                    "rounded-xl md:rounded-2xl h-10 md:h-12 border-border/60 font-black uppercase text-[9px] md:text-[11px] tracking-widest gap-2.5",
                    isFilterOpen && "bg-muted border-primary"
                  )}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                   <SlidersHorizontal className="w-3.5 md:w-4 h-3.5 md:h-4" />
                   <span className="hidden sm:inline">Bộ lọc</span>
                   <ChevronDown className={cn("w-3 h-3 transition-transform", isFilterOpen && "rotate-180")} />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-xl md:rounded-2xl text-muted-foreground hover:text-primary">
                   <ArrowUpDown className="w-4 h-4" />
                </Button>
             </div>
          </div>

          {/* Expanded Filter Panel */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-border/10 mt-4 h-0"
              >
                 <div className="py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Sắp xếp theo</p>
                       <div className="space-y-2">
                          {['Được yêu thích', 'Mới nhất', 'Giá: Thấp đến Cao', 'Giá: Cao đến Thấp'].map((item) => (
                             <label key={item} className="flex items-center gap-3 cursor-pointer group">
                                <div className="w-4 h-4 rounded-full border-2 border-border/60 group-hover:border-primary transition-all" />
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">{item}</span>
                             </label>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Khoảng giá</p>
                       <div className="px-2 pt-2">
                          <div className="h-1 bg-muted rounded-full relative">
                             <div className="absolute inset-y-0 left-0 right-1/4 bg-primary rounded-full" />
                             <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-lg cursor-pointer" />
                             <div className="absolute top-1/2 -translate-y-1/2 right-1/4 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-lg cursor-pointer" />
                          </div>
                          <div className="flex items-center justify-between mt-6">
                             <span className="text-xs font-bold">0đ</span>
                             <span className="text-xs font-bold text-primary">500.000đ</span>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Đánh giá bậc</p>
                       <div className="flex flex-wrap gap-2">
                          {[5, 4, 3].map((star) => (
                             <Button key={star} variant="outline" size="sm" className="rounded-xl h-9 font-bold px-3">
                                {star} <Star className="w-3 h-3 ml-1 fill-primary text-primary" />
                             </Button>
                          ))}
                       </div>
                    </div>
                    <div className="flex items-end justify-end">
                       <Button className="w-full md:w-auto h-12 rounded-2xl bg-foreground text-background font-black uppercase text-[10px] tracking-widest px-8">
                          Áp dụng bộ lọc
                       </Button>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </section>

      {/* 3. Service Listing Grid */}
      <section className="mt-12 md:mt-16">
        <Container>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6 md:gap-8"
          >
            {MOCK_SERVICES.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </motion.div>

          {/* Load More Section */}
          <div className="mt-20 md:mt-32 flex flex-col items-center space-y-8">
             <div className="w-1.5 h-1.5 rounded-full bg-border" />
             <div className="w-1.5 h-1.5 rounded-full bg-border/60" />
             <div className="w-1.5 h-1.5 rounded-full bg-border/20" />
             <Button 
               variant="outline" 
               className="mt-8 h-14 px-12 rounded-2xl border-border/60 hover:border-primary/40 font-black uppercase text-xs tracking-widest gap-3 group transition-all"
             >
                Tải thêm dịch vụ
                <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
             </Button>
          </div>
        </Container>
      </section>
    </div>
  );
}
