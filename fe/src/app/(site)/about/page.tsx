"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Target, 
  Heart, 
  Award, 
  Clock, 
  Users, 
  Building, 
  MapPin, 
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Container from "@/components/Container";

const STATS = [
  { value: "50,000+", label: "Khách hàng tin dùng" },
  { value: "5,000+", label: "Đối tác chuyên nghiệp" },
  { value: "2 Triệu+", label: "Giờ làm việc an toàn" },
  { value: "15+", label: "Tỉnh thành phủ sóng" },
];

const CORE_VALUES = [
  {
    icon: ShieldCheck,
    title: "Minh bạch",
    desc: "Tại CleanZ, giá cả dịch vụ và chi phí luôn được công khai rõ ràng, không có phí ẩn hay thu thêm.",
  },
  {
    icon: Heart,
    title: "Tận tâm",
    desc: "Chúng tôi coi nhà của khách hàng như nhà của mình. Đội ngũ đối tác luôn dọn dẹp bằng cả trái tim.",
  },
  {
    icon: Zap,
    title: "Công nghệ",
    desc: "Áp dụng nền tảng công nghệ mạnh mẽ để tối ưu hóa việc phân bổ công việc, mang lại trải nghiệm nhanh và mượt mà.",
  },
];

const TIMELINE = [
  { year: "2024", title: "Ra mắt ý tưởng", desc: "Đội ngũ sáng lập phôi thai ý tưởng về một siêu ứng dụng tiện ích gia đình khác biệt." },
  { year: "2025", title: "CleanZ V1.0", desc: "Chính thức ra mắt bản thử nghiệm tại TP.HCM với dịch vụ Dọn nhà theo giờ, đạt 5.000 user đầu tiên." },
  { year: "2026", title: "Bùng nổ hệ sinh thái", desc: "Mở rộng 15 tỉnh thành, ra mắt hàng loạt dịch vụ mới như Vệ sinh máy lạnh, Giặt rèm, Phun côn trùng." },
];

