"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Sparkles, Star, Clock, Search, ArrowRight, Sun, Moon,
  Wrench, Scissors, HeartPulse, BookOpen, Dumbbell, Home,
  BadgeCheck, ShieldCheck, TrendingUp, CheckCircle2, Award,
  Eye, Zap, Smartphone, User, Bell, MapPin, CalendarCheck,
  Heart, Share2, ChevronRight, Filter, LayoutGrid, List,
  CreditCard, UserCheck, Brush, Code2, Palette, Layers,
  Play, X, Plus, Minus, Package, Truck, RefreshCw,
  MessageSquare, ThumbsUp, Camera, Settings, LogOut,
  PieChart, BarChart2, Activity, DollarSign, Users,
  SlidersHorizontal, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (d = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: d, ease: [0.22, 1, 0.36, 1] },
  }),
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: (d = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.5, delay: d, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { icon: Wrench, label: "Sửa chữa", color: "#3B82F6", bg: "bg-blue-50", count: 142 },
  { icon: Home, label: "Dọn dẹp", color: "#10B981", bg: "bg-emerald-50", count: 89 },
  { icon: Scissors, label: "Làm đẹp", color: "#EC4899", bg: "bg-rose-50", count: 65 },
  { icon: HeartPulse, label: "Sức khỏe", color: "#EF4444", bg: "bg-red-50", count: 53 },
  { icon: BookOpen, label: "Gia sư", color: "#F59E0B", bg: "bg-amber-50", count: 78 },
  { icon: Dumbbell, label: "Fitness", color: "#8B5CF6", bg: "bg-violet-50", count: 34 },
];

const SERVICES = [
  {
    id: 1, title: "Dọn nhà chuyên sâu", tag: "Dọn dẹp",
    rating: 4.9, reviews: 1280, price: "450.000đ", unit: "/ buổi",
    duration: "4–5 giờ", isHot: true,
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80",
    provider: "CleanZ Pro", providerAvatar: "C",
  },
  {
    id: 2, title: "Sửa máy lạnh & Nạp gas", tag: "Sửa chữa",
    rating: 4.8, reviews: 850, price: "250.000đ", unit: "/ máy",
    duration: "1–2 giờ", isHot: false,
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&q=80",
    provider: "TechFix VN", providerAvatar: "T",
  },
  {
    id: 3, title: "Massage thư giãn & Spa", tag: "Làm đẹp",
    rating: 5.0, reviews: 920, price: "350.000đ", unit: "/ 90p",
    duration: "90 phút", isHot: true,
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80",
    provider: "BeautyHub", providerAvatar: "B",
  },
];

const STATS_DASHBOARD = [
  { label: "Tổng đơn hàng", value: "1,284", icon: Package, change: "+12.5%", up: true, color: "#FFA000" },
  { label: "Doanh thu tháng", value: "48.6M", icon: DollarSign, change: "+8.2%", up: true, color: "#10B981" },
  { label: "Người dùng mới", value: "342", icon: Users, change: "-2.1%", up: false, color: "#3B82F6" },
  { label: "Tỷ lệ hài lòng", value: "98.4%", icon: ThumbsUp, change: "+0.8%", up: true, color: "#8B5CF6" },
];

const REVIEWS = [
  { name: "Nguyễn Thị Lan", avatar: "N", rating: 5, time: "2 ngày trước", text: "Dịch vụ tuyệt vời! Thợ đến đúng giờ, làm việc chuyên nghiệp và nhiệt tình. Nhà sạch bóng từng góc." },
  { name: "Trần Minh Khoa", avatar: "T", rating: 4, time: "5 ngày trước", text: "Kỹ thuật viên có tay nghề cao, giải thích rõ ràng vấn đề. Sẽ tiếp tục ủng hộ KingOfService." },
];

const BOOKING_STEPS = [
  { step: 1, label: "Chọn dịch vụ", icon: Search, done: true },
  { step: 2, label: "Đặt lịch", icon: CalendarCheck, done: true },
  { step: 3, label: "Thanh toán", icon: CreditCard, done: false },
  { step: 4, label: "Hoàn thành", icon: CheckCircle2, done: false },
];

const COMPONENTS_LIST = [
  { name: "Button", variants: ["Primary", "Secondary", "Outline", "Ghost", "Destructive"] },
  { name: "Badge", variants: ["Default", "Secondary", "Outline", "Hot", "New"] },
  { name: "Input", variants: ["Default", "Search", "With Icon", "Error"] },
];

