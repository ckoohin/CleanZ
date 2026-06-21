"use client";

import * as React from "react";
import {
  Bell,
  CalendarCheck,
  FileText,
  HeadphonesIcon,
  LayoutDashboard,
  MapPinned,
  Settings2,
  ShieldCheck,
  TicketPercent,
  Users,
  UserCog,
  Wallet,
  Wrench,
} from "lucide-react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { SidebarBrand } from "@/components/sidebar/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

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
];

const businessNav = [
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
    title: "Quản lý Dịch vụ",
    url: "/admin/services",
    icon: <Wrench />,
    items: [{ title: "Danh sách dịch vụ", url: "/admin/services" }],
  },
  {
    title: "Khách hàng",
    url: "/admin/customers",
    icon: <Users />,
    items: [{ title: "Danh sách khách hàng", url: "/admin/customers" }],
  },
];

const operationsNav = [
  {
    title: "Quản lý Tasker",
    url: "/admin/taskers",
    icon: <UserCog />,
    items: [{ title: "Danh sách Tasker", url: "/admin/taskers" }],
  },
  {
    title: "Theo dõi GPS",
    url: "/admin/tracking",
    icon: <MapPinned />,
    items: [{ title: "Theo dõi vị trí", url: "/admin/tracking" }],
  },
  {
    title: "Thông báo",
    url: "/admin/notifications",
    icon: <Bell />,
    items: [{ title: "Broadcast & Lịch sử", url: "/admin/notifications" }],
  },
];

const financeNav = [
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
    icon: <TicketPercent />,
    items: [
      { title: "Danh sách voucher", url: "/admin/vouchers" },
      { title: "Tạo voucher mới", url: "/admin/vouchers/create" },
    ],
  },
];

const systemNav = [
  {
    title: "Hỗ trợ khách hàng",
    url: "/admin/support-tickets",
    icon: <HeadphonesIcon />,
    items: [{ title: "Hàng đợi ticket", url: "/admin/support-tickets" }],
  },
  {
    title: "Cấu hình hệ thống",
    url: "/admin/settings",
    icon: <Settings2 />,
    items: [
      { title: "Cài đặt chung", url: "/admin/settings" },
      { title: "Phân quyền & Role", url: "/admin/settings/roles" },
      { title: "Nhân viên hệ thống", url: "/admin/staff" },
      { title: "Quản lý chính sách", url: "/admin/policies" },
    ],
  },
];

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40"
      {...props}
    >
      <SidebarHeader className="h-16 border-b border-border/40 justify-center">
        <SidebarBrand />
      </SidebarHeader>

      <SidebarContent className="py-2 scrollbar-hide bg-sidebar transition-colors duration-300">
        <NavMain items={overviewNav} label="Tổng quan" />
        <NavMain items={businessNav} label="Nghiệp vụ chính" />
        <NavMain items={operationsNav} label="Nhân sự & vận hành" />
        <NavMain items={financeNav} label="Tài chính" />
        <NavMain items={systemNav} label="Hỗ trợ & hệ thống" />
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3">
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}