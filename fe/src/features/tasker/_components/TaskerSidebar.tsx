"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Mail,
  User,
  LogOut,
  Star,
  Wifi,
  WifiOff,
  Briefcase,
  Settings,
  WalletCards,
  LifeBuoy,
  AlertTriangle,
  ScrollText,
} from "lucide-react";
import { NotificationBell } from "@/features/notifications/_components/NotificationBell";
import { cn } from "@/lib/utils";
import { useTaskerProfile } from "@/features/tasker/hooks/tasker.hooks";
import { useLogout } from "@/features/auth/hooks/auth.hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LogoApp from "@/components/logo/LogoApp";
import { useTaskerActiveBooking } from "@/features/booking/hooks/useTaskerBooking";

// ─── Nav config ───────────────────────────────────────────────────────────────

const ALL_NAV_ITEMS = [
  { href: "/tasker",               label: "Trang chủ", icon: Home, exact: true },
  { href: "/tasker/jobs",          label: "Nhận đơn",  icon: Briefcase },
  { href: "/tasker/earnings",      label: "Thu nhập",  icon: WalletCards },
  { href: "/tasker/notifications", label: "Hộp thư",   icon: Mail },
  { href: "/tasker/profile",       label: "Tài khoản", icon: User },
  { href: "/tasker/support-tickets", label: "Hỗ trợ",  icon: LifeBuoy },
  { href: "/tasker/policies",        label: "Chính sách", icon: ScrollText },
];

const LEFT_TABS  = [ALL_NAV_ITEMS[0], ALL_NAV_ITEMS[1]];
const RIGHT_TABS = [ALL_NAV_ITEMS[3], ALL_NAV_ITEMS[4]];

