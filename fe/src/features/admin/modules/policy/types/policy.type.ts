import type { LucideIcon } from 'lucide-react';
import {
  Scale,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  Headphones,
  CreditCard,
  FileText,
} from 'lucide-react';

export type PolicyRole = 'CUSTOMER' | 'TASKER' | 'ALL';

export type PolicyCategory =
  | 'LEGAL'
  | 'CLEANING_STANDARD'
  | 'INCIDENT_HANDLING'
  | 'CANCELLATION'
  | 'CUSTOMER_SUPPORT'
  | 'PAYMENT'
  | 'GENERAL';

export interface PolicyCategoryMeta {
  label: string;
  icon: LucideIcon;
  color: string;       // Tailwind badge colour classes
  bgColor: string;     // Tailwind icon bg classes
}

export const POLICY_CATEGORY_META: Record<PolicyCategory, PolicyCategoryMeta> = {
  LEGAL:             { label: 'Pháp lý',            icon: Scale,       color: 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40',  bgColor: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  CLEANING_STANDARD: { label: 'Tiêu chuẩn dọn dẹp', icon: Sparkles,    color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40', bgColor: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  INCIDENT_HANDLING: { label: 'Xử lý sự cố',        icon: ShieldAlert,  color: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/40',           bgColor: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
  CANCELLATION:      { label: 'Hủy & Hoàn tiền',    icon: RefreshCw,   color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40',       bgColor: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  CUSTOMER_SUPPORT:  { label: 'Hỗ trợ KH',          icon: Headphones,  color: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40',           bgColor: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  PAYMENT:           { label: 'Thanh toán',          icon: CreditCard,  color: 'text-cyan-700 bg-cyan-100 dark:text-cyan-300 dark:bg-cyan-900/40',           bgColor: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
  GENERAL:           { label: 'Chung',               icon: FileText,    color: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800',               bgColor: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export interface Policy {
  id: string;
  title: string;
  slug: string;
  content: string;
  role: PolicyRole;
  category: PolicyCategory;
  iconEmoji: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyPayload {
  title: string;
  slug: string;
  content: string;
  role?: PolicyRole;
  category?: PolicyCategory;
  iconEmoji?: string;
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdatePolicyPayload {
  title?: string;
  slug?: string;
  content?: string;
  role?: PolicyRole;
  category?: PolicyCategory;
  iconEmoji?: string;
  isDefault?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}