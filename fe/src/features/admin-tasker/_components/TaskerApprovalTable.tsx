"use client";

import React, { useState } from "react";
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
import {
  useAdminTasker,
  useApproveTasker,
  useRejectTasker,
  useRequestMoreInfoTasker,
} from "../hooks/admin-tasker.hooks";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";
import type { AdminTasker, AdminTaskerFilter } from "../types/admin-tasker.types";
import { TaskerDetailModal } from "./TaskerDetailModal";
import { AdminReviewModal } from "./AdminReviewModal";
import { Eye, CheckCircle, Info, XCircle, Trash2, Clock, ListFilter } from "lucide-react";
import { toast } from "sonner";

type DocFilter = TaskerStatus | "ALL";

const toDocStatusParam = (
  value: DocFilter
): AdminTaskerFilter["docStatus"] | undefined =>
  value === "ALL"
    ? undefined
    : (value.toUpperCase() as AdminTaskerFilter["docStatus"]);

const canReview = (row: AdminTasker) =>
  row.approvalStatus === TaskerStatus.PENDING ||
  row.approvalStatus === TaskerStatus.NEED_INFO;

export const TaskerApprovalTable: React.FC = () => {
  const [filter, setFilter] = useState<{
    status: DocFilter;
    keyword: string;
    page: number;
    limit: number;
  }>({ status: "ALL", keyword: "", page: 1, limit: 5 });

  const { data: response, isLoading } = useAdminTasker({
    keyword: filter.keyword || undefined,
    docStatus: toDocStatusParam(filter.status),
    page: filter.page,
    limit: filter.limit,
  });

  const approveMutation = useApproveTasker();
  const rejectMutation = useRejectTasker();
  const requestInfoMutation = useRequestMoreInfoTasker();

  const [, setSelectedTaskers] = useState<AdminTasker[]>([]);
  const [selectedTaskerId, setSelectedTaskerId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    taskerId: string;
    type: "reject" | "request_info";
  }>({ isOpen: false, taskerId: "", type: "reject" });

  const displayData = response?.data ?? [];
  const totalItems = response?.total ?? 0;

  const columns: Column<AdminTasker>[] = [
    {
      key: "fullName",
      title: "Ứng viên",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
            {row.fullName?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-semibold text-sm">{row.fullName || "Chưa cập nhật"}</p>
            <p className="text-xs text-muted-foreground">{row.phone || "N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "workingAddress",
      title: "Khu vực",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-foreground/80 max-w-[200px] truncate block">
          {row.workingAddress || "Chưa cập nhật"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày đăng ký",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "N/A"}
        </span>
      ),
    },
    {
      key: "approvalStatus",
      title: "Trạng thái",
      render: (row) => {
        const styleMap: Record<string, string> = {
          [TaskerStatus.APPROVED]: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
          [TaskerStatus.PENDING]: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
          [TaskerStatus.NEED_INFO]: "bg-blue-500/10 text-blue-700 border-blue-500/20",
          [TaskerStatus.REJECTED]: "bg-red-500/10 text-red-700 border-red-500/20",
        };
        const iconMap: Record<string, React.ReactNode> = {
          [TaskerStatus.APPROVED]: <CheckCircle className="w-3 h-3 mr-1" />,
          [TaskerStatus.PENDING]: <Clock className="w-3 h-3 mr-1" />,
          [TaskerStatus.NEED_INFO]: <Info className="w-3 h-3 mr-1" />,
          [TaskerStatus.REJECTED]: <XCircle className="w-3 h-3 mr-1" />,
        };
        const labelMap: Record<string, string> = {
          [TaskerStatus.APPROVED]: "Đã duyệt",
          [TaskerStatus.PENDING]: "Chờ duyệt",
          [TaskerStatus.NEED_INFO]: "Cần bổ sung",
          [TaskerStatus.REJECTED]: "Từ chối",
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
              styleMap[row.approvalStatus] || styleMap[TaskerStatus.PENDING]
            }`}
          >
            {iconMap[row.approvalStatus] || <Clock className="w-3 h-3 mr-1" />}
            {labelMap[row.approvalStatus] || "Chưa rõ"}
          </span>
        );
      },
    },
  ];

  const rowActions: RowAction<AdminTasker>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => setSelectedTaskerId(row.id),
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
      label: "Từ chối",
      icon: XCircle,
      variant: "destructive",
      onClick: (row) =>
        setReviewModal({ isOpen: true, taskerId: row.id, type: "reject" }),
      hidden: (row) => !canReview(row),
    },
  ];

  const bulkActions: BulkAction<AdminTasker>[] = [
    {
      label: "Duyệt tất cả đã chọn",
      icon: CheckCircle,
      onClick: (rows) => {
        const pendingRows = rows.filter(canReview);
        if (pendingRows.length === 0) {
          toast.info("Không có hồ sơ nào hợp lệ để duyệt trong danh sách chọn.");
          return;
        }
        pendingRows.forEach((row) => approveMutation.mutate(row.id));
        toast.success(`Đã gửi yêu cầu duyệt ${pendingRows.length} hồ sơ.`);
      },
      variant: "default",
    },
    {
      label: "Từ chối đã chọn",
      icon: Trash2,
      onClick: () => {
        toast.info("Tính năng từ chối hàng loạt đang phát triển.");
      },
      variant: "destructive",
    },
  ];

  return (
    <>
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
        placeholderSearch="Tìm tên, số điện thoại..."
        isLoading={isLoading || approveMutation.isPending}
        emptyTitle="Không có hồ sơ nhân viên"
        emptyDescription="Danh sách nhân viên trống hoặc không có hồ sơ nào khớp với bộ lọc của bạn."
        onSelectionChange={setSelectedTaskers}
        rowActions={rowActions}
        bulkActions={bulkActions}
        inlineActionCount={2}
        filters={
          <Select
            value={filter.status}
            onValueChange={(val) =>
              setFilter((prev) => ({ ...prev, status: val as DocFilter, page: 1 }))
            }
          >
            <SelectTrigger className="h-11 min-w-[160px] rounded-xl border-border/60 bg-background text-sm font-medium focus:ring-primary/20">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">
                <div className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4 opacity-70" /> Tất cả trạng thái
                </div>
              </SelectItem>
              <SelectItem value={TaskerStatus.PENDING}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-70" /> Chờ duyệt
                </div>
              </SelectItem>
              <SelectItem value={TaskerStatus.APPROVED}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 opacity-70" /> Đã duyệt
                </div>
              </SelectItem>
              <SelectItem value={TaskerStatus.NEED_INFO}>
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 opacity-70" /> Cần bổ sung
                </div>
              </SelectItem>
              <SelectItem value={TaskerStatus.REJECTED}>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 opacity-70" /> Từ chối
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {selectedTaskerId && (
        <TaskerDetailModal
          taskerId={selectedTaskerId}
          isOpen={!!selectedTaskerId}
          onClose={() => setSelectedTaskerId(null)}
        />
      )}

      <AdminReviewModal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal((prev) => ({ ...prev, isOpen: false }))}
        title={reviewModal.type === "reject" ? "Từ chối hồ sơ" : "Yêu cầu bổ sung thông tin"}
        description={
          reviewModal.type === "reject"
            ? "Vui lòng cho biết lý do bạn từ chối hồ sơ này. Nhân viên sẽ nhận được thông báo này."
            : "Vui lòng mô tả chi tiết những thông tin hoặc giấy tờ mà nhân viên cần cập nhật thêm."
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
    </>
  );
};