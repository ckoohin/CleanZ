"use client";

import React from "react";
import { X, MapPin, ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Profile } from "@/features/auth/types/user.type";
import { UseMutationResult } from "@tanstack/react-query";
import LogoApp from "@/components/logo/LogoApp";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { NavLink, PARTNER_LINKS } from "./nav.config";

interface MobileSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  city: string;
  navLinks: NavLink[];
  profile?: Profile | null;
  logout: UseMutationResult<void, unknown, void, unknown>;
  isMounted: boolean;
}

const CUSTOMER_MOBILE_LINKS: NavLink[] = [
  { label: "Bảng điều khiển", href: "/customer" },
  { label: "Đặt dịch vụ", href: "/customer/catalog" },
  { label: "Hoạt động dọn dẹp", href: "/customer/history" },
  { label: "Ví CleanZ", href: "/customer/wallet" },
  { label: "Địa chỉ đã lưu", href: "/customer/addresses" },
  { label: "Bài viết & Tin tức", href: "/customer/blogs" },
  { label: "Hỗ trợ khách hàng", href: "/customer/support-tickets" },
  { label: "Chính sách đối tác", href: "/customer/policies" },
  { label: "Hồ sơ cá nhân", href: "/customer/profile" },
  { label: "Cài đặt tài khoản", href: "/customer/settings" },
];

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  mobileOpen,
  setMobileOpen,
  city, 
  navLinks,
  profile,
  logout,
  isMounted,
}) => {
  return (
    <div className={cn(
      "fixed inset-0 z-50 xl:hidden transition-all duration-300",
      mobileOpen ? "pointer-events-auto" : "pointer-events-none"
    )}>
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          mobileOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Panel */}
      <div className={cn(
        "absolute top-0 right-0 h-full w-[300px] bg-background shadow-2xl",
        "flex flex-col transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <LogoApp />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {/* City Selection */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/60 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{city}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
          </div>

          {/* Hiển thị danh sách link tương ứng dựa trên trạng thái đăng nhập */}
          {profile ? (
            <>
              {CUSTOMER_MOBILE_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                  <ChevronDown className="w-4 h-4 -rotate-90 opacity-40" />
                </a>
              ))}
            </>
          ) : (
            <>
              {/* Main Nav Links (from config) */}
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                  <ChevronDown className="w-4 h-4 -rotate-90 opacity-40" />
                </a>
              ))}

              <Separator className="my-4" />

              {/* Partner Nav Links (from config) */}
              {PARTNER_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                  <ChevronDown className="w-4 h-4 -rotate-90 opacity-40" />
                </a>
              ))}
            </>
          )}
        </div>

        {/* Footer: Auth & Hotline */}
        <div className="border-t border-border p-4 space-y-3">
          {!profile && (
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="w-full font-semibold rounded-xl h-11 text-base" asChild>
                <a href="/login" onClick={() => setMobileOpen(false)}>Đăng nhập</a>
              </Button>
              <Button className="w-full font-semibold rounded-xl h-11 text-base shadow-md shadow-primary/20" asChild>
                <a href="/register" onClick={() => setMobileOpen(false)}>Đăng ký miễn phí</a>
              </Button>
            </div>
          )}
          {isMounted && profile && (
            <ConfirmDialog
              trigger={
                <Button
                  className="w-full font-semibold rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 h-11 text-base">
                  <LogOut className="w-4 h-4 shrink-0 mr-2" />
                  Đăng xuất
                </Button>
              }
              title="Xác nhận đăng xuất"
              description="Bạn có chắc chắn muốn đăng xuất?"
              confirmText="Đăng xuất"
              cancelText="Hủy"
              onConfirm={() => {
                logout.mutate()
              }}
            />
          )}
          <p className="text-center text-xs text-muted-foreground pt-2">
            Hotline: <a href="tel:18006868" className="text-primary font-bold">1800 6868</a> (miễn phí)
          </p>
        </div>
      </div>
    </div>
  );
};
