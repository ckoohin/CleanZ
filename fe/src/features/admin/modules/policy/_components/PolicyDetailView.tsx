'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CalendarDays, Edit3,
  ExternalLink, FileText, Loader2, Package,
  Shield, Users, User, Clock,
  AlertCircle, Star, Hash, RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AdminButton, StatusBadge } from '@/components/admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdminPolicyDetail } from '../hooks/useAdminPolicyDetail';
import { usePackagesByPolicy } from '../hooks/useAdminPolicies';
import { PolicyFormModal } from './PolicyFormModal';
import { POLICY_CATEGORY_META } from '../types/policy.type';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

// ─── Simple Markdown renderer ─────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-[var(--c-ink)]">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-xs bg-[var(--c-card-2)] px-1 py-0.5 rounded">{part.slice(1, -1)}</code>;
    return part;
  });
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-[var(--c-ink)]">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <h2 key={i} className="text-base font-bold mt-5 mb-2 first:mt-0 text-[var(--c-ink)]">{line.slice(3)}</h2>;
        if (line.startsWith('# '))
          return <h1 key={i} className="text-lg font-black mt-5 mb-2 first:mt-0 text-[var(--c-ink)]">{line.slice(2)}</h1>;
        if (line.startsWith('### '))
          return <h3 key={i} className="text-sm font-semibold mt-4 mb-1 text-[var(--c-ink)]">{line.slice(4)}</h3>;
        if (line.startsWith('> '))
          return <blockquote key={i} className="border-l-4 border-[var(--c-primary)]/40 pl-4 italic text-[var(--c-muted)]">{line.slice(2)}</blockquote>;
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-5 list-disc">{renderInline(line.slice(2))}</li>;
        if (/^\d+\./.test(line))
          return <li key={i} className="ml-5 list-decimal">{renderInline(line.replace(/^\d+\.\s*/, ''))}</li>;
        if (line.startsWith('|'))
          return <p key={i} className="font-mono text-xs text-[var(--c-muted)] bg-[var(--c-card-2)] rounded px-2 py-0.5">{line}</p>;
        if (!line.trim())
          return <div key={i} className="h-1.5" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const roleLabel = (r: string) =>
  r === 'CUSTOMER' ? 'Customer' : r === 'TASKER' ? 'Tasker' : 'Tất cả';

// ─── Main Component ───────────────────────────────────────────────────────────

