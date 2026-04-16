'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  Wrench, 
  Sparkles, 
  Scissors, 
  HeartPulse, 
  BookOpen, 
  Dumbbell, 
  Search,
  Zap,
  Paintbrush,
  Car,
  Utensils,
  Baby,
  Dog,
  ArrowRight,
  Filter,
  Star,
  ShieldCheck,
  ZapIcon,
  HelpCircle,
  TrendingUp,
  LayoutGrid
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Container from "@/components/Container";
import { 
  containerVariants, 
  itemVariants 
} from "../motions/service.motion";

const ALL_CATEGORIES = [
  { 
    id: "repair",
    icon: Wrench, 
    label: "Sửa chữa", 
    description: "Sửa điện nước, đồ gia dụng, điều hòa và nhiều hơn thế nữa.",
    color: "bg-blue-500/10 text-blue-500",
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/repair",
    count: 120,
    tags: ["Điện", "Nước", "Gia dụng"],
    featured: true
  },
  { 
    id: "cleaning",
    icon: Sparkles, 
    label: "Dọn dẹp", 
    description: "Vệ sinh nhà cửa, văn phòng, dọn dẹp sau xây dựng chuyên nghiệp.",
    color: "bg-emerald-500/10 text-emerald-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/cleaning",
    count: 85,
    tags: ["Nhà cửa", "Văn phòng"],
    featured: true
  },
  { 
    id: "beauty",
    icon: Scissors, 
    label: "Làm đẹp", 
    description: "Cắt tóc, làm móng, spa và dịch vụ chăm sóc cá nhân tận nơi.",
    color: "bg-rose-500/10 text-rose-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/beauty",
    count: 210,
    tags: ["Tóc", "Móng", "Spa"],
    featured: true
  },
  { 
    id: "health",
    icon: HeartPulse, 
    label: "Sức khỏe", 
    description: "Khám bệnh tại nhà, điều dưỡng, và các dịch vụ y tế hỗ trợ.",
    color: "bg-red-500/10 text-red-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/health",
    count: 45,
    tags: ["Bác sĩ", "Điều dưỡng"]
  },
  { 
    id: "tutor",
    icon: BookOpen, 
    label: "Gia sư", 
    description: "Dạy kèm các môn học, đóng ngoại ngữ, năng khiếu cho mọi lứa tuổi.",
    color: "bg-amber-500/10 text-amber-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/tutor",
    count: 156,
    tags: ["Toán", "Tiếng Anh", "Lập trình"]
  },
  { 
    id: "fitness",
    icon: Dumbbell, 
    label: "Fitness", 
    description: "Huấn luyện viên cá nhân, yoga, pilates tại nhà hoặc phòng tập.",
    color: "bg-violet-500/10 text-violet-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/fitness",
    count: 92,
    tags: ["Gym", "Yoga", "Pilates"]
  },
  { 
    id: "electrical",
    icon: Zap, 
    label: "Điện & Năng lượng", 
    description: "Lắp đặt hệ thống điện, năng lượng mặt trời và thiết bị thông minh.",
    color: "bg-yellow-500/10 text-yellow-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/electrical",
    count: 38,
    tags: ["Năng lượng", "Smart Home"]
  },
  { 
    id: "decoration",
    icon: Paintbrush, 
    label: "Sơn & Trang trí", 
    description: "Sơn nhà, dán tường, thiết kế nội thất và làm mới không gian.",
    color: "bg-orange-500/10 text-orange-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/decoration",
    count: 64,
    tags: ["Sơn", "Nội thất"]
  },
  { 
    id: "transport",
    icon: Car, 
    label: "Vận chuyển", 
    description: "Chuyển nhà, thuê xe tải, giao hàng cồng kềnh an toàn, nhanh chóng.",
    color: "bg-slate-500/10 text-slate-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/transport",
    count: 73,
    tags: ["Chuyển nhà", "Giao hàng"]
  },
  { 
    id: "catering",
    icon: Utensils, 
    label: "Ẩm thực", 
    description: "Nấu tiệc tại nhà, cung cấp suất ăn công nghiệp và giao đồ ăn.",
    color: "bg-cyan-500/10 text-cyan-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/catering",
    count: 89,
    tags: ["Tiệc", "Suất ăn"]
  },
  { 
    id: "babysitting",
    icon: Baby, 
    label: "Trông trẻ", 
    description: "Dịch vụ bảo mẫu, trông trẻ theo giờ đáng tin cậy và tận tâm.",
    color: "bg-pink-500/10 text-pink-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/babysitting",
    count: 32,
    tags: ["Bảo mẫu", "Trông trẻ"]
  },
  { 
    id: "pets",
    icon: Dog, 
    label: "Thú cưng", 
    description: "Chăm sóc, dắt chó đi dạo và spa cho thú cưng yêu quý của bạn.",
    color: "bg-stone-500/10 text-stone-500", 
    hoverColor: "group-hover:bg-primary group-hover:text-primary-foreground",
    href: "/services/pets",
    count: 51,
    tags: ["Chó", "Mèo", "Spa"]
  },
];

