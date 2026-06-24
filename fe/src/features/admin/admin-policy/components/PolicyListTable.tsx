"use client";

import React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useAdminPolicies } from "../hooks/useAdminPolicies";
import { Policy } from "../types/policy.type";
import { DeletePolicyDialog } from "./DeletePolicyDialog";

const roleMap: Record<string, { label: string; icon: React.ReactNode }> = {
  CUSTOMER: {
    label: "Customer",
    icon: <User className="w-3.5 h-3.5" />,
  },
  TASKER: {
    label: "Tasker",
    icon: <Shield className="w-3.5 h-3.5" />,
  },
  ALL: {
    label: "Tất cả",
    icon: <Users className="w-3.5 h-3.5" />,
  },
};

function formatDate(dateString?: string) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
}

type PolicyRowProps = {
  policy: Policy;
  onDelete: (policy: Policy) => void;
};

function PolicyRow({ policy, onDelete }: PolicyRowProps) {
  const roleInfo = roleMap[policy.role] || roleMap.ALL;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/40 transition-colors">
      <td className="px-4 py-4 font-medium text-foreground align-top">
        <div className="space-y-1">
          <p className="font-semibold">{policy.title}</p>
          <p className="text-xs text-muted-foreground break-all">{policy.slug}</p>
        </div>
      </td>

      <td className="px-4 py-4 align-top">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium bg-background">
          {roleInfo.icon}
          {roleInfo.label}
        </span>
      </td>

      <td className="px-4 py-4 align-top">
        {policy.isActive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold">
            <BadgeCheck className="w-3.5 h-3.5" />
            Đang hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
            Tạm ẩn
          </span>
        )}
      </td>

      <td className="px-4 py-4 text-sm text-muted-foreground align-top whitespace-nowrap">
        {formatDate(policy.createdAt)}
      </td>

      <td className="px-4 py-4 align-top">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/policies/${policy.id}`}
            className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <Eye className="w-3.5 h-3.5" />
            Xem chi tiết
          </Link>

          <Link
            href={`/admin/policies/${policy.id}/edit`}
            className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            <Pencil className="w-3.5 h-3.5" />
            Sửa
          </Link>

          <button
            type="button"
            onClick={() => onDelete(policy)}
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
}

export function PolicyListTable() {
  const query = useAdminPolicies();
  const { data, isLoading, isError } = query;

  const [deletingPolicy, setDeletingPolicy] = React.useState<Policy | null>(null);

  const policies = React.useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải danh sách chính sách...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
        Không thể tải danh sách chính sách. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <>
      {/* Top actions */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold">Tổng số chính sách: {policies.length}</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý danh sách policy hiển thị trong hệ thống CleanZ.
          </p>
        </div>

        <Link
          href="/admin/policies/create"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Thêm chính sách
        </Link>
      </div>

      {policies.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold">Chưa có chính sách nào</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Hiện tại hệ thống chưa có policy nào để hiển thị.
          </p>

          <Link
            href="/admin/policies/create"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Tạo policy đầu tiên
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-background">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/40 text-left">
                <tr className="border-b">
                  <th className="px-4 py-3 font-semibold">Tiêu đề / Slug</th>
                  <th className="px-4 py-3 font-semibold">Đối tượng</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-3 font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <PolicyRow
                    key={policy.id}
                    policy={policy}
                    onDelete={setDeletingPolicy}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DeletePolicyDialog
        open={Boolean(deletingPolicy)}
        onClose={() => setDeletingPolicy(null)}
        policy={deletingPolicy}
      />
    </>
  );
}