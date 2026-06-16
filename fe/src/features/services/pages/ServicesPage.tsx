'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ChevronDown, 
  LayoutGrid, 
  Sparkles, 
  Paintbrush, 
  Droplets, 
  Building,
  Wind,
  Sun,
  ArrowUpDown,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Container from '@/components/Container';
import ServiceCard from '../_components/ServiceCard';
import { BookingStepper } from '../_components/BookingStepper';
import { ServiceItem } from '@/features/services/types/service.type';
import { cn } from '@/lib/utils';
import { headingVariants, containerVariants } from '../motions/service.motion';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: LayoutGrid },
  { id: 'hourly', label: 'Dọn theo giờ', icon: Sparkles },
  { id: 'deep', label: 'Tổng vệ sinh', icon: Paintbrush },
  { id: 'sofa', label: 'Giặt Sofa/Nệm', icon: Droplets },
  { id: 'office', label: 'Tạp vụ VP', icon: Building },
  { id: 'curtain', label: 'Vệ sinh rèm', icon: Wind },
  { id: 'glass', label: 'Vệ sinh kính', icon: Sun },
];

const MOCK_SERVICES: ServiceItem[] = [
  {
    id: 1,
    title: "Dọn dẹp nhà theo giờ",
    desc: "Giải pháp dọn dẹp linh hoạt, đặt lịch nhanh chóng. Người giúp việc có mặt sau 60 phút.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    tag: "Phổ biến nhất", rating: "4.9", reviews: "12.5k",
    price: "70.000đ", unit: "/ giờ", duration: "Từ 2 giờ",
    bookingUrl: "/customer",
  },
  {
    id: 2,
    title: "Tổng vệ sinh chuyên sâu",
    desc: "Làm sạch toàn diện nhà mới xây, nhà lâu ngày không dọn. Bao gồm máy móc chuyên dụng.",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80",
    tag: "Chuyên sâu", rating: "5.0", reviews: "3.2k",
    price: "150.000đ", unit: "/ buổi", duration: "4–8 giờ",
    bookingUrl: "/customer",
  },
  {
    id: 3,
    title: "Giặt Sofa & Nệm tại nhà",
    desc: "Giặt sạch vết bẩn, khử mùi và diệt khuẩn 99% bằng công nghệ phun hút hơi nước nóng.",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
    tag: "Bảo vệ sức khoẻ", rating: "4.8", reviews: "8.1k",
    price: "250.000đ", unit: "/ bộ", duration: "1.5–2 giờ",
    bookingUrl: "/customer",
  },
  {
    id: 4,
    title: "Vệ sinh sau xây dựng",
    desc: "Làm sạch triệt để xi măng, sơn thừa, bụi mịn công trình. Đội ngũ đông đảo, thiết bị công nghiệp.",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
    tag: "Dự án mới", rating: "4.9", reviews: "1.2k",
    price: "15.000đ", unit: "/ m2", duration: "1-2 ngày",
    bookingUrl: "/customer",
  },
  {
    id: 5,
    title: "Vệ sinh rèm cửa",
    desc: "Tháo lắp giặt sấy tận xưởng hoặc giặt hơi nước tại nhà. Trả lại phom dáng chuẩn.",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80",
    tag: "Làm sạch", rating: "4.7", reviews: "5.5k",
    price: "120.000đ", unit: "/ kg", duration: "Trong ngày",
    bookingUrl: "/customer",
  },
  {
    id: 6,
    title: "Tạp vụ văn phòng",
    desc: "Cung cấp nhân sự vệ sinh văn phòng chuyên nghiệp, đảm bảo không gian làm việc xanh sạch.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    tag: "Dành cho DN", rating: "4.9", reviews: "900+",
    price: "65.000đ", unit: "/ giờ", duration: "Định kỳ",
    bookingUrl: "/customer",
  },
  {
    id: 7,
    title: "Phun khử khuẩn không gian",
    desc: "Khử khuẩn và diệt virus không gian sống bằng dung dịch an toàn cho sức khỏe và trẻ nhỏ.",
    image: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=800&q=80",
    tag: "Mùa dịch", rating: "4.8", reviews: "2.3k",
    price: "300.000đ", unit: "/ lần", duration: "1 giờ",
    bookingUrl: "/customer",
  },
  {
    id: 8,
    title: "Vệ sinh kính mặt ngoài",
    desc: "Đội ngũ đu dây chuyên nghiệp, trang thiết bị bảo hộ an toàn làm sạch kính nhà cao tầng.",
    image: "https://images.unsplash.com/photo-1504913659239-6abc87875a63?w=800&q=80",
    tag: "Đặc biệt", rating: "5.0", reviews: "450",
    price: "30.000đ", unit: "/ m2", duration: "Tùy quy mô",
    bookingUrl: "/customer",
  }
];

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Booking modal state for demo
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  const handleBook = (service: ServiceItem) => {
    setSelectedService(service);
    setBookingModalOpen(true);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 font-sans">
      {/* 1. Header Section */}
      <section className="relative pt-8 md:pt-16 pb-12 md:pb-20 overflow-hidden">
        {/* Background Depth Decor */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
           <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px]" />
           <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        <Container>
          <motion.div
            variants={headingVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center space-y-4 md:space-y-6 relative z-10"
          >
             <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10 px-5 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest leading-none shadow-sm flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Dịch vụ dọn dẹp hàng đầu
             </Badge>
             
             <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.15] text-slate-900 dark:text-white">
                Khám phá dịch vụ <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">hoàn hảo cho tổ ấm</span>
             </h1>
             
             <p className="text-slate-500 dark:text-slate-400 font-medium text-sm md:text-lg max-w-2xl px-4 mt-2">
                Đặt lịch dọn dẹp chỉ trong vài thao tác. Đội ngũ chuyên gia CleanZ luôn sẵn sàng mang lại không gian sống sạch sẽ và thảnh thơi.
             </p>

             {/* Main Search Bar */}
             <div className="w-full max-w-3xl mt-8 md:mt-12 group">
                <div className="relative p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] md:rounded-full shadow-xl shadow-primary/5 flex flex-col md:flex-row items-center focus-within:border-primary/50 focus-within:ring-4 ring-primary/10 transition-all duration-300 gap-2 md:gap-0">
                   <div className="flex-1 flex items-center pl-4 w-full h-12 md:h-14">
                      <Search className="w-5 h-5 text-primary shrink-0 mr-3" />
                      <input 
                        type="text" 
                        placeholder="Bạn cần dịch vụ gì hôm nay?..." 
                        className="w-full bg-transparent border-none outline-none text-sm md:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 h-full"
                      />
                   </div>
                   <div className="w-full md:w-auto flex justify-end">
                      <Button className="w-full md:w-auto h-12 md:h-14 px-8 rounded-xl md:rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg hover:-translate-y-0.5 transition-all">
                         Tìm kiếm
                      </Button>
                   </div>
                </div>
             </div>
          </motion.div>
        </Container>
      </section>

      {/* 2. Navigation & Filter Bar */}
      <section className="sticky top-16 md:top-20 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 py-4 shadow-sm">
        <Container>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             {/* Category Chips - Auto Horizontal Scroll for Mobile */}
             <div className="flex-1 flex overflow-x-auto scrollbar-hide gap-2 md:gap-3 pr-4 pb-1 md:pb-0">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeTab === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveTab(cat.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary shadow-md" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-primary border-transparent hover:bg-primary/5"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isActive ? "animate-pulse" : "opacity-70")} />
                      {cat.label}
                    </button>
                  )
                })}
             </div>

             <div className="hidden md:block w-[1px] h-8 bg-slate-200 dark:bg-slate-800 mx-2" />

             {/* Filter & Sort */}
             <div className="flex items-center gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  className={cn(
                    "rounded-xl h-10 md:h-11 border-slate-200 dark:border-slate-800 font-bold text-xs gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                    isFilterOpen && "bg-slate-100 dark:bg-slate-800 border-primary/50 text-primary"
                  )}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                   <SlidersHorizontal className="w-4 h-4" />
                   <span>Bộ lọc</span>
                   <ChevronDown className={cn("w-3 h-3 transition-transform opacity-50", isFilterOpen && "rotate-180")} />
                </Button>
                <Button variant="outline" size="icon" className="rounded-xl h-10 md:h-11 w-10 md:w-11 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors">
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
                className="overflow-hidden border-t border-slate-200 dark:border-slate-800 mt-4 h-0"
              >
                 <div className="py-6 md:py-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 bg-white dark:bg-slate-900 rounded-3xl mt-2 p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="space-y-4">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sắp xếp theo</p>
                       <div className="space-y-3">
                          {['Được yêu thích nhất', 'Đánh giá cao nhất', 'Giá: Thấp đến Cao', 'Giá: Cao đến Thấp'].map((item) => (
                             <label key={item} className="flex items-center gap-3 cursor-pointer group">
                                <div className="w-4 h-4 rounded-full border-[1.5px] border-slate-300 dark:border-slate-600 group-hover:border-primary transition-all flex items-center justify-center">
                                  {item === 'Được yêu thích nhất' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                </div>
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary">{item}</span>
                             </label>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Khoảng giá</p>
                       <div className="px-2 pt-2">
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full relative">
                             <div className="absolute inset-y-0 left-0 right-1/4 bg-primary rounded-full" />
                             <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-4 bg-white border-2 border-primary rounded-full shadow cursor-pointer hover:scale-125 transition-transform" />
                             <div className="absolute top-1/2 -translate-y-1/2 right-1/4 w-4 h-4 bg-white border-2 border-primary rounded-full shadow cursor-pointer hover:scale-125 transition-transform" />
                          </div>
                          <div className="flex items-center justify-between mt-4">
                             <span className="text-xs font-bold text-slate-500">0đ</span>
                             <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">500.000đ+</span>
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Đánh giá sao</p>
                       <div className="flex flex-wrap gap-2">
                          {[5, 4, 3].map((star) => (
                             <Button key={star} variant="outline" size="sm" className="rounded-xl h-9 font-bold px-4 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">
                                {star} <Star className="w-3.5 h-3.5 ml-1.5 fill-amber-400 text-amber-400" />
                             </Button>
                          ))}
                       </div>
                    </div>
                    <div className="flex items-end justify-start md:justify-end">
                       <Button className="w-full md:w-auto h-11 rounded-xl font-bold px-8 shadow-md">
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
      <section className="mt-8 md:mt-12">
        <Container>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {MOCK_SERVICES.filter(s => activeTab === 'all' || s.title.toLowerCase().includes(activeTab === 'hourly' ? 'theo giờ' : activeTab === 'deep' ? 'tổng' : activeTab === 'sofa' ? 'sofa' : activeTab === 'office' ? 'văn phòng' : activeTab === 'curtain' ? 'rèm' : activeTab === 'glass' ? 'kính' : '')).map((service, index) => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                index={index} 
                onBook={() => handleBook(service)}
              />
            ))}
          </motion.div>

          {/* Load More Section */}
          <div className="mt-16 md:mt-20 flex flex-col items-center">
             <Button 
               variant="outline" 
               className="h-12 px-10 rounded-full border-slate-200 dark:border-slate-800 hover:border-primary hover:text-primary font-bold text-sm gap-2 group transition-all shadow-sm"
             >
                Xem thêm dịch vụ
                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
             </Button>
          </div>
        </Container>
      </section>

      {/* Booking Modal Demo */}
      <BookingStepper 
        open={bookingModalOpen} 
        onOpenChange={setBookingModalOpen} 
        service={selectedService} 
      />
    </div>
  );
}
