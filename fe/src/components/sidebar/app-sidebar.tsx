"use client"

import * as React from "react"
import {
  Bell,
  CalendarCheck,
  HeadphonesIcon,
  LayoutDashboard,
  Settings2,
  Users,
  UserCog,
  Wallet,
  Wrench,
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
} from "@/components/ui/sidebar"

const overviewNav = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: <LayoutDashboard />,
    items: [
      { title: "Bảng điều khiển", url: "/admin" },
      { title: "Hoạt động hệ thống", url: "/admin/activity" },
    ],
  },
]

const managementNav = [
  {
    title: "Quản lý Dịch vụ",
    url: "/admin/services",
    icon: <Wrench />,
    items: [
      { title: "Danh sách dịch vụ", url: "/admin/services" },
    ],
  },
  {
    title: "Quản lý Đơn hàng",
    url: "/admin/bookings",
    icon: <CalendarCheck />,
    items: [
      { title: "Tất cả đơn hàng", url: "/admin/bookings" },
      { title: "Sự cố & Khiếu nại", url: "/admin/incidents" },
    ],
  },
  {
    title: "Quản lý Tasker",
    url: "/admin/taskers",
    icon: <UserCog />,
    items: [
      { title: "Danh sách Tasker", url: "/admin/taskers" },
    ],
  },
  {
    title: "Khách hàng",
    url: "/admin/customers",
    icon: <Users />,
    items: [
      { title: "Danh sách khách hàng", url: "/admin/customers" },
    ],
  },
]

const operationsNav = [
  {
    title: "Tài chính",
    url: "/admin/finances",
    icon: <Wallet />,
    items: [
      { title: "Lịch sử giao dịch", url: "/admin/finances" },
      { title: "Yêu cầu rút tiền", url: "/admin/withdrawals" },
    ],
  },
  {
    title: "Hỗ trợ khách hàng",
    url: "/admin/support-tickets",
    icon: <HeadphonesIcon />,
    items: [
      { title: "Hàng đợi ticket", url: "/admin/support-tickets" },
    ],
  },
  {
    title: "Thông báo",
    url: "/admin/notifications",
    icon: <Bell />,
    items: [
      { title: "Broadcast & Lịch sử", url: "/admin/notifications" },
    ],
  },
]

const systemSettings = [
  {
    name: "Cài đặt hệ thống",
    url: "/admin/settings",
    icon: <Settings2 />,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r border-border/40" {...props}>
      <SidebarHeader className="h-16 border-b border-border/40 justify-center">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent className="py-2 scrollbar-hide">
        <NavMain items={overviewNav} label="Tổng quan" />
        <NavMain items={managementNav} label="Quản lý" />
        <NavMain items={operationsNav} label="Vận hành" />
        <NavProjects projects={systemSettings} label="Hệ thống" />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-3">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
