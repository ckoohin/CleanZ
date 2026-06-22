"use client"

import * as React from "react"
import {
  Home,
  ClipboardList,
  Wallet,
  HeadphonesIcon,
  User,
  Settings,
  MapPin,
} from "lucide-react"

import { NavMain } from "@/components/siderber/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import LogoApp from "@/components/logo/LogoApp"
import Link from "next/link"

const customerData = {
  main: [
    {
      title: "Trang chủ",
      url: "/customer",
      icon: <Home />,
    },
    {
      title: "Hoạt động",
      url: "/customer/history",
      icon: <ClipboardList />,
    },
    {
      title: "Ví CleanZ",
      url: "/customer/wallet",
      icon: <Wallet />,
    },
  ],
  support: [
    {
      title: "Hỗ trợ khách hàng",
      url: "/customer/support-tickets",
      icon: <HeadphonesIcon />,
    },
  ],
  account: [
    {
      title: "Hồ sơ cá nhân",
      url: "/customer/profile",
      icon: <User />,
    },
    {
      title: "Sổ địa chỉ",
      url: "/customer/addresses",
      icon: <MapPin />,
    },
  ]
}

export function CustomerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="none" className="border-r border-border/40 bg-background/50 backdrop-blur-xl hidden md:flex" {...props}>
      <SidebarHeader className="h-16 border-b border-border/40 justify-center px-4">
        <Link href="/" className="flex items-center gap-2">
            <LogoApp />
        </Link>
      </SidebarHeader>
      <SidebarContent className="py-4 scrollbar-hide bg-transparent transition-colors duration-300">
        <NavMain items={customerData.main} label="Dịch vụ" />
        <NavMain items={customerData.account} label="Tài khoản" />
        <NavMain items={customerData.support} label="Trợ giúp" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
