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
import { toast } from "sonner";
import { PageHeader, AdminButton, StatusBadge, StatCard, FilterTabs } from "@/components/admin";
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
  Bell,
  Pencil,
  ShieldAlert,
  Users,
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

  // Bộ đếm cho stat card + tab trạng thái (mỗi query limit:1, chỉ đọc meta.total;
  // không kèm keyword → luôn là tổng thể, được react-query cache theo filter).
  const { data: allCountRes } = useAdminCustomers({ page: 1, limit: 1 });
  const { data: activeCountRes } = useAdminCustomers({ isActive: true, page: 1, limit: 1 });
  const { data: blockedCountRes } = useAdminCustomers({ isActive: false, page: 1, limit: 1 });
  const { data: deletedCountRes } = useAdminCustomers({ deleted: true, page: 1, limit: 1 });
  const counts = {
    all: allCountRes?.meta?.total ?? 0,
    active: activeCountRes?.meta?.total ?? 0,
    blocked: blockedCountRes?.meta?.total ?? 0,
    deleted: deletedCountRes?.meta?.total ?? 0,
  };

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
          <div className="w-9 h-9 rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
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
              <p className="font-bold text-sm text-[var(--c-ink)] truncate">
                {row.fullName || "Chưa cập nhật"}
              </p>
              {row.isVerified && (
                <BadgeCheck className="w-3.5 h-3.5 text-[#0E9F6E] shrink-0" />
              )}
            </div>
            <p className="text-xs text-[var(--c-muted)] truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "Số điện thoại",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-[var(--c-ink-soft)]">
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
          <span className="text-xs font-bold text-[var(--c-ink)]">
            {row.totalBookings} đơn
          </span>
          {row.totalCancelled > 0 && (
            <span className="text-[11px] font-semibold text-[#E11D48]">
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
        <span className="text-xs font-bold text-[#0E9F6E]">
          {formatVND(row.totalSpent)}
        </span>
      ),
    },
    {
      key: "defaultPaymentMethod",
      title: "Thanh toán",
      hideOnMobile: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--c-card-2)] text-[var(--c-ink-soft)] text-[11px] font-bold">
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
        <span className="text-xs font-semibold text-[var(--c-muted)]">
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
          <span className="text-xs font-semibold text-[var(--c-ink-soft)] truncate">
            {row.updatedByName || "Admin"}
          </span>
        ) : (
          <span className="text-xs text-[var(--c-muted)]">—</span>
        ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) =>
        row.deletedAt ? (
          <StatusBadge tone="danger" className="text-[11px]">
            <Trash className="w-3 h-3" />
            Đã xóa · {formatDate(row.deletedAt)}
          </StatusBadge>
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

  // Row actions — BaseTableList tự render thành menu "⋯" gọn (design system §7).
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
      // Placeholder — chức năng gửi thông báo sẽ làm sau.
      label: "Gửi thông báo",
      icon: Bell,
      onClick: (row) =>
        toast.info(
          `Gửi thông báo tới ${row.fullName || "khách hàng"}: tính năng đang được phát triển.`,
        ),
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
      label: "Xóa tài khoản",
      icon: Trash2,
      variant: "destructive",
      separatorBefore: true,
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
    <div className="space-y-5 kos-rise">
      <PageHeader
        title="Quản lý khách hàng"
        description="Theo dõi, tìm kiếm và quản lý tài khoản khách hàng CleanZ."
        actions={
          <>
            <AdminButton
              variant="secondary"
              icon={<Download className="w-4 h-4" />}
              onClick={() => toast.info("Đang xuất danh sách khách hàng…")}
            >
              Xuất Excel
            </AdminButton>
            <AdminButton
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setFormCustomer(undefined)}
            >
              Thêm khách hàng
            </AdminButton>
          </>
        }
      />

      {/* Stat cards — số liệu thật từ meta.total của từng bộ lọc */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Tổng khách hàng" value={counts.all.toLocaleString("vi-VN")} tint="#2563EB" />
        <StatCard icon={UserCheck} label="Đang hoạt động" value={counts.active.toLocaleString("vi-VN")} tint="#0E9F6E" />
        <StatCard icon={ShieldAlert} label="Đã bị khóa" value={counts.blocked.toLocaleString("vi-VN")} tint="#D97706" />
        <StatCard icon={Trash} label="Đã xóa" value={counts.deleted.toLocaleString("vi-VN")} tint="#E11D48" />
      </div>

      {isError && !isLoading && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(225,29,72,0.3)] bg-[rgba(225,29,72,0.06)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#E11D48]" />
            <p className="truncate text-xs font-semibold text-[#E11D48]">
              Không tải được danh sách khách hàng. Vui lòng thử lại.
            </p>
          </div>
          <AdminButton
            variant="secondary"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => refetch()}
            className="shrink-0"
          >
            Thử lại
          </AdminButton>
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
        bulkActions={isDeletedView ? undefined : bulkActions}
        filters={
          <FilterTabs
            tabs={[
              { key: "ALL", label: "Tất cả", count: counts.all },
              { key: "ACTIVE", label: "Hoạt động", count: counts.active },
              { key: "BLOCKED", label: "Đã khóa", count: counts.blocked },
              { key: "DELETED", label: "Đã xóa", count: counts.deleted },
            ]}
            value={filter.isActive}
            onChange={(val) =>
              setFilter((prev) => ({ ...prev, isActive: val as StatusFilter, page: 1 }))
            }
          />
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