interface TaskerSidebarProps {
  className?: string;
  onToggleOnline?: () => void;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function isTabActive(href: string, exact: boolean | undefined, pathname: string) {
  return exact ? pathname === href : pathname.startsWith(href);
}

function getTaskerLockBanner(
  tasker: ReturnType<typeof useTaskerProfile>["data"],
  now: number,
) {
  if (!tasker) return null;
  if (tasker.status === "TERMINATED") {
    return {
      title: "Tài khoản đã bị khóa vĩnh viễn",
      description: tasker.banReason || "Bạn không thể nhận đơn. Vui lòng liên hệ hỗ trợ nếu cần kháng cáo.",
    };
  }
  if (tasker.status === "SUSPENDED") {
    return {
      title: "Tài khoản đang bị khóa",
      description: tasker.banEndsAt
        ? `Mở khóa dự kiến: ${new Date(tasker.banEndsAt).toLocaleString("vi-VN")}.`
        : tasker.banReason || "Bạn không thể nhận đơn trong thời gian bị khóa.",
    };
  }
  if (
    tasker.cancelSuspendedUntil &&
    new Date(tasker.cancelSuspendedUntil).getTime() > now
  ) {
    return {
      title: "Bạn đang tạm bị khóa nhận đơn",
      description: `Do hủy đơn quá số lần cho phép. Mở lại sau ${new Date(
        tasker.cancelSuspendedUntil
      ).toLocaleString("vi-VN")}.`,
    };
  }
  return null;
}

function TaskerLockBanner({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { data: tasker } = useTaskerProfile();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const banner = getTaskerLockBanner(tasker, now);

  if (!banner) return null;

  return (
    <div
      className={cn(
        "border border-red-200 bg-red-50 text-red-700 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
        compact ? "px-3 py-2" : "mx-4 mb-3 rounded-2xl px-3 py-2.5"
      )}
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide">{banner.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug">
            {banner.description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar({ className, onToggleOnline }: TaskerSidebarProps) {
  const { data: tasker } = useTaskerProfile();
  const logout = useLogout();
  const pathname = usePathname();
  const isOnline = tasker?.presenceStatus === "ONLINE";

  const initials = tasker?.fullName
    ? tasker.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "S";

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col w-60 border-r border-border bg-card/80 backdrop-blur-md shrink-0 sticky top-0 h-screen",
        className
      )}
    >
      {/* Brand */}
      <div className="px-6 py-6 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <LogoApp variant="icon-only" size="md" />
          <div className="flex flex-col">
            <span className="font-black tracking-tight leading-none text-[22px]">
              Clean<span className="text-primary">Z</span><span className="text-primary font-black">.</span>
            </span>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">PARTNER</span>
          </div>
        </div>
      </div>

      <div className="pt-3">
        <TaskerLockBanner />
      </div>

      {/* Online toggle */}
      <div className="px-4 py-3 border-b border-border/30">
        <button
          onClick={() => onToggleOnline?.()}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
            isOnline
              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          {isOnline
            ? <Wifi className="w-4 h-4" aria-hidden="true" />
            : <WifiOff className="w-4 h-4" aria-hidden="true" />}
          {isOnline ? "Đang hoạt động" : "Không hoạt động"}
          <div className={cn("ml-auto w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {ALL_NAV_ITEMS.map((item) => {
          const active = isTabActive(item.href, item.exact, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-primary-foreground" : "")} aria-hidden="true" />
              <span>{item.label}</span>
              {active && (
                <motion.div
                  layoutId="desktop-nav-indicator"
                  className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary-foreground/60"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2 mb-3 px-1">
          <div className="flex-1 text-center">
            <p className="text-lg font-black">{tasker?.totalJobs ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Đơn xong</p>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 text-center">
            <p className="text-lg font-black flex items-center justify-center gap-0.5">
              {tasker?.avgRating?.toFixed(1) ?? "—"}
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" aria-hidden="true" />
            </p>
            <p className="text-[10px] text-muted-foreground">Đánh giá</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={tasker?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{tasker?.fullName ?? "Đối tác"}</p>
            <p className="text-xs text-muted-foreground truncate">{tasker?.phone ?? "Chưa cập nhật SĐT"}</p>
          </div>
          <Link
            href="/tasker/settings"
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all shrink-0"
            aria-label="Cài đặt"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Link>
          <button
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all shrink-0"
            onClick={() => logout.mutate()}
            aria-label="Đăng xuất"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile Top Bar ───────────────────────────────────────────────────────────

function MobileTopBar() {
  const { data: tasker } = useTaskerProfile();

  const initials = tasker?.fullName
    ? tasker.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "S";

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-md border-b border-border/50">
      <div className="h-16 flex items-center px-4 gap-3">
        <div className="flex items-center gap-2">
        <LogoApp variant="icon-only" size="sm" />
        <div className="flex flex-col">
          <span className="font-black tracking-tight leading-none text-[18px]">
            Clean<span className="text-primary">Z</span><span className="text-primary font-black">.</span>
          </span>
          <span className="text-[9px] text-primary font-bold uppercase tracking-widest mt-0.5">PARTNER</span>
        </div>
      </div>

        <div className="ml-auto flex items-center gap-3">
        <div className="flex flex-col items-end text-right">
          <span className="text-[10px] text-muted-foreground leading-none font-medium">Xin chào,</span>
          <span className="text-sm font-bold text-foreground leading-tight truncate max-w-[120px] mt-0.5">
            {tasker?.fullName?.split(" ").pop() ?? "Đối tác"}
          </span>
        </div>
        
        <Link href="/tasker/support-tickets" aria-label="Hỗ trợ" className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
          <LifeBuoy className="w-4 h-4" />
        </Link>
        <Link href="/tasker/settings" className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
          <Settings className="w-4 h-4" />
        </Link>
        <NotificationBell href="/tasker/notifications" className="w-8 h-8 shrink-0" />

        <Avatar className="w-9 h-9 border-2 border-background shadow-sm ring-1 ring-border shrink-0">
          <AvatarImage src={tasker?.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
        </Avatar>
      </div>
      </div>
      <TaskerLockBanner compact />
    </div>
  );
}

// ─── Single Bottom Tab ────────────────────────────────────────────────────────

function BottomTab({ href, label, icon: Icon, exact }: {
  href: string; label: string; icon: React.ElementType; exact?: boolean;
}) {
  const pathname = usePathname();
  const active = isTabActive(href, exact, pathname);

  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-[3px] pt-2 pb-1 relative touch-manipulation min-w-0"
      aria-current={active ? "page" : undefined}
    >
      {/* Active dot */}
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="bottom-nav-dot"
            className="absolute top-1 w-5 h-0.5 rounded-full bg-primary"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        animate={active ? { y: -1, scale: 1.08 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
      >
        <Icon
          className={cn("w-[23px] h-[23px] transition-colors duration-150", active ? "text-primary" : "text-muted-foreground/60")}
          strokeWidth={active ? 2.2 : 1.8}
          aria-hidden="true"
        />
      </motion.div>

      <span className={cn(
        "text-[10px] leading-none font-medium transition-colors duration-150 truncate",
        active ? "text-primary font-semibold" : "text-muted-foreground/60"
      )}>
        {label}
      </span>
    </Link>
  );
}

// ─── Mobile Bottom Nav — bTaskee style ────────────────────────────────────────

const CleanZBotIcon = ({ className }: { className?: string }) => (
  <div className={cn("relative shrink-0", className)}>
    <Image 
      src="/mascot.svg" 
      alt="CleanZ Bot" 
      fill 
      className="object-contain"
    />
  </div>
);

function MobileBottomNav({
  isOnline,
  onToggleOnline,
}: {
  isOnline: boolean;
  onToggleOnline?: () => void;
}) {
  const { data: activeBooking } = useTaskerActiveBooking();
  const hasActiveBooking = !!activeBooking;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div 
        className={cn(
          "absolute right-4 transition-all duration-300 z-50",
          hasActiveBooking 
            ? "bottom-[calc(env(safe-area-inset-bottom,0px)+178px)]" 
            : "bottom-[calc(env(safe-area-inset-bottom,0px)+74px)]"
        )}
      >
        <motion.button
          onClick={() => onToggleOnline?.()}
          whileTap={{ scale: 0.92 }}
          className={cn(
            "relative w-[48px] h-[48px] rounded-full flex flex-col items-center justify-center gap-[1px]",
            "shadow-md transition-colors duration-300 border-[2.5px] border-background",
            isOnline
              ? "bg-emerald-500 shadow-emerald-500/30 text-white"
              : "bg-orange-500 shadow-orange-500/30 text-white"
          )}
          aria-label={isOnline ? "Tắt hoạt động" : "Bật hoạt động"}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 relative z-10" strokeWidth={2.5} />
              <span className="text-[7.5px] font-bold leading-none relative z-10 uppercase tracking-widest mt-0.5">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 relative z-10" strokeWidth={2.5} />
              <span className="text-[7.5px] font-bold leading-none relative z-10 uppercase tracking-widest mt-0.5">Offline</span>
            </>
          )}

          {/* Pulse ring khi online */}
          {isOnline && (
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
            />
          )}
        </motion.button>
      </div>

      {/* Background Tab bar với SVG tạo đường cong */}
      <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px))] pointer-events-none drop-shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_-4px_16px_rgba(0,0,0,0.4)] text-card">
        <div className="flex w-full" style={{ height: "62px" }}>
          <div className="flex-1 bg-current rounded-tl-[24px]" />
          <svg width="100" height="62" viewBox="0 0 100 62" className="shrink-0 fill-current">
            <path d="M0,0 C 20,0 26,36 50,36 C 74,36 80,0 100,0 L100,62 L0,62 Z" />
          </svg>
          <div className="flex-1 bg-current rounded-tr-[24px]" />
        </div>
        <div className="w-full bg-current" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>

      {/* Nội dung Tab bar */}
      <div className="relative flex items-stretch h-[62px]">
        <div className="flex-1 flex px-1">
          {LEFT_TABS.map((t) => <BottomTab key={t.href} {...t} />)}
        </div>
        <div className="w-[100px] shrink-0" aria-hidden="true" />
        <div className="flex-1 flex px-1">
          {RIGHT_TABS.map((t) => <BottomTab key={t.href} {...t} />)}
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <motion.button
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className={cn(
            "relative w-[76px] h-[76px] flex flex-col items-center justify-center",
            "transition-transform duration-300 drop-shadow-lg"
          )}
          aria-label="Chat AI Trợ lý"
        >
          <CleanZBotIcon className="w-full h-full" />
        </motion.button>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function TaskerSidebar({ className, onToggleOnline }: TaskerSidebarProps) {
  const { data: tasker } = useTaskerProfile();
  const isOnline = tasker?.presenceStatus === "ONLINE";

  return (
    <>
      {/* Desktop: sidebar trái */}
      <DesktopSidebar className={className} onToggleOnline={onToggleOnline} />

      {/* Mobile */}
      <MobileTopBar />
      <MobileBottomNav isOnline={isOnline} onToggleOnline={onToggleOnline} />
    </>
  );
}
