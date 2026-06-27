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
  Clock3,
  Hash,
  CalendarDays,
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
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
}

export function PolicyDetailView({ id }: Props) {
  const { data, isLoading, isError, error } = useAdminPolicyDetail(id);

  if (!id) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600">
        Không tìm thấy ID chính sách trên URL.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-3xl border bg-card px-5 py-16 flex items-center justify-center text-muted-foreground shadow-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải chi tiết chính sách...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600 space-y-2">
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
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                Chi tiết chính sách
              </div>

              <div>
                <h2 className="text-2xl font-black leading-tight">
                  {data.title}
                </h2>
                <p className="text-sm text-muted-foreground break-all">
                  ID: {data.id}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/policies"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold hover:bg-muted transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách
            </Link>

            <Link
              href={`/admin/policies/${data.id}/edit`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground px-4 text-sm font-semibold hover:opacity-90 transition"
            >
              <Pencil className="w-4 h-4" />
              Chỉnh sửa chính sách
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Overview */}
          <section className="rounded-3xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Thông tin chính sách</h3>
                <p className="text-sm text-muted-foreground">
                  Tổng quan về tiêu đề, slug, trạng thái và đối tượng áp dụng.
                </p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border bg-background p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Tiêu đề
                </p>
                <p className="text-lg font-bold break-words">{data.title}</p>
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
            </div>
          </section>

          {/* Policy content */}
          <section className="rounded-3xl border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Nội dung chính sách</h3>
                <p className="text-sm text-muted-foreground">
                  Nội dung chi tiết hiển thị cho người dùng trong hệ thống CleanZ.
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-2xl border bg-background p-5 whitespace-pre-wrap leading-7 text-sm min-h-[260px]">
                {data.content?.trim() ? data.content : "Chưa có nội dung"}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT */}
        <aside className="space-y-6">
          <section className="rounded-3xl border bg-card shadow-sm overflow-hidden">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-bold">Thông tin hệ thống</h3>
              <p className="text-sm text-muted-foreground">
                Dữ liệu định danh và mốc thời gian của chính sách.
              </p>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-primary">
                  <Hash className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Policy ID
                  </p>
                  <p className="text-sm font-medium break-all">{data.id}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-primary">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Ngày tạo
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(data.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-primary">
                  <Clock3 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Cập nhật lần cuối
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(data.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border bg-card shadow-sm overflow-hidden">
            <div className="border-b px-6 py-4">
              <h3 className="text-lg font-bold">Thao tác nhanh</h3>
            </div>

            <div className="p-6 flex flex-col gap-3">
              <Link
                href={`/admin/policies/${data.id}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                <Pencil className="w-4 h-4" />
                Chỉnh sửa chính sách
              </Link>

              <Link
                href="/admin/policies"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold hover:bg-muted transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại danh sách
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}