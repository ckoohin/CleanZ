'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Wind, Home, Shirt, Bug, Armchair, Briefcase,
  ChevronRight, Clock, MapPin, ArrowRight, Loader2, Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Container from '@/components/Container';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCustomerHome } from '../hooks/useCustomerHome';
import { ROUTES } from '@/constants/routes';
import type { CustomerBookingDetail, BookingStatus } from '@/features/booking/types/booking.types';

// ─── Static data ──────────────────────────────────────────────────────────────

const MAIN_SERVICES = [
  { id: 'cleaning',       label: "Dọn dẹp",       icon: Sparkles, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  { id: 'ac-cleaning',   label: "Máy lạnh",       icon: Wind,     color: "text-cyan-600",    bg: "bg-cyan-500/10" },
  { id: 'deep-cleaning', label: "Tổng vệ sinh",   icon: Home,     color: "text-indigo-600",  bg: "bg-indigo-500/10" },
  { id: 'laundry',       label: "Giặt là",        icon: Shirt,    color: "text-blue-600",    bg: "bg-blue-500/10" },
  { id: 'pest-control',  label: "Diệt côn trùng", icon: Bug,      color: "text-red-600",     bg: "bg-red-500/10" },
  { id: 'sofa-cleaning', label: "Sofa/Nệm",       icon: Armchair, color: "text-amber-600",   bg: "bg-amber-500/10" },
  { id: 'office',        label: "Tạp vụ",         icon: Briefcase,color: "text-foreground/90",bg: "bg-muted/10" },
  { id: 'more',          label: "Tất cả",         icon: ChevronRight, color: "text-gray-500", bg: "bg-gray-500/10" },
];

const PROMOS = [
  { title: "Giảm 30% dọn dẹp", code: "CLEAN30", img: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80" },
  { title: "Vệ sinh máy lạnh 199k", code: "AC199",   img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80" },
  { title: "Giảm 50k giặt Sofa",   code: "SOFA50",  img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Partial<Record<BookingStatus, string>> = {
  POSTED:            "Đang tìm Tasker",
  CONFIRMED:         "Đã xác nhận",
  TASKER_ON_THE_WAY: "Tasker đang đến",
  CHECKED_IN:        "Tasker đã đến",
  IN_PROGRESS:       "Đang làm việc",
  COMPLETED:         "Đã hoàn thành",
  CANCELLED:         "Đã hủy",
  EXPIRED:           "Hết hạn",
};

function fmtCurrency(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function fmtRelativeDate(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "Hôm nay";
    if (days === 1) return "Hôm qua";
    if (days < 7) return `${days} ngày trước`;
    return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  } catch {
    return dateStr;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActiveBookingWidget({ booking }: { booking: CustomerBookingDetail }) {
  const router = useRouter();
  const label = STATUS_LABEL[booking.status] ?? "Đang hoạt động";
  const isPulse = ["POSTED", "TASKER_ON_THE_WAY", "IN_PROGRESS"].includes(booking.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto mb-6 md:mb-8"
    >
      <div
        onClick={() => router.push(`/customer/booking/${booking.id}`)}
        className="relative bg-card border border-border/40 rounded-[2rem] p-4 md:p-5 flex items-center justify-between shadow-md shadow-primary/5 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer group overflow-hidden"
      >
        {isPulse && <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />}

        <div className="flex items-center gap-4 relative z-10 min-w-0">
          {/* Status dot */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            {isPulse && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-[3px] border-card animate-pulse" />
            )}
          </div>
          <div className="min-w-0 flex flex-col items-start">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest mb-1.5 truncate">
              {isPulse && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />}
              {label}
            </span>
            <p className="text-base md:text-lg font-black truncate text-foreground leading-snug">{booking.service.name}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-primary/80 shrink-0" />
              <span>{booking.schedule.scheduledStartDate} · {booking.schedule.scheduledStartTime}</span>
            </div>
          </div>
        </div>

        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0 relative z-10">
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
        </div>
      </div>
    </motion.div>
  );
}

function RecentBookingItem({ booking }: { booking: CustomerBookingDetail }) {
  const router = useRouter();
  const isDone = booking.status === "COMPLETED";

  return (
    <div
      className="relative p-3 md:p-4 rounded-[1.5rem] flex items-center justify-between hover:bg-muted/50 transition-all cursor-pointer group"
      onClick={() => router.push(`/customer/booking/${booking.id}`)}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-[1.1rem] flex items-center justify-center shrink-0",
          isDone ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted"
        )}>
          <Clock className={cn("w-5 h-5", isDone ? "text-emerald-500" : "text-muted-foreground")} />
        </div>
        <div>
          <p className="font-semibold text-[15px] text-foreground">{booking.service.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fmtRelativeDate(booking.createdAt)} · {fmtCurrency(booking.price.totalPrice)}
          </p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
    </div>
  );
}

function RecentBookingSection({ bookings, isLoading }: { bookings: CustomerBookingDetail[]; isLoading: boolean }) {
  const router = useRouter();
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-16 bg-card border border-border/40 rounded-[2rem] animate-pulse" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div
        onClick={() => router.push(ROUTES.CUSTOMER.CATALOG)}
        className="bg-card border border-dashed border-border/60 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
      >
        <Package className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground text-center">Chưa có đơn nào. Đặt dịch vụ ngay?</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/40 rounded-[2rem] p-2 shadow-sm">
      {bookings.map((b, i) => (
        <div key={b.id} className="relative">
          <RecentBookingItem booking={b} />
          {i < bookings.length - 1 && (
            <div className="absolute bottom-0 left-[4.5rem] right-4 h-[1px] bg-border/40" />
          )}
        </div>
      ))}
    </div>
  );
}

function SavedAddressSection({ addresses, isLoading }: {
  addresses: { id: string; label?: string | null; fullAddress: string; isDefault: boolean }[];
  isLoading: boolean;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="h-28 bg-card border border-border/40 rounded-[2rem] animate-pulse" />
        ))}
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <motion.div
        whileTap={{ scale: 0.96 }}
        onClick={() => router.push(ROUTES.CUSTOMER.ADDRESSES)}
        className="p-5 rounded-[2rem] bg-card border border-dashed border-border/60 hover:border-primary/30 transition-all cursor-pointer"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <MapPin className="w-5 h-5" />
        </div>
        <p className="font-bold text-[15px]">Thêm địa chỉ</p>
        <p className="text-xs text-muted-foreground mt-1">Đặt dịch vụ nhanh hơn</p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {addresses.map(addr => (
        <motion.div
          key={addr.id}
          whileTap={{ scale: 0.96 }}
          onClick={() => router.push(ROUTES.CUSTOMER.ADDRESSES)}
          className="p-5 rounded-[2rem] bg-card border border-border/40 hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="font-bold text-[15px] truncate">{addr.label || "Địa chỉ"}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{addr.fullAddress}</p>
          {addr.isDefault && (
            <span className="inline-block mt-2 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              Mặc định
            </span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppleStyleHomePage() {
  const { activeBooking, recentBookings, savedAddresses, isHistoryLoading, isAddressLoading } = useCustomerHome();

  return (
    <div className="bg-background min-h-screen pb-safe font-sans selection:bg-primary/20">

      {/* 1. Sticky Search / Header */}
      <div className="sticky top-[64px] z-30 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <Container className="py-4 md:py-6">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-0">
            <h1 className="hidden md:block text-2xl lg:text-3xl font-bold text-center mb-6 tracking-tight text-foreground">
              Xin chào, bạn cần dịch vụ gì hôm nay?
            </h1>
            <Link
              href={ROUTES.CUSTOMER.CATALOG}
              className="flex items-center gap-3 w-full h-12 md:h-14 pl-4 pr-4 bg-muted/50 border border-transparent rounded-[1.25rem] text-sm text-muted-foreground/70 hover:bg-muted hover:border-primary/20 transition-all"
            >
              <svg className="w-5 h-5 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 4.5 4.5a7.5 7.5 0 0 0 12.15 12.15z" />
              </svg>
              Tìm dịch vụ, mã đơn...
            </Link>
          </div>
        </Container>
      </div>

      <Container className="space-y-10 md:space-y-14 px-4 md:px-8 lg:px-0 mt-6">

        {/* 2. Active booking widget */}
        {activeBooking && <ActiveBookingWidget booking={activeBooking} />}

        {/* 3. Main services grid */}
        <section className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-y-6 gap-x-3 md:gap-x-6">
            {MAIN_SERVICES.map((srv) => (
              <Link
                key={srv.id}
                href={srv.id === "more" ? ROUTES.CUSTOMER.CATALOG : ROUTES.CUSTOMER.CATALOG}
                className="group flex flex-col items-center gap-3"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className="w-[4.25rem] h-[4.25rem] md:w-20 md:h-20 bg-card rounded-[1.5rem] md:rounded-[1.75rem] flex items-center justify-center border border-border/30 shadow-sm transition-all group-hover:shadow-md"
                >
                  <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors", srv.bg, srv.color)}>
                    <srv.icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                  </div>
                </motion.div>
                <span className="text-[11px] md:text-xs font-semibold text-center leading-tight text-foreground/80 group-hover:text-foreground transition-colors">
                  {srv.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Promos */}
        <section className="w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Ưu đãi hôm nay</h2>
            <Link href={ROUTES.CUSTOMER.CATALOG} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
              Xem tất cả
            </Link>
          </div>

          <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0">
            {PROMOS.map((promo) => (
              <motion.div
                whileTap={{ scale: 0.98 }}
                key={promo.title}
                className="min-w-[85vw] md:min-w-[320px] h-[220px] rounded-[2rem] relative overflow-hidden snap-center flex flex-col justify-end p-6 group cursor-pointer shadow-sm"
              >
                <img src={promo.img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative z-10 flex items-end justify-between w-full">
                  <div>
                    <Badge className="bg-card/20 text-white hover:bg-card/30 backdrop-blur-md mb-3 text-[10px] uppercase tracking-wider font-bold border-none">
                      {promo.code}
                    </Badge>
                    <h3 className="text-xl md:text-2xl font-bold text-white leading-tight">{promo.title}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-card/20 backdrop-blur-md flex items-center justify-center shrink-0">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 5. Recent bookings + Saved addresses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pb-24 max-w-6xl mx-auto">

          {/* Lịch sử gần đây — real data */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-lg font-bold tracking-tight">Gần đây</h2>
              {recentBookings.length > 0 && (
                <Link href={ROUTES.CUSTOMER.HISTORY} className="text-xs font-semibold text-primary hover:opacity-80">
                  Xem tất cả
                </Link>
              )}
            </div>
            <RecentBookingSection bookings={recentBookings} isLoading={isHistoryLoading} />
          </section>

          {/* Địa chỉ — real data */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-lg font-bold tracking-tight">Địa chỉ đã lưu</h2>
              <Link href={ROUTES.CUSTOMER.ADDRESSES} className="text-xs font-semibold text-primary hover:opacity-80">
                Quản lý
              </Link>
            </div>
            <SavedAddressSection addresses={savedAddresses} isLoading={isAddressLoading} />
          </section>

        </div>
      </Container>
    </div>
  );
}
