"use client";

import React, { useEffect, useState } from "react";
import {
  Eye,
  ListFilter,
  Pencil,
  Plus,
  RotateCcw,
  TicketPercent,
  Trash2,
} from "lucide-react";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminButton, PageHeader, StatusBadge } from "@/components/admin";
import { useAdminVouchers } from "../hooks/useAdminVouchers";
import { DeleteVoucherDialog } from "./DeleteVoucherDialog";
import { Voucher, VoucherListQuery, VoucherType } from "../types/voucher.type";

function formatDate(dateString?: string | null) {
  if (!dateString) return "Không giới hạn";
  return new Date(dateString).toLocaleString("vi-VN");
}

function formatCurrency(value?: number | null) {
  if (value == null) return "--";
  return `${new Intl.NumberFormat("vi-VN").format(Number(value))}đ`;
}

function getVoucherStatus(voucher: Voucher) {
  if (!voucher.isActive) return { label: "Tạm tắt", tone: "neutral" as const };

  const now = Date.now();
  const start = voucher.startDate ? new Date(voucher.startDate).getTime() : null;
  const end = voucher.endDate ? new Date(voucher.endDate).getTime() : null;

  if (start && start > now) return { label: "Sắp diễn ra", tone: "warning" as const };
  if (end && end < now) return { label: "Hết hạn", tone: "danger" as const };
  return { label: "Đang hoạt động", tone: "success" as const };
}

