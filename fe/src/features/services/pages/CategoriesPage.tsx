'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Building, 
  Wind, 
  Droplets, 
  Sun,
  Search,
  Paintbrush,
  Star,
  ShieldCheck,
  ZapIcon,
  HelpCircle,
  TrendingUp,
  LayoutGrid,
  ArrowRight,
  Filter,
  HeartPulse,
  Users,
  Clock
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
    id: "cleaning",
    icon: Sparkles, 
    label: "Dọn dẹp nhà cửa", 
    description: "Giải pháp dọn dẹp linh hoạt theo giờ hoặc định kỳ cho gia đình.",
    color: "bg-emerald-500/10 text-emerald-600",
    hoverColor: "group-hover:bg-emerald-600 group-hover:text-white",
    href: "/services/cleaning",
    count: 120,
    tags: ["Theo giờ", "Định kỳ", "Chuyên sâu"],
    featured: true
  },
  { 
    id: "deep-cleaning",
    icon: Paintbrush, 
    label: "Tổng vệ sinh", 
    description: "Vệ sinh toàn diện, làm sạch nhà mới xây hoặc nhà lâu ngày không dọn.",
    color: "bg-blue-500/10 text-blue-600", 
    hoverColor: "group-hover:bg-blue-600 group-hover:text-white",
    href: "/services/deep-cleaning",
    count: 85,
    tags: ["Sau xây dựng", "Toàn diện"],
    featured: true
  },
  { 
    id: "sofa",
    icon: Droplets, 
    label: "Giặt Sofa & Nệm", 
    description: "Giặt sạch vết bẩn, khử mùi và diệt khuẩn 99% bằng hơi nước nóng.",
    color: "bg-rose-500/10 text-rose-600", 
    hoverColor: "group-hover:bg-rose-600 group-hover:text-white",
    href: "/services/sofa",
    count: 210,
    tags: ["Sofa", "Nệm", "Thảm"],
    featured: true
  },
  { 
    id: "office",
    icon: Building, 
    label: "Tạp vụ văn phòng", 
    description: "Cung cấp nhân sự vệ sinh văn phòng chuyên nghiệp, làm việc định kỳ.",
    color: "bg-amber-500/10 text-amber-600", 
    hoverColor: "group-hover:bg-amber-600 group-hover:text-white",
    href: "/services/office",
    count: 45,
    tags: ["Văn phòng", "Công ty"]
  },
  { 
    id: "curtain",
    icon: Wind, 
    label: "Vệ sinh rèm cửa", 
    description: "Giặt sấy rèm tận xưởng hoặc giặt hơi nước trực tiếp tại nhà.",
    color: "bg-purple-500/10 text-purple-600", 
    hoverColor: "group-hover:bg-purple-600 group-hover:text-white",
    href: "/services/curtain",
    count: 156,
    tags: ["Rèm vải", "Rèm cuốn"]
  },
  { 
    id: "glass",
    icon: Sun, 
    label: "Vệ sinh kính", 
    description: "Đội ngũ đu dây chuyên nghiệp làm sạch kính mặt ngoài tòa nhà.",
    color: "bg-cyan-500/10 text-cyan-600", 
    hoverColor: "group-hover:bg-cyan-600 group-hover:text-white",
    href: "/services/glass",
    count: 92,
    tags: ["Kính tòa nhà", "Showroom"]
  }
];

