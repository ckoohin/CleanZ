import http from '@/lib/api/http';
import { API_ENDPOINTS } from '@/constants/api-endpoints';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PolicyRole = 'CUSTOMER' | 'TASKER' | 'ALL';
export type PolicyCategory =
  | 'LEGAL'
  | 'CLEANING_STANDARD'
  | 'INCIDENT_HANDLING'
  | 'CANCELLATION'
  | 'CUSTOMER_SUPPORT'
  | 'PAYMENT'
  | 'GENERAL';

export const POLICY_CATEGORY_META: Record<PolicyCategory, { label: string; emoji: string; color: string }> = {
  LEGAL:             { label: 'Pháp lý',            emoji: '⚖️',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  CLEANING_STANDARD: { label: 'Tiêu chuẩn dọn dẹp', emoji: '🧹',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  INCIDENT_HANDLING: { label: 'Xử lý sự cố',        emoji: '🛡️',  color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  CANCELLATION:      { label: 'Hủy & Hoàn tiền',    emoji: '🔄',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  CUSTOMER_SUPPORT:  { label: 'Hỗ trợ KH',          emoji: '🎧',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PAYMENT:           { label: 'Thanh toán',          emoji: '💳',  color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  GENERAL:           { label: 'Chung',               emoji: '📄',  color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

export interface PolicyEntity {
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

export interface CreatePolicyDto {
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

export type UpdatePolicyDto = Partial<CreatePolicyDto>;

// ─── API Calls ─────────────────────────────────────────────────────────────────

const E = API_ENDPOINTS.ADMIN_POLICIES;

export const adminPolicyService = {
  // CRUD
  getAll: (category?: PolicyCategory): Promise<PolicyEntity[]> =>
    http.get(E.BASE + (category ? `?category=${category}` : '')),

  getOne: (id: string): Promise<PolicyEntity> =>
    http.get(E.DETAIL(id)),

  create: (dto: CreatePolicyDto): Promise<PolicyEntity> =>
    http.post(E.BASE, dto),

  update: (id: string, dto: UpdatePolicyDto): Promise<PolicyEntity> =>
    http.patch(E.DETAIL(id), dto),

  remove: (id: string): Promise<{ message: string }> =>
    http.delete(E.DETAIL(id)),

  // Seed
  seed: (): Promise<{ created: number; skipped: number }> =>
    http.post(E.SEED, {}),

  // Defaults
  getDefaults: (): Promise<PolicyEntity[]> =>
    http.get(E.DEFAULTS),

  // Package assignment
  getByPackage: (pkgId: string): Promise<PolicyEntity[]> =>
    http.get(E.PACKAGE_POLICIES(pkgId)),

  assignToPackage: (pkgId: string, policyIds: string[]): Promise<PolicyEntity[]> =>
    http.post(E.ASSIGN_TO_PACKAGE(pkgId), { policyIds }),

  removeFromPackage: (pkgId: string, policyId: string): Promise<PolicyEntity[]> =>
    http.delete(E.REMOVE_FROM_PACKAGE(pkgId, policyId)),

  applyDefaults: (pkgId: string): Promise<{ message: string }> =>
    http.post(E.APPLY_DEFAULTS(pkgId), {}),
};
