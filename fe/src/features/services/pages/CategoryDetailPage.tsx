'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Wrench, 
  Sparkles, 
  Scissors, 
  HeartPulse, 
  BookOpen, 
  Dumbbell, 
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  CheckCircle2,
  Sparkles as SparklesIcon,
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Container from "@/components/Container";
import ServiceCard from "../_components/ServiceCard";
import { 
  containerVariants, 
  headingVariants 
} from "../motions/service.motion";

// Dữ liệu mẫu (Thực tế nên lấy từ API)
const CATEGORY_MAP: Record<string, any> = {
  "repair": { 
    icon: Wrench, 
    label: "Sửa chữa", 
    color: "text-blue-500", 
    bg: "rgba(59, 130, 246, 0.1)", 
    theme: "#3b82f6",
    desc: "Khắc phục mọi sự cố điện nước, điều hòa và gia dụng trong ngôi nhà của bạn với đội ngũ kỹ thuật viên tay nghề cao.",
    image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1600&q=80"
  },
  "cleaning": { 
    icon: Sparkles, 
    label: "Dọn dẹp", 
    color: "text-emerald-500", 
    bg: "rgba(16, 185, 129, 0.1)", 
    theme: "#10b981",
    desc: "Không gian sống sạch bóng với đội ngũ vệ sinh chuyên nghiệp, tận tâm và hóa chất an toàn cho sức khỏe.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6954?w=1600&q=80"
  },
  "beauty": { 
    icon: Scissors, 
    label: "Làm đẹp", 
    color: "text-rose-500", 
    bg: "rgba(244, 63, 94, 0.1)", 
    theme: "#f43f5e",
    desc: "Chăm sóc nhan sắc và thư giãn cơ thể ngay tại sự thoải mái của ngôi nhà bạn bởi các chuyên gia spa hàng đầu.",
    image: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=1600&q=80"
  },
  "health": { 
    icon: HeartPulse, 
    label: "Sức khỏe", 
    color: "text-red-500", 
    bg: "rgba(239, 68, 68, 0.1)", 
    theme: "#ef4444",
    desc: "Dịch vụ y tế tại gia, chăm sóc sức khỏe toàn diện cho bạn và người thân với sự tận tâm như người nhà.",
    image: "https://images.unsplash.com/photo-1576091160550-2173bdd99625?w=1600&q=80"
  },
  "tutor": { 
    icon: BookOpen, 
    label: "Gia sư", 
    color: "text-amber-500", 
    bg: "rgba(245, 158, 11, 0.1)", 
    theme: "#f59e0b",
    desc: "Nâng tầm kiến thức với đội ngũ gia sư giỏi, phương pháp sư phạm hiện đại và lộ trình học tập cá nhân hóa.",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1600&q=80"
  },
  "fitness": { 
    icon: Dumbbell, 
    label: "Fitness", 
    color: "text-violet-500", 
    bg: "rgba(139, 92, 246, 0.1)", 
    theme: "#8b5cf6",
    desc: "Luyện tập hiệu quả cùng huấn luyện viên cá nhân, duy trì cơ thể khỏe mạnh và tinh thần sảng khoái mỗi ngày.",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80"
  },
};

const DUMMY_SERVICES = [
  ...Array(4).fill(null).map((_, i) => ({
    id: i + 1,
    title: "Dịch vụ tiêu chuẩn " + (i + 1),
    desc: "Mô tả dịch vụ chi tiết cho khách hàng tham khảo.",
    image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&q=80",
    tag: "Dịch vụ", rating: "4.9", reviews: "45",
    price: "250.000đ", unit: "/ lần", duration: "1–2 giờ",
    bookingUrl: "/booking/service-" + (i + 1),
    categoryId: "repair"
  }))
];

const EXPERTS = [
  { name: "Nguyễn Văn A", role: "Kỹ thuật", rating: 4.9, avatar: "https://i.pravatar.cc/150?u=1" },
  { name: "Trần Thị B", role: "Thợ lành nghề", rating: 5.0, avatar: "https://i.pravatar.cc/150?u=2" },
  { name: "Lê Văn C", role: "Kỹ sư", rating: 4.8, avatar: "https://i.pravatar.cc/150?u=3" },
  { name: "Phạm Minh D", role: "Vệ sinh", rating: 4.9, avatar: "https://i.pravatar.cc/150?u=4" },
];