const PRESS_LOGOS = [
  "https://vtv.vn/bundles/vtvnews/images/logo_vtv.png",
  "https://s1.vnecdn.net/vnexpress/restruct/i/v935/v2_2019/pc/graphics/logo.svg",
  "https://static.thanhnien.vn/thanhnien.vn/image/logo.svg",
  "https://statictuoitre.mediacdn.vn/web_images/tt.svg",
];

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      
      {/* 1. HERO STORY SECTION */}
      <section className="relative pt-8 pb-16 lg:pt-16 lg:pb-32 overflow-hidden bg-[#fdf8f5] dark:bg-muted/10">
        <Container className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1.5 rounded-full font-bold">
                CÂU CHUYỆN THƯƠNG HIỆU
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-[1.15]">
                Sứ mệnh nâng tầm <span className="text-primary">chất lượng sống</span> cho gia đình Việt.
              </h1>
              <div className="space-y-4 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  CleanZ ra đời với một khát vọng duy nhất: <strong>Giải quyết bài toán việc nhà rườm rà</strong> và giải phóng phụ nữ khỏi những áp lực không tên.
                </p>
                <p>
                  Không chỉ là một ứng dụng dọn dẹp, chúng tôi xây dựng một hệ sinh thái giúp <strong>hàng ngàn người lao động</strong> có công việc ổn định, thu nhập cao và một môi trường làm việc được tôn trọng.
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white dark:border-slate-800 h-[500px]"
            >
              <Image 
                src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1000&q=80"
                alt="Đội ngũ CleanZ"
                fill
                className="object-cover"
                priority
              />
            </motion.div>
          </div>
        </Container>
      </section>

      {/* 2. STATS SECTION */}
      <section className="py-20 bg-primary">
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x-0 lg:divide-x divide-white/20">
            {STATS.map((stat, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex flex-col items-center text-center text-white px-4"
              >
                <p className="text-4xl md:text-5xl font-black mb-2">{stat.value}</p>
                <p className="text-primary-foreground/80 font-medium text-sm md:text-base">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* 3. TẦM NHÌN & SỨ MỆNH */}
      <section className="py-24 bg-white dark:bg-background border-b border-border">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">Kim chỉ nam hoạt động</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Định hướng vững vàng giúp CleanZ ngày càng vươn xa và mang lại giá trị bền vững.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
            {/* Vision */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-50 dark:bg-muted/10 p-10 rounded-3xl border border-border flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Tầm nhìn</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Trở thành siêu ứng dụng tiện ích gia đình số 1 tại Đông Nam Á, nơi mọi nhu cầu của căn nhà đều được giải quyết chỉ bằng một chạm.
              </p>
            </motion.div>

            {/* Mission */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-50 dark:bg-muted/10 p-10 rounded-3xl border border-border flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Sứ mệnh</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Ứng dụng công nghệ để giải phóng phụ nữ khỏi việc nhà rườm rà, đồng thời tạo ra hàng triệu công việc ổn định cho người lao động phổ thông.
              </p>
            </motion.div>
          </div>

          {/* Core Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {CORE_VALUES.map((val, idx) => (
              <div key={idx} className="p-8 rounded-2xl bg-white dark:bg-background border border-border shadow-sm flex flex-col items-center text-center">
                <val.icon className="w-10 h-10 text-primary mb-4" />
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{val.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. HÀNH TRÌNH PHÁT TRIỂN */}
      <section className="py-24 bg-slate-50 dark:bg-muted/5">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">Hành trình trưởng thành</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Từ một ý tưởng nhỏ, chúng tôi đã vươn lên thành một trong những nền tảng được yêu thích nhất.
            </p>
          </div>

          <div className="max-w-4xl mx-auto relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-1 bg-primary/20 -translate-x-1/2 rounded-full" />
            
            <div className="space-y-12">
              {TIMELINE.map((item, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className={`relative flex items-center justify-between flex-col md:flex-row ${isEven ? 'md:flex-row-reverse' : ''}`}
                  >
                    <div className="hidden md:block w-5/12" />
                    
                    <div className="absolute left-4 md:left-1/2 w-6 h-6 rounded-full bg-primary border-4 border-white dark:border-background shadow-md -translate-x-1/2 z-10" />
                    
                    <div className="w-full pl-12 md:pl-0 md:w-5/12">
                      <div className={`bg-white dark:bg-background p-6 rounded-2xl shadow-sm border border-border ${isEven ? 'md:text-left' : 'md:text-right'}`}>
                        <span className="text-primary font-black text-xl mb-2 block">{item.year}</span>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h4>
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      {/* 5. BÁO CHÍ & TRUYỀN THÔNG */}
      <section className="py-24 bg-white dark:bg-background border-y border-border">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Báo chí nói về CleanZ</h2>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {PRESS_LOGOS.map((src, idx) => (
              <div key={idx} className="relative w-32 h-12 md:w-40 md:h-16 flex items-center justify-center">
                {/* Dùng thẻ img thuần để bỏ qua sự quản lý khắt khe của Next.js */}
                <img src={src} alt="Press Logo" className="max-w-full max-h-full object-contain dark:brightness-0 dark:invert" />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 6. VĂN PHÒNG / LIÊN HỆ */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
          <Image src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80" alt="Office bg" fill className="object-cover" />
        </div>
        
        <Container className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-none px-4 py-1.5">LIÊN HỆ</Badge>
              <h2 className="text-4xl md:text-5xl font-black leading-tight">Ghé thăm văn phòng của chúng tôi</h2>
              <p className="text-slate-300 text-lg">Chúng tôi luôn mở cửa chào đón các ứng viên tài năng và các đối tác doanh nghiệp đến trao đổi cơ hội hợp tác.</p>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl"><MapPin className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h4 className="font-bold text-xl">Trụ sở chính (TP.HCM)</h4>
                    <p className="text-slate-400 mt-1">Tầng 12, Tòa nhà Viettel Complex, 285 Cách Mạng Tháng 8, Phường 12, Quận 10.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl"><Building className="w-6 h-6 text-primary" /></div>
                  <div>
                    <h4 className="font-bold text-xl">Chi nhánh Hà Nội</h4>
                    <p className="text-slate-400 mt-1">Tầng 8, Tòa nhà Lotte Center, 54 Liễu Giai, Phường Cống Vị, Quận Ba Đình.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center md:justify-end">
               <div className="bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/20 w-full max-w-sm space-y-6">
                  <h3 className="text-2xl font-bold">Hợp tác & Truyền thông</h3>
                  <div className="space-y-2 text-slate-300">
                    <p>Email: <strong className="text-white">partner@cleanz.vn</strong></p>
                    <p>Hotline: <strong className="text-white">1800 6868</strong></p>
                    <p>T2 - T6: 8:00 AM - 6:00 PM</p>
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 text-md">Gửi tin nhắn</Button>
               </div>
            </div>
          </div>
        </Container>
      </section>

    </div>
  );
}
