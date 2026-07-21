"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Home,
  LayoutGrid,
  ClipboardList,
  Wallet,
  MapPin,
  BookOpenText,
  Headphones,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, useLogout } from "@/features/auth/hooks/auth.hooks";
import { useCustomerWallet } from "@/features/customer/wallet/hooks/useCustomerWallet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LogoApp from "@/components/logo/LogoApp";

// ─── Nav config ───────────────────────────────────────────────────────────────

const ALL_NAV_ITEMS = [
  { href: "/customer",                 label: "Trang chủ",        icon: Home, exact: true },
  { href: "/customer/catalog",         label: "Dịch vụ",          icon: LayoutGrid },
  { href: "/customer/history",         label: "Hoạt động",        icon: ClipboardList },
  { href: "/customer/wallet",          label: "Ví CleanZ",        icon: Wallet },
  { href: "/customer/addresses",       label: "Địa chỉ đã lưu",   icon: MapPin },
  { href: "/customer/blogs",           label: "Bài viết",         icon: BookOpenText },
  { href: "/customer/support-tickets", label: "Hỗ trợ",          icon: Headphones },
  { href: "/customer/policies",        label: "Chính sách",       icon: ScrollText },
];

function isTabActive(href: string, exact: boolean | undefined, pathname: string) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function CustomerSidebar() {
  const { data: authData } = useAuth();
  const { data: wallet } = useCustomerWallet();
  const logout = useLogout();
  const pathname = usePathname();

  const initials = authData?.fullName
    ? authData.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "C";

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex flex-col w-60 border-r border-border bg-card/80 backdrop-blur-md shrink-0 fixed top-0 left-0 bottom-0 h-screen z-30"
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
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">CUSTOMER</span>
            </div>
          </div>
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
                    layoutId="customer-desktop-nav-indicator"
                    className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary-foreground/60"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          {/* Stats: Ví và Điểm */}
          <div className="flex gap-2 mb-3 px-1">
            <div className="flex-1 text-center">
              <p className="text-sm font-black text-primary leading-tight">
                {wallet?.balance?.toLocaleString("vi-VN") ?? 0}đ
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Số dư ví</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="text-sm font-black text-primary leading-tight">0</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">bPoint</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/customer/profile" className="flex items-center gap-3 flex-1 min-w-0 group">
              <Avatar className="w-9 h-9 shrink-0 group-hover:ring-2 group-hover:ring-primary/50 transition-all">
                <AvatarImage src={authData?.avatarUrl ?? authData?.avatar ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{authData?.fullName ?? "Khách hàng"}</p>
                <p className="text-xs text-muted-foreground truncate">{authData?.phone ?? authData?.email ?? "Chưa cập nhật SĐT"}</p>
              </div>
            </Link>
            <Link
              href="/customer/settings"
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

      {/* Div giữ chỗ cho fixed sidebar trên desktop để tránh đè main content */}
      <div className="hidden lg:block w-60 shrink-0" />
    </>
  );
}
