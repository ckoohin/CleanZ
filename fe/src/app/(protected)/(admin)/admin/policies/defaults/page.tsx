'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  Loader2,
  Pencil,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  Users,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BaseButton } from '@/components/ui/base/base_button';
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
    <TableRow className="group">
      {/* Title */}
      <TableCell className="py-3.5">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bgColor}`}>
            <CatIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              {policy.title}
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{policy.slug}</p>
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
        <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
          <RoleIcon role={policy.role} />
          {roleLabel(policy.role)}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell className="py-3.5">
        {policy.isActive ? (
          <Badge className="text-[11px] gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
            <BadgeCheck className="w-3 h-3" />
            Hoạt động
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[11px]">Tạm ẩn</Badge>
        )}
      </TableCell>

      {/* Order */}
      <TableCell className="py-3.5 text-center">
        <span className="inline-flex w-7 h-7 rounded-full bg-muted items-center justify-center text-xs font-bold text-muted-foreground">
          {policy.sortOrder}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-3.5">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <BaseButton
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => onEdit(policy)}
          >
            <Pencil className="w-3.5 h-3.5" />
            Sửa
          </BaseButton>
          <BaseButton
            variant="destructive"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => onDelete(policy)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </BaseButton>
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
      <div className="space-y-2 pl-2">
        <Link
          href={ROUTES.ADMIN.POLICIES.BASE}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Star className="w-3.5 h-3.5" />
          Mặc định
        </div>

        <h1 className="text-3xl font-black leading-tight tracking-tight flex items-center gap-2">
          Chính sách mặc định
          <Sparkles className="w-6 h-6 text-amber-500" />
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
          Các chính sách này tự động gán cho gói dịch vụ khi nhấn{' '}
          <strong className="text-foreground">&quot;Áp dụng mặc định&quot;</strong>.
          Hiện có <strong className="text-foreground">{defaults.length}</strong> chính sách mặc định.
        </p>
      </div>

      {/* Card */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold">Chính sách mặc định</h2>
            <Badge variant="secondary" className="text-xs">{defaults.length}</Badge>
          </div>
          <Link href={ROUTES.ADMIN.POLICIES.BASE}>
            <BaseButton variant="outline" size="sm" className="gap-2">
              <ShieldAlert className="w-4 h-4" />
              Xem tất cả
            </BaseButton>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : isError ? (
          <div className="mx-5 my-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive text-center">
            Không thể tải danh sách. Vui lòng thử lại.
          </div>
        ) : defaults.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center dark:bg-amber-900/20">
              <Star className="w-7 h-7 text-amber-500" />
            </div>
            <h3 className="text-base font-semibold mb-1">Chưa có chính sách mặc định</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Đánh dấu <strong>isDefault = true</strong> khi tạo/sửa chính sách để xuất hiện ở đây.
            </p>
            <Link href={ROUTES.ADMIN.POLICIES.BASE}>
              <BaseButton variant="outline" size="sm" className="gap-2">
                <FileText className="w-4 h-4" />
                Đi đến danh sách
              </BaseButton>
            </Link>
          </div>
        ) : (
          <div>
            {Array.from(grouped.entries()).map(([cat, policies], idx) => {
              const meta = POLICY_CATEGORY_META[cat];
              const CatIcon = meta.icon;
              return (
                <div key={cat}>
                  {idx > 0 && <Separator />}
                  {/* Category group header */}
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-muted/20">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bgColor}`}>
                      <CatIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {meta.label}
                    </span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">{policies.length}</Badge>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
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
