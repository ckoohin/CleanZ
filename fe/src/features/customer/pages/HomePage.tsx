'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Wind, Home, Shirt, Bug, Armchair, Briefcase,
  ChevronRight, Clock, MapPin, Package,
  Copy, Check, Tag, Newspaper, Eye,
} from "lucide-react";
import Container from '@/components/Container';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCustomerHome } from '../hooks/useCustomerHome';
import { formatVoucherDiscount } from '../vouchers/voucher-format.helper';
import { ROUTES } from '@/constants/routes';
import type { CustomerBookingDetail, BookingStatus } from '@/features/booking/types/booking.types';
import type { AvailableVoucher } from '../vouchers/useCustomerVouchers';
import type { PublicService } from '@/features/services/types/public-service.type';
import type { BlogPost } from '@/features/blog/types/blog.types';

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

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Chào buổi sáng", emoji: "☀️" };
  if (hour < 18) return { text: "Chào buổi chiều", emoji: "🌤️" };
  return { text: "Chào buổi tối", emoji: "🌙" };
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

// ─── Voucher Ticket (Section 2 — dữ liệu thật) ────────────────────────────────

function VoucherTicketCard({ voucher }: { voucher: AvailableVoucher }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Trình duyệt không hỗ trợ clipboard API — bỏ qua im lặng, không chặn UI
    }
  };

  return (
    <div className="min-w-[280px] md:min-w-[320px] relative shrink-0 snap-center">
      <div className="relative flex bg-card border border-border/40 rounded-[1.5rem] shadow-sm overflow-hidden">
        {/* Cuống vé */}
        <div className="w-24 shrink-0 bg-gradient-to-br from-primary to-primary/70 flex flex-col items-center justify-center p-3 relative">
          <Tag className="w-6 h-6 text-primary-foreground/90 mb-1" />
          <span className="text-[10px] font-black text-primary-foreground/90 uppercase tracking-wider text-center">
            {voucher.source === "ISSUED" ? "Riêng cho bạn" : "Ưu đãi"}
          </span>
          {/* Đường đứt nét răng cưa */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background" />
          <div className="absolute right-0 top-0 bottom-0 border-r-2 border-dashed border-card/50" />
        </div>

        {/* Nội dung vé */}
        <div className="flex-1 p-3.5 min-w-0 flex flex-col justify-center gap-1">
          <p className="text-sm font-black text-foreground truncate">{formatVoucherDiscount(voucher)}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            Đơn tối thiểu {fmtCurrency(voucher.minOrderAmount)}
          </p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md truncate">
              {voucher.code}
            </code>
            <button
              onClick={handleCopy}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-all active:scale-95",
                copied
                  ? "bg-emerald-500 text-white"
                  : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary"
              )}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Đã chép ✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VoucherSection({ vouchers, isLoading, isError }: {
  vouchers: AvailableVoucher[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="min-w-[300px] h-[104px] bg-card border border-border/40 rounded-[1.5rem] animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  if (isError || vouchers.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Voucher dành cho bạn</h2>
      </div>
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {vouchers.map((v) => (
          <VoucherTicketCard key={v.id} voucher={v} />
        ))}
      </div>
    </section>
  );
}

// ─── Dịch vụ nổi bật & Ưu đãi hôm nay (Section 3 — dữ liệu thật) ──────────────

function FeaturedPackageCard({ pkg }: { pkg: PublicService }) {
  const router = useRouter();
  const price = pkg.baseHourlyRate ?? 0;

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(ROUTES.CUSTOMER.CATALOG_DETAIL(pkg.id))}
      className="w-55 md:w-auto shrink-0 snap-center bg-card border border-border/40 rounded-[1.75rem] p-4 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
    >
      <div className="relative w-full aspect-square rounded-[1.25rem] bg-muted/50 flex items-center justify-center overflow-hidden mb-3">
        {pkg.iconUrl ? (
          <img src={pkg.iconUrl} alt={pkg.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <Sparkles className="w-10 h-10 text-primary/30" />
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {pkg.isPopular && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 backdrop-blur-xs px-2 py-0.5 text-[9px] font-black text-white shadow-md">
              <Sparkles className="h-2.5 w-2.5 fill-current" /> Nổi bật
            </span>
          )}
          {pkg.hasPromo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/95 backdrop-blur-xs px-2 py-0.5 text-[9px] font-black text-white shadow-md">
              <Tag className="h-2.5 w-2.5" /> Khuyến mãi
            </span>
          )}
        </div>
      </div>
      <p className="font-bold text-sm text-foreground line-clamp-2 leading-snug mb-1.5 min-h-[2.5em]">{pkg.name}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-primary">
          {fmtCurrency(price)}<span className="text-[10px] font-normal text-muted-foreground">/giờ</span>
        </p>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </motion.div>
  );
}