// ─── Reusable Sub-Components ─────────────────────────────────────────────────
const SectionBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children, color = "#FFA000",
}) => (
  <span
    className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border mb-5"
    style={{ color, backgroundColor: `${color}12`, borderColor: `${color}25` }}
  >
    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
    {children}
  </span>
);

const SectionTitle: React.FC<{ children: React.ReactNode; highlight?: string }> = ({
  children, highlight,
}) => (
  <h2 className="text-3xl md:text-4xl font-light text-foreground tracking-tight leading-tight"
    style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
    {children}
    {highlight && <em className="italic not-italic text-primary"> {highlight}</em>}
  </h2>
);

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={cn(
    "bg-card/80 backdrop-blur-md border border-border/60 rounded-2xl shadow-sm",
    "hover:shadow-md hover:shadow-primary/8 hover:border-primary/20 transition-all duration-300",
    className
  )}>
    {children}
  </div>
);

const TabNav: React.FC<{
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex overflow-x-auto scrollbar-hide gap-1 p-1 bg-muted/50 rounded-2xl w-fit">
    {tabs.map(tab => (
      <button key={tab}
        onClick={() => onChange(tab)}
        className={cn(
          "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all",
          active === tab
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}>
        {tab}
      </button>
    ))}
  </div>
);

// ─── Section Components ────────────────────────────────────────────────────────

// 1. Navigation Header
const NavSection = () => (
  <div className="space-y-4">
    <SectionBadge>Navigation</SectionBadge>
    <SectionTitle highlight="Header & Nav">Sticky</SectionTitle>
    <div className="mt-6 rounded-2xl overflow-hidden border border-border/50">
      <header className="bg-card/90 backdrop-blur-md border-b border-border/40 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
          </div>
          <span className="font-bold text-foreground" style={{ fontFamily: "Georgia, serif" }}>
            KingOfService
          </span>
          <nav className="hidden md:flex items-center gap-6 ml-8">
            {["Trang chủ", "Dịch vụ", "Đặt lịch", "Về chúng tôi"].map(item => (
              <a key={item} href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item}</a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <button className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
            Đặt dịch vụ
          </button>
        </div>
      </header>
      {/* Breadcrumb */}
      <div className="bg-background/60 px-6 py-3 flex items-center gap-2 text-xs text-muted-foreground border-b border-border/30">
        <span>Trang chủ</span>
        <ChevronRight className="w-3 h-3" />
        <span>Dịch vụ</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-medium">Dọn dẹp nhà cửa</span>
      </div>
    </div>
  </div>
);

// 2. Hero Section
const HeroSection = () => (
  <div className="space-y-4">
    <SectionBadge color="#3B82F6">Hero Section</SectionBadge>
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background to-muted/30 border border-border/50 p-10 md:p-16 text-center">
      {/* Background blobs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[80px] opacity-20" style={{ background: "radial-gradient(circle, #FFA000 0%, transparent 70%)" }} />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full blur-[80px] opacity-15" style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }} />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="relative z-10 max-w-2xl mx-auto"
      >
        <motion.div variants={fadeUp}>
          <span className="inline-flex items-center gap-2 bg-accent/60 text-accent-foreground border border-primary/20 text-[11px] font-medium tracking-[0.1em] uppercase px-3.5 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            1,200+ thợ đã được xác minh
          </span>
        </motion.div>

        <motion.h1 variants={fadeUp} custom={0.1}
          className="text-[clamp(36px,6vw,64px)] font-light leading-[1.08] tracking-[-0.02em] text-foreground mb-5"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
          Mọi dịch vụ,{" "}
          <em className="not-italic italic text-primary">chính xác</em>
          {" "}trong từng chi tiết
        </motion.h1>

        <motion.p variants={fadeUp} custom={0.2}
          className="text-base text-muted-foreground leading-[1.8] max-w-md mx-auto mb-8 font-light">
          Thợ chất lượng, giá minh bạch và đặt lịch dễ dàng — tất cả trong một nền tảng chuyên nghiệp.
        </motion.p>

        <motion.div variants={fadeUp} custom={0.3} className="max-w-md mx-auto">
          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border rounded-2xl p-1.5 pl-4 shadow-lg focus-within:border-primary/40 transition-all">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60"
              placeholder="Bạn đang cần tìm dịch vụ gì?" />
            <button className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors shrink-0">
              Tìm kiếm
            </button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} custom={0.4} className="flex flex-wrap justify-center gap-4 mt-8 pt-6 border-t border-border/40">
          {[
            { icon: BadgeCheck, text: "Thợ đã xác minh" },
            { icon: ShieldCheck, text: "Bảo hiểm công việc" },
            { icon: Clock, text: "Hỗ trợ 24/7" },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
              {text}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  </div>
);

// 3. Categories Section
const CategoriesSection = () => (
  <div className="space-y-4">
    <SectionBadge color="#10B981">Categories</SectionBadge>
    <SectionTitle>Danh mục</SectionTitle>
    <p className="text-sm text-muted-foreground mt-1">Horizontal scroll trên mobile</p>

    <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-2 mt-4">
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.button
            key={cat.label}
            custom={i * 0.08}
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{ y: -3, scale: 1.03 }}
            className="flex flex-col items-center gap-2.5 shrink-0 group"
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
              "group-hover:scale-105 group-hover:shadow-lg",
              cat.bg
            )} style={{ boxShadow: `0 4px 20px ${cat.color}25` }}>
              <Icon className="w-7 h-7" style={{ color: cat.color }} aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-foreground">{cat.label}</span>
            <span className="text-[10px] text-muted-foreground">{cat.count} dịch vụ</span>
          </motion.button>
        );
      })}
    </div>
  </div>
);

// 4. Service Cards
const ServiceCardsSection = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <SectionBadge>Service Cards</SectionBadge>
        <SectionTitle highlight="glassmorphism">Cards với</SectionTitle>
      </div>
      <button className="flex items-center gap-1 text-sm text-primary font-semibold group">
        Xem tất cả
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
      {SERVICES.map((s, i) => (
        <motion.div
          key={s.id}
          custom={i * 0.1}
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
          whileHover={{ y: -5 }}
          className="group"
        >
          <GlassCard className="overflow-hidden flex flex-col">
            <div className="relative h-48 overflow-hidden">
              <img src={s.image} alt={s.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

              {s.isHot && (
                <span className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground px-2.5 py-1 rounded-full">
                  HOT
                </span>
              )}

              <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold border border-border/40">
                <Star className="w-3 h-3 fill-primary text-primary" />
                {s.rating}
                <span className="text-muted-foreground">({s.reviews})</span>
              </div>

              <div className="absolute bottom-3 right-3 flex gap-2">
                <button className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <Heart className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500 transition-colors" />
                </button>
                <button className="w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {s.tag}
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                    {s.providerAvatar}
                  </div>
                  <span className="text-xs text-muted-foreground">{s.provider}</span>
                </div>
              </div>

              <h3 className="font-bold text-sm text-foreground leading-snug">{s.title}</h3>

              <div className="border-t border-border/50 pt-2 mt-auto flex items-center justify-between">
                <div>
                  <span className="text-base font-bold text-foreground">{s.price}</span>
                  <span className="text-xs text-muted-foreground ml-1">{s.unit}</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {s.duration}
                </span>
              </div>

              <button className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-colors mt-1">
                <CalendarCheck className="w-3.5 h-3.5" />
                Đặt ngay
              </button>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  </div>
);

// 5. Booking Flow
const BookingSection = () => {
  const [activeStep, setActiveStep] = useState(2);
  return (
    <div className="space-y-4">
      <SectionBadge color="#8B5CF6">Booking Flow</SectionBadge>
      <SectionTitle highlight="đặt lịch">Quy trình</SectionTitle>

      <GlassCard className="p-6 mt-4">
        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          {BOOKING_STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.step === activeStep;
            const isDone = s.step < activeStep;
            return (
              <React.Fragment key={s.step}>
                <button
                  onClick={() => setActiveStep(s.step)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 group relative",
                    i > 0 && "flex-1"
                  )}
                >
                  {i > 0 && (
                    <div className={cn(
                      "absolute -left-1/2 top-4 w-full h-px -translate-y-1/2",
                      isDone || isActive ? "bg-primary/40" : "bg-border"
                    )} />
                  )}
                  <div className={cn(
                    "relative w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all z-10",
                    isDone ? "bg-primary border-primary" :
                      isActive ? "bg-primary/10 border-primary" :
                        "bg-background border-border"
                  )}>
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      : <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                    }
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-wide whitespace-nowrap",
                    isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 3 Content - Payment */}
        <div className="border border-border/50 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Thông tin thanh toán</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Tên trên thẻ</label>
              <input className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" placeholder="NGUYEN VAN A" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Số thẻ</label>
              <div className="relative">
                <input className="w-full h-11 pl-3 pr-10 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" placeholder="1234 5678 9012 3456" />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Ngày hết hạn</label>
              <input className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" placeholder="MM / YY" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">CVV</label>
              <input className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" placeholder="•••" />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
              className="flex-1 h-11 rounded-xl border border-border hover:border-foreground text-foreground text-sm font-bold transition-colors">
              ← Quay lại
            </button>
            <button onClick={() => setActiveStep(Math.min(4, activeStep + 1))}
              className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors">
              Xác nhận thanh toán →
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

// 6. Dashboard Stats
const DashboardSection = () => (
  <div className="space-y-4">
    <SectionBadge color="#EC4899">Admin Dashboard</SectionBadge>
    <SectionTitle highlight="Analytics">Stats &amp;</SectionTitle>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
      {STATS_DASHBOARD.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            custom={i * 0.08}
            variants={scaleIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{ scale: 1.03, y: -2 }}
          >
            <GlassCard className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: stat.color }} aria-hidden="true" />
                </div>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  stat.up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                )}>
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground" style={{ fontFamily: "Georgia, serif" }}>
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>

    {/* Mini Chart Area */}
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Doanh thu 7 ngày</p>
          <p className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: "Georgia, serif" }}>48.6M đ</p>
        </div>
        <BarChart2 className="w-5 h-5 text-primary" />
      </div>
      {/* Fake Bar Chart */}
      <div className="flex items-end gap-2 h-24">
        {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }}
            className="flex-1 rounded-t-lg"
            style={{
              backgroundColor: i === 5 ? "#FFA000" : "#FFA00030",
              minHeight: 4
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
          <span key={d} className="text-[10px] text-muted-foreground flex-1 text-center">{d}</span>
        ))}
      </div>
    </GlassCard>
  </div>
);

