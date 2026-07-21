"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Wallet, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Trang chủ",
    href: "/home",
    icon: Home,
    matchPaths: ["/", "/home"],
  },
  {
    label: "Hoạt động",
    href: "/activity",
    icon: ClipboardList,
    matchPaths: ["/activity", "/history"],
  },
  {
    label: "Thanh toán",
    href: "/payment",
    icon: Wallet,
    matchPaths: ["/payment", "/wallet"],
  },
  {
    label: "Tin nhắn",
    href: "/messages",
    icon: MessageCircle,
    matchPaths: ["/messages", "/chat"],
  },
  {
    label: "Tài khoản",
    href: "/account",
    icon: User,
    matchPaths: ["/account", "/profile", "/customer"],
  },
];

export const MobileBottomNav = () => {
  const pathname = usePathname();

  // Ẩn vĩnh viễn trên các trang đặt lịch (booking wizard) để nhường chỗ cho nút Tiếp tục ghim đáy
  if (pathname.startsWith('/customer/booking') || pathname.startsWith('/booking')) {
    return null;
  }

  // Logic theo dõi cuộn để tự động ẩn/hiện menu chính trên di động
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY.current) {
          setShowNav(false); // Cuộn xuống -> ẩn
        } else {
          setShowNav(true);  // Cuộn lên -> hiện
        }
      } else {
        setShowNav(true);   // Gần đầu trang -> hiện
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={cn(
      "md:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-lg border-t border-border pb-2",
      "transition-transform duration-300 ease-in-out",
      showNav ? "translate-y-0" : "translate-y-full"
    )}>
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matchPaths.some((path) =>
            pathname === path || (path !== "/" && pathname?.startsWith(path))
          );

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-full h-full gap-1 group"
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-sm shadow-primary/50" />
              )}
              
              <div
                className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-300",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              
              <span
                className={cn(
                  "text-[10px] font-semibold transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
