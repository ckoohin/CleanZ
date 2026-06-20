"use client";

import React, { useState } from "react";
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
import { useAdminUsers, useDeleteUser, useResetUserPassword } from "../hooks/useAdminUser";
import type { AdminUser, UserQueryFilter, UserRole } from "../types/user.types";
import { ALL_ROLES, ROLE_BADGE_STYLES, ROLE_LABELS } from "../constants";
import { UserStatusToggle } from "./UserStatusToggle";
import { UserDetailDrawer } from "./UserDetailDrawer";
import { UserFormDialog } from "./UserFormDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { Eye, Pencil, KeyRound, Trash2, UserPlus, ListFilter } from "lucide-react";

type StatusFilter = "ALL" | "ACTIVE" | "BLOCKED";
type RoleFilter = "ALL" | UserRole;

export const UserListTable: React.FC = () => {
  const [filter, setFilter] = useState<{
    keyword: string;
    role: RoleFilter;
    status: StatusFilter;
    page: number;
    limit: number;
  }>({ keyword: "", role: "ALL", status: "ALL", page: 1, limit: 10 });

  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);

  const deleteMutation = useDeleteUser();
  const resetMutation = useResetUserPassword();

  const apiActiveParam =
    filter.status === "ACTIVE" ? true : filter.status === "BLOCKED" ? false : undefined;
  const apiRoleParam: UserRole | undefined = filter.role === "ALL" ? undefined : filter.role;

  const listFilter: UserQueryFilter = {
    keyword: filter.keyword || undefined,
    role: apiRoleParam,
    isActive: apiActiveParam,
    page: filter.page,
    limit: filter.limit,
  };

  const { data: response, isLoading } = useAdminUsers(listFilter);

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
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-bold uppercase rounded-md border px-2 py-0.5",
            ROLE_BADGE_STYLES[row.role] || "bg-muted text-muted-foreground"
          )}
        >
          {ROLE_LABELS[row.role] || row.role}
        </Badge>
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
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <UserStatusToggle userId={row.id} isActive={row.isActive} fullName={row.fullName} />
        </div>
      ),
    },
  ];

  const rowActions: RowAction<AdminUser>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setDetailId(row.id),
    },
    {
      type: "edit",
      label: "Chỉnh sửa",
      icon: Pencil,
      onClick: (row) => openEdit(row),
    },
    {
      label: "Gửi email đặt lại mật khẩu",
      icon: KeyRound,
      onClick: (row) => setResetTarget(row),
    },
    {
      type: "delete",
      label: "Xóa người dùng",
      icon: Trash2,
      onClick: (row) => setDeleteTarget(row),
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
        placeholderSearch="Tìm theo tên hoặc email..."
        isLoading={isLoading}
        emptyTitle="Không tìm thấy người dùng"
        emptyDescription="Không có người dùng nào khớp với tìm kiếm hoặc bộ lọc của bạn."
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