const blurVariants: Variants = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [0.3, 0.5, 0.3],
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
    desc: "Tìm kiếm và lựa chọn lĩnh vực bạn cần hỗ trợ từ danh sách dịch vụ của chúng tôi.",
    icon: LayoutGrid
  },
  {
    title: "Lựa chọn gói",
    desc: "Xem xét các gói dịch vụ minh bạch về giá cả và thời gian thực hiện.",
    icon: ZapIcon
  },
  {
    title: "Đặt lịch & Xong",
    desc: "Xác nhận thời gian và nhân viên của chúng tôi sẽ có mặt ngay.",
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
    <div className="categories-page min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 relative overflow-hidden font-sans pt-4 pb-20 md:pt-12">
      {/* Background Decor Enhanced */}
      <div className="absolute top-0 left-0 w-full h-[800px] overflow-hidden pointer-events-none">
        <motion.div
          variants={blurVariants}
          animate="animate"
          className="absolute -top-40 -right-40 w-[800px] h-[800px] rounded-full blur-[120px] bg-primary/10"
        />
        <div className="absolute top-20 -left-40 w-[600px] h-[600px] rounded-full blur-[100px] bg-blue-500/10" />
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-[radial-gradient(ellipse_at_top,var(--color-primary-15),transparent_70%)]" style={{"--color-primary-15": "color-mix(in srgb, var(--primary) 15%, transparent)"} as React.CSSProperties} />
      </div>

      {/* Hero Header */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        <Container className="px-5 md:px-0">
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Floating Avatars Trust Badge */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 md:mb-8">
                <div className="flex -space-x-3">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" alt="User" className="w-12 h-12 md:w-10 md:h-10 rounded-full border-[3px] border-slate-50 dark:border-slate-950 object-cover shadow-sm" />
                  <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop" alt="User" className="w-12 h-12 md:w-10 md:h-10 rounded-full border-[3px] border-slate-50 dark:border-slate-950 object-cover shadow-sm" />
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" alt="User" className="w-12 h-12 md:w-10 md:h-10 rounded-full border-[3px] border-slate-50 dark:border-slate-950 object-cover shadow-sm" />
                  <div className="w-12 h-12 md:w-10 md:h-10 rounded-full border-[3px] border-slate-50 dark:border-slate-950 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-black text-slate-600 dark:text-slate-300 shadow-sm">
                    +50k
                  </div>
                </div>
                <div className="text-center sm:text-left mt-1 sm:mt-0">
                  <div className="flex items-center justify-center sm:justify-start gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <Star key={i} className="w-4 h-4 md:w-4 md:h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Khách hàng tin dùng</span>
                </div>
              </div>

              <Badge variant="secondary" className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-primary hover:bg-white transition-colors px-5 py-2.5 md:py-2 rounded-full mb-8 font-bold uppercase tracking-widest text-xs border border-primary/20 shadow-xl shadow-primary/5 flex items-center gap-2 w-fit mx-auto">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Hệ sinh thái dọn dẹp số 1 VN
              </Badge>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.2] tracking-tight text-slate-900 dark:text-white mb-6 relative">
                Mọi nhu cầu dọn dẹp, <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 relative inline-block pb-1 md:pb-2">
                  chỉ trong một chạm
                  {/* Decorative underline */}
                  <svg className="absolute bottom-0 left-0 w-full h-3 md:h-4 text-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="4" />
                  </svg>
                </span>
              </h1>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed px-4 md:px-2">
                Nền tảng kết nối trực tiếp bạn với hàng ngàn nhân viên vệ sinh được đào tạo bài bản, kiểm tra nhân thân rõ ràng. Nhanh chóng - Tiện lợi - An toàn.
              </p>

              {/* Enhanced Search Bar */}
              <div className="relative group max-w-3xl mx-auto mb-10">
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-blue-500/20 to-primary/30 rounded-[2.5rem] blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 hidden md:block" />
                <div className="relative flex flex-col md:flex-row items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 md:border-white/50 dark:border-slate-800/50 rounded-[1.5rem] md:rounded-full shadow-lg md:shadow-2xl focus-within:border-primary/50 focus-within:ring-2 md:focus-within:ring-4 ring-primary/10 transition-all duration-300 p-3 md:p-2 md:pl-6 gap-3 md:gap-0">
                  <div className="flex items-center w-full flex-1 h-14 pl-2 md:pl-0">
                    <Search className="w-6 h-6 text-primary shrink-0 mr-3" />
                    <Input 
                      placeholder="Nhập dịch vụ bạn cần..." 
                      className="flex-1 border-none shadow-none focus-visible:ring-0 h-full text-base font-medium bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 px-0"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="hidden md:block w-[1px] h-8 bg-slate-200 dark:bg-slate-800 mx-4" />
                  
                  <div className="flex items-center w-full md:w-auto">
                    <Button className="w-full md:w-auto rounded-xl md:rounded-full px-8 h-14 text-base font-bold shadow-md md:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 transition-all bg-primary text-primary-foreground group/btn">
                      Tìm kiếm ngay
                      <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Tags */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-slate-500 text-xs md:text-sm font-medium">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold mr-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Dịch vụ hot:</span>
                </div>
                {['Tổng vệ sinh', 'Giặt Sofa', 'Dọn theo giờ', 'Vệ sinh rèm'].map(tag => (
                  <button key={tag} onClick={() => setSearchQuery(tag)} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:text-primary transition-all rounded-full px-4 md:px-4 py-2 md:py-1.5 shadow-sm text-xs font-bold">
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Stats Bar Enhanced */}
      <section className="relative z-20 -mt-2 md:-mt-8 mb-16 md:mb-24">
        <Container className="px-5 md:px-0">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-100 md:border-white dark:border-slate-800 rounded-3xl md:rounded-[2rem] shadow-xl md:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 pointer-events-none" />
              {[
                { label: "Nhân sự", value: "2,500+", icon: Sparkles },
                { label: "Khách hàng", value: "100k+", icon: HeartPulse },
                { label: "Hoàn thành", value: "1 Triệu+", icon: ShieldCheck },
                { label: "Hài lòng", value: "99.8%", icon: Star },
              ].map((stat, i) => (
                <div key={i} className={`flex flex-col items-center justify-center p-6 md:p-8 relative border-slate-100 dark:border-slate-800/50 ${i % 2 === 0 ? 'border-r' : ''} md:border-r ${i === 3 ? 'md:border-r-0' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''} group/stat`}>
                  <div className="w-12 h-12 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/10 flex items-center justify-center mb-3 md:mb-4 text-primary group-hover/stat:bg-primary group-hover/stat:text-white group-hover/stat:-translate-y-1 group-hover/stat:shadow-lg transition-all duration-300">
                    <stat.icon className="w-6 h-6 md:w-6 md:h-6" />
                  </div>
                  <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1 md:mb-2 tracking-tight">{stat.value}</span>
                  <span className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-slate-500 text-center">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Categories Content */}
      <section className="py-12 md:py-20 relative z-10">
        <Container className="px-5 md:px-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <h2 className="text-3xl md:text-5xl font-serif font-black text-slate-900 dark:text-white mb-3">
                {searchQuery ? `Kết quả tìm kiếm` : "Dịch vụ dọn dẹp"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-base">
                Giải pháp làm sạch toàn diện cho không gian của bạn.
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
              <Button 
                variant={activeTab === "all" ? "default" : "ghost"} 
                onClick={() => setActiveTab("all")}
                className={`rounded-lg font-bold px-6 h-10 ${activeTab === "all" ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
              >
                Tất cả
              </Button>
              <Button 
                variant={activeTab === "featured" ? "default" : "ghost"} 
                onClick={() => setActiveTab("featured")}
                className={`rounded-lg font-bold px-6 h-10 ${activeTab === "featured" ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
              >
                Nổi bật
              </Button>
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {filteredCategories.length > 0 ? (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                layout
              >
                {filteredCategories.map((cat) => (
                  <motion.div key={cat.id} variants={itemVariants} layout transition={{ duration: 0.4 }}>
                    <Card 
                      className="group flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-xl transition-all duration-300 cursor-pointer rounded-2xl overflow-hidden"
                      onClick={() => router.push(cat.href)}
                    >
                      <CardContent className="p-6 md:p-8 flex flex-col h-full relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full transition-transform duration-500 group-hover:scale-150" />
                        
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cat.color} ${cat.hoverColor} mb-6 transition-all duration-300 shadow-sm relative z-10`}>
                          <cat.icon className="w-7 h-7" />
                        </div>
                        
                        <div className="mb-6 flex-1 relative z-10">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors flex items-center gap-2">
                            {cat.label}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            {cat.description}
                          </p>
                        </div>

                        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 relative z-10">
                          <div className="flex flex-wrap gap-2 mb-6">
                            {cat.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-3 py-1 rounded-md transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gói dịch vụ</span>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {cat.count}+ GÓI
                              </span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary transition-colors">
                              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
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
                className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-2xl font-serif font-black text-slate-900 dark:text-white mb-3">Không tìm thấy dịch vụ</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                  Hãy thử tìm kiếm bằng một từ khóa khác hoặc liên hệ chúng tôi.
                </p>
                <Button onClick={() => setSearchQuery("")} className="font-bold rounded-full px-8">
                  Thử lại
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24">
        <Container className="px-5 md:px-0">
          <div className="bg-primary rounded-3xl p-10 md:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-white opacity-5 rounded-l-full pointer-events-none" />
            
            <div className="relative z-10 max-w-xl text-center lg:text-left">
              <h2 className="text-3xl md:text-5xl font-serif font-black text-white mb-6">
                Cam kết chất lượng <br/> cho mọi nhà.
              </h2>
              <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed">
                Đội ngũ nhân viên dọn dẹp được chọn lọc kỹ lưỡng, đảm bảo mang đến không gian sống hoàn hảo nhất.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-full px-8 h-12 font-bold shadow-xl">
                  Trải nghiệm ngay
                </Button>
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 rounded-full px-8 h-12 font-bold group">
                  Xem bảng giá <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            
            <div className="relative z-10 grid grid-cols-2 gap-4 w-full lg:w-auto">
               {[
                 { icon: ShieldCheck, title: "An toàn", desc: "Bảo hiểm tài sản 100Tr" },
                 { icon: Star, title: "5 Sao", desc: "Đội ngũ chuyên nghiệp" },
                 { icon: ZapIcon, title: "Tốc độ", desc: "Có mặt sau 60 phút" },
                 { icon: HelpCircle, title: "24/7", desc: "Hỗ trợ khách hàng" }
               ].map((item, i) => (
                 <div key={i} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/20 transition-all">
                    <item.icon className="w-8 h-8 text-white mb-4" />
                    <h4 className="text-white text-lg font-bold mb-1">{item.title}</h4>
                    <p className="text-white/70 text-xs">{item.desc}</p>
                 </div>
               ))}
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default CategoriesPage;
