"use client"

import * as React from "react"
import {
  Bell,
  CalendarCheck,
  FileText,
  HeadphonesIcon,
  LayoutDashboard,
  Newspaper,
  Settings2,
  TicketPercent,
  Users,
  UserCog,
  Wallet,
  Wrench,
  ShieldCheck,
} from "lucide-react"

import { ROUTES } from "@/constants/routes"
import { NavMain } from "@/components/sidebar/nav-main"
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
    url: ROUTES.ADMIN.DASHBOARD,
    icon: <LayoutDashboard />,
    items: [
      { title: "Bảng điều khiển", url: ROUTES.ADMIN.DASHBOARD },
      { title: "Hoạt động hệ thống", url: "/admin/activity" },
    ],
  },
]

const managementNav = [
  {
    title: "Quản lý Dịch vụ",
    url: ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.BASE,
    icon: <Wrench />,
    items: [
      { title: "Gói dịch vụ", url: ROUTES.ADMIN.SERVICES.SERVICE_PACKAGES.BASE },
      { title: "Danh sách dịch vụ", url: ROUTES.ADMIN.SERVICES.SUB_SERVICES.BASE },
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
    title: "Voucher & Khuyến mãi",
    url: ROUTES.ADMIN.VOUCHERS.BASE,
    icon: <TicketPercent />,
    items: [
      { title: "Danh sách voucher", url: ROUTES.ADMIN.VOUCHERS.BASE },
      { title: "Tạo voucher mới", url: ROUTES.ADMIN.VOUCHERS.CREATE },
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
    title: "Blog",
    url: ROUTES.ADMIN.BLOGS.BASE,
    icon: <Newspaper />,
    items: [
      { title: "Quản lý blog", url: ROUTES.ADMIN.BLOGS.BASE },
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

const systemNav = [
  {
    title: "Cài đặt hệ thống",
    url: "/admin/settings",
    icon: <Settings2 />,
    items: [
      { title: "Cài đặt chung", url: "/admin/settings" },
      { title: "Ngày cao điểm", url: "/admin/settings/peak-days" },
    ],
  },
  {
    title: "Quản lý chính sách",
    url: ROUTES.ADMIN.POLICIES.BASE,
    icon: <FileText />,
    items: [
      { title: "Danh sách chính sách", url: ROUTES.ADMIN.POLICIES.BASE },
      { title: "Chính sách mặc định", url: ROUTES.ADMIN.POLICIES.DEFAULTS },
    ],
  },
  {
    title: "Nhân viên hệ thống",
    url: "/admin/staff",
    icon: <ShieldCheck />,
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
        <NavMain items={systemNav} label="Hệ thống" />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-3">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
