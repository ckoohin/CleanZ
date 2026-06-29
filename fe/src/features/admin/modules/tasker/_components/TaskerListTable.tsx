"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { PageHeader, StatusBadge, type BadgeTone } from "@/components/admin";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";
import {
  useAdminTasker,
  useDeleteTaskerProfile,
} from "../hooks/admin-tasker.hooks";
import type { AdminTasker, AdminTaskerFilter } from "../types/admin-tasker.types";
import {
  ACCOUNT_STATUS_LABELS,
  ALL_ACCOUNT_STATUSES,
  ALL_DOC_STATUSES,
  DOC_STATUS_LABELS,
  formatDateVN,
  type AdminTaskerDocStatus,
} from "../constants";

// Map hồ sơ status (lowercase) → semantic badge tone (design system §2).
const DOC_TONE: Record<string, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  need_info: "info",
  expired: "neutral",
};
import { TaskerStatusToggle } from "./TaskerStatusToggle";
import { TaskerEditDialog } from "./TaskerEditDialog";
import { TaskerReinstateDialog } from "./TaskerReinstateDialog";
import { ConfirmDialog } from "@/components/ui/base/confirm_dialog";
import {
  Eye,
  CheckCircle,
  ListFilter,
  AlertTriangle,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

type AccountStatusFilter = "ALL" | AdminTasker["status"];
type DocStatusFilter = "ALL" | AdminTaskerDocStatus;

const canReview = (row: AdminTasker) =>
  row.approvalStatus === TaskerStatus.PENDING ||
  row.approvalStatus === TaskerStatus.NEED_INFO;

export const TaskerListTable: React.FC = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<{
    keyword: string;
    status: AccountStatusFilter;
    docStatus: DocStatusFilter;
    page: number;
    limit: number;
  }>({ keyword: "", status: "ALL", docStatus: "ALL", page: 1, limit: 10 });

  const [editTarget, setEditTarget] = useState<AdminTasker | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTasker | null>(null);
  const [reinstateTarget, setReinstateTarget] = useState<AdminTasker | null>(null);

  const deleteMutation = useDeleteTaskerProfile();

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const listFilter: AdminTaskerFilter = {
    keyword: filter.keyword || undefined,
    status: filter.status === "ALL" ? undefined : filter.status,
    docStatus: filter.docStatus === "ALL" ? undefined : filter.docStatus,
    page: filter.page,
    limit: filter.limit,
  };

  const { data: response, isLoading } = useAdminTasker(listFilter);

  const displayData = response?.data ?? [];
  const totalItems = response?.total ?? 0;

  const columns: Column<AdminTasker>[] = [
    {
      key: "fullName",
      title: "Đối tác",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] flex items-center justify-center font-bold text-xs shrink-0">
            {row.avatarUrl ? (
              <img
                src={row.avatarUrl}
                alt={row.fullName ?? ""}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              row.fullName?.[0]?.toUpperCase() || "T"
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-[var(--c-ink)]">
              {row.fullName || "Chưa cập nhật"}
            </p>
            <p className="text-xs text-[var(--c-muted)]">{row.phone || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "workingAddress",
      title: "Khu vực",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-[var(--c-muted)] max-w-[200px] truncate block">
          {row.workingAddress || "Chưa cập nhật"}
        </span>
      ),
    },
    {
      key: "avgRating",
      title: "Hiệu suất",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center gap-1">
          <span className="font-bold text-[var(--c-primary-strong)] text-sm">
            ★ {row.avgRating > 0 ? row.avgRating.toFixed(1) : "N/A"}
          </span>
          <span className="text-[10px] text-[var(--c-muted)]">
            ({row.totalJobs} ca)
          </span>
        </div>
      ),
    },
    {
      key: "approvalStatus",
      title: "Hồ sơ",
      render: (row) => (
        <StatusBadge tone={DOC_TONE[row.approvalStatus] ?? "neutral"}>
          {DOC_STATUS_LABELS[row.approvalStatus] || row.approvalStatus}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <TaskerStatusToggle
            taskerId={row.id}
            status={row.status}
            fullName={row.fullName || "tasker"}
            presenceStatus={row.presenceStatus}
            cancelSuspendedUntil={row.cancelSuspendedUntil}
          />
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày tham gia",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-[var(--c-muted)]">
          {row.createdAt ? formatDateVN(row.createdAt) : "N/A"}
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
  ];

  const rowActions: RowAction<AdminTasker>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => router.push(`/admin/taskers/${row.id}`),
    },
    {
      type: "approve",
      label: "Xem & duyệt hồ sơ",
      icon: CheckCircle,
      // Mọi quyết định (duyệt / yêu cầu bổ sung / từ chối) đều nằm trong màn
      // review để admin xem giấy tờ trước khi quyết định.
      onClick: (row) => router.push(`/admin/taskers/verification/${row.id}`),
      hidden: (row) => !canReview(row),
    },
    {
      type: "edit",
      label: "Chỉnh sửa",
      icon: Pencil,
      onClick: (row) => setEditTarget(row),
    },
    {
      type: "delete",
      label: "Xóa hồ sơ",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
      // BE chỉ cho phép xóa hồ sơ CHƯA được duyệt.
      hidden: (row) => row.approvalStatus === TaskerStatus.APPROVED,
    },
    {
      // Chỉ hiện với tasker bị CHẤM DỨT VĨNH VIỄN — đường khôi phục sau kháng cáo
      // (unban thường chỉ áp dụng cho khóa có thời hạn SUSPENDED).
      type: "edit",
      label: "Khôi phục (kháng cáo)",
      icon: RotateCcw,
      onClick: (row) => setReinstateTarget(row),
      hidden: (row) => row.status !== "TERMINATED",
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Quản lý đối tác (Tasker)"
        description="Tìm kiếm, lọc theo trạng thái tài khoản / hồ sơ và quản lý hoạt động của tasker."
      />

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
        emptyTitle="Không tìm thấy tasker"
        emptyDescription="Không có tasker nào khớp với tìm kiếm hoặc bộ lọc của bạn."
        rowActions={rowActions}
        inlineActionCount={1}
        filters={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select
              value={filter.status}
              onValueChange={(val) =>
                setFilter((prev) => ({
                  ...prev,
                  status: val as AccountStatusFilter,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-10 flex-1 rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] text-sm font-medium shadow-none sm:w-[160px] sm:flex-none">
                <SelectValue placeholder="Trạng thái tài khoản" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-[var(--c-muted)]" />
                    Tất cả tài khoản
                  </div>
                </SelectItem>
                {ALL_ACCOUNT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ACCOUNT_STATUS_LABELS[s] || s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.docStatus}
              onValueChange={(val) =>
                setFilter((prev) => ({
                  ...prev,
                  docStatus: val as DocStatusFilter,
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-10 flex-1 rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] text-sm font-medium shadow-none sm:w-[150px] sm:flex-none">
                <SelectValue placeholder="Trạng thái hồ sơ" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[var(--c-muted)]" />
                    Tất cả hồ sơ
                  </div>
                </SelectItem>
                {ALL_DOC_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {DOC_STATUS_LABELS[s.toLowerCase()] || s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {editTarget && (
        <TaskerEditDialog
          // Remount mỗi lần mở để form khởi tạo lại từ props.
          key={editTarget.id}
          isOpen={!!editTarget}
          tasker={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
        variant="destructive"
        title="Xóa hồ sơ tasker"
        confirmLabel="Xóa hồ sơ"
        description={
          <span>
            Bạn có chắc chắn muốn xóa hồ sơ của{" "}
            <strong>{deleteTarget?.fullName || "đối tác này"}</strong>? Ứng viên
            sẽ cần nộp lại hồ sơ từ đầu.
          </span>
        }
      />

      {reinstateTarget && (
        <TaskerReinstateDialog
          key={reinstateTarget.id}
          isOpen={!!reinstateTarget}
          tasker={reinstateTarget}
          onClose={() => setReinstateTarget(null)}
        />
      )}
    </div>
  );
};
