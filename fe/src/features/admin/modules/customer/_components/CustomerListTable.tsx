"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import {
  useAdminCustomers,
  useDeleteCustomer,
  useRestoreCustomer,
  useResendTempPassword,
  adminCustomerKeys,
} from "@/features/admin/modules/customer/hooks/useAdminCustomer";
import { adminCustomerApi } from "@/features/admin/modules/customer/services/admin-customer.service";
import type { CustomerListItem } from "@/features/admin/modules/customer/types/customer.types";
import { CustomerStatusToggle } from "@/features/admin/modules/customer/_components/CustomerStatusToggle";
import { CustomerFormDialog } from "@/features/admin/modules/customer/_components/CustomerFormDialog";
import { ConfirmDialog } from "@/components/ui/base/confirm_dialog";
import {
  formatVND,
  formatDate,
  PAYMENT_METHOD_LABELS,
} from "@/features/admin/modules/customer/customer.helpers";
import {
  Eye,
  Pencil,
  ShieldAlert,
  ListFilter,
  UserCheck,
  CheckCircle2,
  PauseCircle,
  Download,
  Trash2,
  BadgeCheck,
  Wallet,
  Plus,
  RotateCcw,
  Trash,
  KeyRound,
  AlertTriangle,
} from "lucide-react";

