'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
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
import { AdminButton, StatusBadge, PageHeader } from '@/components/admin';
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
    <TableRow className="group border-[var(--c-line)] hover:bg-[var(--c-card-2)]">
      {/* Title / Slug */}
      <TableCell className="align-top py-3.5">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${catMeta.bgColor}`}>
            <CatIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--c-ink)] leading-tight flex items-center gap-1.5">
              {policy.title}
              {policy.isDefault && (
                <Star className="w-3.5 h-3.5 text-[var(--c-primary)] fill-[var(--c-primary)] shrink-0" />
              )}
            </p>
            <p className="text-xs font-mono text-[var(--c-muted)] mt-0.5">{policy.slug}</p>
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
        <Badge variant="outline" className="text-[11px] gap-1 text-[var(--c-muted)] border-[var(--c-line)]">
          <RoleIcon className="w-3 h-3" />
          {roleMeta.label}
        </Badge>
      </TableCell>

      {/* Status */}
      <TableCell className="align-top py-3.5">
        {policy.isActive ? (
          <StatusBadge tone="success" dot>Hoạt động</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Tạm ẩn</StatusBadge>
        )}
      </TableCell>

      {/* Created */}
      <TableCell className="align-top py-3.5 text-xs text-[var(--c-muted)] whitespace-nowrap">
        {formatDate(policy.createdAt)}
      </TableCell>

      {/* Actions */}
      <TableCell className="align-top py-3.5">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/admin/policies/${policy.id}`}>
            <AdminButton variant="secondary" size="sm" className="gap-1" icon={<Eye className="w-3.5 h-3.5" />}>
              Xem
            </AdminButton>
          </Link>
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
      <div className="flex items-center justify-center py-20 text-[var(--c-muted)] gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Đang tải danh sách chính sách...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-[rgba(225,29,72,0.3)] bg-[rgba(225,29,72,0.08)] px-4 py-6 text-sm text-[#E11D48] text-center">
        Không thể tải danh sách. Vui lòng thử lại.
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <PageHeader
        title="Quản lý chính sách"
        description="Thư viện chính sách hiển thị cho khách hàng, tasker và hệ thống CleanZ."
      />

      {/* Card */}
      <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl shadow-sm overflow-hidden">

        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-line)]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--c-primary-strong)]" />
            <h2 className="text-base font-bold text-[var(--c-ink)]">Danh sách chính sách</h2>
            <Badge variant="secondary" className="text-xs">{policies.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              icon={seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            >
              Seed mặc định
            </AdminButton>
            <AdminButton
              variant="primary"
              size="sm"
              onClick={() => setOpenCreate(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Thêm chính sách
            </AdminButton>
          </div>
        </div>

        {/* Empty state */}
        {policies.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-[var(--c-primary-soft)] flex items-center justify-center">
              <FileText className="w-7 h-7 text-[var(--c-primary-strong)]" />
            </div>
            <h3 className="text-base font-semibold mb-1 text-[var(--c-ink)]">Chưa có chính sách nào</h3>
            <p className="text-sm text-[var(--c-muted)] mb-5 max-w-xs mx-auto">
              Nhấn &quot;Seed mặc định&quot; để tạo bộ chính sách chuẩn, hoặc tạo mới thủ công.
            </p>
            <div className="flex justify-center gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                icon={seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              >
                Seed mặc định
              </AdminButton>
              <AdminButton variant="primary" size="sm" onClick={() => setOpenCreate(true)} icon={<Plus className="w-4 h-4" />}>
                Tạo mới
              </AdminButton>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[var(--c-line)] [&>th]:text-[var(--c-muted)] [&>th]:text-xs [&>th]:font-semibold">
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