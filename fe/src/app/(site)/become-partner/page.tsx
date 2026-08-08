"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Star,
  Smartphone,
  Wallet,
  GraduationCap,
  FileText,
  MapPin,
  CheckCircle,
  Briefcase,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import Container from "@/components/Container";

const BENEFITS = [
  {
    icon: Clock,
    title: "Tự do thời gian",
    description: "Không gò bó lịch trình. Bạn hoàn toàn chủ động nhận việc vào những khung giờ rảnh rỗi, tắt app khi cần nghỉ ngơi.",
    color: "bg-orange-500/10 text-orange-500 border-orange-200 dark:border-orange-900/50",
  },
  {
    icon: Wallet,
    title: "Thu nhập minh bạch",
    description: "Nhận mức thù lao hấp dẫn (lên đến 15-25 triệu/tháng). Chi phí dịch vụ và chiết khấu được hiển thị rõ ràng trước khi bạn nhận việc.",
    color: "bg-blue-500/10 text-blue-500 border-blue-200 dark:border-blue-900/50",
  },
  {
    icon: ShieldCheck,
    title: "Bảo vệ quyền lợi",
    description: "An tâm làm việc với gói bảo hiểm tai nạn rủi ro. Đội ngũ hỗ trợ đối tác của CleanZ luôn túc trực giải quyết vấn đề 24/7.",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-200 dark:border-emerald-900/50",
  },
  {
    icon: GraduationCap,
    title: "Đào tạo chuyên nghiệp",
    description: "Được tham gia các khóa huấn luyện nghiệp vụ chuẩn khách sạn 5 sao hoàn toàn miễn phí, nâng cao kỹ năng và chất lượng.",
    color: "bg-purple-500/10 text-purple-500 border-purple-200 dark:border-purple-900/50",
  },
];

const REQUIREMENTS = [
  { icon: FileText, title: "CMND/CCCD bản gốc", desc: "Thẻ căn cước công dân gắn chíp còn hạn sử dụng." },
  { icon: Smartphone, title: "Điện thoại thông minh", desc: "Smartphone iOS hoặc Android có kết nối 4G/Wifi." },
  { icon: CheckCircle, title: "Sơ yếu lý lịch", desc: "Có xác nhận của địa phương trong vòng 6 tháng." },
  { icon: ShieldCheck, title: "Giấy xác nhận hạnh kiểm", desc: "Hoặc Lý lịch tư pháp bản gốc." },
];

const STEPS = [
  {
    number: "1",
    title: "Đăng ký Online",
    description: "Điền thông tin cá nhân cơ bản qua biểu mẫu trực tuyến hoặc trên App Partner chỉ trong 3 phút.",
  },
  {
    number: "2",
    title: "Nộp hồ sơ & Phỏng vấn",
    description: "Mang theo bộ hồ sơ bản gốc đến văn phòng CleanZ để đối chiếu và tham gia phỏng vấn ngắn.",
  },
  {
    number: "3",
    title: "Đào tạo & Kiểm tra",
    description: "Tham gia khóa học lý thuyết, thực hành nghiệp vụ chuẩn và vượt qua bài Test kỹ năng.",
  },
  {
    number: "4",
    title: "Trở thành Đối tác",
    description: "Kích hoạt tài khoản thành công. Mở ứng dụng, chọn ca làm việc đầu tiên và nhận thu nhập ngay!",
  },
];

const FAQS = [
  {
    question: "Tôi chưa có kinh nghiệm dọn dẹp thì có đăng ký được không?",
    answer: "Hoàn toàn được! CleanZ có tổ chức các buổi đào tạo nghiệp vụ từ cơ bản đến nâng cao (chuẩn phòng khách sạn 5 sao) hoàn toàn miễn phí cho tất cả đối tác mới trước khi bắt đầu nhận việc.",
  },
  {
    question: "Hồ sơ của tôi mất bao lâu để được xét duyệt?",
    answer: "Sau khi bạn hoàn tất phỏng vấn và nộp đủ hồ sơ hợp lệ, quá trình xét duyệt và kích hoạt tài khoản thường diễn ra trong vòng 24-48 giờ.",
  },
  {
    question: "Thu nhập được thanh toán như thế nào?",
    answer: "Thù lao sẽ được chuyển thẳng vào Tài khoản chính trên App CleanZ Partner của bạn ngay sau khi hoàn thành công việc. Bạn có thể yêu cầu rút tiền về tài khoản ngân hàng cá nhân bất cứ lúc nào.",
  },
  {
    question: "Tôi có bị ép buộc số giờ làm tối thiểu không?",
    answer: "Không. Tại CleanZ, bạn hoàn toàn làm chủ thời gian. Bạn tự quyết định số lượng công việc nhận mỗi tuần tùy theo thời gian rảnh của bản thân.",
  },
];

