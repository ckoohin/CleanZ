"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Wrench,
  CalendarCheck,
  Users,
  CreditCard,
  FileText,
  BarChart3,
  Settings2,
  ShieldCheck,
  Star,
  Sparkles
} from "lucide-react"

import { NavMain } from "@/components/siderber/nav-main"
import { NavProjects } from "@/components/siderber/nav-projects"
import { NavUser } from "@/components/sidebar/nav-user"
import { SidebarBrand } from "@/components/sidebar/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Dữ liệu quản trị CleanZ
const adminData = {
  user: {
    name: "Admin Root",
    email: "admin@CleanZ.com",
    avatar: "https://i.pravatar.cc/150?u=admin",
    fullName: "Ngô Đức Admin"
  },
  teams: [
    {
      name: "CleanZ",
      logo: (
        <Sparkles className="text-primary fill-primary/20" />
      ),
      plan: "Quản trị hệ thống",
    },
  ],
  navMain: [
    {
      title: "Tổng quan",
      url: "/admin",
      icon: <LayoutDashboard />,
      items: [
        { title: "Bảng điều khiển", url: "/admin" },
        { title: "Hoạt động gần đây", url: "/admin/activity" },
      ],
    },
    {
      title: "Quản lý Dịch vụ",
      url: "/admin/services",
      icon: <Wrench />,
      items: [
        { title: "Danh sách dịch vụ", url: "/admin/services" },
        { title: "Danh mục", url: "/admin/categories" },
        { title: "Bảng giá chuyển động", url: "/admin/pricing" },
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
        { title: "Sự cố & Khiếu nại", url: "/admin/incidents" },
      ],
    },
    {
      title: "Quản lý Nhân sự",
      url: "/admin/taskers",
      icon: <ShieldCheck />,
      items: [
        { title: "Danh sách đối tác", url: "/admin/taskers" },
        { title: "Xác minh hồ sơ", url: "/admin/taskers/verification" },
        { title: "Lịch làm việc", url: "/admin/taskers/schedule" },
        { title: "Bảng lương & Thu nhập", url: "/admin/taskers/payroll" },
      ],
    },
    {
      title: "Khách hàng",
      url: "/admin/users",
      icon: <Users />,
      items: [
        { title: "Danh sách khách hàng", url: "/admin/users" },
        { title: "Phân hạng Loyalty", url: "/admin/users/loyalty" },
        { title: "Gói Subscription", url: "/admin/users/plans" },
      ],
    },
  ],
  secondaryNav: [
    {
      title: "Tài chính & Hóa đơn",
      url: "/admin/finances",
      icon: <CreditCard />,
      items: [
        { title: "Yêu cầu rút tiền", url: "/admin/finances" },
        { title: "Quản lý hóa đơn", url: "/admin/finances/invoices" },
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
  ],
  settings: [
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
  ],
}
type User = { name: string; email: string; avatar: string;  }

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r border-border/40" {...props}>
      <SidebarHeader className="h-16 border-b border-border/40 justify-center">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent className="py-2 scrollbar-hide bg-sidebar transition-colors duration-300">
        <NavMain items={adminData.navMain} label="Menu Chính" />
        <NavMain items={adminData.secondaryNav} label="Vận hành & Tài chính" />
        <NavProjects projects={adminData.settings} label="Hệ thống" />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <NavUser user={adminData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
