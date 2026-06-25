"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BaseTableList,
  type Column,
  type RowAction,
  type BulkAction,
} from "@/components/ui/base/base_table_list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAdminCustomers } from "@/features/admin/modules/customer/hooks/useAdminCustomer";
import type { CustomerListItem } from "@/features/admin/modules/customer/types/customer.types";
import { CustomerStatusToggle } from "@/features/admin/modules/customer/_components/CustomerStatusToggle";
import {
  Eye,
  ShieldAlert,
  ListFilter,
  UserCheck,
  CheckCircle2,
  PauseCircle,
  Download,
  Trash2,
  BadgeCheck,
  Wallet,
} from "lucide-react";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Tiền mặt",
  MOMO: "MoMo",
  ZALOPAY: "ZaloPay",
  VNPAY: "VNPay",
  VIETQR: "VietQR",
};

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "N/A";

export const CustomerListTable: React.FC = () => {
  const router = useRouter();

  const [filter, setFilter] = useState<{
    isActive: "ALL" | "ACTIVE" | "BLOCKED";
    keyword: string;
    page: number;
    limit: number;
  }>({
    isActive: "ALL",
    keyword: "",
    page: 1,
    limit: 10,
  });

  // Map state to API filters
  const apiActiveParam =
    filter.isActive === "ACTIVE"
      ? true
      : filter.isActive === "BLOCKED"
      ? false
      : undefined;

  const { data: response, isLoading } = useAdminCustomers({
    keyword: filter.keyword || undefined,
    isActive: apiActiveParam,
    page: filter.page,
    limit: filter.limit,
  });

  const displayData = response?.data || [];
  const totalItems = response?.meta?.total || 0;

  const goToDetail = (id: string) => router.push(`/admin/customers/${id}`);

  // Bulk actions — UI chỉ hiển thị, backend chưa hỗ trợ (sẽ wiring sau).
  const notImplemented = (label: string) => (rows: CustomerListItem[]) =>
    toast.info(`${label} (${rows.length} khách hàng): tính năng đang được phát triển.`);

  const bulkActions: BulkAction<CustomerListItem>[] = [
    { label: "Kích hoạt", icon: CheckCircle2, onClick: notImplemented("Kích hoạt") },
    { label: "Tạm dừng", icon: PauseCircle, onClick: notImplemented("Tạm dừng") },
    { label: "Xuất file", icon: Download, onClick: notImplemented("Xuất file") },
    {
      label: "Xóa",
      icon: Trash2,
      variant: "destructive",
      onClick: notImplemented("Xóa"),
    },
  ];

  // Columns definition
  const columns: Column<CustomerListItem>[] = [
    {
      key: "fullName",
      title: "Khách hàng",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
            {row.avatarUrl ? (
              <img
                src={row.avatarUrl}
                alt={row.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              row.fullName?.[0]?.toUpperCase() || "C"
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm text-foreground/90 truncate">
                {row.fullName || "Chưa cập nhật"}
              </p>
              {row.isVerified && (
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "Số điện thoại",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-foreground/70">
          {row.phone || "Chưa cập nhật"}
        </span>
      ),
    },
    {
      key: "totalBookings",
      title: "Đơn hàng",
      hideOnMobile: true,
      className: "w-[130px]",
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-foreground/90">
            {row.totalBookings} đơn
          </span>
          {row.totalCancelled > 0 && (
            <span className="text-[11px] font-semibold text-rose-500">
              {row.totalCancelled} đã hủy
            </span>
          )}
        </div>
      ),
    },
    {
      key: "totalSpent",
      title: "Tổng chi tiêu",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {formatVND(row.totalSpent)}
        </span>
      ),
    },
    {
      key: "defaultPaymentMethod",
      title: "Thanh toán",
      hideOnMobile: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground/70 text-[11px] font-bold">
          <Wallet className="w-3 h-3" />
          {PAYMENT_METHOD_LABELS[row.defaultPaymentMethod ?? ""] ||
            row.defaultPaymentMethod ||
            "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Tham gia",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <CustomerStatusToggle
            customerId={row.id}
            isActive={row.isActive}
            fullName={row.fullName}
          />
        </div>
      ),
    },
  ];

  // Row actions
  const rowActions: RowAction<CustomerListItem>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => goToDetail(row.id),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">Quản lý khách hàng</h1>
          <p className="text-xs text-muted-foreground">
            Tìm kiếm, lọc theo trạng thái và quản lý tài khoản khách hàng.
          </p>
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={displayData}
        rowKey="id"
        totalItems={totalItems}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setFilter((prev) => ({ ...prev, limit, page: 1 }))}
        keyword={filter.keyword}
        onKeywordChange={(keyword) => setFilter((prev) => ({ ...prev, keyword, page: 1 }))}
        placeholderSearch="Tìm theo tên, email, số điện thoại..."
        isLoading={isLoading}
        emptyTitle="Không tìm thấy khách hàng"
        emptyDescription="Không có khách hàng nào khớp với tìm kiếm hoặc bộ lọc của bạn."
        rowActions={rowActions}
        inlineActionCount={1}
        bulkActions={bulkActions}
        filters={
          <Select
            value={filter.isActive}
            onValueChange={(val) =>
              setFilter((prev) => ({
                ...prev,
                isActive: val as "ALL" | "ACTIVE" | "BLOCKED",
                page: 1,
              }))
            }
          >
            <SelectTrigger className="h-11 w-[180px] rounded-xl border border-border/50 bg-muted/30 text-[13px] font-medium shadow-none transition-colors hover:bg-muted/50 focus:ring-2 focus:ring-primary/15 focus:ring-offset-0">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-muted-foreground" />
                    Tất cả trạng thái
                  </div>
                </SelectItem>
                <SelectItem value="ACTIVE">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    Đang hoạt động
                  </div>
                </SelectItem>
                <SelectItem value="BLOCKED">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    Đã bị khóa
                  </div>
                </SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
};
