"use client";

import * as React from "react";
import {
  Clock,
  Eye,
  ListFilter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  CalendarDays,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  BaseTableList,
  type Column,
  type RowAction,
} from "@/components/ui/base/base_table_list";
import {
  PageHeader,
  StatCard,
  StatusBadge,
  AdminButton,
  type BadgeTone,
} from "@/components/admin";

export type ActivityData = {
  id: string;
  actor: string;
  role: "ADMIN" | "TASKER" | "CUSTOMER";
  action: string;
  details: string;
  status: "SUCCESS" | "WARNING" | "DANGER";
  timestamp: string;
};

const mockData: ActivityData[] = Array.from({ length: 156 }).map((_, i) => ({
  id: `ACT-${String(i + 1).padStart(3, "0")}`,
  actor: ["Admin Root", "Nguyễn Văn A", "Lê Minh Tâm", "Hệ thống", "Trần Thị B"][i % 5],
  role: (["ADMIN", "TASKER", "CUSTOMER", "ADMIN", "TASKER"] as const)[i % 5],
  action: ["Cập nhật cấu hình", "Yêu cầu rút tiền", "Hủy đơn hàng", "Tự động gán Tasker", "Hoàn thành ca làm"][i % 5],
  details: `Chi tiết thao tác số ${i + 1} được ghi lại trong hệ thống`,
  status: (["SUCCESS", "WARNING", "DANGER", "SUCCESS", "SUCCESS"] as const)[i % 5],
  timestamp: new Date(Date.now() - i * 3600000 * 2).toISOString(),
}));

const STATUS_TONE: Record<ActivityData["status"], BadgeTone> = {
  SUCCESS: "success",
  WARNING: "warning",
  DANGER: "danger",
};

export default function AdminActivityPage() {
  const [data] = React.useState<ActivityData[]>(mockData);

  const stats = React.useMemo(
    () => ({
      total: data.length,
      success: data.filter((d) => d.status === "SUCCESS").length,
      warning: data.filter((d) => d.status === "WARNING").length,
      danger: data.filter((d) => d.status === "DANGER").length,
    }),
    [data]
  );

  const [filter, setFilter] = React.useState({ status: "ALL", keyword: "", page: 1, limit: 10 });
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  const filteredData = React.useMemo(() => {
    return data.filter((item) => {
      const matchStatus = filter.status === "ALL" || item.status === filter.status;
      const matchKeyword =
        !filter.keyword ||
        item.action.toLowerCase().includes(filter.keyword.toLowerCase()) ||
        item.actor.toLowerCase().includes(filter.keyword.toLowerCase()) ||
        item.details.toLowerCase().includes(filter.keyword.toLowerCase());

      let matchDate = true;
      if (dateRange?.from) {
        const itemDate = new Date(item.timestamp);
        const start = new Date(dateRange.from);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.to ?? dateRange.from);
        end.setHours(23, 59, 59, 999);
        matchDate = itemDate >= start && itemDate <= end;
      }
      return matchStatus && matchKeyword && matchDate;
    });
  }, [data, filter.status, filter.keyword, dateRange]);

  const displayData = filteredData.slice((filter.page - 1) * filter.limit, filter.page * filter.limit);

  React.useEffect(() => {
    setFilter((prev) => ({ ...prev, page: 1 }));
  }, [dateRange]);

  const columns: Column<ActivityData>[] = [
    {
      key: "actor",
      title: "Người thực hiện",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--c-ink)]">{row.actor}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--c-muted)]">{row.role}</span>
        </div>
      ),
    },
    {
      key: "action",
      title: "Hành động",
      render: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold text-[var(--c-primary-strong)]">{row.action}</span>
          <span className="line-clamp-1 text-[12px] text-[var(--c-muted)]">{row.details}</span>
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
              <span className="text-xs font-medium text-[var(--c-ink-soft)]">{date.toLocaleDateString("vi-VN")}</span>
              <span className="text-[10px]">{date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => <StatusBadge tone={STATUS_TONE[row.status]} dot>{row.status}</StatusBadge>,
    },
  ];

  const rowActions: RowAction<ActivityData>[] = [
    {
      type: "view",
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => console.log("View", row.id),
    },
  ];

  return (
    <div className="space-y-6 kos-rise">
      <PageHeader
        title="Nhật ký hoạt động"
        description="Theo dõi chi tiết các thao tác của người dùng trên hệ thống (Audit Log)."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BarChart3} label="Tổng hoạt động" value={stats.total.toLocaleString("vi-VN")} tint="#2563EB" />
        <StatCard icon={CheckCircle} label="Thành công" value={stats.success.toLocaleString("vi-VN")} tint="#0E9F6E" />
        <StatCard icon={AlertTriangle} label="Cảnh báo" value={stats.warning.toLocaleString("vi-VN")} tint="#D97706" />
        <StatCard icon={XCircle} label="Lỗi / Thất bại" value={stats.danger.toLocaleString("vi-VN")} tint="#E11D48" />
      </div>

      <BaseTableList
        columns={columns}
        data={displayData}
        rowKey="id"
        totalItems={filteredData.length}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter((p) => ({ ...p, page }))}
        onLimitChange={(limit) => setFilter((p) => ({ ...p, limit, page: 1 }))}
        keyword={filter.keyword}
        onKeywordChange={(keyword) => setFilter((p) => ({ ...p, keyword, page: 1 }))}
        placeholderSearch="Tìm theo hành động hoặc người thực hiện..."
        rowActions={rowActions}
        inlineActionCount={1}
        emptyTitle="Không có hoạt động"
        emptyDescription="Thử đổi từ khoá hoặc bộ lọc."
        emptyIcon={ListFilter}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <AdminButton variant="secondary" icon={<CalendarDays className="size-4" />}>
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
              <AdminButton variant="ghost" onClick={() => setDateRange(undefined)} title="Xoá bộ lọc ngày">
                <XCircle className="size-4" />
              </AdminButton>
            )}
            <Select
              value={filter.status}
              onValueChange={(val) => setFilter((p) => ({ ...p, status: val, page: 1 }))}
            >
              <SelectTrigger className="h-9 w-[170px] rounded-lg border-[var(--c-line-strong)] bg-[var(--c-card-2)] text-[13px] font-medium text-[var(--c-ink)]">
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent className="cz-admin rounded-xl">
                <SelectItem value="ALL">
                  <span className="flex items-center gap-2"><ListFilter className="size-4 text-[var(--c-muted)]" /> Tất cả trạng thái</span>
                </SelectItem>
                <SelectItem value="SUCCESS">
                  <span className="flex items-center gap-2"><UserCheck className="size-4 text-[#0E9F6E]" /> Thành công</span>
                </SelectItem>
                <SelectItem value="WARNING">
                  <span className="flex items-center gap-2"><AlertTriangle className="size-4 text-[#D97706]" /> Cảnh báo</span>
                </SelectItem>
                <SelectItem value="DANGER">
                  <span className="flex items-center gap-2"><XCircle className="size-4 text-[#E11D48]" /> Thất bại / Lỗi</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  );
}
