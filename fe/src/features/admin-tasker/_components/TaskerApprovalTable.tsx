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
import {
  useAdminTasker,
  useApproveTasker,
} from "../hooks/admin-tasker.hooks";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";
import type { AdminTasker, AdminTaskerFilter } from "../types/admin-tasker.types";
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
  const router = useRouter();

  const [, setSelectedTaskers] = useState<AdminTasker[]>([]);

  const goToDetail = (id: string) =>
    router.push(`/admin/taskers/verification/${id}`);

  const displayData = response?.data ?? [];
  const totalItems = response?.total ?? 0;

  const columns: Column<AdminTasker>[] = [
    {
      key: "fullName",
      title: "Ứng viên",
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
        <span className="text-xs font-semibold text-muted-foreground">
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
      type: "approve",
      label: "Xem & duyệt hồ sơ",
      icon: CheckCircle,
      onClick: (row) => goToDetail(row.id),
      hidden: (row) => !canReview(row),
    },
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => goToDetail(row.id),
      hidden: (row) => canReview(row),
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">Xác minh hồ sơ nhân viên</h1>
          <p className="text-xs text-muted-foreground">
            Kiểm tra, lọc theo trạng thái và phê duyệt các yêu cầu trở thành đối tác.
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
            <SelectTrigger className="h-10 min-w-[160px] rounded-full border-border/40 bg-background text-sm font-medium shadow-none">
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
    </div>
  );
};