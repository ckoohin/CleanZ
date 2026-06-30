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
  ReceiptText,
  UserRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import {
  useAdminVoucherDetail,
  useAdminVoucherStats,
} from "../hooks/useAdminVoucherDetail";
import type { VoucherUsageStatus } from "../types/voucher.type";

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

const STATUS_LABEL: Record<VoucherUsageStatus, string> = {
  ISSUED: "Đã phát hành",
  RESERVED: "Đang giữ chỗ",
  USED: "Đã sử dụng",
  RELEASED: "Đã giải phóng",
};

const STATUS_CLASS: Record<VoucherUsageStatus, string> = {
  ISSUED: "border-blue-200 bg-blue-50 text-blue-700",
  RESERVED: "border-amber-200 bg-amber-50 text-amber-700",
  USED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RELEASED: "border-slate-200 bg-slate-50 text-slate-600",
};

export function VoucherDetailView({ id }: Props) {
  const { data, isLoading, isError, error } = useAdminVoucherDetail(id);
  const { data: stats, isLoading: isStatsLoading } = useAdminVoucherStats(id);

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
              Giới hạn sử dụng
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

        {/* usage statistics */}
        <div className="rounded-2xl border bg-background p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Thống kê sử dụng voucher</h3>
            </div>
            {isStatsLoading && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang tải thống kê...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tổng phát hành
              </p>
              <p className="mt-2 text-2xl font-black">{stats?.issuedCount ?? 0}</p>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Đã dùng
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-600">
                {stats?.usedCount ?? data.usedCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Đang giữ chỗ
              </p>
              <p className="mt-2 text-2xl font-black text-amber-600">
                {stats?.reservedCount ?? data.reservedCount ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tỷ lệ chuyển đổi
              </p>
              <p className="mt-2 text-2xl font-black">
                {stats ? `${stats.conversionRate.toFixed(1)}%` : "0%"}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 lg:col-span-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <WalletCards className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Tổng tiền đã giảm
                </p>
              </div>
              <p className="mt-2 text-2xl font-black text-primary">
                {formatCurrency(stats?.totalDiscountAmount ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 lg:col-span-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CircleDollarSign className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wider">
                  Giá trị đơn có voucher
                </p>
              </div>
              <p className="mt-2 text-2xl font-black">
                {formatCurrency(stats?.totalOrderAmount ?? 0)}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border">
            <div className="border-b bg-muted/30 px-4 py-3">
              <p className="text-sm font-bold">Chi tiết lượt sử dụng</p>
              <p className="text-xs text-muted-foreground">
                Theo từng khách hàng, đơn hàng và trạng thái voucher.
              </p>
            </div>

            {!stats?.usages?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <UserRound className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm font-semibold">Chưa có lượt phát hành/sử dụng</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-muted/20 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-bold">Khách hàng</th>
                      <th className="px-4 py-3 font-bold">Trạng thái</th>
                      <th className="px-4 py-3 font-bold">Đơn hàng</th>
                      <th className="px-4 py-3 font-bold text-right">Giảm giá</th>
                      <th className="px-4 py-3 font-bold text-right">Tổng đơn</th>
                      <th className="px-4 py-3 font-bold">Thời điểm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.usages.map((usage) => (
                      <tr key={usage.id} className="hover:bg-muted/10">
                        <td className="px-4 py-3">
                          <p className="font-bold">
                            {usage.customerName ?? "Khách hàng"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {usage.customerPhone || usage.customerEmail || usage.customerId}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_CLASS[usage.status]}`}
                          >
                            {STATUS_LABEL[usage.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {usage.bookingCode ? (
                            <>
                              <p className="font-semibold">#{usage.bookingCode}</p>
                              <p className="text-xs text-muted-foreground">
                                {usage.bookingStatus ?? "—"}
                              </p>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Chưa gắn đơn</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {formatCurrency(usage.discountAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(usage.totalPrice)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <p>Phát: {formatDate(usage.issuedAt)}</p>
                          {usage.reservedAt && (
                            <p>Giữ: {formatDate(usage.reservedAt)}</p>
                          )}
                          {usage.usedAt && <p>Dùng: {formatDate(usage.usedAt)}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