const blurVariants: Variants = {
  animate: {
    scale: [1, 1.2, 1],
    opacity: [0.2, 0.4, 0.2],
    transition: {
      duration: 10,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const STEPS = [
  {
    title: "Chọn danh mục",
    desc: "Tìm kiếm và lựa chọn lĩnh vực bạn cần hỗ trợ từ hệ sinh thái đa dạng.",
    icon: LayoutGrid
  },
  {
    title: "Lựa chọn gói",
    desc: "Xem xét các gói dịch vụ minh bạch về giá cả và thời gian thực hiện.",
    icon: ZapIcon
  },
  {
    title: "Đặt lịch & Xong",
    desc: "Xác nhận thời gian và chuyên gia của chúng tôi sẽ có mặt ngay.",
    icon: ShieldCheck
  }
];

export const CategoriesPage = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredCategories = useMemo(() => {
    let result = ALL_CATEGORIES.filter(cat => 
      cat.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (activeTab === "featured") {
      result = result.filter(cat => cat.featured);
    }

    return result;
  }, [searchQuery, activeTab]);

  return (
    <div className="categories-page min-h-screen bg-background text-foreground transition-colors duration-300 relative overflow-hidden">
      {/* Background Decor */}
      <motion.div
        variants={blurVariants}
        animate="animate"
        className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] bg-[radial-gradient(circle,rgba(var(--primary),0.15)_0%,transparent_70%)]"
      />
      <motion.div
        variants={blurVariants}
        animate="animate"
        className="pointer-events-none absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] bg-[radial-gradient(circle,rgba(var(--secondary),0.1)_0%,transparent_70%)]"
      />

      {/* Hero Header */}
      <section className="relative pt-24 pb-16 md:pt-40 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
        <Container className="px-5 md:px-0">
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 mb-6 md:mb-8 px-4 py-1.5 md:px-5 md:py-2 bg-primary/5 backdrop-blur-sm border border-primary/10 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                   Dịch vụ 5 sao
                </span>
              </div>
              
              <h1 
                className="text-[clamp(36px,10vw,84px)] font-light leading-[1.05] tracking-[-0.04em] text-foreground mb-8 md:mb-10 text-balance"
                style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
              >
                Giải pháp <span className="text-primary italic relative">
                  tối ưu
                  <svg className="absolute -bottom-1 left-0 w-full h-3 text-primary/20 md:h-4" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span> cho cuộc sống hiện đại
              </h1>
              
              <p 
                className="text-muted-foreground text-sm md:text-2xl mb-10 md:mb-14 max-w-3xl mx-auto leading-relaxed font-light text-pretty"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Khám phá hệ sinh thái dịch vụ đa dạng, kết nối bạn với những hàng trăm chuyên gia trên toàn quốc.
              </p>

              <div className="relative group max-w-3xl mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[1.8rem] md:rounded-[2rem] blur-lg opacity-0 group-focus-within:opacity-100 transition-all duration-700" />
                <div className="relative flex items-center bg-card/60 backdrop-blur-xl border border-border/80 rounded-[1.5rem] md:rounded-[1.8rem] shadow-2xl group-focus-within:border-primary/50 transition-all duration-500 overflow-hidden p-1.5 md:p-2">
                  <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Search className="w-5 h-5 md:w-6 h-6" />
                  </div>
                  <Input 
                    placeholder="Bạn cần hỗ trợ điều gì?..." 
                    className="flex-1 border-none shadow-none focus-visible:ring-0 h-12 md:h-14 text-sm md:text-lg pl-0 font-light"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <div className="pr-1.5 md:pr-2 block">
                     <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-[1.1rem] md:rounded-[1.2rem] px-5 md:px-8 h-12 md:h-14 font-bold text-xs md:text-base shadow-lg shadow-primary/20">
                        {searchQuery ? "Tìm" : "Tìm ngay"}
                     </Button>
                  </div>
                </div>
              </div>

              <div className="mt-8 md:mt-12 flex items-center justify-start md:justify-center gap-3 overflow-x-auto pb-4 scrollbar-hide text-muted-foreground/60 text-xs md:text-sm font-medium whitespace-nowrap">
                <div className="flex items-center gap-2 shrink-0">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Phổ biến: </span>
                </div>
                {['Sửa máy lạnh', 'Vệ sinh sofa', 'Trông trẻ', 'Gia sư Tiếng Anh'].map(tag => (
                  <button key={tag} onClick={() => setSearchQuery(tag)} className="hover:text-primary transition-colors cursor-pointer border-b border-transparent hover:border-primary/30">
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Stats Bar */}
      <section className="relative z-20 -mt-6 md:-mt-10 mb-12 md:mb-20">
        <Container className="px-5 md:px-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0 bg-card/40 backdrop-blur-md border border-border/60 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-xl divide-x-0 md:divide-x divide-border/20">
            {[
              { label: "Đối tác", value: "2.5k+" },
              { label: "Khách hàng", value: "50k+" },
              { label: "Đơn hoàn thành", value: "120k+" },
              { label: "Hài lòng", value: "99.8%" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center px-4 py-2 md:px-6 md:py-4">
                <span className="text-xl md:text-4xl font-light text-foreground mb-1 md:mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>{stat.value}</span>
                <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 text-center">{stat.label}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Categories Content */}
      <section className="py-12 md:py-20 font-sans relative z-10">
        <Container className="px-5 md:px-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 md:mb-20 gap-8 md:gap-10">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-light text-foreground mb-4 md:mb-6" style={{ fontFamily: "'Times New Roman', serif" }}>
                {searchQuery ? `Kết quả của bạn` : "Duyệt chuyên mục"}
              </h2>
              <p className="text-muted-foreground text-sm md:text-lg font-light leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Tìm thấy giải pháp tối ưu cho gia đình bạn.
              </p>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 bg-card/40 backdrop-blur-md p-1 md:p-1.5 rounded-2xl border border-border/60 shrink-0 overflow-x-auto scrollbar-hide max-w-full">
              <Button 
                variant={activeTab === "all" ? "default" : "ghost"} 
                onClick={() => setActiveTab("all")}
                className={activeTab === "all" ? "bg-primary hover:bg-primary/90 text-primary-foreground rounded-[0.8rem] md:rounded-[1rem] font-bold px-4 md:px-6 h-10 md:h-12 text-xs" : "rounded-[1rem] font-medium h-10 md:h-12 text-muted-foreground text-xs"}
              >
                Tất cả
              </Button>
              <Button 
                variant={activeTab === "featured" ? "default" : "ghost"} 
                onClick={() => setActiveTab("featured")}
                className={activeTab === "featured" ? "bg-primary hover:bg-primary/90 text-primary-foreground rounded-[0.8rem] md:rounded-[1rem] font-bold px-4 md:px-6 h-10 md:h-12 text-xs" : "rounded-[1rem] font-medium h-10 md:h-12 text-muted-foreground text-xs"}
              >
                Nổi bật
              </Button>
              <Separator orientation="vertical" className="h-5 mx-1 md:h-6 md:mx-2 bg-border/40" />
              <Button 
                variant="outline" 
                className="rounded-[0.8rem] md:rounded-[1rem] border-border/60 font-medium px-4 md:px-6 h-10 md:h-12 text-xs"
              >
                <Filter className="w-3.5 h-3.5 mr-2 text-primary" />
                Lọc
              </Button>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredCategories.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                layout
              >
                {filteredCategories.map((cat) => (
                  <motion.div key={cat.id} variants={itemVariants} layout transition={{ duration: 0.4 }}>
                    <Card 
                      className="group relative h-full bg-card/40 backdrop-blur-md border border-border/40 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col rounded-[2.2rem] md:rounded-[2.8rem]"
                      onClick={() => router.push(cat.href)}
                    >
                      <div className="absolute top-0 right-0 w-32 md:w-40 h-32 md:h-40 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-[100px] md:rounded-bl-[120px] transition-transform duration-1000 group-hover:scale-150" />
                      
                      <CardContent className="p-8 md:p-10 relative z-10 flex flex-col h-full">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center ${cat.color} ${cat.hoverColor} mb-6 md:mb-8 transition-all duration-500 shadow-sm group-hover:rotate-[15deg] group-hover:scale-110`}>
                          <cat.icon className="w-6 h-6 md:w-8 h-8 transition-transform duration-500" />
                        </div>
                        
                        <div className="mb-6 md:mb-8 flex-1">
                          <h3 
                            className="text-xl md:text-3xl font-light text-foreground mb-3 md:mb-4 group-hover:text-primary transition-colors flex items-center gap-2"
                            style={{ fontFamily: "'Times New Roman', serif" }}
                          >
                            {cat.label}
                            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 text-primary" />
                          </h3>
                          <p 
                            className="text-muted-foreground text-xs md:text-sm line-clamp-3 leading-relaxed md:leading-loose font-light"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {cat.description}
                          </p>
                        </div>

                        <div className="mt-auto pt-6 md:pt-8 border-t border-border/20">
                          <div className="flex flex-wrap gap-2 mb-6 md:mb-8">
                            {cat.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[8px] md:text-[9px] uppercase tracking-widest font-black text-muted-foreground/40 bg-foreground/[0.03] px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-border/40 hover:bg-primary/5 hover:text-primary transition-colors">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mb-0.5">Quy mô</span>
                              <span className="text-xs font-bold text-foreground">
                                {cat.count}+ DỊCH VỤ
                              </span>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-border/60 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-500">
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 md:py-40 bg-card/20 backdrop-blur-xl rounded-[3rem] md:rounded-[4rem] border border-dashed border-border/60"
              >
                <div className="w-16 h-16 md:w-24 md:h-24 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-8 overflow-hidden relative">
                   <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                   <Search className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/40 relative z-10" />
                </div>
                <h3 className="text-2xl md:text-4xl font-light text-foreground mb-4 md:mb-6" style={{ fontFamily: "'Times New Roman', serif" }}>Không tìm thấy</h3>
                <p className="text-muted-foreground max-w-xs mx-auto font-light leading-relaxed text-sm md:text-lg">
                  Hãy thử bằng một từ khóa khác.
                </p>
                <Button 
                  className="mt-8 md:mt-12 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl md:rounded-2xl px-8 md:px-12 h-12 md:h-14 font-bold border border-primary/20 transition-all duration-500 text-xs"
                  onClick={() => setSearchQuery("")}
                >
                  Xác nhận lại
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-40 bg-card/20 relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-[120px] pointer-events-none" />
        <Container className="px-5 md:px-0">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-32">
            <Badge className="mb-6 md:mb-8 px-4 py-1 bg-primary/10 text-primary border-primary/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">
              Quy trình nhanh gọn
            </Badge>
            <h2 className="text-3xl md:text-7xl font-light leading-tight mb-6 md:mb-8" style={{ fontFamily: "'Times New Roman', serif" }}>
              Trải nghiệm <span className="italic font-serif text-primary">không lo âu</span>
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg font-light leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Bảo vệ quyền lợi của bạn tối đa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-20 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-[2.5rem] left-1/2 -translate-x-1/2 w-[70%] h-[1px] bg-gradient-to-r from-transparent via-border/60 to-transparent" />
            
            {STEPS.map((step, i) => (
              <motion.div 
                key={i} 
                className="relative flex flex-col items-center text-center group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-card border border-border/80 flex items-center justify-center mb-6 md:mb-10 shadow-xl group-hover:bg-primary group-hover:border-primary transition-all duration-500 group-hover:rotate-12 group-hover:scale-110 relative">
                  <span className="absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 rounded-full bg-background border border-border text-[9px] font-black flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-white/20 transition-colors">0{i+1}</span>
                  <step.icon className="w-6 h-6 md:w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-xl md:text-2xl font-light mb-2 md:mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>{step.title}</h3>
                <p className="text-muted-foreground text-xs md:text-sm font-light leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-40">
        <Container className="px-5 md:px-0">
          <div className="bg-primary rounded-[2.5rem] md:rounded-[4rem] p-10 md:p-32 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-white opacity-5 rounded-l-full pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 md:gap-24">
              <div className="max-w-xl text-center lg:text-left">
                <h2 
                  className="text-3xl md:text-7xl font-serif text-white mb-8 md:mb-10 leading-[1] tracking-tight"
                  style={{ fontFamily: "'Times New Roman', serif" }}
                >
                  Cam kết <span className="italic block text-black/90">chất lượng vàng</span> cho mọi nhà.
                </h2>
                <p className="text-white/80 text-sm md:text-xl mb-10 md:mb-14 leading-relaxed font-light" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Xây dựng sự tin cậy thông qua quy trình kiểm soát chuyên gia nghiêm ngặt.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-[1rem] md:rounded-[1.2rem] px-8 md:px-12 h-14 md:h-16 text-sm md:text-base font-black shadow-2xl">
                    Làm đối tác
                  </Button>
                  <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 rounded-[1rem] md:rounded-[1.2rem] px-8 md:px-12 h-14 md:h-16 text-sm md:text-base font-black group">
                    Xem biểu phí <ArrowRight className="ml-2 md:ml-3 w-4 h-4 md:w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 w-full md:w-auto">
                 {[
                   { icon: ShieldCheck, title: "An toàn", desc: "Mọi đơn hàng được bảo hiểm." },
                   { icon: Star, title: "5 Sao", desc: "Cộng đồng đánh giá cao." },
                   { icon: ZapIcon, title: "Tốc độ", desc: "Có mặt sau 30 phút." },
                   { icon: HelpCircle, title: "24/7", desc: "Hỗ trợ tận tâm." }
                 ].map((item, i) => (
                   <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 border border-white/10 hover:bg-white transition-all duration-500 group/item">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/20 flex items-center justify-center mb-4 md:mb-6 group-hover/item:bg-primary transition-colors">
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-white group-hover/item:text-primary text-lg font-bold mb-2 transition-colors">{item.title}</h4>
                      <p className="text-white/60 group-hover/item:text-muted-foreground text-[10px] md:text-xs leading-relaxed transition-colors">{item.desc}</p>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer CTA Space */}
      <section className="pb-24 md:pb-32 text-center text-sans">
        <Container className="px-5 md:px-0">
          <div className="max-w-2xl mx-auto">
             <h3 className="text-xl md:text-2xl font-light mb-6 md:mb-8 pt-10 border-t border-border/40" style={{ fontFamily: "'Times New Roman', serif" }}>Cần thêm thông tin khác?</h3>
             <div className="flex flex-wrap justify-center gap-4 md:gap-10">
                <Button variant="link" className="text-muted-foreground hover:text-primary font-bold text-xs">Trung tâm hỗ trợ</Button>
                <Button variant="link" className="text-muted-foreground hover:text-primary font-bold text-xs">Chính sách</Button>
                <Button variant="link" className="text-muted-foreground hover:text-primary font-bold text-xs">FAQ</Button>
             </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default CategoriesPage;