export const CustomerListTable: React.FC = () => {
  const router = useRouter();

  type StatusFilter = "ALL" | "ACTIVE" | "BLOCKED" | "DELETED";
  const [filter, setFilter] = useState<{
    isActive: StatusFilter;
    keyword: string;
    page: number;
    limit: number;
  }>({
    isActive: "ALL",
    keyword: "",
    page: 1,
    limit: 10,
  });

  // null = closed, undefined = create mode, CustomerListItem = edit mode
  const [formCustomer, setFormCustomer] = useState<
    CustomerListItem | null | undefined
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerListItem | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<CustomerListItem[]>([]);
  const [restoreTarget, setRestoreTarget] = useState<CustomerListItem | null>(null);

  // Giá trị ô tìm kiếm hiển thị tức thời; được debounce trước khi đẩy vào filter.keyword.
  const [keywordInput, setKeywordInput] = useState("");
  // Cờ loading riêng cho thao tác xóa hàng loạt (không dùng deleteMutation.isPending).
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const queryClient = useQueryClient();
  const deleteMutation = useDeleteCustomer();
  const restoreMutation = useRestoreCustomer();
  const resendMutation = useResendTempPassword();

  // Debounce từ khóa: chỉ cập nhật filter (và reset page) sau 350ms ngừng gõ.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((prev) =>
        prev.keyword === keywordInput
          ? prev
          : { ...prev, keyword: keywordInput, page: 1 },
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const isDeletedView = filter.isActive === "DELETED";

  // Map state to API filters
  const apiActiveParam =
    filter.isActive === "ACTIVE"
      ? true
      : filter.isActive === "BLOCKED"
      ? false
      : undefined;

  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useAdminCustomers({
    keyword: filter.keyword || undefined,
    isActive: apiActiveParam,
    deleted: isDeletedView ? true : undefined,
    page: filter.page,
    limit: filter.limit,
  });

  const displayData = response?.data || [];
  const totalItems = response?.meta?.total || 0;

  const goToDetail = (id: string) => router.push(`/admin/customers/${id}`);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const handleConfirmBulkDelete = async () => {
    const targets = bulkDeleteTargets;
    if (targets.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        targets.map((c) => adminCustomerApi.deleteCustomer(c.id)),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      // Làm mới danh sách MỘT lần sau khi tất cả request hoàn tất.
      queryClient.invalidateQueries({ queryKey: adminCustomerKeys.all });
      toast.success(`Đã xóa ${ok}/${targets.length} khách hàng`);
      if (failed > 0) {
        toast.error(`${failed} khách hàng xóa không thành công.`);
      }
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteTargets([]);
    }
  };

  const handleConfirmRestore = () => {
    if (!restoreTarget) return;
    restoreMutation.mutate(restoreTarget.id, {
      onSuccess: () => setRestoreTarget(null),
    });
  };

  // Bulk actions — một số UI chỉ hiển thị, backend chưa hỗ trợ (sẽ wiring sau).
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
      onClick: (rows) => setBulkDeleteTargets(rows),
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
      key: "updatedByName",
      title: "Cập nhật bởi",
      hideOnMobile: true,
      render: (row) =>
        row.updatedBy ? (
          <span className="text-xs font-semibold text-foreground/80 truncate">
            {row.updatedByName || "Admin"}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) =>
        row.deletedAt ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
            <Trash className="w-3 h-3" />
            Đã xóa · {formatDate(row.deletedAt)}
          </span>
        ) : (
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

  // Row actions — ẩn/hiện theo trạng thái xóa của từng dòng.
  const rowActions: RowAction<CustomerListItem>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => goToDetail(row.id),
      hidden: (row) => !!row.deletedAt,
    },
    {
      type: "edit",
      label: "Chỉnh sửa",
      icon: Pencil,
      onClick: (row) => setFormCustomer(row),
      hidden: (row) => !!row.deletedAt,
    },
    {
      label: "Gửi lại mật khẩu tạm",
      icon: KeyRound,
      onClick: (row) => resendMutation.mutate(row.id),
      hidden: (row) => !!row.deletedAt,
    },
    {
      type: "delete",
      label: "Xóa",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
      hidden: (row) => !!row.deletedAt,
    },
    {
      type: "edit",
      label: "Khôi phục",
      icon: RotateCcw,
      onClick: (row) => setRestoreTarget(row),
      hidden: (row) => !row.deletedAt,
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
        <Button
          onClick={() => setFormCustomer(undefined)}
          className="rounded-full shrink-0 gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Thêm khách hàng
        </Button>
      </div>

      {isError && !isLoading && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <p className="truncate text-xs font-semibold text-rose-600 dark:text-rose-400">
              Không tải được danh sách khách hàng. Vui lòng thử lại.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="shrink-0 gap-1.5 rounded-full"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Thử lại
          </Button>
        </div>
      )}

      <BaseTableList
        columns={columns}
        data={displayData}
        rowKey="id"
        totalItems={totalItems}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter((prev) => ({ ...prev, page }))}
        onLimitChange={(limit) => setFilter((prev) => ({ ...prev, limit, page: 1 }))}
        keyword={keywordInput}
        onKeywordChange={setKeywordInput}
        placeholderSearch="Tìm theo tên, email, số điện thoại..."
        isLoading={isLoading}
        emptyTitle={
          isDeletedView ? "Không có khách hàng đã xóa" : "Không tìm thấy khách hàng"
        }
        emptyDescription={
          isDeletedView
            ? "Chưa có tài khoản khách hàng nào bị xóa."
            : "Không có khách hàng nào khớp với tìm kiếm hoặc bộ lọc của bạn."
        }
        rowActions={rowActions}
        inlineActionCount={1}
        bulkActions={isDeletedView ? undefined : bulkActions}
        filters={
          <Select
            value={filter.isActive}
            onValueChange={(val) =>
              setFilter((prev) => ({
                ...prev,
                isActive: val as StatusFilter,
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
                <SelectItem value="DELETED">
                  <div className="flex items-center gap-2">
                    <Trash className="w-4 h-4 text-muted-foreground" />
                    Đã xóa
                  </div>
                </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {formCustomer !== null && (
        <CustomerFormDialog
          // Remount on each open so the form state initializes fresh from props.
          key={formCustomer ? formCustomer.id : "create"}
          isOpen={formCustomer !== null}
          customer={formCustomer}
          onClose={() => setFormCustomer(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
        variant="destructive"
        title="Xóa khách hàng"
        confirmLabel="Xóa"
        description={
          <span>
            Bạn có chắc chắn muốn xóa khách hàng{" "}
            <strong>{deleteTarget?.fullName}</strong>? Tài khoản sẽ bị vô hiệu hóa
            và không còn xuất hiện trong danh sách.
          </span>
        }
      />

      <ConfirmDialog
        isOpen={bulkDeleteTargets.length > 0}
        onClose={() => setBulkDeleteTargets([])}
        onConfirm={handleConfirmBulkDelete}
        isPending={isBulkDeleting}
        variant="destructive"
        title="Xóa khách hàng đã chọn"
        confirmLabel={`Xóa ${bulkDeleteTargets.length} khách hàng`}
        description={
          <span>
            Bạn có chắc chắn muốn xóa{" "}
            <strong>{bulkDeleteTargets.length}</strong> khách hàng đã chọn? Các tài
            khoản sẽ bị vô hiệu hóa và không còn xuất hiện trong danh sách.
          </span>
        }
      />

      <ConfirmDialog
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleConfirmRestore}
        isPending={restoreMutation.isPending}
        title="Khôi phục khách hàng"
        confirmLabel="Khôi phục"
        description={
          <span>
            Khôi phục tài khoản của khách hàng{" "}
            <strong>{restoreTarget?.fullName}</strong>? Tài khoản sẽ hoạt động trở
            lại và xuất hiện trong danh sách.
          </span>
        }
      />
    </div>
  );
};
