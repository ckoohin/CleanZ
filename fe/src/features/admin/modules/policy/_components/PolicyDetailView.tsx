"use client";

import React from "react";
import {
  BadgeCheck,
  FileText,
  Loader2,
  Shield,
  User,
  Users,
  ArrowLeft,
  Pencil,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useAdminPolicyDetail } from "@/features/admin/modules/policy/hooks/useAdminPolicyDetail";

type Props = {
  id: string;
};

const roleMap: Record<string, { label: string; icon: React.ReactNode }> = {
  CUSTOMER: {
    label: "Customer",
    icon: <User className="w-4 h-4" />,
  },
  TASKER: {
    label: "Tasker",
    icon: <Shield className="w-4 h-4" />,
  },
  ALL: {
    label: "Tất cả",
    icon: <Users className="w-4 h-4" />,
  },
};

function formatDate(dateString?: string) {
  if (!dateString) return "--";
  return new Date(dateString).toLocaleString("vi-VN");
}

export function PolicyDetailView({ id }: Props) {
  const { data, isLoading, isError, error } = useAdminPolicyDetail(id);

  const renderContent = () => {
    if (!id) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600">
          Không tìm thấy ID chính sách trên URL.
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="rounded-2xl border bg-card px-5 py-16 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Đang tải chi tiết chính sách...
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600 space-y-2">
          <p className="font-semibold">Không thể tải chi tiết chính sách.</p>
          <p>Vui lòng thử lại.</p>

          {error && (
            <pre className="whitespace-pre-wrap text-xs text-red-700 bg-white/60 rounded-xl p-3 border overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          )}
        </div>
      );
    }

    const roleInfo = roleMap[data.role] || roleMap.ALL;

    return (
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* top action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Thông tin chính sách</h2>
              <p className="text-sm text-muted-foreground">
                ID: {data.id}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/policies"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </Link>

            <Link
              href={`/admin/policies/${data.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
            >
              <Pencil className="w-4 h-4" />
              Chỉnh sửa
            </Link>
          </div>
        </div>

        {/* content */}
        <div className="p-5 space-y-6">
          {/* grid info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-background p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Tiêu đề
              </p>
              <p className="text-lg font-bold">{data.title}</p>
            </div>

            <div className="rounded-2xl border bg-background p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Slug
              </p>
              <p className="text-base font-medium break-all text-primary">
                {data.slug}
              </p>
            </div>

            <div className="rounded-2xl border bg-background p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Đối tượng áp dụng
              </p>
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium bg-background">
                {roleInfo.icon}
                {roleInfo.label}
              </span>
            </div>

            <div className="rounded-2xl border bg-background p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Trạng thái
              </p>
              {data.isActive ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-sm font-semibold">
                  <BadgeCheck className="w-4 h-4" />
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 text-sm font-semibold">
                  Tạm ẩn
                </span>
              )}
            </div>

            <div className="rounded-2xl border bg-background p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Ngày tạo
              </p>
              <p className="text-sm">{formatDate(data.createdAt)}</p>
            </div>

            <div className="rounded-2xl border bg-background p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Cập nhật lần cuối
              </p>
              <p className="text-sm">{formatDate(data.updatedAt)}</p>
            </div>
          </div>

          {/* content policy */}
          <div className="rounded-2xl border bg-background p-5">
            <div className="mb-3">
              <h3 className="text-lg font-bold">Nội dung chính sách</h3>
              <p className="text-sm text-muted-foreground">
                Nội dung chi tiết hiển thị cho người dùng trong hệ thống.
              </p>
            </div>

            <div className="rounded-xl border bg-white p-4 whitespace-pre-wrap leading-7 text-sm">
              {data.content || "Chưa có nội dung"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-background py-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="space-y-2 pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldAlert size={14} /> Hệ thống quản trị
          </div>

          <h1 className="text-3xl font-black text-balance leading-tight tracking-tight flex items-center gap-2">
            Chi tiết chính sách
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </h1>

          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Xem đầy đủ nội dung, trạng thái và thông tin chi tiết của chính sách trong hệ thống CleanZ.
          </p>
        </div>

        {renderContent()}
      </div>
    </main>
  );
}