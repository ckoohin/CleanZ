"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight, 
  Users, 
  Star,
  Zap,
  HelpCircle,
  Briefcase,
  Smartphone,
  Award
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
    icon: TrendingUp,
    title: "Thu nhập bứt phá",
    description: "Mức thu nhập hấp dẫn lên đến 20-25 triệu/tháng. Nhận thưởng thêm dựa trên chất lượng dịch vụ và đánh giá 5 sao từ khách hàng.",
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    icon: Clock,
    title: "Chủ động thời gian",
    description: "Hoàn toàn tự do chọn ca làm việc. Bạn có thể làm toàn thời gian hoặc bán thời gian tùy theo lịch trình cá nhân.",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Bảo hiểm & Đào tạo",
    description: "Được tham gia các khóa đào tạo chuyên sâu chuẩn quốc tế và gói bảo hiểm tai nạn toàn diện trong suốt quá trình làm việc.",
    color: "bg-emerald-500/10 text-emerald-500",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Đăng ký trực tuyến",
    description: "Hoàn tất hồ sơ online trong 5 phút với thông tin cơ bản và các giấy tờ tùy thân.",
  },
  {
    number: "02",
    title: "Phỏng vấn & Đào tạo",
    description: "Tham gia buổi gặp gỡ trực tiếp và khóa học nghiệp vụ dọn dẹp chuyên nghiệp từ CleanZ.",
  },
  {
    number: "03",
    title: "Bắt đầu nhận việc",
    description: "Kích hoạt tài khoản, nhận các yêu cầu dọn dẹp đầu tiên và bắt đầu tăng thu nhập.",
  },
];

const FAQS = [
  {
    question: "Tôi cần chuẩn bị hồ sơ gì để đăng ký đối tác CleanZ?",
    answer: "Hồ sơ cơ bản bao gồm: CCCD (bản gốc), Sơ yếu lý lịch và Giấy xác nhận hạnh kiểm (hoặc Lý lịch tư pháp). Chúng tôi sẽ hỗ trợ bạn hoàn thiện các giấy tờ này trong quá trình phỏng vấn.",
  },
  {
    question: "Sau bao lâu thì tôi có thể bắt đầu đi làm?",
    answer: "Kể từ khi đăng ký, quy trình xét duyệt và đào tạo thường diễn ra trong vòng 3-7 ngày. Ngay sau khi vượt qua bài kiểm tra nghiệp vụ, bạn có thể bắt đầu nhận việc ngay trên ứng dụng.",
  },
  {
    question: "CleanZ thu phí chiết khấu như thế nào?",
    answer: "CleanZ áp dụng mức chiết khấu minh bạch và cạnh tranh nhất hiện nay, dao động từ 15-20% tùy theo hiệu quả công việc. Phần phí này được tái đầu tư vào quảng cáo để mang lời mời dịch vụ liên tục đến cho bạn.",
  },
];

