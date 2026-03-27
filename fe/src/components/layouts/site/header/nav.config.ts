import { LucideIcon, Bell, ShoppingCart, Heart } from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: number;
};

export const NAV_LINKS: NavLink[] = [
  { label: "Danh mục",    href: "/categories" },
  { label: "Dịch vụ",     href: "/services" },
  { label: "Lịch đặt",    href: "/bookings" },
  { label: "Trợ giúp",    href: "/support" },
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