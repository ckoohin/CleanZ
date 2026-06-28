import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Activity,
  ClipboardList,
  Sparkles,
  Tag,
  ScrollText,
  Users,
  BadgeCheck,
  UserCog,
  ArrowLeftRight,
  WalletCards,
  Banknote,
  TriangleAlert,
  LifeBuoy,
  Bell,
  Settings,
} from 'lucide-react';

export type NavLeaf = { title: string; href: string };

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  badgeUrgent?: boolean;
  children?: NavLeaf[];
};

export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [
      { title: 'Bảng điều khiển', href: '/admin', icon: LayoutDashboard },
      { title: 'Hoạt động hệ thống', href: '/admin/activity', icon: Activity },
    ],
  },
  {
    label: 'Nghiệp vụ',
    items: [
      { title: 'Đơn hàng', href: '/admin/bookings', icon: ClipboardList, badge: 7, badgeUrgent: true },
      {
        title: 'Dịch vụ',
        href: '/admin/services',
        icon: Sparkles,
        children: [
          { title: 'Gói dịch vụ', href: '/admin/service-packages' },
          { title: 'Tạo gói mới', href: '/admin/services/create-package' },
          { title: 'Dịch vụ con', href: '/admin/services/sub-services' },
        ],
      },
      { title: 'Bảng giá', href: '/admin/pricing', icon: Tag },
      {
        title: 'Chính sách',
        href: '/admin/policies',
        icon: ScrollText,
        children: [{ title: 'Chính sách mặc định', href: '/admin/policies/defaults' }],
      },
    ],
  },
  {
    label: 'Người dùng',
    items: [
      { title: 'Khách hàng', href: '/admin/customers', icon: Users },
      {
        title: 'Tasker',
        href: '/admin/taskers',
        icon: BadgeCheck,
        badge: 12,
        children: [{ title: 'Xác minh KYC', href: '/admin/taskers/verification' }],
      },
      { title: 'Tài khoản hệ thống', href: '/admin/users', icon: UserCog },
    ],
  },
  {
    label: 'Tài chính',
    items: [
      { title: 'Giao dịch', href: '/admin/finances', icon: ArrowLeftRight },
      { title: 'Quản lý ví', href: '/admin/wallets', icon: WalletCards },
      { title: 'Rút tiền', href: '/admin/withdrawals', icon: Banknote, badge: 5 },
    ],
  },
  {
    label: 'Chăm sóc & Vận hành',
    items: [
      { title: 'Sự cố', href: '/admin/incidents', icon: TriangleAlert, badge: 4, badgeUrgent: true },
      { title: 'Hỗ trợ khách hàng', href: '/admin/support-tickets', icon: LifeBuoy, badge: 9 },
      { title: 'Thông báo', href: '/admin/notifications', icon: Bell },
    ],
  },
  {
    label: 'Hệ thống',
    items: [
      {
        title: 'Cấu hình',
        href: '/admin/settings',
        icon: Settings,
        children: [{ title: 'Ngày cao điểm', href: '/admin/settings/peak-days' }],
      },
    ],
  },
];
