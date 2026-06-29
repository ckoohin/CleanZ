"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  TicketPercent,
  Trash2,
  XCircle,
} from "lucide-react";
import { useAdminVouchers } from "../hooks/useAdminVouchers";
import { DeleteVoucherDialog } from "./DeleteVoucherDialog";
import { Voucher, VoucherListQuery, VoucherType } from "../types/voucher.type";

function formatDate(dateString?: string | null) {
  if (!dateString) return "--";
  return new Date(dateString).toLocaleString("vi-VN");
}

function formatCurrency(value?: number | null) {
  if (value == null) return "--";
  return new Intl.NumberFormat("vi-VN").format(Number(value)) + "đ";
}

function VoucherStatusBadge({ voucher }: { voucher: Voucher }) {
  if (!voucher.isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 text-xs font-semibold">
        Tạm ẩn
      </span>
    );
  }

  const now = new Date();
  const start = voucher.startDate ? new Date(voucher.startDate) : null;
  const end = voucher.endDate ? new Date(voucher.endDate) : null;

  if (start && start > now) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-semibold">
        Sắp diễn ra
      </span>
    );
  }

  if (end && end < now) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold">
        Hết hạn
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold">
      <BadgeCheck className="w-3.5 h-3.5" />
      Đang hoạt động
    </span>
  );
}

type VoucherApiResponse =
  | Voucher[]
  | {
      data?: Voucher[] | { items?: Voucher[]; total?: number; page?: number; limit?: number; totalPages?: number };
      items?: Voucher[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
      meta?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      };
      pagination?: {
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
      };
    }
  | undefined;

