"use client"

import * as React from "react"
import {
  Home,
  ClipboardList,
  Wallet,
  BookOpenText,
  Headphones,
  User,
  MapPin,
  LayoutGrid,
  ScrollText,
} from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"
import { CustomerSidebarBrand } from "./CustomerSidebarBrand"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// ─── Nav data ──────────────────────────────────────────────────────────────────
const serviceNav = [
  {
    title: "Trang chủ",
    url: "/customer",
    icon: <Home />,
  },
  {
    title: "Danh mục dịch vụ",
    url: "/customer/catalog",
    icon: <LayoutGrid />,
  },
  {
    title: "Hoạt động",
    url: "/customer/history",
    icon: <ClipboardList />,
  },
  {
    title: "Ví CleanZ",
    url: "/customer/wallet",
    icon: <Wallet />,
  },
  {
    title: "Blog",
    url: "/customer/blogs",
    icon: <BookOpenText />,
  },
]

const accountNav = [
  {
    title: "Hồ sơ cá nhân",
    url: "/customer/profile",
    icon: <User />,
  },
  {
    title: "Sổ địa chỉ",
    url: "/customer/addresses",
    icon: <MapPin />,
  },
]

const supportNav = [
  {
    title: "Hỗ trợ",
    url: "/customer/support-tickets",
    icon: <Headphones />,
  },
  {
    title: "Chính sách",
    url: "/customer/policies",
    icon: <ScrollText />,
  },
]

// ─── CustomerSidebar ────────────────────────────────────────────────────────────
export function CustomerSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" className="border-r border-border/40" {...props}>
      <SidebarHeader className="h-16 border-b border-border/40 justify-center">
        <CustomerSidebarBrand />
      </SidebarHeader>

      <SidebarContent className="py-2 scrollbar-hide">
        <NavMain items={serviceNav} label="Dịch vụ" />
        <NavMain items={accountNav} label="Tài khoản" />
        <NavMain items={supportNav} label="Trợ giúp" />
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-3">
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
