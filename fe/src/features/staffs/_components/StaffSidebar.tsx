"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  User,
  Calendar,
  DollarSign,
  Bell,
  LogOut,
  ChevronRight,
  Star,
  Menu,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStaffProfile } from "@/features/staffs/hooks/staff.hooks";
import { useLogout } from "@/features/auth/hooks/auth.hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/staff", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/staff/profile", label: "Hồ sơ cá nhân", icon: User },
  { href: "/staff/schedule", label: "Lịch làm việc", icon: Calendar },
  { href: "/staff/earnings", label: "Thu nhập", icon: DollarSign },
  { href: "/staff/notifications", label: "Thông báo", icon: Bell },
];

interface StaffSidebarProps {
  className?: string;
}

export function StaffSidebar({ className }: StaffSidebarProps) {
  const pathname = usePathname();
  const { data: staff } = useStaffProfile();
  const logout = useLogout();
  const [isOnline, setIsOnline] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const initials = staff?.fullName
    ? staff.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "S";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm">C</span>
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">CleanZ</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
              Đối tác
            </p>
          </div>
        </div>
      </div>

      {/* Online toggle */}
      <div className="px-4 py-3 border-b border-border/30">
        <button
          onClick={() => setIsOnline((v) => !v)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
            isOnline
              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4" aria-hidden="true" />
          ) : (
            <WifiOff className="w-4 h-4" aria-hidden="true" />
          )}
          {isOnline ? "Đang hoạt động" : "Không hoạt động"}
          <div
            className={cn(
              "ml-auto w-2 h-2 rounded-full",
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn("w-4 h-4 shrink-0", active ? "text-primary-foreground" : "")}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {active && (
                <ChevronRight className="w-3 h-3 ml-auto text-primary-foreground/70" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-border/50">
        {/* Stats mini */}
        <div className="flex gap-2 mb-3 px-1">
          <div className="flex-1 text-center">
            <p className="text-lg font-black">{staff?.totalJobs ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Đơn xong</p>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 text-center">
            <p className="text-lg font-black flex items-center justify-center gap-0.5">
              {staff?.avgRating?.toFixed(1) ?? "—"}
              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" aria-hidden="true" />
            </p>
            <p className="text-[10px] text-muted-foreground">Đánh giá</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarImage src={staff?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{staff?.fullName ?? "Đối tác"}</p>
            <p className="text-xs text-muted-foreground truncate">{staff?.phone ?? "Chưa cập nhật SĐT"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => logout.mutate()}
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col w-60 border-r border-border bg-card/80 backdrop-blur-md shrink-0 sticky top-0 h-screen",
          className
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card/80 backdrop-blur-md border-b border-border flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center"
          aria-label="Mở menu"
        >
          <Menu className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-black text-xs">C</span>
          </div>
          <span className="font-bold text-sm">CleanZ Partner</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40")} />
          <Avatar className="w-8 h-8">
            <AvatarImage src={staff?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <span className="font-bold">Menu</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
