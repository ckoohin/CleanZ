"use client";

import * as React from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle,
  Clock,
  Eye,
  ListFilter,
  UserCheck,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import {
  AdminButton,
  PageHeader,
  StatCard,
  StatusBadge,
  type BadgeTone,
} from "@/components/admin";
import { useAdminActivities } from "@/features/admin/modules/activity/hooks/useAdminActivities";
import type {
  AdminActivityItem,
  AdminActivityQuery,
  AdminActivityStatus,
} from "@/features/admin/modules/activity/types/activity.types";
import {
  getActivityChangeRows,
  getActivityDisplayAction,
  getActivitySummary,
  getActivityTargetLabel,
} from "@/features/admin/modules/activity/utils/activity-display";

const STATUS_TONE: Record<AdminActivityStatus, BadgeTone> = {
  SUCCESS: "success",
  WARNING: "warning",
  DANGER: "danger",
};

const STATUS_LABEL: Record<AdminActivityStatus, string> = {
  SUCCESS: "Thành công",
  WARNING: "Cảnh báo",
  DANGER: "Thất bại",
};

type ActivityFilter = {
  status: "ALL" | AdminActivityStatus;
  keyword: string;
  page: number;
  limit: number;
};

function toIsoBoundary(date: Date, endOfDay: boolean): string {
  const boundary = new Date(date);
  boundary.setHours(
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return boundary.toISOString();
}

export default function AdminActivityPage() {
  const [filter, setFilter] = React.useState<ActivityFilter>({
    status: "ALL",
    keyword: "",
    page: 1,
    limit: 10,
  });
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [selectedActivity, setSelectedActivity] =
    React.useState<AdminActivityItem | null>(null);
  const deferredKeyword = React.useDeferredValue(filter.keyword.trim());

  const query = React.useMemo<AdminActivityQuery>(
    () => ({
      page: filter.page,
      limit: filter.limit,
      status: filter.status === "ALL" ? undefined : filter.status,
      keyword: deferredKeyword || undefined,
      from: dateRange?.from ? toIsoBoundary(dateRange.from, false) : undefined,
      to: dateRange?.from
        ? toIsoBoundary(dateRange.to ?? dateRange.from, true)
        : undefined,
    }),
    [dateRange, deferredKeyword, filter.limit, filter.page, filter.status],
  );

  const { data: response, isLoading } = useAdminActivities(query);
  const data = response?.data ?? [];
  const selectedChanges = selectedActivity
    ? getActivityChangeRows(selectedActivity)
    : [];
  const stats = response?.stats ?? {
    total: 0,
    success: 0,
    warning: 0,
    danger: 0,
  };

  React.useEffect(() => {
    setFilter((previous) => ({ ...previous, page: 1 }));
  }, [dateRange]);

  const columns: Column<AdminActivityItem>[] = [
    {
      key: "actor",
      title: "Người thực hiện",
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-[var(--c-ink)]">
            {row.actor}
          </span>
          <span className="truncate text-[10px] font-bold tracking-wide text-[var(--c-muted)]">
            {row.actorEmail}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      title: "Hành động",
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold text-[var(--c-primary-strong)]">
            {getActivityDisplayAction(row)}
          </span>
          <span className="line-clamp-1 text-[12px] text-[var(--c-muted)]">
            {getActivitySummary(row)}
          </span>
        </div>
      ),
    },
    {
      key: "timestamp",
      title: "Thời gian",
      hideOnMobile: true,
      render: (row) => {
        const date = new Date(row.timestamp);
        return (
          <div className="flex items-center gap-1.5 text-[var(--c-muted)]">
            <Clock className="size-3.5" />
            <div className="flex flex-col tabular-nums">
              <span className="text-xs font-medium text-[var(--c-ink-soft)]">
                {date.toLocaleDateString("vi-VN")}
              </span>
              <span className="text-[10px]">
                {date.toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => (
        <StatusBadge tone={STATUS_TONE[row.status]} dot>
          {STATUS_LABEL[row.status]}
        </StatusBadge>
      ),
    },
  ];

  const rowActions: RowAction<AdminActivityItem>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: setSelectedActivity,
    },
  ];

  return (
    <div className="space-y-6 kos-rise">
      <PageHeader
        title="Nhật ký hoạt động"
        description="Theo dõi mọi thao tác thay đổi và điều chỉnh do admin thực hiện trên hệ thống."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BarChart3}
          label="Tổng hoạt động"
          value={stats.total.toLocaleString("vi-VN")}
          tint="#2563EB"
        />
        <StatCard
          icon={CheckCircle}
          label="Thành công"
          value={stats.success.toLocaleString("vi-VN")}
          tint="#0E9F6E"
        />
        <StatCard
          icon={AlertTriangle}
          label="Cảnh báo"
          value={stats.warning.toLocaleString("vi-VN")}
          tint="#D97706"
        />
        <StatCard
          icon={XCircle}
          label="Lỗi / Thất bại"
          value={stats.danger.toLocaleString("vi-VN")}
          tint="#E11D48"
        />
      </div>

      <BaseTableList
        columns={columns}
        data={data}
        rowKey="id"
        totalItems={response?.meta.total ?? 0}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter((current) => ({ ...current, page }))}
        onLimitChange={(limit) =>
          setFilter((current) => ({ ...current, limit, page: 1 }))
        }
        keyword={filter.keyword}
        onKeywordChange={(keyword) =>
          setFilter((current) => ({ ...current, keyword, page: 1 }))
        }
        placeholderSearch="Tìm theo hành động, admin hoặc nội dung thay đổi..."
        rowActions={rowActions}
        isLoading={isLoading}
        emptyTitle="Không có hoạt động"
        emptyDescription="Chưa có thao tác admin phù hợp với bộ lọc."
        emptyIcon={ListFilter}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <AdminButton
                  variant="secondary"
                  icon={<CalendarDays className="size-4" />}
                >
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                      : format(dateRange.from, "dd/MM/yyyy")
                    : "Lọc theo ngày"}
                </AdminButton>
              </PopoverTrigger>
              <PopoverContent className="cz-admin w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={vi}
                />
              </PopoverContent>
            </Popover>
            {dateRange?.from && (
              <AdminButton
                variant="ghost"
                onClick={() => setDateRange(undefined)}
                title="Xoá bộ lọc ngày"
              >
                <XCircle className="size-4" />
              </AdminButton>
            )}
            <Select
              value={filter.status}
              onValueChange={(status) =>
                setFilter((current) => ({
                  ...current,
                  status: status as ActivityFilter["status"],
                  page: 1,
                }))
              }
            >
              <SelectTrigger className="h-9 w-[170px] rounded-lg border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[13px] font-medium text-[var(--c-ink)]">
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">
                  <span className="flex items-center gap-2">
                    <ListFilter className="size-4 text-[var(--c-muted)]" /> Tất
                    cả trạng thái
                  </span>
                </SelectItem>
                <SelectItem value="SUCCESS">
                  <span className="flex items-center gap-2">
                    <UserCheck className="size-4 text-[#0E9F6E]" /> Thành công
                  </span>
                </SelectItem>
                <SelectItem value="WARNING">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-[#D97706]" /> Cảnh báo
                  </span>
                </SelectItem>
                <SelectItem value="DANGER">
                  <span className="flex items-center gap-2">
                    <XCircle className="size-4 text-[#E11D48]" /> Thất bại / Lỗi
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Dialog
        open={selectedActivity !== null}
        onOpenChange={(open) => !open && setSelectedActivity(null)}
      >
        <DialogContent className="cz-admin max-w-2xl rounded-2xl border-[var(--c-line)] bg-[var(--c-card)] text-[var(--c-ink)]">
          <DialogHeader>
            <DialogTitle>Chi tiết hoạt động</DialogTitle>
            <DialogDescription>
              Thông tin cụ thể về thao tác và nội dung admin đã thay đổi.
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[var(--c-muted)]">Admin</p>
                  <p className="font-semibold">{selectedActivity.actor}</p>
                  <p className="text-xs text-[var(--c-muted)]">
                    {selectedActivity.actorEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--c-muted)]">Thời gian</p>
                  <p className="font-medium">
                    {new Date(selectedActivity.timestamp).toLocaleString(
                      "vi-VN",
                    )}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-[var(--c-muted)]">Thao tác</p>
                  <p className="font-semibold text-[var(--c-primary-strong)]">
                    {getActivityDisplayAction(selectedActivity)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--c-muted)]">Đối tượng</p>
                  <p className="font-medium">
                    {getActivityTargetLabel(selectedActivity)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--c-muted)]">Kết quả</p>
                  <div className="mt-1">
                    <StatusBadge
                      tone={STATUS_TONE[selectedActivity.status]}
                      dot
                    >
                      {STATUS_LABEL[selectedActivity.status]}
                    </StatusBadge>
                  </div>
                </div>
                {selectedActivity.errorMessage && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-[var(--c-muted)]">Lỗi</p>
                    <p className="font-medium text-red-600">
                      {selectedActivity.errorMessage}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 font-semibold">Nội dung thay đổi</p>
                {selectedChanges.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)]">
                    <div className="hidden grid-cols-[160px_1fr_1fr] gap-4 border-b border-[var(--c-line)] bg-[var(--c-card)] px-4 py-2 text-xs font-semibold text-[var(--c-muted)] sm:grid">
                      <p>Thông tin</p>
                      <p>Dữ liệu cũ</p>
                      <p>
                        {selectedActivity.status === "SUCCESS"
                          ? "Dữ liệu mới"
                          : "Dữ liệu yêu cầu"}
                      </p>
                    </div>
                    <div className="divide-y divide-[var(--c-line)]">
                      {selectedChanges.map((change, index) => (
                        <div
                          key={`${change.label}-${index}`}
                          className="grid gap-3 px-4 py-3 sm:grid-cols-[160px_1fr_1fr] sm:gap-4"
                        >
                          <p className="text-xs font-semibold text-[var(--c-ink-soft)]">
                            {change.label}
                          </p>
                          <div>
                            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--c-muted)] sm:hidden">
                              Dữ liệu cũ
                            </p>
                            <p className="break-words font-medium text-[var(--c-ink-soft)]">
                              {change.before}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--c-muted)] sm:hidden">
                              {selectedActivity.status === "SUCCESS"
                                ? "Dữ liệu mới"
                                : "Dữ liệu yêu cầu"}
                            </p>
                            <p className="break-words font-semibold text-[var(--c-primary-strong)]">
                              {change.after}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card-2)] px-4 py-3 text-[var(--c-muted)]">
                    Hoạt động này không làm thay đổi dữ liệu nghiệp vụ hoặc log
                    cũ chưa có dữ liệu để so sánh.
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