// TODO: gỡ cờ này sau khi dọn xong data test (PKG-T, PKG-TEN-DV, PKG-TEN-DICH-VU,
// PKG-TEST, PKG-OIHOU, PKG-A) trong DB — các gói này đang bị đánh dấu isPopular=true
// và mới hơn các gói thật nên luôn chiếm hết section, không có cách nào lọc đúng
// bằng code khi dữ liệu nguồn còn rác. Xem thảo luận trong customer-homepage-redesign-plan.md.
const TEMP_HIDE_FEATURED_SECTION = true;

function FeaturedPackagesSection({ packages, isLoading, isError }: {
  packages: PublicService[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (TEMP_HIDE_FEATURED_SECTION) return null;

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="min-w-[220px] h-[260px] bg-card border border-border/40 rounded-[1.75rem] animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  if (isError || packages.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Dịch vụ nổi bật & Ưu đãi hôm nay</h2>
        <Link href={ROUTES.CUSTOMER.CATALOG} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          Xem tất cả
        </Link>
      </div>
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
        {packages.map((pkg) => (
          <FeaturedPackageCard key={pkg.id} pkg={pkg} />
        ))}
      </div>
    </section>
  );
}

// ─── Tin tức & Blog tiêu biểu (Section 4) ─────────────────────────────────────

function BlogCard({ blog }: { blog: BlogPost }) {
  return (
    <Link
      href={ROUTES.CUSTOMER.BLOG_DETAIL(blog.slug)}
      className="group bg-card border border-border/40 rounded-[1.5rem] overflow-hidden hover:shadow-md hover:border-primary/30 transition-all flex flex-col w-[270px] sm:w-auto shrink-0 snap-start"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {blog.thumbnail_url ? (
          <img
            src={blog.thumbnail_url}
            alt={blog.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
          <span>{blog.published_at ? fmtRelativeDate(blog.published_at) : fmtRelativeDate(blog.createdAt)}</span>
          {blog.author && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span className="truncate">{blog.author.fullName}</span>
            </>
          )}
        </div>
        <h3 className="font-bold text-xs sm:text-[14px] leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {blog.title}
        </h3>
        <div className="mt-auto pt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
          <Eye className="w-3.5 h-3.5" /> Đọc tin tức
        </div>
      </div>
    </Link>
  );
}

function BlogSection({ blogs, isLoading, isError }: {
  blogs: BlogPost[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex overflow-x-auto scrollbar-hide snap-x gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-[270px] sm:w-auto shrink-0 h-[260px] bg-card border border-border/40 rounded-[1.5rem] animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || blogs.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg md:text-2xl font-bold tracking-tight">Tin tức & Blog tiêu biểu</h2>
        <Link href={ROUTES.CUSTOMER.BLOGS} className="text-xs md:text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
          Xem tất cả
        </Link>
      </div>
      <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3">
        {blogs.map((blog) => (
          <BlogCard key={blog.id} blog={blog} />
        ))}
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppleStyleHomePage() {
  const {
    activeBooking, recentBookings, savedAddresses, isHistoryLoading, isAddressLoading,
    featuredPackages, isFeaturedPackagesLoading, isFeaturedPackagesError,
    vouchers, isVouchersLoading, isVouchersError,
    featuredBlogs, isBlogsLoading, isBlogsError,
  } = useCustomerHome();

  const greeting = useMemo(() => getGreeting(), []);

  return (
    <div className="bg-background min-h-screen pb-safe font-sans selection:bg-primary/20">

      {/* 1. Sticky Search / Header */}
      <div className="sticky top-[64px] z-30 bg-background/70 backdrop-blur-xl border-b border-border/30">
        <Container className="py-4 md:py-6">
          <div className="max-w-3xl mx-auto w-full px-4 md:px-0">
            <h1 className="hidden md:block text-2xl lg:text-3xl font-bold text-center mb-6 tracking-tight text-foreground">
              {greeting.text} {greeting.emoji} — Bạn cần dịch vụ gì hôm nay?
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

        {/* 4. Voucher Ticket — dữ liệu thật */}
        <VoucherSection vouchers={vouchers} isLoading={isVouchersLoading} isError={isVouchersError} />

        {/* 5. Dịch vụ nổi bật & Ưu đãi hôm nay — dữ liệu thật */}
        <FeaturedPackagesSection
          packages={featuredPackages}
          isLoading={isFeaturedPackagesLoading}
          isError={isFeaturedPackagesError}
        />

        {/* 6. Tin tức & Blog tiêu biểu */}
        <BlogSection blogs={featuredBlogs} isLoading={isBlogsLoading} isError={isBlogsError} />

        {/* 7. Recent bookings + Saved addresses */}
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
