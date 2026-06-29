"use client";

import React from "react";
import {
  BadgeCheck,
  ArrowLeft,
  Pencil,
  Loader2,
  TicketPercent,
  CalendarClock,
  CircleDollarSign,
  Hash,
  Clock3,
} from "lucide-react";
import Link from "next/link";
import { useAdminVoucherDetail } from "../hooks/useAdminVoucherDetail";

type Props = {
  id: string;
};

function formatDate(dateString?: string | null) {
  if (!dateString) return "--";
  return new Date(dateString).toLocaleString("vi-VN");
}

function formatCurrency(value?: number | null) {
  if (value == null) return "--";
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

export function VoucherDetailView({ id }: Props) {
  const { data, isLoading, isError, error } = useAdminVoucherDetail(id);

  if (!id) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600">
        Không tìm thấy ID voucher trên URL.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-card px-5 py-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải chi tiết voucher...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-600 space-y-2">
        <p className="font-semibold">Không thể tải chi tiết voucher.</p>
        <p>Vui lòng thử lại.</p>

        {error && (
          <pre className="whitespace-pre-wrap text-xs text-red-700 bg-white/60 rounded-xl p-3 border overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <TicketPercent className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Thông tin voucher</h2>
            <p className="text-sm text-muted-foreground">ID: {data.id}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/vouchers"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Link>

          <Link
            href={`/admin/vouchers/${data.id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            <Pencil className="w-4 h-4" />
            Chỉnh sửa
          </Link>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* header card */}
        <div className="rounded-3xl border bg-gradient-to-br from-primary/[0.08] to-background p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <TicketPercent className="w-3.5 h-3.5" />
                Voucher CleanZ
              </div>

              <div>
                <h3 className="text-3xl font-black tracking-tight">{data.name}</h3>
                <p className="text-primary font-semibold mt-1">{data.code}</p>
              </div>

              {data.description ? (
                <p className="text-sm text-muted-foreground max-w-3xl leading-7">
                  {data.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Chưa có mô tả cho voucher này.
                </p>
              )}
            </div>

            <div>
              {data.isActive ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 text-sm font-semibold">
                  <BadgeCheck className="w-4 h-4" />
                  Đang hoạt động
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-4 py-2 text-sm font-semibold">
                  Tạm ẩn
                </span>
              )}
            </div>
          </div>
        </div>

        {/* info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-background p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Loại voucher
            </p>
            <p className="text-lg font-bold">
              {data.type === "PERCENT" ? "Phần trăm (%)" : "Số tiền cố định"}
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Giá trị giảm
            </p>
            <p className="text-lg font-bold">
              {data.type === "PERCENT"
                ? `${data.value}%`
                : formatCurrency(data.value)}
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Giảm tối đa
            </p>
            <p className="text-lg font-bold">{formatCurrency(data.maxDiscount)}</p>
          </div>

          <div className="rounded-2xl border bg-background p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Đơn tối thiểu
            </p>
            <p className="text-lg font-bold">
              {formatCurrency(data.minOrderAmount ?? 0)}
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Giới hạn lượt dùng
            </p>
            <p className="text-lg font-bold">
              {data.usageLimit ?? "Không giới hạn"}
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Đã sử dụng
            </p>
            <p className="text-lg font-bold">{data.usedCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              Đang giữ chỗ: {data.reservedCount ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Giới hạn mỗi khách
            </p>
            <p className="text-lg font-bold">
              {data.perCustomerLimit ?? "Không giới hạn"}
            </p>
          </div>

          <div className="rounded-2xl border bg-background p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Gói áp dụng
            </p>
            <p className="text-lg font-bold">
              {data.packageIds?.length ? `${data.packageIds.length} gói` : "Tất cả"}
            </p>
          </div>
        </div>

        {/* timeline / extra info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-background p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Thời gian hiệu lực</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Clock3 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Ngày bắt đầu</p>
                  <p className="text-muted-foreground">{formatDate(data.startDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock3 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Ngày kết thúc</p>
                  <p className="text-muted-foreground">{formatDate(data.endDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock3 className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Ngày tạo</p>
                  <p className="text-muted-foreground">{formatDate(data.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-background p-5">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Thông tin bổ sung</h3>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Gói dịch vụ áp dụng</p>
                <p className="font-medium break-all">
                  {data.packageIds?.length
                    ? data.packageIds.join(", ")
                    : "Tất cả gói dịch vụ"}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Khách hàng áp dụng</p>
                <p className="font-medium break-all">
                  {data.customerIds?.length
                    ? data.customerIds.join(", ")
                    : "Tất cả khách hàng"}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground">Mã voucher</p>
                <p className="font-medium">{data.code}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Trạng thái hệ thống</p>
                <p className="font-medium">{data.isActive ? "Hoạt động" : "Tạm ẩn"}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Kiểu giảm giá</p>
                <p className="font-medium">
                  {data.type === "PERCENT"
                    ? "Giảm theo phần trăm"
                    : "Giảm theo số tiền cố định"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* summary */}
        <div className="rounded-2xl border bg-background p-5">
          <div className="flex items-center gap-2 mb-3">
            <CircleDollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">Tóm tắt áp dụng voucher</h3>
          </div>

          <div className="text-sm leading-7 text-foreground/90">
            Voucher <span className="font-semibold">{data.name}</span> với mã{" "}
            <span className="font-semibold text-primary">{data.code}</span>{" "}
            hiện đang{" "}
            <span className="font-semibold">
              {data.isActive ? "được kích hoạt" : "tạm ẩn"}
            </span>
            . Voucher áp dụng theo hình thức{" "}
            <span className="font-semibold">
              {data.type === "PERCENT" ? "giảm phần trăm" : "giảm số tiền cố định"}
            </span>{" "}
            với giá trị{" "}
            <span className="font-semibold">
              {data.type === "PERCENT"
                ? `${data.value}%`
                : formatCurrency(data.value)}
            </span>
            . Đơn hàng tối thiểu yêu cầu là{" "}
            <span className="font-semibold">
              {formatCurrency(data.minOrderAmount ?? 0)}
            </span>
            , số lượt sử dụng tối đa là{" "}
            <span className="font-semibold">
              {data.usageLimit ?? "không giới hạn"}
            </span>
            , mỗi khách được dùng tối đa{" "}
            <span className="font-semibold">
              {data.perCustomerLimit ?? "không giới hạn"}
            </span>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
