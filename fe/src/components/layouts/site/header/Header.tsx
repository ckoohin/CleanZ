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
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────── */
interface HeaderProps {
  navLinks?: NavLink[];
  actions?: HeaderAction[];
}

/* ─── Search suggestions ────────────────── */
const SUGGESTIONS = [
  { icon: TrendingUp, label: "Dọn nhà cuối tuần",    tag: "Hot" },
  { icon: Zap,        label: "Sửa điều hòa khẩn",    tag: "Nhanh" },
  { icon: Star,       label: "Massage thư giãn 60p",  tag: "4.9★" },
  { icon: Clock,      label: "Gia sư toán cấp 2",     tag: "" },
];

const CITIES = ["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Cần Thơ", "Hải Phòng"];

/* ─── Component ─────────────────────────── */
export const Header: React.FC<HeaderProps> = ({
  navLinks = NAV_LINKS,
  actions  = HEADER_ACTIONS,
}) => {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [cityOpen,    setCityOpen]    = useState(false);
  const [city,        setCity]        = useState("TP. Hồ Chí Minh");
  const [query,       setQuery]       = useState("");

  const searchRef = useRef<HTMLDivElement>(null);
  const cityRef   = useRef<HTMLDivElement>(null);

  /* scroll detection */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* close dropdowns on outside click */
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (cityRef.current   && !cityRef.current.contains(e.target as Node))   setCityOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  /* lock body scroll when mobile menu open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ══════════════════════════════════════
          TOP BAR
      ══════════════════════════════════════ */}
      <div className="w-full bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-9 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-3 md:gap-4">
            <a href="tel:18006868" className="flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
              <Phone className="w-3 h-3" />
              <span className="font-bold">1800 6868</span>
              <span className="opacity-60 hidden sm:inline">(Miễn phí)</span>
            </a>
            <Separator orientation="vertical" className="h-3 bg-primary-foreground/30" />
            <span className="hidden md:flex items-center gap-1.5 opacity-85">
              <Sparkles className="w-3 h-3" />
              Mới: Dịch vụ điều dưỡng tại nhà — đặt ngay hôm nay!
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4 opacity-85">
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

      {/* ══════════════════════════════════════
          MAIN HEADER
      ══════════════════════════════════════ */}
      <header className={cn(
        "sticky top-0 w-full z-40 bg-background/95 backdrop-blur-lg transition-all duration-300",
        scrolled
          ? "border-b border-border shadow-sm"
          : "border-b border-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="h-16 flex items-center justify-between gap-3">

            {/* ── LEFT: Logo + City picker ── */}
            <div className="flex items-center gap-4 shrink-0">
              <LogoApp />

              {/* City dropdown */}
              <div ref={cityRef} className="relative hidden lg:block">
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

                {/* City dropdown panel */}
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

            {/* ── CENTER: Nav ── */}
            <div className="hidden md:flex flex-1 justify-center">
              <HeaderNav navLinks={navLinks} />
            </div>

            {/* ── RIGHT: Search + Actions + Auth + Avatar ── */}
            <div className="flex items-center gap-1 shrink-0">

              {/* Search */}
              <div ref={searchRef} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    searchOpen && "bg-muted text-foreground"
                  )}
                  onClick={() => setSearchOpen((v) => !v)}
                >
                  <Search className="w-4 h-4" />
                </Button>

                {/* Search dropdown */}
                <div className={cn(
                  "absolute right-0 top-full mt-2 w-80 md:w-96 bg-background border border-border rounded-2xl shadow-xl overflow-hidden",
                  "transition-all duration-200 origin-top-right",
                  searchOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}>
                  {/* Input */}
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

                  {/* Suggestions */}
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

                  {/* Footer hint */}
                  <div className="px-4 py-2.5 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">
                      Nhấn <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> để tìm kiếm
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification + action icons */}
              <HeaderActions actions={actions} />

              <Separator orientation="vertical" className="h-5 mx-1 hidden md:block" />

              {/* Auth buttons */}
              <div className="hidden md:flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium text-muted-foreground hover:text-foreground px-3"
                  asChild
                >
                  <a href="/auth/login">Đăng nhập</a>
                </Button>
                <Button size="sm" className="font-semibold rounded-full px-5 gap-1.5" asChild>
                  <a href="/auth/register">
                    Đăng ký miễn phí
                    <Badge className="ml-0.5 bg-primary-foreground/20 text-primary-foreground text-[9px] px-1.5 py-0 font-black">
                      FREE
                    </Badge>
                  </a>
                </Button>
              </div>

              {/* Avatar with dropdown */}
              <AvatarProfile />

              {/* Mobile toggle */}
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

      {/* ══════════════════════════════════════
          MOBILE MENU OVERLAY
      ══════════════════════════════════════ */}
      <div className={cn(
        "fixed inset-0 z-30 md:hidden transition-all duration-300",
        mobileOpen ? "pointer-events-auto" : "pointer-events-none"
      )}>
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* Slide-in panel */}
        <div className={cn(
          "absolute top-0 right-0 h-full w-[300px] bg-background shadow-2xl",
          "flex flex-col transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <LogoApp />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
            {/* City */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/60 mb-3">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium text-foreground">{city}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
            </div>

            {/* Nav links */}
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
            <p className="text-center text-xs text-muted-foreground pt-1">
              Hotline: <a href="tel:18006868" className="text-primary font-bold">1800 6868</a> (miễn phí)
            </p>
          </div>
        </div>
      </div>
    </>
  );
};