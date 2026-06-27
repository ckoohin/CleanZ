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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  ROLE_BADGE_STYLES,
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
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
            {row.avatarUrl ? (
              <img
                src={row.avatarUrl}
                alt={row.fullName}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              row.fullName?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-foreground/90">
              {row.fullName || "Chưa cập nhật"}
            </p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "Số điện thoại",
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.phone || "—"}
        </span>
      ),
    },
    {
      key: "role",
      title: "Vai trò",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <Badge
            variant="outline"
            className={cn(
              "w-fit text-[10px] font-bold uppercase rounded-md border px-2 py-0.5",
              ROLE_BADGE_STYLES[row.role] || "bg-muted text-muted-foreground"
            )}
          >
            {ROLE_LABELS[row.role] || row.role}
          </Badge>
          <span className="text-[10px] font-semibold text-muted-foreground">
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
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-bold uppercase">
            Đã xác thực
          </Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground border-none text-[10px] font-bold uppercase">
            Chưa
          </Badge>
        ),
    },
    {
      key: "createdAt",
      title: "Ngày tham gia",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-muted-foreground">
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
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold">
              <Trash className="w-3 h-3" />
              Đã xóa · {formatUserDate(row.deletedAt)}
            </span>
          );
        }
        // Không cho tự khóa/mở khóa tài khoản của chính mình — hiển thị nhãn tĩnh.
        if (currentUserId && row.id === currentUserId) {
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold",
                row.isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {row.isActive ? "Đang hoạt động" : "Đã khóa"}
            </span>
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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">Quản lý người dùng</h1>
          <p className="text-xs text-muted-foreground">
            Tìm kiếm, lọc theo vai trò/trạng thái và quản lý tài khoản.
          </p>
        </div>
        <Button
          onClick={openCreate}
          aria-label="Thêm người dùng"
          className="rounded-full gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Thêm người dùng</span>
        </Button>
      </div>

      {isError && !isLoading && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <p className="truncate text-xs font-semibold text-rose-600 dark:text-rose-400">
              Không tải được danh sách người dùng. Vui lòng thử lại.
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
              <SelectTrigger className="h-10 min-w-[150px] rounded-full border-border/40 bg-background text-sm font-medium shadow-none">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-muted-foreground" />
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
              <SelectTrigger className="h-10 min-w-[160px] rounded-full border-border/40 bg-background text-sm font-medium shadow-none">
                <SelectValue placeholder="Phương thức" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
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
              <SelectTrigger className="h-10 min-w-[150px] rounded-full border-border/40 bg-background text-sm font-medium shadow-none">
                <SelectValue placeholder="Xác thực" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
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
              <SelectTrigger className="h-10 min-w-[160px] rounded-full border-border/40 bg-background text-sm font-medium shadow-none">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                <SelectItem value="BLOCKED">Đã bị khóa</SelectItem>
                <SelectItem value="DELETED">
                  <div className="flex items-center gap-2">
                    <Trash className="w-4 h-4 text-muted-foreground" />
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
