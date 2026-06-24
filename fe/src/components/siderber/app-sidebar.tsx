"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Wrench,
  CalendarCheck,
  Users,
  BarChart3,
  Settings2,
  Sparkles,
  Ticket,
  Wallet,
  HeadphonesIcon,
  Bell,
  UserCog,
  Truck,
  ShieldAlert,
} from "lucide-react"

import { ROUTES } from "@/constants/routes"
import { NavMain } from "@/components/siderber/nav-main"
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
      url: ROUTES.ADMIN.DASHBOARD,
      icon: <LayoutDashboard />,
      items: [
        { title: "Bảng điều khiển", url: ROUTES.ADMIN.DASHBOARD },
        { title: "Hoạt động hệ thống", url: ROUTES.ADMIN.ACTIVITY },
      ],
    },
    {
      title: "Báo cáo & Phân tích",
      url: ROUTES.ADMIN.REPORTS.BASE,
      icon: <BarChart3 />,
      items: [
        { title: "Doanh thu tổng hợp", url: ROUTES.ADMIN.REPORTS.BASE },
        { title: "Hiệu suất Tasker", url: ROUTES.ADMIN.REPORTS.TASKERS },
        { title: "Xu hướng đặt dịch vụ", url: ROUTES.ADMIN.REPORTS.BOOKINGS },
      ],
    },
  ],

  // ── NHÓM 2: Nghiệp vụ chính ──────────────────────────────────────────────
  core: [
    {
      title: "Quản lý Đơn hàng",
      url: ROUTES.ADMIN.BOOKINGS,
      icon: <CalendarCheck />,
    },
    {
      title: "Quản lý Dịch vụ",
      url: ROUTES.ADMIN.SERVICES.BASE,
      icon: <Wrench />,
      items: [
        { title: "Gói dịch vụ", url: ROUTES.ADMIN.SERVICES.BASE },
        { title: "Tạo gói mới", url: ROUTES.ADMIN.SERVICES.CREATE },
        { title: "Quản lý dịch vụ con", url: ROUTES.ADMIN.SERVICES.SUB_SERVICES },
      ],
    },
    {
      title: "Quản lý Chính sách",
      url: ROUTES.ADMIN.POLICIES.BASE,
      icon: <ShieldAlert />,
      items: [
        { title: "Tất cả chính sách", url: ROUTES.ADMIN.POLICIES.BASE },
        { title: "Chính sách mặc định", url: ROUTES.ADMIN.POLICIES.DEFAULTS },
      ],
    },
    {
      title: "Khách hàng",
      url: ROUTES.ADMIN.CUSTOMERS.BASE,
      icon: <Users />,
      items: [
        { title: "Danh sách khách hàng", url: ROUTES.ADMIN.CUSTOMERS.BASE },
        { title: "Đánh giá & Phản hồi", url: ROUTES.ADMIN.CUSTOMERS.REVIEWS },
      ],
    },
  ],

  // ── NHÓM 3: Nhân sự & Vận hành ──────────────────────────────────────────
  operations: [
    {
      title: "Quản lý Tasker",
      url: ROUTES.ADMIN.TASKERS.BASE,
      icon: <UserCog />,
      items: [
        { title: "Danh sách Tasker", url: ROUTES.ADMIN.TASKERS.BASE },
        { title: "Xác minh hồ sơ", url: ROUTES.ADMIN.TASKERS.VERIFICATION },
        { title: "Lịch làm việc", url: ROUTES.ADMIN.TASKERS.SCHEDULE },
        { title: "Bảng lương", url: ROUTES.ADMIN.TASKERS.PAYROLL },
      ],
    },
    {
      title: "Theo dõi GPS",
      url: ROUTES.ADMIN.TRACKING.BASE,
      icon: <Truck />,
      items: [
        { title: "Theo dõi đơn hàng", url: ROUTES.ADMIN.TRACKING.BASE },
        { title: "Lộ trình Tasker", url: ROUTES.ADMIN.TRACKING.ROUTES },
      ],
    },
    {
      title: "Thông báo",
      url: ROUTES.ADMIN.NOTIFICATIONS,
      icon: <Bell />,
      items: [
        { title: "Broadcast & Lịch sử", url: ROUTES.ADMIN.NOTIFICATIONS },
      ],
    },
  ],

  // ── NHÓM 4: Tài chính ────────────────────────────────────────────────────
  finance: [
    {
      title: "Tài chính & Ví",
      url: ROUTES.ADMIN.FINANCES.BASE,
      icon: <Wallet />,
      items: [
        { title: "Lịch sử giao dịch", url: ROUTES.ADMIN.FINANCES.BASE },
        { title: "Yêu cầu rút tiền", url: ROUTES.ADMIN.FINANCES.WITHDRAWALS },
        { title: "Quản lý ví", url: ROUTES.ADMIN.FINANCES.WALLETS },
      ],
    },
    {
      title: "Voucher & Khuyến mãi",
      url: ROUTES.ADMIN.VOUCHERS.BASE,
      icon: <Ticket />,
      items: [
        { title: "Danh sách voucher", url: ROUTES.ADMIN.VOUCHERS.BASE },
        { title: "Tạo voucher mới", url: ROUTES.ADMIN.VOUCHERS.CREATE },
      ],
    },
  ],

  // ── NHÓM 5: Hỗ trợ & Hệ thống ───────────────────────────────────────────
  support: [
    {
      title: "Hỗ trợ khách hàng",
      url: ROUTES.ADMIN.SUPPORT_TICKETS.BASE,
      icon: <HeadphonesIcon />,
      items: [
        { title: "Hàng đợi ticket", url: ROUTES.ADMIN.SUPPORT_TICKETS.BASE },
      ],
    },
    {
      title: "Cấu hình hệ thống",
      url: ROUTES.ADMIN.SETTINGS.BASE,
      icon: <Settings2 />,
      items: [
        { title: "Cài đặt chung", url: ROUTES.ADMIN.SETTINGS.BASE },
        { title: "Ngày cao điểm", url: ROUTES.ADMIN.SETTINGS.PEAK_DAYS },
        { title: "Phân quyền & Role", url: ROUTES.ADMIN.SETTINGS.ROLES },
      ],
    },
  ],
}

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
