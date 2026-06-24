'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
  Shield,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BaseButton } from '@/components/ui/base/base_button';
import { Separator } from '@/components/ui/separator';
import { useAdminPolicies, useSeedPolicies } from '@/features/admin/modules/policy/hooks/useAdminPolicies';
import { Policy, POLICY_CATEGORY_META } from '@/features/admin/modules/policy/types/policy.type';
import { PolicyFormModal } from './PolicyFormModal';
import { DeletePolicyDialog } from './DeletePolicyDialog';

// ─── Role map ─────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; Icon: typeof User }> = {
  CUSTOMER: { label: 'Customer', Icon: User },
  TASKER:   { label: 'Tasker',   Icon: Shield },
  ALL:      { label: 'Tất cả',   Icon: Users },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function PolicyRow({
  policy,
  onEdit,
  onDelete,
}: {
  policy: Policy;
  onEdit: (p: Policy) => void;
  onDelete: (p: Policy) => void;
}) {
  const catMeta  = POLICY_CATEGORY_META[policy.category] ?? POLICY_CATEGORY_META.GENERAL;
  const roleMeta = ROLE_META[policy.role] ?? ROLE_META.ALL;
  const CatIcon  = catMeta.icon;
  const RoleIcon = roleMeta.Icon;

  return (
    <TableRow className="group">
      {/* Title / Slug */}
      <TableCell className="align-top py-3.5">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${catMeta.bgColor}`}>
            <CatIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground leading-tight flex items-center gap-1.5">
              {policy.title}
              {policy.isDefault && (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
              )}
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{policy.slug}</p>
          </div>
        </div>
      </TableCell>

      {/* Category */}
      <TableCell className="align-top py-3.5">
        <Badge variant="secondary" className={`text-[11px] font-semibold gap-1 ${catMeta.color}`}>
          <CatIcon className="w-3 h-3" />
          {catMeta.label}
        </Badge>
      </TableCell>

      {/* Role */}
      <TableCell className="align-top py-3.5">
        <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
          <RoleIcon className="w-3 h-3" />
          {roleMeta.label}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell className="align-top py-3.5">
        {policy.isActive ? (
          <Badge className="text-[11px] gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100">
            <BadgeCheck className="w-3 h-3" />
            Hoạt động
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[11px]">Tạm ẩn</Badge>
        )}
      </TableCell>

      {/* Created */}
      <TableCell className="align-top py-3.5 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(policy.createdAt)}
      </TableCell>

      {/* Actions */}
      <TableCell className="align-top py-3.5">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/admin/policies/${policy.id}`}>
            <BaseButton variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
              <Eye className="w-3.5 h-3.5" />
              Xem
            </BaseButton>
          </Link>
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function PolicyListTable() {
  const { data, isLoading, isError } = useAdminPolicies();
  const seedMutation = useSeedPolicies();

  const [openCreate, setOpenCreate]       = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<Policy | null>(null);

  const policies = useMemo(() => data ?? [], [data]);

  // ── States ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Đang tải danh sách chính sách...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm text-destructive text-center">
        Không thể tải danh sách. Vui lòng thử lại.
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="space-y-2 pl-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" />
          Hệ thống quản trị
        </div>
        <h1 className="text-3xl font-black leading-tight tracking-tight flex items-center gap-2">
          Quản lý chính sách
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
          Thư viện chính sách hiển thị cho khách hàng, tasker và hệ thống CleanZ.
        </p>
      </div>

      {/* Card */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">Danh sách chính sách</h2>
            <Badge variant="secondary" className="text-xs">{policies.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BaseButton
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              isLoading={seedMutation.isPending}
              className="gap-2"
            >
              {!seedMutation.isPending && <Download className="w-4 h-4" />}
              Seed mặc định
            </BaseButton>
            <BaseButton
              variant="primary"
              size="sm"
              onClick={() => setOpenCreate(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm chính sách
            </BaseButton>
          </div>
        </div>

        {/* Empty state */}
        {policies.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-1">Chưa có chính sách nào</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Nhấn "Seed mặc định" để tạo bộ chính sách chuẩn, hoặc tạo mới thủ công.
            </p>
            <div className="flex justify-center gap-2">
              <BaseButton
                variant="outline"
                size="sm"
                onClick={() => seedMutation.mutate()}
                isLoading={seedMutation.isPending}
                className="gap-2"
              >
                {!seedMutation.isPending && <Download className="w-4 h-4" />}
                Seed mặc định
              </BaseButton>
              <BaseButton variant="primary" size="sm" onClick={() => setOpenCreate(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Tạo mới
              </BaseButton>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[260px]">Tiêu đề</TableHead>
                  <TableHead className="min-w-[150px]">Loại</TableHead>
                  <TableHead className="min-w-[100px]">Đối tượng</TableHead>
                  <TableHead className="min-w-[110px]">Trạng thái</TableHead>
                  <TableHead className="min-w-[100px]">Ngày tạo</TableHead>
                  <TableHead className="min-w-[150px]">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <PolicyRow
                    key={p.id}
                    policy={p}
                    onEdit={setEditingPolicy}
                    onDelete={setDeletingPolicy}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modals */}
      <PolicyFormModal open={openCreate} onClose={() => setOpenCreate(false)} />
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
    </>
  );
}