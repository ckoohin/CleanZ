'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Pencil,
  Shield,
  ShieldAlert,
  Star,
  Trash2,
  Users,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AdminButton, StatusBadge, PageHeader } from '@/components/admin';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminPolicies } from '@/features/admin/modules/policy/hooks/useAdminPolicies';
import { Policy, POLICY_CATEGORY_META, PolicyCategory } from '@/features/admin/modules/policy/types/policy.type';
import { PolicyFormModal } from '@/features/admin/modules/policy/_components/PolicyFormModal';
import { DeletePolicyDialog } from '@/features/admin/modules/policy/_components/DeletePolicyDialog';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

// ─── Role helper ─────────────────────────────────────────────────────────────

const roleLabel = (role: string) =>
  role === 'CUSTOMER' ? 'Customer' : role === 'TASKER' ? 'Tasker' : 'Tất cả';

const RoleIcon = ({ role }: { role: string }) => {
  if (role === 'CUSTOMER') return <User className="w-3 h-3" />;
  if (role === 'TASKER')   return <Shield className="w-3 h-3" />;
  return <Users className="w-3 h-3" />;
};

// ─── Default Policy Row ────────────────────────────────────────────────────────

function DefaultPolicyRow({
  policy,
  onEdit,
  onDelete,
}: {
  policy: Policy;
  onEdit: (p: Policy) => void;
  onDelete: (p: Policy) => void;
}) {
  const meta = POLICY_CATEGORY_META[policy.category] ?? POLICY_CATEGORY_META.GENERAL;
  const CatIcon = meta.icon;

  return (
    <TableRow className="group border-[var(--c-line)] hover:bg-[var(--c-card-2)]">
      {/* Title */}
      <TableCell className="py-3.5">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bgColor}`}>
            <CatIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--c-ink)] flex items-center gap-1.5">
              {policy.title}
              <Star className="w-3.5 h-3.5 text-[var(--c-primary)] fill-[var(--c-primary)] shrink-0" />
            </p>
            <p className="text-xs font-mono text-[var(--c-muted)] mt-0.5">{policy.slug}</p>
          </div>
        </div>
      </TableCell>

      {/* Category */}
      <TableCell className="py-3.5">
        <Badge variant="secondary" className={cn('text-[11px] font-semibold gap-1', meta.color)}>
          <CatIcon className="w-3 h-3" />
          {meta.label}
        </Badge>
      </TableCell>

      {/* Role */}
      <TableCell className="py-3.5">
        <Badge variant="outline" className="text-[11px] gap-1 text-[var(--c-muted)] border-[var(--c-line)]">
          <RoleIcon role={policy.role} />
          {roleLabel(policy.role)}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell className="py-3.5">
        {policy.isActive ? (
          <StatusBadge tone="success" dot>Hoạt động</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Tạm ẩn</StatusBadge>
        )}
      </TableCell>

      {/* Order */}
      <TableCell className="py-3.5 text-center">
        <span className="inline-flex w-7 h-7 rounded-full bg-[var(--c-card-2)] items-center justify-center text-xs font-bold text-[var(--c-muted)]">
          {policy.sortOrder}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-3.5">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <AdminButton
            variant="secondary"
            size="sm"
            className="gap-1"
            onClick={() => onEdit(policy)}
            icon={<Pencil className="w-3.5 h-3.5" />}
          >
            Sửa
          </AdminButton>
          <AdminButton
            variant="danger"
            size="sm"
            className="px-2"
            onClick={() => onDelete(policy)}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDefaultPoliciesPage() {
  const { data = [], isLoading, isError } = useAdminPolicies();
  const defaults = useMemo(() => data.filter((p) => p.isDefault), [data]);

  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<Policy | null>(null);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<PolicyCategory, Policy[]>();
    for (const p of defaults) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return map;
  }, [defaults]);

  return (
    <main className="space-y-6">

      {/* Header */}
      <div className="space-y-3">
        <Link
          href={ROUTES.ADMIN.POLICIES.BASE}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--c-muted)] hover:text-[var(--c-ink)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>

        <PageHeader
          title={
            <span className="flex items-center gap-2">
              Chính sách mặc định
              <Star className="w-5 h-5 text-[var(--c-primary)] fill-[var(--c-primary)]" />
            </span>
          }
          description={`Các chính sách này tự động gán cho gói dịch vụ khi nhấn "Áp dụng mặc định". Hiện có ${defaults.length} chính sách mặc định.`}
          actions={
            <Link href={ROUTES.ADMIN.POLICIES.BASE}>
              <AdminButton variant="secondary" size="sm" icon={<ShieldAlert className="w-4 h-4" />}>
                Xem tất cả
              </AdminButton>
            </Link>
          }
        />
      </div>

      {/* Card */}
      <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-line)]">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-[var(--c-primary)] fill-[var(--c-primary)]" />
            <h2 className="text-base font-bold text-[var(--c-ink)]">Chính sách mặc định</h2>
            <Badge variant="secondary" className="text-xs">{defaults.length}</Badge>
          </div>
          <Link href={ROUTES.ADMIN.POLICIES.BASE}>
            <AdminButton variant="secondary" size="sm" icon={<ShieldAlert className="w-4 h-4" />}>
              Xem tất cả
            </AdminButton>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[var(--c-muted)]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : isError ? (
          <div className="mx-5 my-5 rounded-xl border border-[rgba(225,29,72,0.3)] bg-[rgba(225,29,72,0.08)] px-4 py-6 text-sm text-[#E11D48] text-center">
            Không thể tải danh sách. Vui lòng thử lại.
          </div>
        ) : defaults.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-[var(--c-primary-soft)] flex items-center justify-center">
              <Star className="w-7 h-7 text-[var(--c-primary-strong)]" />
            </div>
            <h3 className="text-base font-semibold mb-1 text-[var(--c-ink)]">Chưa có chính sách mặc định</h3>
            <p className="text-sm text-[var(--c-muted)] mb-5 max-w-xs mx-auto">
              Đánh dấu <strong>isDefault = true</strong> khi tạo/sửa chính sách để xuất hiện ở đây.
            </p>
            <Link href={ROUTES.ADMIN.POLICIES.BASE}>
              <AdminButton variant="secondary" size="sm" icon={<FileText className="w-4 h-4" />}>
                Đi đến danh sách
              </AdminButton>
            </Link>
          </div>
        ) : (
          <div>
            {Array.from(grouped.entries()).map(([cat, policies], idx) => {
              const meta = POLICY_CATEGORY_META[cat];
              const CatIcon = meta.icon;
              return (
                <div key={cat}>
                  {idx > 0 && <Separator className="bg-[var(--c-line)]" />}
                  {/* Category group header */}
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-[var(--c-card-2)]">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bgColor}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide text-[var(--c-muted)]">
                      {meta.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{policies.length}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-[var(--c-line)] [&>th]:text-[var(--c-muted)] [&>th]:text-xs [&>th]:font-semibold">
                        <TableHead className="min-w-[260px]">Tiêu đề</TableHead>
                        <TableHead className="min-w-[140px]">Loại</TableHead>
                        <TableHead className="min-w-[100px]">Đối tượng</TableHead>
                        <TableHead className="min-w-[110px]">Trạng thái</TableHead>
                        <TableHead className="min-w-[70px] text-center">Thứ tự</TableHead>
                        <TableHead className="min-w-[140px]">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map((p) => (
                        <DefaultPolicyRow
                          key={p.id}
                          policy={p}
                          onEdit={setEditingPolicy}
                          onDelete={setDeletingPolicy}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <PolicyFormModal
        open={Boolean(editingPolicy)}
        onClose={() => setEditingPolicy(null)}
        policy={editingPolicy}
      />
      <DeletePolicyDialog
        open={Boolean(deletingPolicy)}
        onClose={() => setDeletingPolicy(null)}
        policy={deletingPolicy}
      />
    </main>
  );
}
