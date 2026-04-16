"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  CalendarClock, 
  Wallet, 
  MapPin, 
  UserCircle, 
  MessageSquare, 
  ShieldCheck,
  Star,
  Settings,
  Sparkles,
  Search,
  Grid
} from "lucide-react"

import { NavMain } from "@/components/siderber/nav-main"
import { NavProjects } from "@/components/siderber/nav-projects"
import { NavUser } from "@/components/siderber/nav-user"
import { TeamSwitcher } from "@/components/siderber/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroupLabel
} from "@/components/ui/sidebar"

const customerData = {
  user: {
    name: "Lê Minh Tâm",
    email: "customer@kingofservice.com",
    avatar: "https://i.pravatar.cc/150?u=customer",
  },
  teams: [
    {
      name: "KingOfService",
      logo: <Sparkles className="text-primary fill-primary/20" />,
      plan: "Tài khoản cá nhân",
    },
  ],
  navMain: [
    {
      title: "Tổng quan",
      url: "/customer",
      icon: <LayoutDashboard />,
      isActive: true,
    },
    {
      title: "Đơn dọn dẹp",
      url: "/customer/bookings",
      icon: <CalendarClock />,
      items: [
        { title: "Sắp tới", url: "/customer/bookings" },
        { title: "Lịch sử đặt", url: "/customer/bookings/history" },
        { title: "Khiếu nại", url: "/customer/bookings/disputes" },
      ],
    },
    {
      title: "Khám phá dịch vụ",
      url: "/services",
      icon: <Grid />,
    },
  ],
  personal: [
    {
      title: "Ví & Ưu đãi",
      url: "/customer/wallet",
      icon: <Wallet />,
      items: [
        { title: "Số dư & Nạp tiền", url: "/customer/wallet" },
        { title: "Kho Voucher", url: "/customer/wallet/vouchers" },
        { title: "Thanh toán", url: "/customer/wallet/methods" },
      ],
    },
    {
      title: "Địa chỉ đã lưu",
      url: "/customer/addresses",
      icon: <MapPin />,
    },
    {
      title: "Đánh giá của tôi",
      url: "/customer/reviews",
      icon: <Star />,
    },
  ],
  support: [
    {
       name: "Hỗ trợ & HDSD",
       url: "/help",
       icon: <MessageSquare />,
    },
    {
       name: "Cài đặt tài khoản",
       url: "/customer/settings",
       icon: <Settings />,
    },
  ]
}

export function CustomerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r border-border/40" {...props}>
      <SidebarHeader className="h-16 border-b border-border/40 justify-center">
        <TeamSwitcher teams={customerData.teams} />
      </SidebarHeader>
      <SidebarContent className="py-2 scrollbar-hide bg-sidebar transition-colors duration-300">
        <NavMain items={customerData.navMain} label="Bảng điều khiển" />
        <NavMain items={customerData.personal} label="Tài khoản cá nhân" />
        <NavProjects projects={customerData.support} label="Hệ thống" />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <NavUser user={customerData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
