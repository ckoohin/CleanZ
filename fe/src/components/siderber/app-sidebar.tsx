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
import { NavUser } from "@/components/siderber/nav-user"
import { TeamSwitcher } from "@/components/siderber/team-switcher"
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
      isActive: true,
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
  ],
  secondaryNav: [
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r border-border/40" {...props}>
      <SidebarHeader className="h-16 border-b border-border/40 justify-center">
        <TeamSwitcher teams={adminData.teams} />
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
