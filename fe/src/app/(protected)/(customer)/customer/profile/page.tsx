"use client";

import { motion, Variants } from "motion/react";
import {
  User, Mail, Phone, MapPin, Bell, Lock,
  ClipboardList, ChevronRight, CheckCircle2,
  Clock, Star, ShieldCheck, Camera, Home,
  Wrench, BellRing, BellOff,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// ─── Mock data ───────────────────────────────────────────────────────────────

const USER = {
  fullName: "Nguyễn Văn An",
  email: "nguyenvanan@gmail.com",
  phone: "0912 345 678",
  avatar: "",
  role: "CUSTOMER" as const,
  isVerified: true,
  joinedAt: "Tháng 3, 2024",
  totalOrders: 12,
  totalSpent: "4.800.000đ",
  rating: 4.9,
};

const ADDRESSES = [
  { id: 1, label: "Nhà", icon: Home, address: "123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM", isDefault: true },
  { id: 2, label: "Văn phòng", icon: Wrench, address: "45 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM", isDefault: false },
];

const ORDER_HISTORY = [
  { id: "KOS-2401", service: "Sửa điều hòa", date: "12/01/2025", status: "done", price: "450.000đ", rating: 5 },
  { id: "KOS-2389", service: "Thông tắc bồn rửa", date: "05/01/2025", status: "done", price: "280.000đ", rating: 4 },
  { id: "KOS-2310", service: "Sửa máy giặt", date: "22/12/2024", status: "done", price: "600.000đ", rating: 5 },
  { id: "KOS-2298", service: "Lắp đèn trần", date: "15/12/2024", status: "done", price: "150.000đ", rating: 5 },
];

const NOTIFICATIONS = [
  { id: "order_update", label: "Cập nhật đơn hàng", desc: "Thông báo khi thợ xác nhận hoặc hoàn thành", enabled: true },
  { id: "promotions", label: "Khuyến mãi & ưu đãi", desc: "Nhận thông tin voucher và deal hấp dẫn", enabled: true },
  { id: "reminders", label: "Nhắc lịch bảo dưỡng", desc: "Nhắc nhở định kỳ bảo dưỡng thiết bị", enabled: false },
  { id: "news", label: "Tin tức dịch vụ", desc: "Cập nhật dịch vụ và tính năng mới", enabled: false },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero banner ── */}
      <div className="relative h-36 bg-[#0D47A1] dark:bg-[#060E24] overflow-hidden">
        <div className="absolute inset-0 bg-primary/10" />
        <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute top-4 left-4 flex items-center gap-2 opacity-40">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-white" />
          ))}
        </div>
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">

        {/* ── Avatar + Info card ── */}
        <motion.div
          className="relative -mt-14 mb-6"
          custom={0} variants={fadeUp} initial="hidden" animate="show"
        >
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-end gap-5">

              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="w-20 h-20 border-4 border-card shadow-md">
                  <AvatarImage src={USER.avatar} />
                  <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                    {USER.fullName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow border-2 border-card">
                  <Camera className="w-3 h-3 text-white" />
                </button>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground truncate">{USER.fullName}</h1>
                  {USER.isVerified && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{USER.email}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className="bg-primary/10 text-primary border-0 text-xs font-semibold">
                    Khách hàng
                  </Badge>
                  <span className="text-xs text-muted-foreground">Thành viên từ {USER.joinedAt}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Đơn dịch vụ", value: USER.totalOrders },
                { label: "Tổng chi tiêu", value: USER.totalSpent },
                { label: "Đánh giá TB", value: `★ ${USER.rating}` },
              ].map((s) => (
                <div key={s.label} className="text-center bg-muted/50 rounded-xl py-3">
                  <p className="text-base font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Thông tin cá nhân ── */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="mb-4">
          <SectionCard
            icon={User}
            title="Thông tin cá nhân"
          >
            <InfoRow icon={User} label="Họ tên" value={USER.fullName} />
            <InfoRow icon={Mail} label="Email" value={USER.email} verified />
            <InfoRow icon={Phone} label="Số điện thoại" value={USER.phone} />
          </SectionCard>
        </motion.div>

        {/* ── Địa chỉ đã lưu ── */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="mb-4">
          <SectionCard icon={MapPin} title="Địa chỉ đã lưu" count={ADDRESSES.length}>
            <div className="space-y-3">
              {ADDRESSES.map((addr) => (
                <div
                  key={addr.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                    addr.isDefault
                      ? "border-primary/30 bg-accent"
                      : "border-border bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    addr.isDefault ? "bg-primary/15" : "bg-muted"
                  )}>
                    <addr.icon className={cn("w-4 h-4", addr.isDefault ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{addr.label}</span>
                      {addr.isDefault && (
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold px-1.5 py-0">
                          Mặc định
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{addr.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Lịch sử đặt dịch vụ ── */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="mb-4">
          <SectionCard icon={ClipboardList} title="Lịch sử dịch vụ" count={USER.totalOrders}>
            <div className="space-y-2">
              {ORDER_HISTORY.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-colors group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{order.service}</span>
                      <span className="text-sm font-bold text-primary shrink-0">{order.price}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{order.date}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{order.id}</span>
                      <div className="ml-auto flex items-center gap-0.5">
                        {[...Array(order.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </div>
              ))}
            </div>
            <button className="w-full mt-3 text-xs text-primary font-semibold hover:underline underline-offset-4 py-2">
              Xem tất cả lịch sử →
            </button>
          </SectionCard>
        </motion.div>

        {/* ── Đổi mật khẩu ── */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="mb-4">
          <SectionCard icon={Lock} title="Bảo mật">
            <div className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-accent/50 transition-colors cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Đổi mật khẩu</p>
                  <p className="text-xs text-muted-foreground">Cập nhật lần cuối: 30 ngày trước</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border mt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Email đã xác thực</p>
                  <p className="text-xs text-muted-foreground">{USER.email}</p>
                </div>
              </div>
              <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-0 text-xs">
                Đã xác thực
              </Badge>
            </div>
          </SectionCard>
        </motion.div>

        {/* ── Cài đặt thông báo ── */}
        <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="mb-4">
          <SectionCard icon={Bell} title="Thông báo">
            <div className="space-y-1">
              {NOTIFICATIONS.map((n) => (
                <div key={n.id} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      n.enabled ? "bg-primary/10" : "bg-muted"
                    )}>
                      {n.enabled
                        ? <BellRing className="w-4 h-4 text-primary" />
                        : <BellOff className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{n.label}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{n.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={n.enabled}
                    disabled
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-bold text-foreground flex-1">{title}</h2>
        {count !== undefined && (
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
      {/* Body */}
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  verified,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  verified?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
      {verified && (
        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      )}
    </div>
  );
}