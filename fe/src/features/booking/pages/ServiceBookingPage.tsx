'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  Info,
  ChevronRight,
  MessageSquare,
  CreditCard,
  Plus,
  Minus,
  Sparkles,
  Zap,
  Gift,
  AlertCircle,
  HelpCircle,
  XCircle,
  Check,
  ChevronDown,
  Smartphone,
  Wallet,
  Building2
} from "lucide-react";
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Container from "@/components/Container";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Dữ liệu mẫu mở rộng
const DUMMY_SERVICE = {
  id: "cleaning-standard",
  title: "Dọn nhà chuyên sâu",
  category: "Vệ sinh",
  rating: 4.9,
  reviews: 1280,
  price: 150000,
  unit: "giờ",
  duration: "3-4 giờ",
  image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80",
  description: "Dịch vụ vệ sinh toàn diện mang lại không gian sống trong lành nhất cho gia đình bạn. Chúng tôi không chỉ dọn dẹp, chúng tôi chăm sóc từng ngóc ngách bằng sự tận tâm và công nghệ vệ sinh hiện đại nhất.",
  benefits: [
    { icon: Zap, title: "Nhanh chóng", desc: "Có mặt sau 60 phút đặt lịch" },
    { icon: ShieldCheck, title: "Bảo hiểm", desc: "Bảo vệ tài sản lên đến 20tr" },
    { icon: Sparkles, title: "Sạch sâu", desc: "Hóa chất đạt chuẩn an toàn" },
  ],
  process: [
    { step: "01", title: "Khảo sát và Phân loại", desc: "Chuyên gia kiểm tra tình trạng bề mặt và vật liệu để chọn hóa chất phù hợp." },
    { step: "02", title: "Dọn dẹp thô", desc: "Thu gom rác, hút bụi toàn bộ sàn nhà và các hốc tường." },
    { step: "03", title: "Vệ sinh chi tiết", desc: "Lau kính, khử khuẩn bếp, phòng tắm bằng máy hơi nước nóng." },
    { step: "04", title: "Nghiệm thu", desc: "Khách hàng kiểm tra và ký biên bản hoàn thành." },
  ],
  inclusions: ["Hút bụi sàn & thảm", "Lau kính mặt trong (dưới 2m)", "Vệ sinh toilet & bồn rửa", "Khử mùi phòng khách"],
  exclusions: ["Giặt rèm/thảm nặng", "Lau kính mặt ngoài nhà cao tầng", "Nấu ăn/Trông trẻ", "Di chuyển đồ nội thất nặng"],
  experts: [
    { id: 1, name: "Nguyễn Thị Hoa", rating: 4.9, avatar: "https://i.pravatar.cc/150?u=hoa", role: "Trưởng nhóm", experience: "5 năm" },
    { id: 2, name: "Trần Văn Nam", rating: 4.8, avatar: "https://i.pravatar.cc/150?u=nam", role: "Kỹ thuật", experience: "3 năm" },
    { id: 3, name: "Lê Thị Lan", rating: 5.0, avatar: "https://i.pravatar.cc/150?u=lan", role: "Chuyên viên", experience: "4 năm" },
  ],
  faqs: [
    { q: "Tôi có cần chuẩn bị dụng cụ vệ sinh không?", a: "Nhân viên của chúng tôi đã trang bị đầy đủ máy hút bụi và hóa chất chuyên dụng. Bạn không cần chuẩn bị thêm gì." },
    { q: "Nếu có đồ đạc bị hư hỏng thì sao?", a: "Chúng tôi có gói bảo hiểm trách nhiệm dân sự. Mọi hư hỏng do nhân viên gây ra sẽ được bối thường 100% giá trị sau khi xác minh." },
    { q: "Tôi muốn thay đổi giờ làm việc?", a: "Bạn có thể thay đổi hoặc hủy lịch miễn phí trước 2 giờ so với giờ hẹn qua ứng dụng hoặc hotline." }
  ]
};

const TIME_SLOTS = ["08:00", "09:00", "10:00", "13:00", "14:00", "15:00", "16:00", "18:00"];

