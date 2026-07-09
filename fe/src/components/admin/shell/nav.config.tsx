import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Activity,
  ClipboardList,
  Sparkles,
  Tag,
  ScrollText,
  TicketPercent,
  Users,
  BadgeCheck,
  UserCog,
  ArrowLeftRight,
  WalletCards,
  Banknote,
  ShieldCheck,
  TriangleAlert,
  LifeBuoy,
  Newspaper,
  Bell,
  Settings,
  Star,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export type NavLeaf = { title: string; href: string };

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Optional live count badge — left undefined until wired to a real counter hook. */
  badge?: number;
  badgeUrgent?: boolean;
  children?: NavLeaf[];
};

export type NavGroup = { label: string; items: NavItem[] };

const A = ROUTES.ADMIN;

/** Single source of truth for the admin sidebar / breadcrumb. Routes come from @/constants/routes. */
export const navGroups: NavGroup[] = [
  {
    label: "Tổng quan",
    items: [
      { title: "Bảng điều khiển", href: A.DASHBOARD, icon: LayoutDashboard },
      { title: "Hoạt động hệ thống", href: A.ACTIVITY, icon: Activity },
    ],
  },
  {
    label: "Nghiệp vụ",
    items: [
      { title: "Đơn hàng", href: A.BOOKINGS, icon: ClipboardList },
      {
        title: "Dịch vụ",
        href: A.SERVICES.SERVICE_PACKAGES.BASE,
        icon: Sparkles,
        children: [
          { title: "Gói dịch vụ", href: A.SERVICES.SERVICE_PACKAGES.BASE },
          { title: "Tạo gói mới", href: A.SERVICES.SERVICE_PACKAGES.CREATE },
          { title: "Báo cáo thống kê", href: A.SERVICES.SERVICE_PACKAGES.REPORTS },
          // { title: "Dịch vụ con", href: A.SERVICES.SUB_SERVICES.BASE },
        ],
      },
      // { title: "Bảng giá", href: A.PRICING, icon: Tag },
      {
        title: "Chính sách",
        href: A.POLICIES.BASE,
        icon: ScrollText,
        children: [{ title: "Chính sách mặc định", href: A.POLICIES.DEFAULTS }],
      },
    ],
  },
  {
    label: "Người dùng",
    items: [
      { title: "Khách hàng", href: A.CUSTOMERS.BASE, icon: Users },
      {
        title: "Tasker",
        href: A.TASKERS.BASE,
        icon: BadgeCheck,
        children: [{ title: "Xác minh KYC", href: A.TASKERS.VERIFICATION }],
      },
      { title: "Tài khoản hệ thống", href: A.USERS, icon: UserCog },
    ],
  },
  {
    label: "Tài chính",
    items: [
      { title: "Giao dịch", href: A.FINANCES.BASE, icon: ArrowLeftRight },
      { title: "Quản lý ví", href: A.FINANCES.WALLETS, icon: WalletCards },
      { title: "Rút tiền", href: A.FINANCES.WITHDRAWALS, icon: Banknote },
      { title: "Rút tiền (Khách)", href: A.FINANCES.CUSTOMER_WITHDRAWALS, icon: Banknote },
      { title: "Đối soát bồi thường", href: A.FINANCES.RECONCILIATION, icon: ShieldCheck },
      {
        title: "Voucher",
        href: A.VOUCHERS.BASE,
        icon: TicketPercent,
        children: [
          { title: "Danh sách voucher", href: A.VOUCHERS.BASE },
          { title: "Tạo voucher mới", href: A.VOUCHERS.CREATE },
        ],
      },
    ],
  },
  {
    label: "Chăm sóc & Vận hành",
    items: [
      { title: "Sự cố", href: A.INCIDENTS, icon: TriangleAlert },
      { title: "Hỗ trợ khách hàng", href: A.SUPPORT_TICKETS.BASE, icon: LifeBuoy },
      { title: "Blog", href: A.BLOGS.BASE, icon: Newspaper },
      { title: "Đánh giá", href: A.REVIEWS, icon: Star },
      { title: "Thông báo", href: A.NOTIFICATIONS, icon: Bell },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      {
        title: "Cấu hình",
        href: A.SETTINGS.BASE,
        icon: Settings,
        children: [{ title: "Ngày cao điểm", href: A.SETTINGS.PEAK_DAYS }],
      },
    ],
  },
];

/** Is this nav item the active one for the given pathname? */
export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === pathname) return true;
  if (item.children?.some((c) => c.href === pathname)) return true;
  if (item.href !== ROUTES.ADMIN.DASHBOARD && pathname.startsWith(item.href + "/")) return true;
  return false;
}

/** Breadcrumb trail for the topbar, e.g. ["Người dùng", "Khách hàng"]. */
export function crumbsFor(pathname: string): string[] {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href === pathname) return [group.label, item.title];
      const child = item.children?.find((c) => c.href === pathname);
      if (child) return [group.label, item.title, child.title];
      if (item.href !== ROUTES.ADMIN.DASHBOARD && pathname.startsWith(item.href + "/")) {
        return [group.label, item.title];
      }
    }
  }
  return ["Tổng quan", "Bảng điều khiển"];
}

/** Best page title for a pathname (used by document-less placeholders). */
export function titleFor(pathname: string): string {
  const crumbs = crumbsFor(pathname);
  return crumbs[crumbs.length - 1] ?? "Trang";
}
