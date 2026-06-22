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
  Sparkles,
  Ticket,
  Wallet,
  ArrowDownToLine,
  HeadphonesIcon,
  MapPin,
  Bell,
  Tag,
  Activity,
  ClipboardList,
  UserCog,
  Truck,
  AlertTriangle,
  PackageCheck,
  PiggyBank,
  TrendingUp,
} from "lucide-react"

import { ROUTES } from "@/constants/routes"
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

// ─── Dữ liệu quản trị CleanZ ─────────────────────────────────────────────────
const adminData = {
  user: {
    name: "Admin Root",
    email: "admin@CleanZ.com",
    avatar: "https://i.pravatar.cc/150?u=admin",
    fullName: "Ngô Đức Admin",
  },
  teams: [
    {
      name: "CleanZ",
      logo: <Sparkles className="text-primary fill-primary/20" />,
      plan: "Quản trị hệ thống",
    },
  ],

  // ── NHÓM 1: Tổng quan ─────────────────────────────────────────────────────
  overview: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: <LayoutDashboard />,
      items: [
        { title: "Bảng điều khiển", url: "/admin" },
        { title: "Hoạt động hệ thống", url: "/admin/activity" },
      ],
    },
    {
      title: "Báo cáo & Phân tích",
      url: "/admin/reports",
      icon: <BarChart3 />,
      items: [
        { title: "Doanh thu tổng hợp", url: "/admin/reports" },
        { title: "Hiệu suất Tasker", url: "/admin/reports/taskers" },
        { title: "Xu hướng đặt dịch vụ", url: "/admin/reports/bookings" },
      ],
    },
  ],

  // ── NHÓM 2: Nghiệp vụ chính ──────────────────────────────────────────────
  core: [
    {
      title: "Quản lý Đơn hàng",
      url: "/admin/bookings",
      icon: <CalendarCheck />,
    },
    {
      title: "Quản lý Dịch vụ",
      url: "/admin/services",
      icon: <Wrench />,
      items: [
        { title: "Danh mục", url: "/admin/categories" },
        { title: "Danh sách dịch vụ", url: "/admin/services" },
        { title: "Bảng giá dịch vụ", url: "/admin/pricing" },
      ],
    },
    {
      title: "Khách hàng",
      url: "/admin/customers",
      icon: <Users />,
      items: [
        { title: "Danh sách khách hàng", url: "/admin/customers" },
        { title: "Đánh giá & Phản hồi", url: "/admin/reviews" },
      ],
    },
  ],

  // ── NHÓM 3: Nhân sự & Vận hành ──────────────────────────────────────────
  operations: [
    {
      title: "Quản lý Tasker",
      url: "/admin/taskers",
      icon: <UserCog />,
      items: [
        { title: "Danh sách Tasker", url: "/admin/taskers" },
        { title: "Xác minh hồ sơ", url: "/admin/taskers/verification" },
        { title: "Lịch làm việc", url: "/admin/taskers/schedule" },
        { title: "Bảng lương", url: "/admin/taskers/payroll" },
      ],
    },
    {
      title: "Theo dõi GPS",
      url: "/admin/tracking",
      icon: <Truck />,
      items: [
        { title: "Theo dõi đơn hàng", url: "/admin/tracking" },
        { title: "Lộ trình Tasker", url: "/admin/tracking/routes" },
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
  ],

  // ── NHÓM 4: Tài chính ────────────────────────────────────────────────────
  finance: [
    {
      title: "Tài chính & Ví",
      url: "/admin/finances",
      icon: <Wallet />,
      items: [
        { title: "Lịch sử giao dịch", url: "/admin/finances" },
        { title: "Yêu cầu rút tiền", url: "/admin/withdrawals" },
        { title: "Quản lý ví", url: "/admin/wallets" },
      ],
    },
    {
      title: "Voucher & Khuyến mãi",
      url: "/admin/vouchers",
      icon: <Ticket />,
      items: [
        { title: "Danh sách voucher", url: "/admin/vouchers" },
        { title: "Tạo voucher mới", url: "/admin/vouchers/create" },
      ],
    },
  ],

  // ── NHÓM 5: Hỗ trợ & Hệ thống ───────────────────────────────────────────
  support: [
    {
      title: "Hỗ trợ khách hàng",
      url: "/admin/support-tickets",
      icon: <HeadphonesIcon />,
      items: [
        { title: "Hàng đợi ticket", url: "/admin/support-tickets" },
      ],
    },
    {
      title: "Cấu hình hệ thống",
      url: ROUTES.ADMIN.SETTINGS.BASE,
      icon: <Settings2 />,
      items: [
        { title: "Cài đặt chung", url: ROUTES.ADMIN.SETTINGS.BASE },
        { title: "Ngày cao điểm", url: ROUTES.ADMIN.SETTINGS.PEAK_DAYS },
        { title: "Phân quyền & Role", url: "/admin/roles" },
        { title: "Nhân viên hệ thống", url: "/admin/staff" },
      ],
    },
  ],
}

type User = { name: string; email: string; avatar: string }

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r border-border/40" {...props}>
      <SidebarHeader className="h-16 border-b border-border/40 justify-center">
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent className="py-2 scrollbar-hide bg-sidebar transition-colors duration-300">
        <NavMain items={adminData.overview} label="Tổng quan" />
        <NavMain items={adminData.core} label="Nghiệp vụ chính" />
        <NavMain items={adminData.operations} label="Nhân sự & Vận hành" />
        <NavMain items={adminData.finance} label="Tài chính" />
        <NavMain items={adminData.support} label="Hỗ trợ & Hệ thống" />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <NavUser user={adminData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