const PAYMENT_METHODS = [
  { id: 'cod', name: 'Tiền mặt', icon: Wallet, desc: 'Trả sau khi hoàn thành' },
  { id: 'momo', name: 'MoMo', icon: Smartphone, desc: 'Thanh toán trực tuyến' },
  { id: 'card', name: 'Thẻ / Banking', icon: CreditCard, desc: 'Visa, Master, ATM' },
];

export default function ServiceBookingPage() {
  const router = useRouter();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [quantity, setQuantity] = useState(3);
  const [selectedExpert, setSelectedExpert] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState('cod');
  const [voucher, setVoucher] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const totalPrice = DUMMY_SERVICE.price * quantity;
  const shipFee = 20000;
  const discount = voucher.toLowerCase() === 'king' ? 50000 : 0;
  const finalTotal = totalPrice + shipFee - discount;

  return (
    <div className="min-h-screen bg-background pb-32 transition-colors duration-300">
      {/* 1. Header Navigation */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/40">
        <Container className="px-5 md:px-0 h-16 md:h-20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex flex-col">
                 <h1 className="font-bold text-sm md:text-lg truncate max-w-[200px] md:max-w-none">{DUMMY_SERVICE.title}</h1>
                 <p className="hidden md:block text-[10px] text-muted-foreground uppercase tracking-widest font-black">CleanZ Premium</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <Badge className="bg-emerald-500/10 text-emerald-500 border-none hidden sm:flex">Sẵn sàng ngay</Badge>
               <Button variant="outline" size="icon" className="rounded-xl border-border/60">
                  <HelpCircle className="w-4 h-4" />
               </Button>
            </div>
        </Container>
      </div>

      <Container className="pt-8 md:pt-16 px-5 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          
          {/* LEFT COLUMN: Service Details & Education */}
          <div className="lg:col-span-7 space-y-16 md:space-y-24">
            
            {/* Hero Image & Headline */}
            <section className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="aspect-[16/9] md:aspect-[21/9] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl relative"
              >
                <img src={DUMMY_SERVICE.image} alt={DUMMY_SERVICE.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-10 left-10 right-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                   <div className="space-y-3">
                     <div className="flex items-center gap-3">
                        <Badge className="bg-primary/20 backdrop-blur-md text-primary-foreground border-none text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                           {DUMMY_SERVICE.category}
                        </Badge>
                        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md rounded-full px-3 py-1 text-[11px] font-bold text-white">
                           <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                           {DUMMY_SERVICE.rating} <span className="opacity-60 text-[9px] font-medium">({DUMMY_SERVICE.reviews} lượt)</span>
                        </div>
                     </div>
                     <h2 className="text-4xl md:text-7xl font-light leading-[0.9] text-foreground" style={{ fontFamily: "'Times New Roman', serif" }}>
                        {DUMMY_SERVICE.title}
                     </h2>
                   </div>
                   <div className="bg-card/40 backdrop-blur-xl border border-white/20 p-4 md:p-6 rounded-[2rem] shadow-2xl shrink-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Giá từ</p>
                      <p className="text-2xl md:text-3xl font-black text-primary">{(DUMMY_SERVICE.price).toLocaleString()}đ<span className="text-xs font-medium text-muted-foreground">/{DUMMY_SERVICE.unit}</span></p>
                   </div>
                </div>
              </motion.div>
              <p className="text-muted-foreground text-lg md:text-2xl font-light leading-relaxed max-w-2xl text-pretty" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {DUMMY_SERVICE.description}
              </p>
            </section>

            {/* Benefits Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {DUMMY_SERVICE.benefits.map((benefit, i) => (
                 <div key={i} className="bg-card/40 border border-border/40 p-8 rounded-[2rem] space-y-4 hover:border-primary/40 transition-colors group">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                       <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                       <h4 className="font-bold text-lg mb-1">{benefit.title}</h4>
                       <p className="text-sm text-muted-foreground font-light">{benefit.desc}</p>
                    </div>
                 </div>
               ))}
            </div>

            {/* Service Process */}
            <section className="space-y-12">
               <div className="space-y-4">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] border-primary/20 text-primary rounded-full px-4">Quy trình</Badge>
                  <h3 className="text-3xl md:text-5xl font-light" style={{ fontFamily: "'Times New Roman', serif" }}>Cách chúng tôi <span className="italic text-primary">làm việc</span></h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {DUMMY_SERVICE.process.map((step, i) => (
                    <div key={i} className="flex gap-6 relative">
                       <div className="text-5xl md:text-6xl font-black text-primary/10 select-none absolute -top-4 -left-2">{step.step}</div>
                       <div className="relative pt-2">
                          <h4 className="text-xl font-bold mb-3">{step.title}</h4>
                          <p className="text-muted-foreground text-sm md:text-base font-light leading-relaxed">{step.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            {/* Inclusions & Exclusions */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card/40 rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-14 border border-border/40">
               <div className="space-y-8">
                  <h4 className="flex items-center gap-3 text-xl font-bold text-emerald-500">
                     <CheckCircle2 className="w-6 h-6" /> Bao gồm
                  </h4>
                  <ul className="space-y-4">
                     {DUMMY_SERVICE.inclusions.map((item, i) => (
                       <li key={i} className="flex items-center gap-3 text-sm md:text-base font-light">
                          <Check className="w-4 h-4 text-emerald-500" /> {item}
                       </li>
                     ))}
                  </ul>
               </div>
               <Separator className="md:hidden" />
               <div className="space-y-8">
                  <h4 className="flex items-center gap-3 text-xl font-bold text-rose-500">
                     <XCircle className="w-6 h-6" /> Không bao gồm
                  </h4>
                  <ul className="space-y-4">
                     {DUMMY_SERVICE.exclusions.map((item, i) => (
                       <li key={i} className="flex items-center gap-3 text-sm md:text-base font-light text-muted-foreground/60">
                          <Minus className="w-4 h-4 opacity-40" /> {item}
                       </li>
                     ))}
                  </ul>
               </div>
            </section>

            {/* FAQ Accordion */}
            <section className="space-y-10">
               <h3 className="text-2xl md:text-4xl font-light" style={{ fontFamily: "'Times New Roman', serif" }}>Câu hỏi thường gặp</h3>
               <Accordion type="single" collapsible className="w-full">
                 {DUMMY_SERVICE.faqs.map((faq, i) => (
                   <AccordionItem key={i} value={`item-${i}`} className="border-border/40 px-2">
                     <AccordionTrigger className="text-left font-bold text-base md:text-lg hover:no-underline hover:text-primary transition-colors py-6">
                        {faq.q}
                     </AccordionTrigger>
                     <AccordionContent className="text-muted-foreground text-sm md:text-base font-light leading-relaxed pb-6">
                        {faq.a}
                     </AccordionContent>
                   </AccordionItem>
                 ))}
               </Accordion>
            </section>
          </div>

          {/* RIGHT COLUMN: Interactive Booking Form */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-10">
              
              {/* MAIN FORM CARD */}
              <div className="bg-card border border-border/60 rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12">
                   <CalendarIcon className="w-40 h-40 text-primary" />
                </div>

                <div className="relative z-10 space-y-12">
                   {/* 1. Location Selection */}
                   <section className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="flex items-center gap-3 font-bold text-lg">
                           <MapPin className="w-5 h-5 text-primary" /> Địa điểm
                         </h4>
                         <Button variant="link" className="text-[10px] font-black uppercase text-primary p-0">Chọn từ bản đồ</Button>
                      </div>
                      <div className="relative">
                         <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                         <Input 
                            placeholder="Địa chỉ giao việc..." 
                            className="pl-11 h-14 rounded-2xl border-border/60 bg-background/50 focus-visible:ring-primary/20"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                         />
                      </div>
                   </section>

                   {/* 2. Date & Time Selection */}
                   <section className="space-y-6">
                      <h4 className="flex items-center gap-3 font-bold text-lg">
                         <Clock className="w-5 h-5 text-blue-500" /> Thời gian
                      </h4>
                      <div className="flex flex-col gap-4">
                         {/* Date Trigger */}
                         <Accordion type="single" collapsible>
                            <AccordionItem value="calendar" className="border-none">
                               <AccordionTrigger className="bg-muted/40 rounded-2xl px-6 py-4 hover:no-underline border border-border/40">
                                  <div className="flex items-center gap-3">
                                     <CalendarIcon className="w-4 h-4 text-primary" />
                                     <span className="font-bold text-sm">{date ? date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }) : 'Chọn ngày'}</span>
                                  </div>
                               </AccordionTrigger>
                               <AccordionContent className="pt-4 flex justify-center">
                                  <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    className="rounded-2xl border border-border/40 bg-card p-4 shadow-xl"
                                    disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                                  />
                               </AccordionContent>
                            </AccordionItem>
                         </Accordion>

                         {/* Time List */}
                         <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-2 px-2">
                            {TIME_SLOTS.map((t) => (
                               <button
                                  key={t}
                                  onClick={() => setSelectedTime(t)}
                                  className={`shrink-0 px-6 py-3 rounded-xl border text-xs font-black uppercase tracking-widest transition-all ${
                                     selectedTime === t 
                                     ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' 
                                     : 'bg-background border-border/40 text-muted-foreground hover:border-primary/40'
                                  }`}
                               >
                                  {t}
                               </button>
                            ))}
                         </div>
                      </div>
                   </section>

                   {/* 3. Expert Selection */}
                   <section className="space-y-6">
                      <h4 className="flex items-center gap-3 font-bold text-lg">
                         <User className="w-5 h-5 text-emerald-500" /> Chuyên gia
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                         {DUMMY_SERVICE.experts.map((exp) => (
                           <button
                              key={exp.id}
                              onClick={() => setSelectedExpert(exp.id === selectedExpert ? null : exp.id)}
                              className={`p-4 rounded-2xl border transition-all text-center relative ${
                                selectedExpert === exp.id
                                ? 'bg-emerald-500/5 border-emerald-500 shadow-xl shadow-emerald-500/10'
                                : 'bg-background border-border/40 opacity-60 hover:opacity-100'
                              }`}
                           >
                              <div className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-emerald-500/20 p-0.5">
                                 <img src={exp.avatar} alt={exp.name} className="w-full h-full rounded-full object-cover" />
                              </div>
                              <p className="text-[10px] font-black truncate">{exp.name.split(' ').pop()}</p>
                              <div className="flex items-center justify-center gap-0.5 text-[8px] font-bold text-amber-500 mt-1">
                                 <Star className="w-2 h-2 fill-current" /> {exp.rating}
                              </div>
                           </button>
                         ))}
                      </div>
                   </section>

                   {/* 4. Payment Methods */}
                   <section className="space-y-6">
                      <h4 className="flex items-center gap-3 font-bold text-lg">
                         <CreditCard className="w-5 h-5 text-violet-500" /> Thanh toán
                      </h4>
                      <div className="space-y-3">
                         {PAYMENT_METHODS.map((method) => (
                           <button
                              key={method.id}
                              onClick={() => setSelectedPayment(method.id)}
                              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                selectedPayment === method.id
                                ? 'bg-violet-500/5 border-violet-500'
                                : 'bg-background border-border/40'
                              }`}
                           >
                              <div className="flex items-center gap-4 text-left">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPayment === method.id ? 'bg-violet-500 text-white' : 'bg-muted/40 text-muted-foreground'}`}>
                                    <method.icon className="w-5 h-5" />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold">{method.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{method.desc}</span>
                                 </div>
                              </div>
                              {selectedPayment === method.id && <CheckCircle2 className="w-5 h-5 text-violet-500" />}
                           </button>
                         ))}
                      </div>
                   </section>

                   {/* 5. Voucher & Note */}
                   <section className="space-y-4 pt-4 border-t border-border/40">
                      <div className="flex gap-2">
                         <div className="relative flex-1 group">
                            <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                            <Input 
                               placeholder="Mã giảm giá..." 
                               className="pl-11 h-12 rounded-xl bg-muted/40 border-border/40"
                               value={voucher}
                               onChange={(e) => setVoucher(e.target.value)}
                            />
                         </div>
                         <Button variant="outline" className="h-12 rounded-xl border-border/60 hover:border-primary px-6">Áp dụng</Button>
                      </div>
                      <Accordion type="single" collapsible>
                         <AccordionItem value="note" className="border-none">
                            <AccordionTrigger className="text-[10px] font-black uppercase text-muted-foreground hover:no-underline justify-center gap-2">Ghi chú thêm <ChevronDown className="w-3 h-3" /></AccordionTrigger>
                            <AccordionContent>
                               <Textarea 
                                  placeholder="Nhập nội dung ghi chú..." 
                                  className="rounded-xl border-border/40 mt-2 min-h-[80px]"
                                  value={note}
                                  onChange={(e) => setNote(e.target.value)}
                               />
                            </AccordionContent>
                         </AccordionItem>
                      </Accordion>
                   </section>

                   {/* CHECKOUT SUMMARY */}
                   <div className="space-y-6 pt-6 border-t border-border/40">
                      <div className="space-y-3">
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Phí dịch vụ ({quantity}h x {DUMMY_SERVICE.price.toLocaleString()}đ)</span>
                            <span className="font-bold">{totalPrice.toLocaleString()}đ</span>
                         </div>
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Phí di chuyển</span>
                            <span className="font-bold">{shipFee.toLocaleString()}đ</span>
                         </div>
                         {discount > 0 && (
                           <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between text-sm">
                              <span className="text-rose-500 font-bold flex items-center gap-1"><Gift className="w-3 h-3" /> Voucher KING</span>
                              <span className="text-rose-500 font-bold">-{discount.toLocaleString()}đ</span>
                           </motion.div>
                         )}
                      </div>
                      <div className="bg-primary p-8 rounded-[2rem] text-primary-foreground shadow-2xl shadow-primary/30 relative overflow-hidden group">
                         <div className="flex items-end justify-between relative z-10">
                            <span className="text-sm font-bold uppercase tracking-[0.2em] opacity-80">Tổng thanh toán</span>
                            <div className="text-right">
                               <p className="text-4xl md:text-5xl font-black leading-none">{finalTotal.toLocaleString()}đ</p>
                               <p className="text-[9px] font-black uppercase mt-2 opacity-60">Thanh toán bằng {PAYMENT_METHODS.find(m => m.id === selectedPayment)?.name}</p>
                            </div>
                         </div>
                         {/* shine sweep */}
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      </div>
                      <Button 
                        className="w-full h-16 md:h-20 bg-background hover:bg-muted/80 text-foreground border border-border/60 font-black text-sm md:text-lg uppercase tracking-widest rounded-2xl md:rounded-[2.5rem] shadow-xl transition-all"
                        disabled={!selectedTime || !date || !address}
                        onClick={() => alert("Đang xử lý đặt lịch!")}
                      >
                         <Zap className="w-5 h-5 text-primary mr-3 fill-primary" />
                         Xác nhận & Hoàn tất
                      </Button>
                      <div className="flex items-center justify-center gap-2 text-muted-foreground/40">
                         <ShieldCheck className="w-3.5 h-3.5" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Bảo mật SSL 256-bit</span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Support Hotline */}
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-center justify-between group cursor-pointer hover:bg-primary/10 transition-colors">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                       <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase opacity-40">Cần hỗ trợ?</p>
                       <p className="font-bold">1900 6789</p>
                    </div>
                 </div>
                 <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* MOBILE MINI SUMMARY & CTA (Fixed) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-border/40 p-5 md:hidden">
         <div className="flex items-center justify-between gap-6">
            <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-1">Tạm tính</span>
               <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-primary">{finalTotal.toLocaleString()}đ</p>
                  <span className="text-[8px] font-medium opacity-40">NET</span>
               </div>
            </div>
            <Button 
               className="flex-1 h-14 bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/30"
               disabled={!selectedTime || !date || !address}
               onClick={() => alert("Đặt lịch!")}
            >
               Tiếp tục
            </Button>
         </div>
      </div>
    </div>
  );
}
