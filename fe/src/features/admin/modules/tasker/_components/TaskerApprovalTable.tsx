"use client";

import React, { useState } from "react";
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
import { PageHeader, StatusBadge, type BadgeTone } from "@/components/admin";
import { useAdminTasker, adminTaskerKeys } from "../hooks/admin-tasker.hooks";
import { adminTaskerApi } from "../services/admin-tasker.service";
import { TaskerStatus } from "@/features/tasker/types/tasker.type";
import type { AdminTasker, AdminTaskerFilter } from "../types/admin-tasker.types";
import { formatDateVN } from "../constants";
import { Eye, CheckCircle, Info, XCircle, Clock, ListFilter } from "lucide-react";
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

  const router = useRouter();
  const queryClient = useQueryClient();

  // Cờ loading riêng cho thao tác duyệt hàng loạt.
  const [isBulkApproving, setIsBulkApproving] = useState(false);
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
          <div className="w-9 h-9 rounded-xl bg-[var(--c-primary-soft)] text-[var(--c-primary-strong)] flex items-center justify-center font-bold text-xs shrink-0">
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
            <p className="font-bold text-sm text-[var(--c-ink)]">
              {row.fullName || "Chưa cập nhật"}
            </p>
            <p className="text-xs text-[var(--c-muted)]">{row.phone || "N/A"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "workingAddress",
      title: "Khu vực",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-[var(--c-ink-soft)] max-w-[200px] truncate block">
          {row.workingAddress || "Chưa cập nhật"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Ngày đăng ký",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs font-semibold text-[var(--c-muted)]">
          {row.createdAt ? formatDateVN(row.createdAt) : "N/A"}
        </span>
      ),
    },
    {
      key: "approvalStatus",
      title: "Trạng thái",
      render: (row) => {
        const toneMap: Record<string, BadgeTone> = {
          [TaskerStatus.APPROVED]: "success",
          [TaskerStatus.PENDING]: "warning",
          [TaskerStatus.NEED_INFO]: "info",
          [TaskerStatus.REJECTED]: "danger",
        };
        const iconMap: Record<string, React.ReactNode> = {
          [TaskerStatus.APPROVED]: <CheckCircle className="w-3 h-3" />,
          [TaskerStatus.PENDING]: <Clock className="w-3 h-3" />,
          [TaskerStatus.NEED_INFO]: <Info className="w-3 h-3" />,
          [TaskerStatus.REJECTED]: <XCircle className="w-3 h-3" />,
        };
        const labelMap: Record<string, string> = {
          [TaskerStatus.APPROVED]: "Đã duyệt",
          [TaskerStatus.PENDING]: "Chờ duyệt",
          [TaskerStatus.NEED_INFO]: "Cần bổ sung",
          [TaskerStatus.REJECTED]: "Từ chối",
        };
        return (
          <StatusBadge tone={toneMap[row.approvalStatus] || "warning"}>
            {iconMap[row.approvalStatus] || <Clock className="w-3 h-3" />}
            {labelMap[row.approvalStatus] || "Chưa rõ"}
          </StatusBadge>
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

  // Duyệt hàng loạt: gọi API trực tiếp trong Promise.allSettled để chỉ hiển thị
  // MỘT toast tổng kết (không spam mỗi dòng) và chỉ làm mới danh sách sau khi
  // tất cả request hoàn tất. (Tham khảo CustomerListTable.handleConfirmBulkDelete.)
  const handleBulkApprove = async (rows: AdminTasker[]) => {
    const pendingRows = rows.filter(canReview);
    if (pendingRows.length === 0) {
      toast.info("Không có hồ sơ nào hợp lệ để duyệt trong danh sách chọn.");
      return;
    }
    setIsBulkApproving(true);
    try {
      const results = await Promise.allSettled(
        pendingRows.map((row) => adminTaskerApi.approveTasker(row.id))
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - ok;
      queryClient.invalidateQueries({ queryKey: adminTaskerKeys.all });
      toast.success(`Đã duyệt ${ok}/${pendingRows.length} hồ sơ`);
      if (failed > 0) {
        toast.error(`${failed} hồ sơ duyệt không thành công.`);
      }
    } finally {
      setIsBulkApproving(false);
    }
  };

  const bulkActions: BulkAction<AdminTasker>[] = [
    {
      label: "Duyệt tất cả đã chọn",
      icon: CheckCircle,
      onClick: handleBulkApprove,
      variant: "default",
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title="Xác minh hồ sơ nhân viên"
        description="Kiểm tra, lọc theo trạng thái và phê duyệt các yêu cầu trở thành đối tác."
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
        placeholderSearch="Tìm tên, số điện thoại..."
        isLoading={isLoading || isBulkApproving}
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
            <SelectTrigger className="h-10 min-w-[185px] rounded-full border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[var(--c-ink)] text-sm font-medium shadow-none">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent className="cz-admin rounded-xl border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
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