export default function BecomePartnerLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full py-20 lg:py-32 overflow-hidden bg-muted/30">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute top-0 -left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>
        
        <Container className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col space-y-6"
            >
              <Badge variant="outline" className="w-fit border-primary/30 text-primary px-4 py-1 rounded-full font-bold">
                🤝 GIA NHẬP ĐỘI NGŨ CHUYÊN GIA VỆ SINH
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1]">
                Nâng tầm <span className="text-primary">sự nghiệp</span> & bứt phá <span className="text-primary">thu nhập</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Trở thành đối tác dọn dẹp của CleanZ để tiếp cận hàng nghìn khách hàng mỗi ngày và nhận chế độ đãi ngộ tốt nhất thị trường.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="h-14 px-8 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all group" asChild>
                  <Link href="/become-partner/signup">
                    Tạo tài khoản Đối tác
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-2xl text-lg font-bold border-2" asChild>
                  <Link href="/become-partner/register">Đã có tài khoản? Nộp hồ sơ</Link>
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Miễn phí đăng ký
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Nhận việc mỗi ngày
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 rounded-[2rem] overflow-hidden shadow-2xl border-8 border-background">
                <Image
                  src="/clean_z_partner_hero_1778944951586.png"
                  alt="CleanZ Professional Partner"
                  width={600}
                  height={800}
                  className="w-full h-[600px] object-cover"
                  priority
                />
              </div>
              {/* Floating Stat Card */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 z-20 bg-background p-4 rounded-2xl shadow-xl border border-border flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary fill-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Hài lòng từ khách hàng</p>
                  <p className="text-xl font-bold">4.9/5.0</p>
                </div>
              </motion.div>
              
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-10 -right-6 z-20 bg-background p-4 rounded-2xl shadow-xl border border-border flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Thưởng hiệu quả tháng</p>
                  <p className="text-xl font-bold">+5,000,000đ</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-background">
        <Container>
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black">Lợi ích đặc quyền dành cho bạn</h2>
            <p className="text-muted-foreground text-lg">
              Chúng tôi không chỉ là nền tảng, chúng tôi là đối tác đồng hành cùng sự phát triển sự nghiệp của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BENEFITS.map((benefit, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5 }}
                className="p-8 rounded-[2rem] bg-muted/30 border border-transparent hover:border-primary/20 hover:bg-background hover:shadow-xl transition-all"
              >
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", benefit.color)}>
                  <benefit.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* How it works Section */}
      <section id="how-to-join" className="py-24 bg-muted/30">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-black">3 bước gia nhập cộng đồng CleanZ</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Quy trình đăng ký của chúng tôi cực kỳ đơn giản và nhanh chóng, giúp bạn bắt đầu công việc và có thu nhập ngay lập tức.
              </p>
              
              <div className="space-y-6">
                {STEPS.map((step, index) => (
                  <div key={index} className="flex gap-6 group">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border-2 border-primary/20 flex items-center justify-center text-primary font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {step.number}
                      </div>
                      {index !== STEPS.length - 1 && (
                        <div className="w-0.5 h-full bg-primary/10 my-1" />
                      )}
                    </div>
                    <div className="pb-8">
                      <h4 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{step.title}</h4>
                      <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-14 px-8 rounded-2xl text-lg font-bold" asChild>
                  <Link href="/become-partner/signup">Tạo tài khoản mới</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-2xl text-lg font-bold" asChild>
                  <Link href="/become-partner/register">Đã có tài khoản</Link>
                </Button>
              </div>
            </div>
            
            <div className="relative bg-background rounded-[3rem] p-8 shadow-2xl border border-border">
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Ứng dụng Partner</h4>
                    <p className="text-xs text-muted-foreground">Version 2.4.0 (Tải miễn phí)</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/50 flex items-center justify-between border border-border">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold">Công việc đang chờ</span>
                    </div>
                    <Badge className="bg-orange-500">+12</Badge>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-muted/50 flex items-center justify-between border border-border">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <span className="text-sm font-semibold">Cộng đồng đối tác</span>
                    </div>
                    <span className="text-sm text-muted-foreground">5,000+</span>
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-primary text-primary-foreground space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium opacity-80">Doanh thu tuần này</span>
                      <Award className="w-5 h-5 opacity-80" />
                    </div>
                    <p className="text-3xl font-black">7,850,000đ</p>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-3/4" />
                    </div>
                    <p className="text-xs opacity-80">Vượt 25% so với tuần trước</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-background">
        <Container classNameContent="max-w-4xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black">Bạn hỏi, CleanZ trả lời</h2>
            <p className="text-muted-foreground text-lg">Mọi điều bạn cần biết trước khi bắt đầu hành trình mới.</p>
          </div>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {FAQS.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border rounded-2xl px-6 bg-muted/10">
                <AccordionTrigger className="text-left font-bold text-lg hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary z-0" />
        <div className="absolute top-0 right-0 w-[50%] h-full bg-white/5 skew-x-12 translate-x-24 z-0" />
        
        <Container className="relative z-10" classNameContent="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Sẵn sàng trở thành đối tác CleanZ chuyên nghiệp?
            </h2>
            <p className="text-primary-foreground/80 text-xl">
              Đừng bỏ lỡ cơ hội gia nhập cộng đồng hơn 5,000+ đối tác dọn dẹp chuyên nghiệp và bứt phá thu nhập ngay hôm nay.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="h-16 px-10 rounded-2xl text-xl font-black bg-white text-primary hover:bg-white/90 shadow-2xl transition-all" asChild>
                <Link href="/become-partner/signup">Tạo tài khoản Đối tác miễn phí</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 rounded-2xl text-xl font-black border-white text-white hover:bg-white/10" asChild>
                <Link href="/become-partner/register">Đã có tài khoản</Link>
              </Button>
            </div>
            <p className="text-white/60 text-sm italic">
              * Quy trình đăng ký hoàn toàn miễn phí và không thu bất kỳ khoản phí hồ sơ nào.
            </p>
          </motion.div>
        </Container>
      </section>
    </div>
  );
}