export function VoucherListTable() {
  const [query, setQuery] = useState<VoucherListQuery>({
    page: 1,
    limit: 10,
    search: "",
    type: "",
    isActive: "",
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((prev) =>
        prev.search === keywordInput
          ? prev
          : { ...prev, search: keywordInput.trim(), page: 1 },
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const { data, isLoading, isError, refetch } = useAdminVouchers(query);
  const vouchers = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns: Column<Voucher>[] = [
    {
      key: "name",
      title: "Voucher",
      render: (voucher) => (
        <div className="space-y-1">
          <p className="text-sm font-bold text-[var(--c-ink)]">{voucher.name}</p>
          <p className="font-mono text-xs font-bold text-[var(--c-primary)]">
            {voucher.code}
          </p>
          {voucher.description ? (
            <p className="line-clamp-2 max-w-[280px] text-xs text-[var(--c-muted)]">
              {voucher.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "type",
      title: "Giảm giá",
      render: (voucher) => (
        <div className="space-y-1">
          <StatusBadge tone={voucher.type === "PERCENT" ? "info" : "purple"}>
            {voucher.type === "PERCENT" ? "Theo %" : "Số tiền"}
          </StatusBadge>
          <p className="text-sm font-bold text-[var(--c-ink)]">
            {voucher.type === "PERCENT"
              ? `${voucher.value}%`
              : formatCurrency(voucher.value)}
          </p>
          <p className="text-xs text-[var(--c-muted)]">
            Tối đa: {formatCurrency(voucher.maxDiscount)}
          </p>
        </div>
      ),
    },
    {
      key: "usedCount",
      title: "Đã sử dụng",
      hideOnMobile: true,
      render: (voucher) => {
        const used = voucher.usedCount ?? 0;
        const reserved = voucher.reservedCount ?? 0;
        const limit = voucher.usageLimit;
        const pct = limit && limit > 0 ? Math.min((used / limit) * 100, 100) : null;
        return (
          <div className="space-y-1.5 min-w-[100px]">
            <p className="text-sm font-bold text-[var(--c-ink)]">
              {used.toLocaleString("vi-VN")}
              {limit ? (
                <span className="text-xs font-medium text-[var(--c-muted)]">
                  {" "}/ {limit.toLocaleString("vi-VN")}
                </span>
              ) : (
                <span className="text-xs font-medium text-[var(--c-muted)]"> / ∞</span>
              )}
            </p>
            {reserved > 0 && (
              <p className="text-xs text-amber-600 font-medium">
                +{reserved} đang giữ chỗ
              </p>
            )}
            {pct !== null && (
              <div className="h-1.5 w-full rounded-full bg-[var(--c-line)]">
                <div
                  className="h-1.5 rounded-full bg-[var(--c-primary)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "limits",
      title: "Giới hạn",
      hideOnMobile: true,
      render: (voucher) => (
        <div className="space-y-1 text-xs font-medium text-[var(--c-ink-soft)]">
          <p>Đơn tối thiểu: {formatCurrency(voucher.minOrderAmount ?? 0)}</p>
          <p>Cá nhân: {voucher.perCustomerLimit ?? "Không giới hạn"}</p>
        </div>
      ),
    },
    {
      key: "packageIds",
      title: "Phạm vi",
      hideOnMobile: true,
      render: (voucher) => (
        <div className="space-y-1 text-xs font-medium text-[var(--c-ink-soft)]">
          <p>
            Gói áp dụng:{" "}
            <span className="font-semibold text-[var(--c-ink)]">
              {voucher.packageIds?.length ? `${voucher.packageIds.length} gói` : "Tất cả"}
            </span>
          </p>
          <p>
            Khách hàng:{" "}
            <span className="font-semibold text-[var(--c-ink)]">
              {voucher.customerIds?.length
                ? `${voucher.customerIds.length} khách`
                : "Tất cả"}
            </span>
          </p>
        </div>
      ),
    },
    {
      key: "startDate",
      title: "Hiệu lực",
      hideOnMobile: true,
      render: (voucher) => (
        <div className="space-y-1 text-xs font-medium text-[var(--c-ink-soft)]">
          <p>Bắt đầu: {formatDate(voucher.startDate)}</p>
          <p>Kết thúc: {formatDate(voucher.endDate)}</p>
        </div>
      ),
    },
    {
      key: "isActive",
      title: "Trạng thái",
      render: (voucher) => {
        const status = getVoucherStatus(voucher);
        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
      },
    },
  ];

  const rowActions: RowAction<Voucher>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (voucher) => {
        window.location.href = `/admin/vouchers/${voucher.id}`;
      },
    },
    {
      type: "edit",
      label: "Chỉnh sửa",
      icon: Pencil,
      onClick: (voucher) => {
        window.location.href = `/admin/vouchers/${voucher.id}/edit`;
      },
    },
    {
      type: "delete",
      label: "Xóa voucher",
      icon: Trash2,
      onClick: (voucher) => setDeletingVoucher(voucher),
      separatorBefore: true,
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Quản lý voucher"
        description="Quản lý mã giảm giá, quota sử dụng, phạm vi gói dịch vụ và thời gian hiệu lực."
        actions={
          <AdminButton
            variant="primary"
            icon={<Plus className="size-4" />}
            onClick={() => {
              window.location.href = "/admin/vouchers/create";
            }}
          >
            Thêm voucher
          </AdminButton>
        }
      />

      {isError && !isLoading && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          style={{ borderColor: "rgba(225,29,72,0.3)", background: "rgba(225,29,72,0.06)" }}
        >
          <p className="truncate text-xs font-semibold" style={{ color: "#E11D48" }}>
            Không tải được danh sách voucher. Vui lòng thử lại.
          </p>
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            icon={<RotateCcw className="size-3.5" />}
          >
            Thử lại
          </AdminButton>
        </div>
      )}

      <BaseTableList
        columns={columns}
        data={vouchers}
        rowKey="id"
        totalItems={total}
        page={query.page ?? 1}
        limit={query.limit ?? 10}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setQuery((prev) => ({ ...prev, limit, page: 1 }))}
        keyword={keywordInput}
        onKeywordChange={setKeywordInput}
        placeholderSearch="Tìm theo mã hoặc tên voucher..."
        isLoading={isLoading}
        emptyIcon={TicketPercent}
        emptyTitle="Không tìm thấy voucher"
        emptyDescription="Không có voucher nào khớp với tìm kiếm hoặc bộ lọc của bạn."
        rowActions={rowActions}
        filters={
          <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto sm:w-auto">
            <Select
              value={query.type || "ALL"}
              onValueChange={(type) =>
                setQuery((prev) => ({
                  ...prev,
                  type: type === "ALL" ? "" : (type as VoucherType),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-10 w-full shrink-0 rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-sm font-medium shadow-none sm:w-[162px]">
                <ListFilter className="size-4 text-[var(--c-muted)]" />
                <SelectValue placeholder="Loại voucher" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">Tất cả loại</SelectItem>
                <SelectItem value="PERCENT">Theo phần trăm</SelectItem>
                <SelectItem value="FIXED">Theo số tiền</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={query.isActive || "ALL"}
              onValueChange={(isActive) =>
                setQuery((prev) => ({
                  ...prev,
                  isActive:
                    isActive === "ALL" ? "" : (isActive as "true" | "false"),
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-10 w-full shrink-0 rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-sm font-medium shadow-none sm:w-[185px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="true">Đang bật</SelectItem>
                <SelectItem value="false">Tạm tắt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <DeleteVoucherDialog
        open={Boolean(deletingVoucher)}
        onClose={() => setDeletingVoucher(null)}
        voucher={deletingVoucher}
      />
    </div>
  );
}
