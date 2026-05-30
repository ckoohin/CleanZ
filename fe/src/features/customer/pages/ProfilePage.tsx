"use client";

import { useState } from "react";
import { motion, Variants, AnimatePresence } from "motion/react";
import {
  User, Mail, Phone, MapPin, Bell, Lock,
  ClipboardList, ChevronRight, CheckCircle2,
  Clock, Star, ShieldCheck, Camera, Home,
  Wrench, BellRing, BellOff, Edit3, Plus,
  LogOut, Settings, CreditCard,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/features/auth/hooks/auth.hooks";
import type { UserRole } from "@/features/auth/types/user.type";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  CUSTOMER: "Khách hàng",
  TECHNICIAN: "Thợ dịch vụ",
};

function formatMemberSince(iso: string) {
  const d = new Date(iso);
  return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

const TABS = [
  { id: "info",     label: "Thông tin",  icon: User },
  { id: "address",  label: "Địa chỉ",   icon: MapPin },
  { id: "orders",   label: "Lịch sử",   icon: ClipboardList },
  { id: "security", label: "Bảo mật",   icon: Lock },
  { id: "notify",   label: "Thông báo", icon: Bell },
];

const ADDRESSES = [
  { id: 1, label: "Nhà", icon: Home, address: "123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM", isDefault: true },
  { id: 2, label: "Văn phòng", icon: Wrench, address: "45 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM", isDefault: false },
];

const ORDER_HISTORY = [
  { id: "KOS-2401", service: "Sửa điều hòa",     date: "12/01/2025", price: "450.000đ", rating: 5, worker: "Minh Tuấn" },
  { id: "KOS-2389", service: "Thông tắc bồn rửa", date: "05/01/2025", price: "280.000đ", rating: 4, worker: "Quang Nam" },
  { id: "KOS-2310", service: "Sửa máy giặt",      date: "22/12/2024", price: "600.000đ", rating: 5, worker: "Hoàng Linh" },
  { id: "KOS-2298", service: "Lắp đèn trần",      date: "15/12/2024", price: "150.000đ", rating: 5, worker: "Văn Đức" },
];

const NOTIFICATIONS = [
  { id: "order_update", label: "Cập nhật đơn hàng", desc: "Khi thợ xác nhận hoặc hoàn thành", enabled: true },
  { id: "promotions",   label: "Khuyến mãi & ưu đãi", desc: "Voucher và deal hấp dẫn",       enabled: true },
  { id: "reminders",    label: "Nhắc bảo dưỡng",    desc: "Nhắc nhở định kỳ thiết bị",       enabled: false },
  { id: "news",         label: "Tin tức dịch vụ",   desc: "Cập nhật tính năng mới",           enabled: false },
];

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const tabAnim: Variants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit:   { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useProfile();
  const [activeTab, setActiveTab] = useState("info");

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground text-center">
          Không tải được thông tin. Vui lòng thử lại.
        </p>
      </div>
    );
  }

  if (isLoading || !profile) return <ProfileSkeleton />;

  const avatarInitials = profile.fullName.slice(0, 2).toUpperCase();
  const phoneDisplay   = profile.phone?.trim() || "Chưa cập nhật";

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ── */}
      <div className="relative h-44 bg-[#0D47A1] dark:bg-[#060E24] overflow-hidden">
        <div className="absolute inset-0 bg-primary/8" />
        <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
        <div className="absolute top-5 right-8 grid grid-cols-6 gap-2 opacity-20">
          {[...Array(18)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
        </div>
        <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-primary/10 blur-2xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-20">

        {/* ── Profile card ── */}
        <motion.div
          className="relative md:-mt-16 -mt-27 mb-6"
          custom={0} variants={fadeUp} initial="hidden" animate="show"
        >
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 pb-0 flex flex-col sm:flex-row sm:items-end gap-4">

              {/* Avatar */}
              <div className="relative shrink-0 self-start sm:self-end">
                <Avatar className="w-24 h-24 border-4 border-card shadow-lg">
                  <AvatarImage src={profile.avatar ?? undefined} alt={profile.fullName} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary border-2 border-card flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pb-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-foreground">{profile.fullName}</h1>
                      {profile.isVerified && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{profile.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge className="bg-primary/10 text-primary border-0 font-semibold">
                        {ROLE_LABELS[profile.role]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Thành viên từ {formatMemberSince(profile.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl shrink-0">
                    <Edit3 className="w-3.5 h-3.5" />Chỉnh sửa
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="border-t border-border grid grid-cols-3 divide-x divide-border">
              {[
                { label: "Tổng đơn",    value: "12",     color: "text-foreground" },
                { label: "Chi tiêu",    value: "4.8tr",  color: "text-foreground" },
                { label: "Đánh giá TB", value: "★ 4.9", color: "text-primary" },
              ].map((s) => (
                <div key={s.label} className="py-4 text-center">
                  <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Layout ── */}
        <div className="flex md:flex-row flex-col gap-5 items-start">

          {/* Sidebar tabs — desktop */}
          <motion.aside
            className="hidden md:flex flex-col w-52 shrink-0 bg-card border border-border rounded-2xl shadow-sm overflow-hidden sticky top-4"
            custom={1} variants={fadeUp} initial="hidden" animate="show"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors text-left border-l-2",
                    active
                      ? "bg-primary/8 text-primary border-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
            <Separator />
            <button className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
              <LogOut className="w-4 h-4 shrink-0" />Đăng xuất
            </button>
          </motion.aside>

          {/* Horizontal tabs — mobile */}
          <div className="md:hidden w-full">
            <div className="flex gap-2 overflow-x-auto pb-3 mb-1" style={{scrollbarWidth:'none'}}>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border transition-colors",
                      active
                        ? "bg-primary text-white border-primary"
                        : "bg-card border-border text-muted-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />{tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-w-0 w-full">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} variants={tabAnim} initial="hidden" animate="show" exit="exit">
                {activeTab === "info"     && <TabInfo    profile={profile} phoneDisplay={phoneDisplay} />}
                {activeTab === "address"  && <TabAddress />}
                {activeTab === "orders"   && <TabOrders />}
                {activeTab === "security" && <TabSecurity profile={profile} />}
                {activeTab === "notify"   && <TabNotify />}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function TabInfo({ profile, phoneDisplay }: { profile: any; phoneDisplay: string }) {
  return (
    <div className="space-y-3">
      <TabCard title="Thông tin cá nhân" icon={User}
        action={<Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-8 text-xs"><Edit3 className="w-3 h-3"/>Sửa</Button>}
      >
        <div className="divide-y divide-border">
          <InfoRow icon={User}  label="Họ và tên"      value={profile.fullName} />
          <InfoRow icon={Mail}  label="Email"           value={profile.email} verified={profile.isVerified} />
          <InfoRow icon={Phone} label="Số điện thoại"  value={phoneDisplay} />
        </div>
      </TabCard>
      <TabCard title="Tài khoản" icon={Settings}>
        <div className="divide-y divide-border">
          <InfoRow icon={ShieldCheck} label="Trạng thái"  value={profile.isVerified ? "Đã xác thực" : "Chưa xác thực"} verified={profile.isVerified} />
          <InfoRow icon={User}        label="Vai trò"     value={ROLE_LABELS[profile.role as UserRole]} />
          <InfoRow icon={Clock}       label="Tham gia"    value={formatMemberSince(profile.createdAt)} />
        </div>
      </TabCard>
    </div>
  );
}

function TabAddress() {
  return (
    <TabCard title="Địa chỉ đã lưu" icon={MapPin}
      action={<Button size="sm" className="gap-1.5 rounded-xl h-8 text-xs bg-primary text-white hover:bg-primary/90"><Plus className="w-3 h-3"/>Thêm</Button>}
    >
      <div className="space-y-3">
        {ADDRESSES.map((addr) => (
          <div key={addr.id} className={cn(
            "flex items-start gap-3 p-4 rounded-xl border transition-colors group cursor-pointer",
            addr.isDefault ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/20 hover:bg-muted/30"
          )}>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              addr.isDefault ? "bg-primary/15" : "bg-muted"
            )}>
              <addr.icon className={cn("w-4 h-4", addr.isDefault ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{addr.label}</span>
                {addr.isDefault && <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold px-1.5 py-0">Mặc định</Badge>}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{addr.address}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </TabCard>
  );
}

function TabOrders() {
  return (
    <TabCard title="Lịch sử dịch vụ" icon={ClipboardList} count={ORDER_HISTORY.length}>
      <div className="space-y-2">
        {ORDER_HISTORY.map((order, i) => (
          <motion.div key={order.id} custom={i} variants={fadeUp} initial="hidden" animate="show"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground truncate">{order.service}</span>
                <span className="text-sm font-bold text-primary shrink-0">{order.price}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">{order.date}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{order.id}</span>
                <span className="text-xs text-muted-foreground">· Thợ {order.worker}</span>
                <div className="ml-auto flex items-center gap-0.5">
                  {[...Array(order.rating)].map((_, j) => <Star key={j} className="w-3 h-3 fill-primary text-primary" />)}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
      <Button variant="ghost" className="w-full mt-3 text-primary text-xs font-semibold h-9 rounded-xl">
        Xem tất cả lịch sử →
      </Button>
    </TabCard>
  );
}

function TabSecurity({ profile }: { profile: any }) {
  return (
    <div className="space-y-3">
      <TabCard title="Xác thực & Bảo mật" icon={ShieldCheck}>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mật khẩu</p>
                <p className="text-xs text-muted-foreground">Cập nhật lần cuối: 30 ngày trước</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">Đổi mật khẩu</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center",
                profile.isVerified ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted"
              )}>
                <ShieldCheck className={cn("w-4 h-4", profile.isVerified ? "text-emerald-500" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Xác thực email</p>
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{profile.email}</p>
              </div>
            </div>
            <Badge className={cn("border-0 text-xs shrink-0",
              profile.isVerified
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"
                : "bg-destructive/10 text-destructive"
            )}>
              {profile.isVerified ? "Đã xác thực" : "Chưa xác thực"}
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Xác thực 2 bước</p>
                <p className="text-xs text-muted-foreground">Sắp ra mắt</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">Sắp có</Badge>
          </div>
        </div>
      </TabCard>

      <TabCard title="Vùng nguy hiểm" icon={Lock}>
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5">
          <p className="text-sm font-semibold text-foreground mb-1">Xóa tài khoản</p>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Hành động này không thể hoàn tác. Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn.
          </p>
          <Button variant="destructive" size="sm" className="h-8 text-xs rounded-xl">
            Yêu cầu xóa tài khoản
          </Button>
        </div>
      </TabCard>
    </div>
  );
}

function TabNotify() {
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const toggle = (id: string) =>
    setNotifs((p) => p.map((n) => n.id === id ? { ...n, enabled: !n.enabled } : n));

  return (
    <TabCard title="Cài đặt thông báo" icon={Bell}>
      <div className="space-y-1">
        {notifs.map((n) => (
          <div key={n.id} className="flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                n.enabled ? "bg-primary/10" : "bg-muted"
              )}>
                {n.enabled
                  ? <BellRing className="w-4 h-4 text-primary" />
                  : <BellOff  className="w-4 h-4 text-muted-foreground" />
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
            </div>
            <Switch checked={n.enabled} onCheckedChange={() => toggle(n.id)} className="data-[state=checked]:bg-primary" />
          </div>
        ))}
      </div>
    </TabCard>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function TabCard({ title, icon: Icon, count, action, children }: {
  title: string; icon: React.ElementType; count?: number; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-sm font-bold text-foreground flex-1">{title}</h2>
        {count !== undefined && (
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>
        )}
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, verified }: {
  icon: React.ElementType; label: string; value: string; verified?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
      {verified && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-44 bg-[#0D47A1] dark:bg-[#060E24]" />
      <div className="max-w-4xl mx-auto px-4 -mt-16 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex gap-5">
            <Skeleton className="w-24 h-24 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 pt-4">
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
        <div className="flex gap-5">
          <Skeleton className="hidden md:block w-52 h-64 rounded-2xl" />
          <Skeleton className="flex-1 h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
