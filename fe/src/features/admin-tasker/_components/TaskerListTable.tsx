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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";
import {
  useAdminTasker,
  useApproveTasker,
  useRejectTasker,
  useRequestMoreInfoTasker,
} from "../hooks/admin-tasker.hooks";
import type { AdminTasker, AdminTaskerFilter } from "../types/admin-tasker.types";
import {
  ACCOUNT_STATUS_LABELS,
  ALL_ACCOUNT_STATUSES,
  ALL_DOC_STATUSES,
  DOC_STATUS_BADGE_STYLES,
  DOC_STATUS_LABELS,
  type AdminTaskerDocStatus,
} from "../constants";
import { TaskerStatusToggle } from "./TaskerStatusToggle";
import { TaskerDetailDrawer } from "./TaskerDetailDrawer";
import { AdminReviewModal } from "./AdminReviewModal";
import { Eye, Maximize2, CheckCircle, Info, XCircle, ListFilter, AlertTriangle } from "lucide-react";

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

  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    taskerId: string;
    type: "reject" | "request_info";
  }>({ isOpen: false, taskerId: "", type: "reject" });

  const approveMutation = useApproveTasker();
  const rejectMutation = useRejectTasker();
  const requestInfoMutation = useRequestMoreInfoTasker();

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
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
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
            <p className="font-bold text-sm text-foreground/90">
              {row.fullName || "Chưa cập nhật"}
            </p>
            <p className="text-xs text-muted-foreground">{row.phone || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "workingAddress",
      title: "Khu vực",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
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
          <span className="font-bold text-amber-500 text-sm">
            ★ {row.avgRating > 0 ? row.avgRating.toFixed(1) : "N/A"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            ({row.totalJobs} ca)
          </span>
        </div>
      ),
    },
    {
      key: "approvalStatus",
      title: "Hồ sơ",
      render: (row) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-bold uppercase rounded-md border px-2 py-0.5",
            DOC_STATUS_BADGE_STYLES[row.approvalStatus] ||
              "bg-muted text-muted-foreground"
          )}
        >
          {DOC_STATUS_LABELS[row.approvalStatus] || row.approvalStatus}
        </Badge>
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
          />
        </div>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày tham gia",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-muted-foreground">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("vi-VN")
            : "N/A"}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<AdminTasker>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setDetailId(row.id),
    },
    {
      label: "Xem 360",
      icon: Maximize2,
      onClick: (row) => router.push(`/admin/taskers/${row.id}`),
    },
    {
      type: "approve",
      label: "Duyệt hồ sơ",
      icon: CheckCircle,
      onClick: (row) => approveMutation.mutate(row.id),
      hidden: (row) => !canReview(row),
    },
    {
      label: "Yêu cầu bổ sung",
      icon: Info,
      onClick: (row) =>
        setReviewModal({ isOpen: true, taskerId: row.id, type: "request_info" }),
      hidden: (row) => !canReview(row),
    },
    {
      label: "Từ chối hồ sơ",
      icon: XCircle,
      variant: "destructive",
      onClick: (row) =>
        setReviewModal({ isOpen: true, taskerId: row.id, type: "reject" }),
      hidden: (row) => !canReview(row),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight">Quản lý đối tác (Tasker)</h1>
        <p className="text-xs text-muted-foreground">
          Tìm kiếm, lọc theo trạng thái tài khoản / hồ sơ và quản lý hoạt động của tasker.
        </p>
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
              <SelectTrigger className="h-10 flex-1 rounded-full border-border/40 bg-background text-sm font-medium shadow-none sm:w-[160px] sm:flex-none">
                <SelectValue placeholder="Trạng thái tài khoản" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-muted-foreground" />
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
              <SelectTrigger className="h-10 flex-1 rounded-full border-border/40 bg-background text-sm font-medium shadow-none sm:w-[150px] sm:flex-none">
                <SelectValue placeholder="Trạng thái hồ sơ" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
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

      {detailId && (
        <TaskerDetailDrawer
          taskerId={detailId}
          isOpen={!!detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      <AdminReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
        title={reviewModal.type === "reject" ? "Từ chối hồ sơ" : "Yêu cầu bổ sung thông tin"}
        description={
          reviewModal.type === "reject"
            ? "Vui lòng cho biết lý do bạn từ chối hồ sơ này. Tasker sẽ nhận được thông báo này."
            : "Vui lòng mô tả chi tiết những thông tin hoặc giấy tờ mà tasker cần cập nhật thêm."
        }
        isLoading={rejectMutation.isPending || requestInfoMutation.isPending}
        onConfirm={(notes) => {
          if (reviewModal.type === "reject") {
            rejectMutation.mutate(
              { id: reviewModal.taskerId, notes },
              { onSuccess: () => setReviewModal((prev) => ({ ...prev, isOpen: false })) }
            );
          } else {
            requestInfoMutation.mutate(
              { id: reviewModal.taskerId, notes },
              { onSuccess: () => setReviewModal((prev) => ({ ...prev, isOpen: false })) }
            );
          }
        }}
      />
    </div>
  );
};