export default function BecomePartnerLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      
      {/* 1. HERO SECTION (bTaskee Style) */}
      <section className="relative w-full pt-8 pb-20 lg:pt-16 lg:pb-32 overflow-hidden bg-[#fdf8f5] dark:bg-muted/10">
        <Container className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Left: Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col space-y-6"
            >
              <Badge className="w-fit bg-primary/10 text-primary hover:bg-primary/20 px-4 py-1.5 rounded-full font-bold text-sm">
                CƠ HỘI NGHỀ NGHIỆP
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.15] text-slate-900 dark:text-white">
                Trở thành <span className="text-primary">Đối tác Dọn dẹp</span> CleanZ
              </h1>
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
                Làm chủ thu nhập, tự do thời gian. Gia nhập cộng đồng dịch vụ gia đình chuyên nghiệp nhất và nhận việc sau 24h!
              </p>
              
              <div className="grid grid-cols-2 gap-6 py-4">
                <div>
                  <p className="text-3xl font-black text-primary">15-25<span className="text-lg">tr</span></p>
                  <p className="text-sm font-medium text-slate-500">Thu nhập trung bình/tháng</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-primary">5000+</p>
                  <p className="text-sm font-medium text-slate-500">Đối tác đang hoạt động</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button size="lg" className="h-14 px-8 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all group" asChild>
                  <Link href="/become-partner/signup">
                    Đăng ký ngay
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                
              </div>
            </motion.div>

            {/* Right: Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"
                  alt="CleanZ Partner"
                  width={600}
                  height={800}
                  className="w-full h-[500px] lg:h-[600px] object-cover"
                  priority
                />
              </div>
              {/* Floating Element */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 z-20 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-border flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Star className="w-6 h-6 text-orange-500 fill-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Hài lòng từ khách hàng</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">4.9/5.0</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* 2. TẠI SAO CHỌN CLEANZ? */}
      <section className="py-24 bg-white dark:bg-background">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">Tại sao chọn CleanZ?</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              CleanZ mang đến môi trường làm việc chuyên nghiệp, thu nhập cao và sự tự do tuyệt đối dành cho bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((benefit, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className={cn(
                  "p-8 rounded-3xl bg-white dark:bg-muted/20 border transition-all hover:shadow-xl",
                  benefit.color.split(' ').filter(c => c.startsWith('border-')).join(' ')
                )}
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", benefit.color.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('text-')).join(' '))}>
                  <benefit.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{benefit.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* 3. ĐIỀU KIỆN TRỞ THÀNH ĐỐI TÁC */}
      <section className="py-24 bg-slate-50 dark:bg-muted/10 border-y border-border">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-6">Hồ sơ cần chuẩn bị</h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg mb-8">
                Để đảm bảo chất lượng dịch vụ và sự an toàn cho khách hàng, CleanZ yêu cầu đối tác chuẩn bị đầy đủ các giấy tờ cơ bản sau:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {REQUIREMENTS.map((req, idx) => (
                  <div key={idx} className="bg-white dark:bg-background p-5 rounded-2xl border border-border flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                      <req.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white mb-1">{req.title}</h4>
                      <p className="text-xs text-slate-500">{req.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-lg border-8 border-white dark:border-slate-800">
               <Image
                  src="https://images.unsplash.com/photo-1554774853-719586f82d77?w=800&q=80"
                  alt="Hồ sơ đăng ký"
                  fill
                  className="object-cover"
                />
            </div>
          </div>
        </Container>
      </section>

      {/* 4. QUY TRÌNH GIA NHẬP */}
      <section className="py-24 bg-white dark:bg-background">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white">Quy trình 4 bước đơn giản</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Chỉ mất vài ngày từ lúc đăng ký đến khi bạn nhận được ca làm việc đầu tiên.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, index) => (
              <div key={index} className="relative flex flex-col items-center text-center group">
                {/* Connector line for desktop */}
                {index !== STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-full h-[2px] bg-slate-100 dark:bg-slate-800" />
                )}
                
                <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 border-4 border-white dark:border-background shadow-md flex items-center justify-center text-2xl font-black text-slate-400 group-hover:text-primary group-hover:border-primary/20 transition-all z-10 mb-6">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[250px]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
             <Button size="lg" className="h-14 px-10 rounded-xl text-lg font-bold" asChild>
                <Link href="/become-partner/signup">Đăng ký hồ sơ ngay</Link>
             </Button>
          </div>
        </Container>
      </section>

      {/* 5. APP SHOWCASE */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-white/5 skew-x-12 translate-x-24 z-0" />
        <Container className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div className="order-2 lg:order-1 flex justify-center">
              <div className="relative w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-900 shadow-2xl overflow-hidden">
                {/* Mockup screen content */}
                <div className="absolute inset-0 bg-slate-50 flex flex-col">
                  {/* Fake header */}
                  <div className="bg-primary pt-12 pb-6 px-6 text-white rounded-b-3xl">
                     <p className="text-sm opacity-80">Chào buổi sáng,</p>
                     <h3 className="text-xl font-bold">Nguyễn Thị Mai</h3>
                     <div className="mt-6 bg-white/20 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
                        <div>
                           <p className="text-xs opacity-80">Thu nhập hôm nay</p>
                           <p className="text-2xl font-black">650,000đ</p>
                        </div>
                        <Wallet className="w-8 h-8 opacity-80" />
                     </div>
                  </div>
                  {/* Fake body */}
                  <div className="flex-1 p-4 space-y-4 overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="font-bold text-slate-800">Việc đang chờ</h4>
                       <span className="text-xs text-primary font-bold">Xem tất cả</span>
                    </div>
                    {[1,2,3].map((job) => (
                      <div key={job} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                           <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold">Dọn nhà</Badge>
                           <span className="text-primary font-black text-lg">150k</span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                           <div className="flex items-center gap-2"><Clock className="w-4 h-4"/> 14:00 - 16:00 (Hôm nay)</div>
                           <div className="flex items-center gap-2"><MapPin className="w-4 h-4"/> Quận 7, TP. HCM</div>
                        </div>
                        <Button className="w-full mt-4 rounded-xl font-bold bg-slate-900 text-white">Nhận việc ngay</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-8 text-white">
              <h2 className="text-4xl md:text-5xl font-black leading-tight">
                Ứng dụng dành riêng cho Đối Tác
              </h2>
              <p className="text-primary-foreground/90 text-lg leading-relaxed">
                Tất cả mọi thứ bạn cần để làm việc đều nằm gọn trong chiếc điện thoại. Giao diện trực quan, dễ sử dụng cho mọi lứa tuổi.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                   <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                     <Briefcase className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="font-bold text-xl mb-1">Chủ động nhận việc</h4>
                      <p className="text-white/80">Hệ thống hiển thị hàng trăm công việc mỗi ngày. Bạn xem trước giá tiền, địa điểm và bấm nhận việc nếu thấy phù hợp.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                     <Wallet className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="font-bold text-xl mb-1">Quản lý thu nhập</h4>
                      <p className="text-white/80">Tiền được cộng ngay vào ví ảo sau khi hoàn thành công việc. Rút tiền về ngân hàng nhanh chóng 24/7.</p>
                   </div>
                </div>
                <div className="flex items-start gap-4">
                   <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                     <MapPin className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="font-bold text-xl mb-1">Dẫn đường thông minh</h4>
                      <p className="text-white/80">Tích hợp bản đồ hướng dẫn đường đi ngắn nhất đến nhà khách hàng trực tiếp trên app.</p>
                   </div>
                </div>
              </div>
            </div>
            
          </div>
        </Container>
      </section>

      {/* 6. FAQ */}
      <section className="py-24 bg-slate-50 dark:bg-background">
        <Container classNameContent="max-w-3xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Câu hỏi thường gặp</h2>
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-2xl px-6 bg-white dark:bg-muted/10 shadow-sm">
                <AccordionTrigger className="text-left font-bold text-lg hover:no-underline py-5 text-slate-800 dark:text-white">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 dark:text-slate-400 text-base pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-white dark:bg-background border-t border-border">
        <Container classNameContent="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">
              Sẵn sàng thay đổi thu nhập ngay hôm nay?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Hàng ngàn khách hàng đang chờ đợi dịch vụ chuyên nghiệp từ bạn. 
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="h-14 px-10 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-xl" asChild>
                <Link href="/become-partner/signup">Đăng ký làm đối tác</Link>
              </Button>
            </div>
            <p className="text-slate-400 text-sm">
              * Không thu bất kỳ phí đăng ký nào.
            </p>
          </motion.div>
        </Container>
      </section>

    </div>
  );
}