export function PolicyDetailView({ id }: { id: string }) {
  const { data: policy, isLoading, isError } = useAdminPolicyDetail(id);
  const { data: usedPackages = [], isLoading: pkgsLoading } = usePackagesByPolicy(id);
  const [openEdit, setOpenEdit] = useState(false);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-[var(--c-muted)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Đang tải...</span>
      </div>
    );
  }

  if (isError || !policy) {
    return (
      <div className="py-20 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[rgba(225,29,72,0.12)] flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-[#E11D48]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[var(--c-ink)]">Không tìm thấy chính sách</h3>
          <p className="text-sm text-[var(--c-muted)] mt-1">
            Chính sách có thể đã bị xóa hoặc ID không hợp lệ.
          </p>
        </div>
        <Link href={ROUTES.ADMIN.POLICIES.BASE}>
          <AdminButton variant="secondary" icon={<ArrowLeft className="w-4 h-4" />}>
            Quay lại danh sách
          </AdminButton>
        </Link>
      </div>
    );
  }

  const meta = POLICY_CATEGORY_META[policy.category] ?? POLICY_CATEGORY_META.GENERAL;
  const CatIcon = meta.icon;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6 w-full">

        {/* Back + title */}
        <div className="flex items-center gap-3">
          <Link href={ROUTES.ADMIN.POLICIES.BASE}>
            <AdminButton variant="secondary" className="h-9 w-9 px-0 rounded-xl shrink-0" icon={<ArrowLeft className="w-4 h-4" />} />
          </Link>
          <div className="min-w-0">
            <p className="text-xs text-[var(--c-muted)] font-medium">Quản lý Chính sách</p>
            <h1 className="text-lg font-bold text-[var(--c-ink)] leading-tight truncate">{policy.title}</h1>
          </div>
        </div>

        {/* Hero card */}
        <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl shadow-sm p-5 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            {/* Icon + meta */}
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${meta.bgColor}`}>
                <CatIcon className="w-7 h-7" />
              </div>
              <div className="space-y-2 min-w-0">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={cn('font-semibold gap-1.5', meta.color)}>
                    <CatIcon className="w-3.5 h-3.5" />
                    {meta.label}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 text-[var(--c-muted)] border-[var(--c-line)]">
                    {policy.role === 'CUSTOMER'
                      ? <User className="w-3.5 h-3.5" />
                      : policy.role === 'TASKER'
                      ? <Shield className="w-3.5 h-3.5" />
                      : <Users className="w-3.5 h-3.5" />}
                    {roleLabel(policy.role)}
                  </Badge>
                  {policy.isDefault && (
                    <StatusBadge tone="warning">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      Mặc định
                    </StatusBadge>
                  )}
                  {policy.isActive ? (
                    <StatusBadge tone="success" dot>Hoạt động</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">Tạm ẩn</StatusBadge>
                  )}
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--c-muted)]">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    <code className="font-mono">{policy.slug}</code>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    {pkgsLoading ? '...' : usedPackages.length} gói đang dùng
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatDate(policy.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Cập nhật {formatDate(policy.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit button */}
            <AdminButton
              variant="primary"
              className="shrink-0"
              onClick={() => setOpenEdit(true)}
              icon={<Edit3 className="w-4 h-4" />}
            >
              Chỉnh sửa
            </AdminButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-[var(--c-card)] border border-[var(--c-line)] rounded-2xl shadow-sm p-5 md:p-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="h-auto p-1 bg-[var(--c-card-2)] rounded-xl gap-0.5 mb-6">
              <TabsTrigger
                value="content"
                className="rounded-lg gap-2 text-sm font-medium text-[var(--c-muted)] data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)]"
              >
                <FileText className="w-4 h-4" />
                Nội dung
              </TabsTrigger>
              <TabsTrigger
                value="usage"
                className="rounded-lg gap-2 text-sm font-medium text-[var(--c-muted)] data-[state=active]:bg-[var(--c-card)] data-[state=active]:shadow-sm data-[state=active]:text-[var(--c-primary-strong)]"
              >
                <Package className="w-4 h-4" />
                Áp dụng cho
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-0.5">
                  {usedPackages.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* ── Content tab ───────────────────────────────────────────── */}
            <TabsContent value="content" className="mt-0">
              {policy.content ? (
                <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] px-6 py-5">
                  <MarkdownContent content={policy.content} />
                </div>
              ) : (
                <div className="py-12 text-center text-[var(--c-muted)]">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có nội dung. Nhấn <strong>Chỉnh sửa</strong> để thêm.</p>
                </div>
              )}
            </TabsContent>

            {/* ── Usage tab ─────────────────────────────────────────────── */}
            <TabsContent value="usage" className="mt-0 space-y-4">
              <p className="text-sm text-[var(--c-muted)]">
                Chính sách này đang được áp dụng cho{' '}
                <strong className="text-[var(--c-ink)]">{usedPackages.length}</strong> gói dịch vụ.
              </p>

              {pkgsLoading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="w-5 h-5 animate-spin text-[var(--c-primary-strong)]" />
                </div>
              ) : usedPackages.length === 0 ? (
                <div className="py-14 text-center rounded-xl border-2 border-dashed border-[var(--c-line)] bg-[var(--c-card-2)]">
                  <Package className="w-10 h-10 mx-auto mb-3 text-[var(--c-muted)]/30" />
                  <p className="font-semibold text-sm text-[var(--c-muted)]">Chưa gói nào dùng chính sách này</p>
                  <p className="text-xs text-[var(--c-muted)]/60 mt-1 max-w-xs mx-auto">
                    Gán chính sách vào gói dịch vụ qua tab{' '}
                    <strong>Chính sách &amp; ĐK</strong> của gói tương ứng.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--c-line)] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-[var(--c-line)] [&>th]:text-[var(--c-muted)] [&>th]:text-xs [&>th]:font-semibold">
                        <TableHead className="min-w-[200px]">Tên gói dịch vụ</TableHead>
                        <TableHead className="min-w-[160px]">Mã gói dịch vụ</TableHead>
                        <TableHead className="min-w-[110px]">Trạng thái</TableHead>
                        <TableHead className="min-w-[100px] text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usedPackages.map((pkg) => (
                        <TableRow key={pkg.id} className="group border-[var(--c-line)] hover:bg-[var(--c-card-2)]">
                          <TableCell className="py-3.5 font-semibold text-sm text-[var(--c-ink)]">{pkg.name}</TableCell>
                          <TableCell className="py-3.5 text-sm text-[var(--c-muted)]">
                            {pkg.packageCode ?? '—'}
                          </TableCell>
                          <TableCell className="py-3.5">
                            {pkg.isActive ? (
                              <StatusBadge tone="success" dot>Hoạt động</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">Tạm ẩn</StatusBadge>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 text-right">
                            <Link href={`/admin/services/${pkg.id}`}>
                              <AdminButton
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                icon={<ExternalLink className="w-3.5 h-3.5" />}
                              >
                                Xem gói
                              </AdminButton>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit modal */}
      <PolicyFormModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        policy={policy}
      />
    </>
  );
}