export const CategoryDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  
  const category = CATEGORY_MAP[slug] || { 
    icon: SparklesIcon, 
    label: slug?.charAt(0).toUpperCase() + slug?.slice(1) || "Dịch vụ", 
    color: "text-primary", 
    bg: "rgba(var(--primary), 0.1)",
    theme: "hsl(var(--primary))",
    desc: "Khám phá các dịch vụ chất lượng cao trong danh mục này.",
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1600&q=80"
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setBy] = useState("popular");

  const filteredServices = useMemo(() => {
    return DUMMY_SERVICES.filter(s => 
      s.categoryId === slug && 
      (s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       s.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, slug]);

  const Icon = category.icon;

  return (
    <div className="category-detail-page min-h-screen bg-background text-foreground transition-colors duration-300 relative overflow-hidden">
      {/* Dynamic Background */}
      <div 
        className="absolute top-0 left-0 w-full h-[70vh] opacity-[0.05] pointer-events-none"
        style={{ 
          background: `radial-gradient(circle at 70% 20%, ${category.theme}, transparent 40%), radial-gradient(circle at 20% 60%, var(--primary), transparent 30%)`,
          filter: 'blur(100px)'
        }} 
      />

      {/* Hero Header Section */}
      <section className="relative pt-24 pb-16 md:pt-40 md:pb-32 overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 z-0">
          <img 
            src={category.image} 
            alt={category.label} 
            className="w-full h-full object-cover opacity-[0.05] md:opacity-[0.07] scale-110 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/80 to-background" />
        </div>

        <Container className="px-5 md:px-0">
          <div className="relative z-10">
            {/* Breadcrumb */}
            <motion.nav 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-[9px] md:text-[11px] uppercase tracking-[0.3em] font-black text-muted-foreground/40 mb-10 md:mb-16"
            >
              <button 
                onClick={() => router.push('/categories')} 
                className="hover:text-primary transition-colors flex items-center gap-2 group p-1 -ml-1"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                D.MỤC
              </button>
              <ChevronRight className="w-2.5 h-2.5 opacity-20" />
              <span className="text-foreground/60 truncate max-w-[100px] md:max-w-none">{category.label}</span>
            </motion.nav>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 md:gap-24">
              <motion.div 
                className="max-w-4xl"
                variants={headingVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-6 md:gap-8 mb-8 md:mb-10 group">
                  <div className={`w-16 h-16 md:w-28 md:h-28 rounded-2xl md:rounded-[2.5rem] bg-card border border-border/80 flex items-center justify-center shadow-2xl transition-all duration-700 group-hover:rotate-[15deg] group-hover:scale-110 relative shrink-0`}>
                    <div className="absolute inset-0 rounded-2xl md:rounded-[2.5rem] opacity-20 blur-xl" style={{ backgroundColor: category.theme }} />
                    <Icon className="w-8 h-8 md:w-14 md:h-14 relative z-10" style={{ color: category.theme }} />
                  </div>
                  <div>
                    <Badge className="mb-3 md:mb-4 px-3 py-1 bg-primary/10 text-primary border-primary/20 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest w-fit">
                      Chuyên gia hàng đầu
                    </Badge>
                    <h1 
                      className="text-[clamp(40px,10vw,92px)] font-light tracking-[-0.04em] leading-[0.9] text-foreground text-balance"
                      style={{ fontFamily: "'Times New Roman', serif" }}
                    >
                      {category.label}
                    </h1>
                  </div>
                </div>
                
                <p 
                  className="text-muted-foreground text-base md:text-3xl leading-relaxed mb-10 md:mb-12 font-light max-w-3xl text-pretty"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {category.desc}
                </p>

                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-6 md:gap-12">
                  <div className="flex items-center gap-4 group/item pb-4 sm:pb-0 border-b sm:border-none border-border/20">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center">
                       <CheckCircle2 className="w-5 h-5 md:w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5 md:mb-1">Tin cậy</span>
                      <span className="text-xs md:text-sm font-bold opacity-80">Xác thực 100%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group/item pb-4 sm:pb-0 border-b sm:border-none border-border/20">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                       <Users className="w-5 h-5 md:w-6 h-6 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5 md:mb-1">Quy mô</span>
                      <span className="text-xs md:text-sm font-bold opacity-80">500+ Expert</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group/item">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center">
                       <Star className="w-5 h-5 md:w-6 h-6 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5 md:mb-1">Đánh giá</span>
                      <span className="text-xs md:text-sm font-bold opacity-80">4.9/5 Points</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="flex flex-col gap-4 shrink-0 lg:w-[320px] pt-6 md:pt-0">
                <Button 
                   size="lg" 
                   className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-16 md:h-20 rounded-2xl md:rounded-[1.5rem] font-black text-base md:text-lg shadow-2xl shadow-primary/30"
                >
                  Đặt yêu cầu ngay
                </Button>
                <Button 
                   variant="outline" 
                   size="lg" 
                   className="w-full h-14 md:h-16 rounded-xl md:rounded-[1.2rem] px-8 font-bold border-border/60 bg-transparent"
                >
                  Tư vấn gói tháng
                </Button>
                <p className="text-[9px] text-center text-muted-foreground/60 uppercase tracking-widest leading-relaxed">
                   Miễn phí khảo sát & tư vấn tận nơi.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Services Content Grid */}
      <section className="py-16 md:py-32 relative z-10">
        <Container className="px-5 md:px-0">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 md:mb-20 gap-8 md:gap-10">
            <div className="flex items-center gap-4 w-full">
               <div className="w-1.5 h-10 md:w-2 md:h-12 bg-primary rounded-full shrink-0" />
               <div>
                  <h2 className="text-2xl md:text-5xl font-light text-foreground" style={{ fontFamily: "'Times New Roman', serif" }}>
                    Các gói dịch vụ
                  </h2>
                  <p className="text-muted-foreground text-[11px] md:text-sm font-light mt-1">Lựa chọn phù hợp nhất cho gia đình bạn.</p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:w-[300px] group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Tìm kiếm..."
                  className="pl-11 h-14 md:h-14 bg-card/60 backdrop-blur-xl rounded-xl md:rounded-2xl border-border/60 focus-visible:ring-primary/30 text-sm md:text-base font-light"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>

              <div className="flex items-center gap-2 bg-card/40 backdrop-blur-xl p-1 rounded-2xl border border-border/60 w-full md:w-auto overflow-hidden">
                <Badge  variant="outline" className="h-10 md:h-12 px-4 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 shrink-0 border-none rounded-none">
                  SẮP XẾP:
                </Badge>
                <Select value={sortBy} onValueChange={setBy}>
                  <SelectTrigger className="h-10 md:h-12 flex-1 md:w-[150px] border-none bg-transparent shadow-none font-bold text-[10px] md:text-[11px] uppercase tracking-widest focus:ring-0">
                    <SelectValue placeholder="Chọn" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl md:rounded-2xl border-border/60 overflow-hidden text-sans text-xs">
                    <SelectItem value="popular">Phổ biến</SelectItem>
                    <SelectItem value="price-asc">Giá thấp-cao</SelectItem>
                    <SelectItem value="price-desc">Giá cao-thấp</SelectItem>
                    <SelectItem value="rating">Đánh giá</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Grid Layout */}
          <AnimatePresence mode="popLayout">
            {filteredServices.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                layout
              >
                {filteredServices.map((service, index) => (
                  <ServiceCard 
                    key={service.id} 
                    service={service as any} 
                    index={index}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 md:py-40 bg-card/20 backdrop-blur-xl rounded-[2.5rem] md:rounded-[4rem] border border-dashed border-border/60"
              >
                <div className="w-16 h-16 md:w-24 md:h-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-8">
                  <Search className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-2xl md:text-4xl font-light text-foreground mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>Chưa có dịch vụ</h3>
                <p className="text-muted-foreground max-w-xs mx-auto text-sm md:text-lg font-light leading-relaxed">
                   Hãy liên hệ hỗ trợ để được báo giá riêng!
                </p>
                <Button 
                   variant="outline" 
                   className="mt-10 rounded-xl px-10 h-12 md:h-14 font-black border-primary/30 text-primary text-xs"
                   onClick={() => setSearchQuery("")}
                >
                  Xem tất cả gói
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </section>

      {/* Experts Horizontal on Mobile */}
      <section className="py-16 md:py-40 bg-card/20 relative overflow-hidden">
        <Container className="px-5 md:px-0">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between mb-12 md:mb-24 gap-6">
             <div className="max-w-2xl">
                <Badge className="mb-4 px-3 py-1 bg-blue-500/10 text-blue-500 border-blue-500/20 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">
                   Tinh nhuệ
                </Badge>
                <h2 className="text-3xl md:text-7xl font-light text-foreground leading-[1.1]" style={{ fontFamily: "'Times New Roman', serif" }}>
                  Chuyên gia <span className="italic text-primary">{category.label}</span>
                </h2>
             </div>
             <Button variant="link" className="text-primary font-black text-[10px] md:text-sm uppercase tracking-widest p-0">
                Tất cả chuyên gia <ArrowRight className="ml-2 w-3.5 h-3.5" />
             </Button>
          </div>

          <div className="flex overflow-x-auto pb-8 gap-5 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0 md:grid md:grid-cols-4">
             {EXPERTS.map((expert, i) => (
               <motion.div 
                 key={i}
                 className="shrink-0 w-[240px] md:w-auto bg-background p-6 md:p-8 rounded-[2rem] md:rounded-[2.8rem] border border-border/40 text-center"
               >
                  <div className="relative w-20 h-20 md:w-28 md:h-28 mx-auto mb-6 md:mb-8">
                     <img src={expert.avatar} alt={expert.name} className="w-full h-full rounded-full mx-auto p-1 bg-background object-cover" />
                     <div className="absolute -bottom-1 right-1 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-background z-20">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                     </div>
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-0.5">{expert.name}</h4>
                  <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest mb-4">{expert.role}</p>
                  <div className="flex items-center justify-center gap-1.5 py-2 px-4 bg-card/40 rounded-xl border border-border/20 w-fit mx-auto">
                     <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                     <span className="text-xs font-black">{expert.rating}</span>
                  </div>
               </motion.div>
             ))}
          </div>
        </Container>
      </section>

      {/* Why choose Section */}
      <section className="py-16 md:py-40">
        <Container className="px-5 md:px-0">
          <div className="flex flex-col gap-12 lg:flex-row lg:gap-20 items-center">
             <div className="w-full lg:w-1/2 relative">
                <div className="aspect-[4/3] rounded-[2rem] md:rounded-[4rem] overflow-hidden shadow-2xl relative z-10">
                   <img 
                    src={category.image} 
                    alt="Why choose us" 
                    className="w-full h-full object-cover" 
                   />
                </div>
                {/* Decoration */}
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl z-0" />
             </div>

             <div className="w-full lg:w-1/2 flex flex-col gap-8 md:gap-12 text-sans">
                <div className="space-y-4 md:space-y-6">
                   <h2 className="text-3xl md:text-6xl font-light text-foreground leading-tight" style={{ fontFamily: "'Times New Roman', serif" }}>
                     Tại sao nên đặt tại <span className="italic text-primary">KingOfService</span>?
                   </h2>
                   <p className="text-muted-foreground text-sm md:text-lg font-light leading-relaxed">
                     Thấu hiểu nỗi lo của bạn khi để người lạ vào nhà.
                   </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                   {[
                     { icon: ShieldCheck, title: "An toàn", desc: "Xác minh qua 3 lớp hồ sơ định danh." },
                     { icon: Clock, title: "Tiết kiệm", desc: "Giá tối ưu hơn so với thợ lẻ ngoài." },
                     { icon: MapPin, title: "Phủ sóng", desc: "Hơn 500 điểm cầu hỗ trợ toàn quốc." },
                     { icon: TrendingUp, title: "Real-time", desc: "Theo dõi tiến độ trực tiếp trên App." }
                   ].map((item, i) => (
                     <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-card border border-border/80 flex items-center justify-center">
                           <item.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                           <h4 className="text-sm font-bold mb-1">{item.title}</h4>
                           <p className="text-[11px] text-muted-foreground leading-relaxed font-light">{item.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>

                <Separator className="bg-border/40" />

                <div className="flex items-center gap-6">
                   <div className="flex -space-x-3 shrink-0">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                           <img src={`https://i.pravatar.cc/100?u=${i+20}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full bg-card border-2 border-background flex items-center justify-center text-[8px] font-black italic">+14k</div>
                   </div>
                   <p className="text-[10px] md:text-xs font-light text-muted-foreground leading-tight">
                      Hơn <span className="font-bold text-foreground">14.000 khách hàng</span> <br/> tin tưởng trong tuần qua.
                   </p>
                </div>
             </div>
          </div>
        </Container>
      </section>

      {/* FAQ Mini */}
      <section className="pb-24 md:pb-32">
        <Container className="px-5 md:px-0">
           <div className="bg-card/40 backdrop-blur-md border border-border/60 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-20 text-sans">
              <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
                 <h2 className="text-2xl md:text-4xl font-light mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>Thắc mắc phổ biến</h2>
                 <p className="text-muted-foreground text-xs md:text-base font-light">Giải đáp nhanh cho bạn.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-x-20">
                 {[
                   { q: "Giá có thay đổi sau khi thợ đến không?", a: "Tuyệt đối KHÔNG. Giá được niêm yết cố định." },
                   { q: "Chuyên gia đến trễ phải làm sao?", a: "Chúng tôi cam kết bồi thường 50k cho mỗi 30 phút." },
                   { q: "Tôi có được thay đổi chuyên gia?", a: "Có, bạn có quyền yêu cầu đổi trước 2 tiếng." },
                   { q: "Cần chuẩn bị gì trước khi thợ đến?", a: "Chỉ cần dọn đồ giá trị ra khỏi khu vực làm việc." }
                 ].map((item, i) => (
                   <div key={i} className="group">
                      <h4 className="text-sm md:text-lg font-bold mb-2 flex gap-2 text-foreground/80">
                        <span className="text-primary">Q.</span> {item.q}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-6 border-l border-primary/20">{item.a}</p>
                   </div>
                 ))}
              </div>
           </div>
        </Container>
      </section>
    </div>
  );
};

export default CategoryDetailPage;
