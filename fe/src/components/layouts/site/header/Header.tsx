"use client";
import React, { useState, useEffect, useRef } from "react";
import { HeaderNav } from "./HeaderNav";
import { HeaderActions } from "./HeaderActions";
import { AvatarProfile } from "./AvatarProfile";
import { NavLink, HeaderAction, NAV_LINKS, HEADER_ACTIONS } from "./nav.config";
import LogoApp from "@/components/logo/LogoApp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search, MapPin, ChevronDown, Phone, Menu, X, Sparkles,
  Clock, Star, TrendingUp, Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useLogout } from "@/features/auth/hooks/auth.hooks";

interface HeaderProps {
  navLinks?: NavLink[];
  actions?: HeaderAction[];
}

const SUGGESTIONS = [
  { icon: TrendingUp, label: "Dọn nhà cuối tuần", tag: "Hot" },
  { icon: Zap, label: "Sửa điều hòa khẩn", tag: "Nhanh" },
  { icon: Star, label: "Massage thư giãn 60p", tag: "4.9★" },
  { icon: Clock, label: "Gia sư toán cấp 2", tag: "" },
];

const CITIES = ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng"];

export const Header: React.FC<HeaderProps> = ({
  navLinks = NAV_LINKS,
  actions = HEADER_ACTIONS,
}) => {
  const logout = useLogout()
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [city, setCity] = useState("Hà Nội");
  const [query, setQuery] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* header top */}
      <div className="w-full bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-9 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="tel:18006868" className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
              <Phone className="w-3 h-3" />
              <span className="font-bold">1800 6868</span>
              <span className="opacity-60 hidden sm:inline">(Miễn phí)</span>
            </Link>
            <Separator orientation="vertical" className="h-3 bg-primary-foreground/30" />
            <span className="hidden md:flex items-center gap-1.5 opacity-85">
              <Sparkles className="w-3 h-3" />
              Mới: Dịch vụ điều dưỡng tại nhà — đặt ngay hôm nay!
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 opacity-85">
            <a href="/partner" className="hover:opacity-100 transition-opacity hover:underline underline-offset-2">
              Trở thành đối tác
            </a>
            <Separator orientation="vertical" className="h-3 bg-primary-foreground/30" />
            <a href="/worker" className="hover:opacity-100 transition-opacity hover:underline underline-offset-2">
              Đăng ký làm thợ
            </a>
          </div>
        </div>
      </div>

      {/* header bottom */}
      <header className={cn(
        "sticky top-0 w-full z-40 bg-background/95 backdrop-blur-lg transition-all duration-300",
        scrolled
          ? "border-b border-border shadow-sm"
          : "border-b border-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="h-16 flex items-center justify-between gap-3">

            <div className="flex items-center gap-4 shrink-0">
              <LogoApp />

              {/* menu cty */}
              <div ref={cityRef} className="relative hidden md:block">
                <button
                  onClick={() => setCityOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="font-medium max-w-[120px] truncate">{city}</span>
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    cityOpen ? "rotate-180 text-primary" : "group-hover:text-primary"
                  )} />
                </button>

                <div className={cn(
                  "absolute top-full left-0 mt-2 w-48 bg-background border border-border rounded-xl shadow-lg overflow-hidden",
                  "transition-all duration-200 origin-top-left",
                  cityOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}>
                  <div className="p-1">
                    {CITIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => { setCity(c); setCityOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                          c === city
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex flex-1 justify-center">
              <HeaderNav navLinks={navLinks} />
            </div>

            <div className="flex items-center gap-1 shrink-0">

              {/* search */}
              <div ref={searchRef} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground dark:bg-muted dark:shadow-sm dark:shadow-white",
                    searchOpen && "bg-muted text-foreground"
                  )}
                  onClick={() => setSearchOpen((v) => !v)}
                >
                  <Search className="w-4 h-4" />
                </Button>

                {/* search dropdown */}
                <div className={cn(
                  "absolute right-0 top-full mt-2 w-80 md:w-96 bg-background border border-border rounded-2xl shadow-xl overflow-hidden",
                  "transition-all duration-200 origin-top-right",
                  searchOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}>
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
                      <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input
                        autoFocus={searchOpen}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        type="text"
                        placeholder="Tìm dịch vụ..."
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      />
                      {query && (
                        <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* search phổ biến */}
                  <div className="p-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1.5">
                      Tìm kiếm phổ biến
                    </p>
                    {SUGGESTIONS.map(({ icon: Icon, label, tag }) => (
                      <button
                        key={label}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left"
                        onClick={() => { setQuery(label); setSearchOpen(false); }}
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="flex-1">{label}</span>
                        {tag && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                            {tag}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* footer hint */}
                  <div className="px-4 py-2.5 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                      Nhấn <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> để tìm kiếm
                    </p>
                  </div>
                </div>
              </div>

              <HeaderActions actions={actions} />

              <Separator orientation="vertical" className="h-5 mx-1 hidden md:block" />

              <div className="hidden md:flex items-center gap-1.5">

                {/* LOGIN */}
                <motion.div
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-medium text-muted-foreground hover:text-foreground px-3 dark:shadow-sm dark:text-white dark:bg-muted dark:hover:bg-muted dark:hover:shadow-[0_6px_20px_rgba(99,102,241,0.45)]"
                    asChild
                  >
                    <Link href="/login">
                      Đăng nhập
                    </Link>
                  </Button>
                </motion.div>

                {/* REGISTER */}
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  <Button
                    size="sm"
                    className={cn(
                      "relative font-semibold rounded-full px-5 gap-1.5",
                      "bg-primary text-primary-foreground",
                      "shadow-[0_4px_14px_rgba(99,102,241,0.35)]",
                      "hover:shadow-[0_6px_20px_rgba(99,102,241,0.45)]",
                      "transition-all duration-200"
                    )}
                    asChild
                  >
                    <Link href="/register" className="flex items-center">
                      Đăng ký

                      {/* badge FREE (animated) */}
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                        className="ml-1"
                      >
                        <Badge
                          className={cn(
                            "bg-primary-foreground/20 text-primary-foreground",
                            "text-[9px] px-1.5 py-0 font-black",
                            "backdrop-blur-sm"
                          )}
                        >
                          FREE
                        </Badge>
                      </motion.span>
                    </Link>
                  </Button>
                </motion.div>
              </div>

              {/* avatar */}
              <AvatarProfile />

              <ThemeToggle />
              {/* mobile toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground ml-1"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* mobile menu overlay */}
      <div className={cn(
        "fixed inset-0 z-30 md:hidden transition-all duration-300 z-100",
        mobileOpen ? "pointer-events-auto" : "pointer-events-none"
      )}>
        <div
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />

        <div className={cn(
          "absolute top-0 right-0 h-full w-[300px] bg-background shadow-2xl",
          "flex flex-col transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <LogoApp />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
            {/* city */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/60 mb-3">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium text-foreground">{city}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>

            {/* nav links */}
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {link.label}
                <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-40" />
              </a>
            ))}

            <Separator className="my-3" />

            {/* Partner links */}
            <a href="/partner" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Trở thành đối tác
              <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-40" />
            </a>
            <a href="/worker" className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Đăng ký làm thợ
              <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-40" />
            </a>
          </div>

          {/* Panel footer: auth */}
          <div className="border-t border-border p-4 space-y-2">
            <Button variant="outline" className="w-full font-semibold" asChild>
              <a href="/auth/login">Đăng nhập</a>
            </Button>
            <Button className="w-full font-semibold rounded-xl" asChild>
              <a href="/auth/register">Đăng ký miễn phí</a>
            </Button>
            <ConfirmDialog
              trigger={
                <Button
                  className="w-full font-semibold rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20">
                  <LogOut className="w-4 h-4 shrink-0" />
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
            <p className="text-center text-xs text-muted-foreground pt-1">
              Hotline: <a href="tel:18006868" className="text-primary font-bold">1800 6868</a> (miễn phí)
            </p>
          </div>

          <div className="p-1.5">
</div>
        </div>
      </div>
    </>
  );
};