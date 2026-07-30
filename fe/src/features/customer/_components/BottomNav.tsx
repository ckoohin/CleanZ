"use client"

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  ClipboardList, 
  Wallet, 
  HeadphonesIcon, 
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Trang chủ',  icon: Home,            href: '/customer' },
  { label: 'Hoạt động',  icon: ClipboardList,   href: '/customer/history' },
  { label: 'Ví',         icon: Wallet,           href: '/customer/wallet' },
  { label: 'Hỗ trợ',    icon: HeadphonesIcon,   href: '/customer/support-tickets' },
  { label: 'Tài khoản',  icon: User,             href: '/customer/profile' },
]

export function BottomNav() {
  const pathname = usePathname()

  // Logic theo dõi cuộn để tự động ẩn/hiện menu chính trên di động
  const [showNav, setShowNav] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY.current) {
          setShowNav(false) // Cuộn xuống -> ẩn
        } else {
          setShowNav(true)  // Cuộn lên -> hiện
        }
      } else {
        setShowNav(true)   // Gần đầu trang -> hiện
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Ẩn vĩnh viễn trên các trang đặt lịch (booking wizard) để nhường chỗ cho nút Tiếp tục ghim đáy
  if (pathname.startsWith('/customer/booking') || pathname.startsWith('/booking')) {
    return null;
  }

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-30 bg-background/85 backdrop-blur-xl border-t border-border/40 md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.05)]",
      "transition-transform duration-300 ease-in-out",
      showNav ? "translate-y-0" : "translate-y-full"
    )} style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex h-20 items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.label}
              href={item.href || '#'}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl transition-all duration-300",
                isActive ? "text-primary transform scale-110" : "text-muted-foreground/60 hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive ? "bg-primary/10 shadow-sm" : ""
              )}>
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[1.5px]")} />
              </div>
              <span className={cn("text-[10px] font-bold tracking-tight", isActive ? "opacity-100" : "opacity-60")}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
