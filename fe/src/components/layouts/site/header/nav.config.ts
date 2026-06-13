import { LucideIcon, Bell, ShoppingCart, Heart } from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: number;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Về CleanZ",   href: "/about" },
  { label: "Danh mục",    href: "/categories" },
  { label: "Dịch vụ",     href: "/services" },
  { label: "Lịch đặt",    href: "/bookings" },
  { label: "Trợ giúp",    href: "/support" },
];

export const PARTNER_LINKS: NavLink[] = [
  { label: "Trở thành đối tác", href: "/become-partner" },
  { label: "Đăng ký làm nhân viên", href: "/register-tasker" },
];

export type HeaderAction = {
  type: "icon" | "button";
  icon?: LucideIcon;
  label?: string;
  href?: string;
  badge?: number;
  onClick?: () => void;
};

export const HEADER_ACTIONS: HeaderAction[] = [
  { type: "icon", icon: Heart,        badge: 3  },
  { type: "icon", icon: Bell,         badge: 5  },
  { type: "icon", icon: ShoppingCart, badge: 0  },
];