// 7. Reviews and Ratings
const ReviewsSection = () => (
  <div className="space-y-4">
    <SectionBadge color="#F59E0B">Reviews & Ratings</SectionBadge>
    <SectionTitle>Đánh giá</SectionTitle>

    {/* Rating Summary */}
    <GlassCard className="p-5 mt-4">
      <div className="flex gap-8 items-center mb-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-foreground" style={{ fontFamily: "Georgia, serif" }}>4.9</div>
          <div className="flex gap-0.5 justify-center mt-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="w-4 h-4 fill-primary text-primary" />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">3,280 đánh giá</div>
        </div>
        <div className="flex-1 space-y-2">
          {[90, 6, 3, 1, 0].map((pct, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4">{5 - i}</span>
              <Star className="w-3 h-3 fill-primary text-primary shrink-0" />
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
              <span className="text-xs text-muted-foreground w-6">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review Cards */}
      <div className="space-y-4 border-t border-border/40 pt-4">
        {REVIEWS.map((rv, i) => (
          <motion.div key={rv.name} custom={i * 0.12} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                {rv.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{rv.name}</span>
                  <span className="text-xs text-muted-foreground">{rv.time}</span>
                </div>
                <div className="flex gap-0.5 my-1">
                  {Array.from({ length: rv.rating }).map((_, j) => (
                    <Star key={j} className="w-3 h-3 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{rv.text}</p>
                <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-2 transition-colors">
                  <ThumbsUp className="w-3 h-3" />
                  Hữu ích (12)
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  </div>
);

// 8. UI Components Showcase
const ComponentsSection = () => (
  <div className="space-y-4">
    <SectionBadge color="#3B82F6">UI Components</SectionBadge>
    <SectionTitle highlight="Shadcn UI">Buttons &amp;</SectionTitle>

    <div className="space-y-6 mt-4">
      {/* Buttons */}
      <GlassCard className="p-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Buttons</p>
        <div className="flex flex-wrap gap-3">
          <button className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors">
            Primary
          </button>
          <button className="h-10 px-5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-bold transition-colors">
            Secondary
          </button>
          <button className="h-10 px-5 rounded-xl border border-border hover:border-primary hover:text-primary text-foreground text-sm font-bold transition-colors">
            Outline
          </button>
          <button className="h-10 px-5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-sm font-bold transition-colors">
            Ghost
          </button>
          <button className="h-10 px-5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-bold transition-colors">
            Destructive
          </button>
          <button className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>

      {/* Badges */}
      <GlassCard className="p-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Badges & Tags</p>
        <div className="flex flex-wrap gap-2">
          <span className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">HOT</span>
          <span className="bg-emerald-500/15 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/25">Mới</span>
          <span className="bg-blue-500/15 text-blue-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-500/25">Dọn dẹp</span>
          <span className="bg-rose-500/15 text-rose-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-rose-500/25">Làm đẹp</span>
          <span className="bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-border">Default</span>
          <span className="border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">Outline</span>
        </div>
      </GlassCard>

      {/* Inputs */}
      <GlassCard className="p-5">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Inputs & Form</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tên dịch vụ</label>
            <input className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" placeholder="VD: Dọn nhà chuyên sâu" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className="w-full h-11 pl-9 pr-3 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors" placeholder="Tìm kiếm..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Số điện thoại <span className="text-destructive">*</span></label>
            <input className="w-full h-11 px-3 rounded-xl border border-destructive bg-background text-sm outline-none" placeholder="0912 345 678" />
            <p className="text-xs text-destructive">Số điện thoại không hợp lệ</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Ghi chú</label>
            <textarea className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:border-primary transition-colors resize-none" rows={3} placeholder="Nhập ghi chú thêm..." />
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

// 9. Color System
const ColorSystem = () => (
  <div className="space-y-4">
    <SectionBadge color="#FFA000">Design Tokens</SectionBadge>
    <SectionTitle highlight="Color System">Brand &amp;</SectionTitle>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {[
        { name: "Primary", hex: "#FFA000", var: "--primary" },
        { name: "Primary (Dark)", hex: "#FFB300", var: "--primary (dark)" },
        { name: "Background", hex: "#ffffff", var: "--background" },
        { name: "Foreground", hex: "#0D1B3E", var: "--foreground" },
        { name: "Secondary", hex: "#E3F2FD", var: "--secondary" },
        { name: "Accent", hex: "#FFF3E0", var: "--accent" },
        { name: "Muted", hex: "#E3F2FD", var: "--muted" },
        { name: "Destructive", hex: "#ef4444", var: "--destructive" },
      ].map(({ name, hex, var: v }) => (
        <motion.div key={name} whileHover={{ scale: 1.04, y: -2 }} className="rounded-2xl overflow-hidden border border-border/50 cursor-default">
          <div className="h-16" style={{ backgroundColor: hex }} />
          <div className="p-3 bg-card border-t border-border/30">
            <p className="text-xs font-bold text-foreground">{name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{hex}</p>
            <p className="text-[9px] text-muted-foreground/70 font-mono">{v}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// 10. Typography
const TypographySection = () => (
  <div className="space-y-4">
    <SectionBadge color="#8B5CF6">Typography</SectionBadge>
    <SectionTitle>Font Pairing</SectionTitle>

    <GlassCard className="p-6 mt-4 space-y-6">
      <div className="pb-6 border-b border-border/50">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Display · Times New Roman / Georgia</p>
        <h1 className="text-[clamp(32px,5vw,60px)] font-light leading-tight text-foreground"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
          Giao diện{" "}
          <em className="italic text-primary">premium</em>
          {" "}từng chi tiết
        </h1>
      </div>
      <div className="pb-6 border-b border-border/50">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Body · DM Sans</p>
        <p className="text-3xl font-bold text-primary" style={{ fontFamily: "'DM Sans', sans-serif" }}>DM Sans Bold</p>
        <p className="text-base text-muted-foreground leading-[1.8] mt-2 max-w-lg" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Thợ chất lượng, giá minh bạch và đặt lịch dễ dàng. Hơn 1,200 thợ đã được xác minh sẵn sàng phục vụ bạn 24/7.
        </p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Scale</p>
        <div className="space-y-2">
          {[
            { cls: "text-4xl", label: "text-4xl · 36px · Heading" },
            { cls: "text-2xl", label: "text-2xl · 24px · Title" },
            { cls: "text-lg", label: "text-lg · 18px · Subheading" },
            { cls: "text-sm", label: "text-sm · 14px · Body" },
            { cls: "text-xs", label: "text-xs · 12px · Caption" },
          ].map(({ cls, label }) => (
            <div key={label} className="flex items-baseline gap-4">
              <span className={cn(cls, "font-semibold text-foreground w-48 shrink-0 leading-none")}>{label.split("·")[0].trim()}</span>
              <span className="text-xs text-muted-foreground font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  </div>
);

// 11. CTA / Footer Banner
const CTASection = () => (
  <motion.div
    variants={fadeUp}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true }}
    className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center"
    style={{ background: "linear-gradient(135deg, #E65100 0%, #FFA000 50%, #FFD54F 100%)" }}
  >
    <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
    <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
    <div className="relative z-10">
      <p className="text-white/70 text-[10px] font-black tracking-[0.2em] uppercase mb-4">KingOfService · Premium UI</p>
      <h2 className="text-[clamp(24px,4vw,48px)] font-light text-white leading-tight mb-4"
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
        Sẵn sàng xây dựng{" "}
        <em className="font-bold not-italic">giao diện</em>{" "}
        của bạn?
      </h2>
      <p className="text-white/80 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
        Frontend Design · KingOfService Standards · Brand #FFA000 — tất cả hợp nhất tạo nên trải nghiệm premium.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-white text-primary font-bold text-sm hover:bg-white/90 transition-colors shadow-lg">
          Bắt đầu ngay
        </button>
        <button className="w-full sm:w-auto h-12 px-8 rounded-2xl border border-white/30 text-white font-medium text-sm hover:bg-white/10 transition-colors backdrop-blur-sm">
          Xem tài liệu
        </button>
      </div>
    </div>
  </motion.div>
);

// ─── Main Demo Export ─────────────────────────────────────────────────────────
export default function Demo() {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState("Tất cả");
  const TABS = ["Tất cả", "Navigation", "Hero", "Cards", "Booking", "Dashboard", "Reviews", "Components", "Colors", "Typography"];

  const allSections = [
    { id: "Navigation", node: <NavSection /> },
    { id: "Hero", node: <HeroSection /> },
    { id: "Cards", node: <CategoriesSection /> },
    { id: "Cards", node: <ServiceCardsSection /> },
    { id: "Booking", node: <BookingSection /> },
    { id: "Dashboard", node: <DashboardSection /> },
    { id: "Reviews", node: <ReviewsSection /> },
    { id: "Components", node: <ComponentsSection /> },
    { id: "Colors", node: <ColorSystem /> },
    { id: "Typography", node: <TypographySection /> },
    { id: "Tất cả", node: <CTASection /> },
  ];

  const visibleSections = activeTab === "Tất cả"
    ? allSections
    : allSections.filter(s => s.id === activeTab);

  return (
    <div className={cn("min-h-screen bg-background text-foreground", isDark && "dark")}
      style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Background Depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.08]"
          style={{ background: "radial-gradient(circle, #FFA000 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.06]"
          style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)" }} />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <span className="text-sm font-bold text-foreground" style={{ fontFamily: "Georgia, serif" }}>
                UI Demo
              </span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">KingOfService</span>
            </div>
          </div>

          {/* Tab Nav - scrollable on mobile */}
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max mx-auto justify-center">
              {["Tất cả", "Hero", "Cards", "Booking", "Dashboard", "Colors"].map(tab => (
                <button key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                    activeTab === tab
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-muted-foreground hidden md:block">
              Brand: <strong className="text-primary">#FFA000</strong>
            </span>
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              aria-label="Toggle dark mode"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isDark ? "sun" : "moon"}
                  initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                >
                  {isDark
                    ? <Sun className="w-4 h-4 text-primary" />
                    : <Moon className="w-4 h-4 text-muted-foreground" />
                  }
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* Page Intro */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-7xl mx-auto px-5 md:px-6 pt-12 pb-6 text-center"
      >
        <motion.div variants={fadeUp}>
          <span className="inline-flex items-center gap-2 bg-primary/8 text-primary border border-primary/20 text-[10px] font-black tracking-[0.18em] uppercase px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Frontend Standard · #FFA000 Brand
          </span>
        </motion.div>
        <motion.h1 variants={fadeUp} custom={0.1}
          className="text-[clamp(32px,5vw,64px)] font-light tracking-[-0.02em] text-foreground leading-tight"
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
          KingOfService{" "}
          <em className="italic not-italic text-primary">UI</em>{" "}
          Demo
        </motion.h1>
        <motion.p variants={fadeUp} custom={0.2}
          className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
          Showcase toàn diện giao diện — Navigation, Hero, Service Cards, Booking Flow, Dashboard Analytics, Reviews và Design Tokens.
        </motion.p>

        {/* Quick filter tabs */}
        <motion.div variants={fadeUp} custom={0.3} className="flex justify-center mt-6">
          <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-5 md:px-6 pb-20 space-y-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-20"
          >
            {visibleSections.map((s, i) => (
              <section key={`${s.id}-${i}`}>{s.node}</section>
            ))}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-8 mt-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground">KingOfService</span>
            <span className="text-xs text-muted-foreground">· UI Demo</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Brand <strong className="text-primary">#FFA000</strong></span>
            <span>Tailwind v4</span>
            <span>Shadcn UI</span>
            <span>Framer Motion</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
