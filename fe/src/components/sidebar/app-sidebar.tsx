"use client"

import * as React from "react"
import {
  BarChart3,
  CalendarCheck,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Star,
  Users,
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
    title: "Bảng điều khiển",
    url: "/admin",
    icon: <LayoutDashboard />,
  },
]

const managementNav = [
  {
    title: "Quản lý Dịch vụ",
    url: "/admin/services",
    icon: <Wrench />,
    items: [
      { title: "Danh sách dịch vụ", url: "/admin/services" },
      { title: "Danh mục", url: "/admin/categories" },
      { title: "Bảng giá", url: "/admin/pricing" },
    ],
  },
  {
    title: "Quản lý Đơn hàng",
    url: "/admin/bookings",
    icon: <CalendarCheck />,
    items: [
      { title: "Đơn đặt lịch mới", url: "/admin/bookings" },
      { title: "Đang thực hiện", url: "/admin/bookings/active" },
      { title: "Lịch sử đơn hàng", url: "/admin/bookings/history" },
      { title: "Khiếu nại & Hoàn tiền", url: "/admin/refunds" },
    ],
  },
  {
    title: "Quản lý Nhân sự",
    url: "/admin/tasker",
    icon: <ShieldCheck />,
    items: [
      { title: "Danh sách đối tác", url: "/admin/tasker" },
      { title: "Xác minh hồ sơ", url: "/admin/tasker/verification" },
      { title: "Lịch làm việc", url: "/admin/tasker/schedule" },
      { title: "Bảng lương & Thu nhập", url: "/admin/tasker/payroll" },
    ],
  },
  {
    title: "Khách hàng",
    url: "/admin/customers",
    icon: <Users />,
    items: [
      { title: "Danh sách khách hàng", url: "/admin/customers" },
      { title: "Phân hạng Loyalty", url: "/admin/customers/loyalty" },
      { title: "Gói Subscription", url: "/admin/customers/plans" },
    ],
  },
]

const operationsNav = [
  {
    title: "Tài chính & Hóa đơn",
    url: "/admin/finance",
    icon: <CreditCard />,
    items: [
      { title: "Giao dịch", url: "/admin/finance/transactions" },
      { title: "Quản lý hóa đơn", url: "/admin/finance/invoices" },
    ],
  },
  {
    title: "Đánh giá & Phản hồi",
    url: "/admin/reviews",
    icon: <Star />,
  },
  {
    title: "Báo cáo & Phân tích",
    url: "/admin/analytics",
    icon: <BarChart3 />,
  },
  {
    title: "Cấu hình nội dung",
    url: "/admin/content",
    icon: <FileText />,
    items: [
      { title: "Banner quảng cáo", url: "/admin/content/banners" },
      { title: "FAQs & Trang tĩnh", url: "/admin/content/faqs" },
      { title: "Cài đặt thông báo", url: "/admin/content/notifications" },
    ],
  },
]

const systemSettings = [
  {
    name: "Cài đặt hệ thống",
    url: "/admin/settings",
    icon: <Settings2 />,
  },
  {
    name: "Phân quyền & Role",
    url: "/admin/roles",
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
        <NavProjects projects={systemSettings} label="Hệ thống" />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-3">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