function normalizeVoucherResponse(raw: VoucherApiResponse) {
  // TH1: API trả thẳng mảng
  if (Array.isArray(raw)) {
    return {
      vouchers: raw,
      total: raw.length,
      page: 1,
      limit: raw.length || 10,
      totalPages: 1,
    };
  }

  if (!raw || typeof raw !== "object") {
    return {
      vouchers: [] as Voucher[],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    };
  }

  // TH2: API trả { data: [...] }
  if (Array.isArray(raw.data)) {
    const pagination = raw.pagination ?? raw.meta ?? {};
    const total = raw.total ?? pagination.total ?? raw.data.length ?? 0;
    const page = raw.page ?? pagination.page ?? 1;
    const limit = raw.limit ?? pagination.limit ?? 10;
    const totalPages =
      raw.totalPages ??
      pagination.totalPages ??
      Math.max(1, Math.ceil(total / limit));

    return {
      vouchers: raw.data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  // TH3: API trả { data: { items: [...] } }
  if (
    raw.data &&
    typeof raw.data === "object" &&
    Array.isArray((raw.data as { items?: unknown }).items)
  ) {
    const inner = raw.data as {
      items?: Voucher[];
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    };

    const total = inner.total ?? 0;
    const page = inner.page ?? 1;
    const limit = inner.limit ?? 10;
    const totalPages =
      inner.totalPages ?? Math.max(1, Math.ceil(total / limit));

    return {
      vouchers: inner.items ?? [],
      total,
      page,
      limit,
      totalPages,
    };
  }

  // TH4: API trả { items: [...] }
  if (Array.isArray(raw.items)) {
    const pagination = raw.pagination ?? raw.meta ?? {};
    const total = raw.total ?? pagination.total ?? raw.items.length ?? 0;
    const page = raw.page ?? pagination.page ?? 1;
    const limit = raw.limit ?? pagination.limit ?? 10;
    const totalPages =
      raw.totalPages ??
      pagination.totalPages ??
      Math.max(1, Math.ceil(total / limit));

    return {
      vouchers: raw.items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  return {
    vouchers: [] as Voucher[],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  };
}

export function VoucherListTable() {
  const [query, setQuery] = useState<VoucherListQuery>({
    page: 1,
    limit: 10,
    search: "",
    type: "",
    isActive: "",
  });

  const [searchInput, setSearchInput] = useState("");
  const [deletingVoucher, setDeletingVoucher] = useState<Voucher | null>(null);

  const { data, isLoading, isError } = useAdminVouchers(query);

  const normalized = useMemo(() => {
    return normalizeVoucherResponse(data as VoucherApiResponse);
  }, [data]);

  const vouchers = normalized.vouchers;
  const total = normalized.total;
  const currentPage = normalized.page;
  const totalPages = normalized.totalPages;

  const handleSearch = () => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: searchInput.trim(),
    }));
  };

  const handleReset = () => {
    setSearchInput("");
    setQuery({
      page: 1,
      limit: 10,
      search: "",
      type: "",
      isActive: "",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Đang tải danh sách voucher...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-600">
        Không thể tải danh sách voucher. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <>
      {/* Top action */}
      <div className="mb-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">Tổng số voucher: {total}</h3>
            <p className="text-sm text-muted-foreground">
              Quản lý mã giảm giá, điều kiện áp dụng và thời gian hiệu lực trong hệ thống CleanZ.
            </p>
          </div>

          <Link
            href="/admin/vouchers/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Thêm voucher
          </Link>
        </div>

        {/* Filter */}
        <div className="rounded-2xl border bg-background p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="xl:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo code hoặc tên voucher..."
                className="w-full rounded-xl border bg-background pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <select
            value={query.type ?? ""}
            onChange={(e) =>
              setQuery((prev) => ({
                ...prev,
                page: 1,
                type: e.target.value as "" | VoucherType,
              }))
            }
            className="rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tất cả loại</option>
            <option value="PERCENT">Phần trăm</option>
            <option value="FIXED">Số tiền cố định</option>
          </select>

          <select
            value={query.isActive ?? ""}
            onChange={(e) =>
              setQuery((prev) => ({
                ...prev,
                page: 1,
                isActive: e.target.value as "" | "true" | "false",
              }))
            }
            className="rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm ẩn</option>
          </select>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold hover:opacity-90"
            >
              <Search className="w-4 h-4" />
              Tìm
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-muted"
            >
              <XCircle className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* table */}
      {vouchers.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/20 py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TicketPercent className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold">Chưa có voucher nào</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Hiện tại hệ thống chưa có voucher để hiển thị.
          </p>

          <Link
            href="/admin/vouchers/create"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Tạo voucher đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border bg-background">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr className="border-b">
                    <th className="px-4 py-3 font-semibold">Voucher</th>
                    <th className="px-4 py-3 font-semibold">Loại / Giá trị</th>
                    <th className="px-4 py-3 font-semibold">Điều kiện</th>
                    <th className="px-4 py-3 font-semibold">Hiệu lực</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                    <th className="px-4 py-3 font-semibold">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((voucher) => (
                    <tr
                      key={voucher.id}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="font-semibold">{voucher.name}</p>
                          <p className="text-xs text-primary font-medium">{voucher.code}</p>
                          {voucher.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-2 max-w-[280px]">
                              {voucher.description}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {voucher.type === "PERCENT"
                              ? `${voucher.value}%`
                              : formatCurrency(voucher.value)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Loại: {voucher.type === "PERCENT" ? "Phần trăm" : "Cố định"}
                          </p>
                          {voucher.type === "PERCENT" && voucher.maxDiscount != null ? (
                            <p className="text-xs text-muted-foreground">
                              Trần giảm: {formatCurrency(voucher.maxDiscount)}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-sm">
                          <p>
                            Đơn tối thiểu:{" "}
                            <span className="font-medium">
                              {formatCurrency(voucher.minOrderAmount ?? 0)}
                            </span>
                          </p>
                          <p>
                            Giới hạn:{" "}
                            <span className="font-medium">
                              {voucher.usageLimit ?? "Không giới hạn"}
                            </span>
                          </p>
                          <p>
                            Đã dùng:{" "}
                            <span className="font-medium">{voucher.usedCount ?? 0}</span>
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-sm">
                          <p>
                            Bắt đầu:{" "}
                            <span className="font-medium">
                              {formatDate(voucher.startDate)}
                            </span>
                          </p>
                          <p>
                            Kết thúc:{" "}
                            <span className="font-medium">
                              {formatDate(voucher.endDate)}
                            </span>
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 align-top">
                        <VoucherStatusBadge voucher={voucher} />
                      </td>

                      <td className="px-4 py-4 text-sm text-muted-foreground align-top whitespace-nowrap">
                        {formatDate(voucher.createdAt)}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/vouchers/${voucher.id}`}
                            className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Xem chi tiết
                          </Link>

                          <Link
                            href={`/admin/vouchers/${voucher.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-muted"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Sửa
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeletingVoucher(voucher)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* paging */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Trang <span className="font-semibold">{currentPage}</span> /{" "}
              <span className="font-semibold">{totalPages}</span> — Tổng{" "}
              <span className="font-semibold">{total}</span> voucher
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() =>
                  setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))
                }
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Trước
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setQuery((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))
                }
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}

      <DeleteVoucherDialog
        open={Boolean(deletingVoucher)}
        onClose={() => setDeletingVoucher(null)}
        voucher={deletingVoucher}
      />
    </>
  );
}
