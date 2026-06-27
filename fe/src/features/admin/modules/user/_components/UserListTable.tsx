"use client";

import React, { useEffect, useState } from "react";
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
import {
  PageHeader,
  AdminButton,
  StatusBadge,
  AdminAvatar,
  type BadgeTone,
} from "@/components/admin";
import { useAuth } from "@/features/auth/hooks/auth.hooks";
import {
  useAdminUsers,
  useDeleteUser,
  useResetUserPassword,
  useRestoreUser,
} from "../hooks/useAdminUser";
import type {
  AdminAuthProvider,
  AdminUser,
  UserQueryFilter,
  UserRole,
} from "../types/user.types";
import {
  ALL_PROVIDERS,
  ALL_ROLES,
  PROVIDER_LABELS,
  ROLE_LABELS,
} from "../constants";
import { formatUserDate } from "../user.helpers";
import { UserStatusToggle } from "./UserStatusToggle";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { UserFormDialog } from "./UserFormDialog";
import { ConfirmDialog } from "@/components/ui/base/confirm_dialog";
import {
  Eye,
  Pencil,
  KeyRound,
  Trash2,
  Trash,
  UserPlus,
  ListFilter,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

type StatusFilter = "ALL" | "ACTIVE" | "BLOCKED" | "DELETED";
type RoleFilter = "ALL" | UserRole;
type ProviderFilter = "ALL" | AdminAuthProvider;
type VerifiedFilter = "ALL" | "VERIFIED" | "UNVERIFIED";

/** Vai trò → tông màu pill (ADMIN tím · CUSTOMER xanh · TASKER vàng). */
const ROLE_TONE: Record<string, BadgeTone> = {
  ADMIN: "purple",
  CUSTOMER: "info",
  TASKER: "warning",
};

export const UserListTable: React.FC = () => {
  const { data: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const [filter, setFilter] = useState<{
    keyword: string;
    role: RoleFilter;
    status: StatusFilter;
    provider: ProviderFilter;
    verified: VerifiedFilter;
    page: number;
    limit: number;
  }>({
    keyword: "",
    role: "ALL",
    status: "ALL",
    provider: "ALL",
    verified: "ALL",
    page: 1,
    limit: 10,
  });

  // Giá trị ô tìm kiếm hiển thị tức thời; được debounce trước khi đẩy vào filter.keyword.
  const [keywordInput, setKeywordInput] = useState("");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminUser | null>(null);

  const deleteMutation = useDeleteUser();
  const resetMutation = useResetUserPassword();
  const restoreMutation = useRestoreUser();

  // Debounce từ khóa: chỉ cập nhật filter (và reset page) sau 350ms ngừng gõ.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((prev) =>
        prev.keyword === keywordInput
          ? prev
          : { ...prev, keyword: keywordInput, page: 1 }
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const isDeletedView = filter.status === "DELETED";

  const apiActiveParam =
    filter.status === "ACTIVE" ? true : filter.status === "BLOCKED" ? false : undefined;
  // Ở chế độ "Đã xóa" bỏ qua bộ lọc vai trò/hoạt động cho gọn.
  const apiRoleParam: UserRole | undefined =
    isDeletedView || filter.role === "ALL" ? undefined : filter.role;
  const apiProviderParam: AdminAuthProvider | undefined =
    isDeletedView || filter.provider === "ALL" ? undefined : filter.provider;
  const apiVerifiedParam: boolean | undefined = isDeletedView
    ? undefined
    : filter.verified === "VERIFIED"
    ? true
    : filter.verified === "UNVERIFIED"
    ? false
    : undefined;

  const listFilter: UserQueryFilter = {
    keyword: filter.keyword || undefined,
    role: apiRoleParam,
    isActive: apiActiveParam,
    isVerified: apiVerifiedParam,
    provider: apiProviderParam,
    deleted: isDeletedView ? true : undefined,
    page: filter.page,
    limit: filter.limit,
  };

  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useAdminUsers(listFilter);

  const displayData = response?.data ?? [];
  const totalItems = response?.total ?? 0;

  const openCreate = () => {
    setEditUser(null);
    setFormOpen(true);
  };
  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setFormOpen(true);
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "fullName",
      title: "Người dùng",
      render: (row) => (
        <div className="flex items-center gap-3">
          <AdminAvatar
            src={row.avatarUrl}
            name={row.fullName}
            initials={row.fullName?.[0]?.toUpperCase() || "U"}
            size="md"
          />
          <div>
            <p className="font-bold text-sm text-[var(--c-ink)]">
              {row.fullName || "Chưa cập nhật"}
            </p>
            <p className="text-xs text-[var(--c-muted)]">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "Số điện thoại",
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono text-sm text-[var(--c-muted)]">
          {row.phone || "—"}
        </span>
      ),
    },
    {
      key: "role",
      title: "Vai trò",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusBadge tone={ROLE_TONE[row.role] ?? "neutral"} className="w-fit uppercase">
            {ROLE_LABELS[row.role] || row.role}
          </StatusBadge>
          <span className="text-[10px] font-semibold text-[var(--c-muted)]">
            {PROVIDER_LABELS[row.provider] || row.provider}
          </span>
        </div>
      ),
    },
    {
      key: "isVerified",
      title: "Xác thực",
      hideOnMobile: true,
      className: "text-center w-[110px]",
      render: (row) =>
        row.isVerified ? (
          <StatusBadge tone="success" className="uppercase">
            Đã xác thực
          </StatusBadge>
        ) : (
          <StatusBadge tone="neutral" className="uppercase">
            Chưa
          </StatusBadge>
        ),
    },
    {
      key: "createdAt",
      title: "Ngày tham gia",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-[var(--c-muted)]">
          {formatUserDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => {
        if (row.deletedAt) {
          return (
            <StatusBadge tone="danger">
              <Trash className="w-3 h-3" />
              Đã xóa · {formatUserDate(row.deletedAt)}
            </StatusBadge>
          );
        }
        // Không cho tự khóa/mở khóa tài khoản của chính mình — hiển thị nhãn tĩnh.
        if (currentUserId && row.id === currentUserId) {
          return (
            <StatusBadge tone={row.isActive ? "success" : "neutral"}>
              {row.isActive ? "Đang hoạt động" : "Đã khóa"}
            </StatusBadge>
          );
        }
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <UserStatusToggle userId={row.id} isActive={row.isActive} fullName={row.fullName} />
          </div>
        );
      },
    },
  ];

  const rowActions: RowAction<AdminUser>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setDetailId(row.id),
      hidden: (row) => !!row.deletedAt,
    },
    {
      type: "edit",
      label: "Chỉnh sửa",
      icon: Pencil,
      onClick: (row) => openEdit(row),
      hidden: (row) => !!row.deletedAt,
    },
    {
      label: "Gửi email đặt lại mật khẩu",
      icon: KeyRound,
      onClick: (row) => setResetTarget(row),
      hidden: (row) => !!row.deletedAt,
    },
    {
      type: "delete",
      label: "Xóa người dùng",
      icon: Trash2,
      onClick: (row) => setDeleteTarget(row),
      // Ẩn với dòng đã xóa và với tài khoản của chính admin đang đăng nhập.
      hidden: (row) => !!row.deletedAt || row.id === currentUserId,
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
      <PageHeader
        title="Quản lý người dùng"
        description="Tìm kiếm, lọc theo vai trò/trạng thái và quản lý tài khoản."
        actions={
          <AdminButton
            variant="primary"
            onClick={openCreate}
            aria-label="Thêm người dùng"
            icon={<UserPlus className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Thêm người dùng</span>
          </AdminButton>
        }
      />

      {isError && !isLoading && (
        <div
          className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3"
          style={{ borderColor: "rgba(225,29,72,0.3)", background: "rgba(225,29,72,0.06)" }}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#E11D48" }} />
            <p className="truncate text-xs font-semibold" style={{ color: "#E11D48" }}>
              Không tải được danh sách người dùng. Vui lòng thử lại.
            </p>
          </div>
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
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
        placeholderSearch="Tìm theo tên hoặc email..."
        isLoading={isLoading}
        emptyTitle={
          isDeletedView ? "Không có người dùng đã xóa" : "Không tìm thấy người dùng"
        }
        emptyDescription={
          isDeletedView
            ? "Chưa có tài khoản người dùng nào bị xóa."
            : "Không có người dùng nào khớp với tìm kiếm hoặc bộ lọc của bạn."
        }
        rowActions={rowActions}
        inlineActionCount={2}
        filters={
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={filter.role}
              onValueChange={(val) =>
                setFilter((prev) => ({ ...prev, role: val as RoleFilter, page: 1 }))
              }
            >
              <SelectTrigger className="h-10 min-w-[150px] rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] text-sm font-medium shadow-none">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-[var(--c-muted)]" />
                    Tất cả vai trò
                  </div>
                </SelectItem>
                {ALL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role] || role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.provider}
              onValueChange={(val) =>
                setFilter((prev) => ({ ...prev, provider: val as ProviderFilter, page: 1 }))
              }
            >
              <SelectTrigger className="h-10 min-w-[160px] rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] text-sm font-medium shadow-none">
                <SelectValue placeholder="Phương thức" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">Tất cả phương thức</SelectItem>
                {ALL_PROVIDERS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_LABELS[p] || p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.verified}
              onValueChange={(val) =>
                setFilter((prev) => ({ ...prev, verified: val as VerifiedFilter, page: 1 }))
              }
            >
              <SelectTrigger className="h-10 min-w-[150px] rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] text-sm font-medium shadow-none">
                <SelectValue placeholder="Xác thực" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">Tất cả xác thực</SelectItem>
                <SelectItem value="VERIFIED">Đã xác thực</SelectItem>
                <SelectItem value="UNVERIFIED">Chưa xác thực</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.status}
              onValueChange={(val) =>
                setFilter((prev) => ({ ...prev, status: val as StatusFilter, page: 1 }))
              }
            >
              <SelectTrigger className="h-10 min-w-[160px] rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] text-sm font-medium shadow-none">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="BLOCKED">Đã bị khóa</SelectItem>
                <SelectItem value="DELETED">
                  <div className="flex items-center gap-2">
                    <Trash className="w-4 h-4 text-[var(--c-muted)]" />
                    Đã xóa
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {detailId && (
        <UserDetailDrawer
          userId={detailId}
          isOpen={!!detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {formOpen && (
        <UserFormDialog
          key={editUser?.id ?? "new"}
          isOpen
          onClose={() => setFormOpen(false)}
          user={editUser}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
        title="Xóa người dùng"
        variant="destructive"
        confirmLabel="Xóa"
        isPending={deleteMutation.isPending}
        description={
          <span>
            Bạn có chắc chắn muốn xóa tài khoản của <strong>{deleteTarget?.fullName}</strong>?
            Hành động này sẽ vô hiệu hóa tài khoản (xóa mềm).
          </span>
        }
      />

      <ConfirmDialog
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() =>
          restoreTarget &&
          restoreMutation.mutate(restoreTarget.id, { onSuccess: () => setRestoreTarget(null) })
        }
        title="Khôi phục người dùng"
        confirmLabel="Khôi phục"
        isPending={restoreMutation.isPending}
        description={
          <span>
            Khôi phục tài khoản của <strong>{restoreTarget?.fullName}</strong>? Tài khoản sẽ
            hoạt động trở lại và xuất hiện trong danh sách.
          </span>
        }
      />

      <ConfirmDialog
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        onConfirm={() =>
          resetTarget &&
          resetMutation.mutate(resetTarget.id, { onSuccess: () => setResetTarget(null) })
        }
        title="Gửi email đặt lại mật khẩu"
        confirmLabel="Gửi email"
        isPending={resetMutation.isPending}
        description={
          <span>
            Gửi email đặt lại mật khẩu tới <strong>{resetTarget?.email}</strong>?
          </span>
        }
      />
    </div>
  );
};
