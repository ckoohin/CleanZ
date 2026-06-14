"use client"

import * as React from "react"
import {
  CalendarClock,
  Grid,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
  Star,
  Wallet,
} from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavProjects } from "@/components/sidebar/nav-projects"
import { NavUser } from "@/components/sidebar/nav-user"
import { SidebarBrand } from "@/components/sidebar/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroupLabel
} from "@/components/ui/sidebar"

const customerData = {
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
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent className="py-2 scrollbar-hide bg-sidebar transition-colors duration-300">
        <NavMain items={customerData.navMain} label="Bảng điều khiển" />
        <NavMain items={customerData.personal} label="Tài khoản cá nhân" />
        <NavProjects projects={customerData.support} label="Hệ thống" />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
