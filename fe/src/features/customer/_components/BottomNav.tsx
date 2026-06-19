"use client"

import React from 'react'
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/40 px-2 pb-safe-offset-2 h-20 flex items-center justify-around md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
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
    </nav>
  )
}
