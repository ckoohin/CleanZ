"use client"

import * as React from "react"
import { Activity, Clock, Eye, ListFilter, CheckCircle, AlertTriangle, XCircle, BarChart3, CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

export type ActivityData = {
  id: string
  actor: string
  role: "ADMIN" | "TASKER" | "CUSTOMER"
  action: string
  details: string
  status: "SUCCESS" | "WARNING" | "DANGER"
  timestamp: string
}

const mockData: ActivityData[] = Array.from({ length: 156 }).map((_, i) => ({
  id: `ACT-${String(i + 1).padStart(3, '0')}`,
  actor: ["Admin Root", "Nguyễn Văn A", "Lê Minh Tâm", "Hệ thống", "Trần Thị B"][i % 5],
  role: (["ADMIN", "TASKER", "CUSTOMER", "ADMIN", "TASKER"] as const)[i % 5],
  action: ["Cập nhật cấu hình", "Yêu cầu rút tiền", "Hủy đơn hàng", "Tự động gán Tasker", "Hoàn thành ca làm"][i % 5],
  details: `Chi tiết thao tác số ${i + 1} được ghi lại trong hệ thống`,
  status: (["SUCCESS", "WARNING", "DANGER", "SUCCESS", "SUCCESS"] as const)[i % 5],
  timestamp: new Date(Date.now() - (i * 3600000 * 2)).toISOString(), // Mỗi item cách nhau 2 tiếng
}));

export default function AdminActivityPage() {
  const [data] = React.useState<ActivityData[]>(mockData)
  
  const stats = React.useMemo(() => {
    return {
      total: data.length,
      success: data.filter(d => d.status === "SUCCESS").length,
      warning: data.filter(d => d.status === "WARNING").length,
      danger: data.filter(d => d.status === "DANGER").length,
    }
  }, [data]);

  const [filter, setFilter] = React.useState({
    status: "ALL",
    keyword: "",
    page: 1,
    limit: 10
  })

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()

  const filteredData = React.useMemo(() => {
    return data.filter(item => {
      const matchStatus = filter.status === "ALL" || item.status === filter.status;
      const matchKeyword = !filter.keyword || 
        item.action.toLowerCase().includes(filter.keyword.toLowerCase()) || 
        item.actor.toLowerCase().includes(filter.keyword.toLowerCase()) ||
        item.details.toLowerCase().includes(filter.keyword.toLowerCase());
        
      let matchDate = true;
      if (dateRange?.from) {
        const itemDate = new Date(item.timestamp);
        // Reset thời gian để so sánh chính xác theo ngày
        const start = new Date(dateRange.from);
        start.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const end = new Date(dateRange.to);
          end.setHours(23, 59, 59, 999);
          matchDate = itemDate >= start && itemDate <= end;
        } else {
          // Nếu chỉ chọn 1 ngày (chưa chọn ngày kết thúc)
          const end = new Date(dateRange.from);
          end.setHours(23, 59, 59, 999);
          matchDate = itemDate >= start && itemDate <= end;
        }
      }

      return matchStatus && matchKeyword && matchDate;
    });
  }, [data, filter.status, filter.keyword, dateRange]);

  const displayData = filteredData.slice((filter.page - 1) * filter.limit, filter.page * filter.limit);

  // Khi thay đổi ngày, reset về trang 1
  React.useEffect(() => {
    setFilter(prev => ({ ...prev, page: 1 }))
  }, [dateRange]);

  const columns: Column<ActivityData>[] = [
    {
      key: "actor",
      title: "Người thực hiện",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold">{row.actor}</span>
          <span className="text-[10px] uppercase font-bold text-muted-foreground">{row.role}</span>
        </div>
      ),
    },
    {
      key: "action",
      title: "Hành động",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-primary">{row.action}</span>
          <span className="text-xs text-muted-foreground line-clamp-1">{row.details}</span>
        </div>
      ),
    },
    {
      key: "timestamp",
      title: "Thời gian",
      render: (row) => {
        const date = new Date(row.timestamp)
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <div className="flex flex-col">
              <span className="font-medium text-xs">{date.toLocaleDateString("vi-VN")}</span>
              <span className="text-[10px]">{date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        )
      },
    },
    {
      key: "status",
      title: "Trạng thái",
      render: (row) => {
        return (
          <Badge className={cn(
            "px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border-none",
            row.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500" :
            row.status === "WARNING" ? "bg-amber-500/10 text-amber-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {row.status}
          </Badge>
        )
      },
    },
  ]

  const rowActions: RowAction<ActivityData>[] = [
    {
      label: "Xem chi tiết",
      icon: Eye,
      onClick: (row) => console.log("View activity details", row.id),
      variant: "default",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Nhật ký Hoạt động (Audit Log)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tổng quan và theo dõi chi tiết các thao tác của người dùng trên hệ thống.
          </p>
        </div>
      </div>

      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Tổng hoạt động</p>
            <h3 className="text-2xl font-black">{stats.total}</h3>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Thành công</p>
            <h3 className="text-2xl font-black">{stats.success}</h3>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Cảnh báo</p>
            <h3 className="text-2xl font-black">{stats.warning}</h3>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Lỗi / Thất bại</p>
            <h3 className="text-2xl font-black">{stats.danger}</h3>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <BaseTableList
        columns={columns}
        data={displayData}
        rowKey="id"
        keyword={filter.keyword}
        onKeywordChange={(keyword) => setFilter(prev => ({ ...prev, keyword, page: 1 }))}
        placeholderSearch="Tìm kiếm theo hành động hoặc người thực hiện..."
        rowActions={rowActions}
        totalItems={filteredData.length}
        page={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter(prev => ({ ...prev, page }))}
        onLimitChange={(limit) => setFilter(prev => ({ ...prev, limit, page: 1 }))}
        filters={
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Filter Ngày Tháng Tùy Chỉnh (DateRange Picker) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "h-11 min-w-[260px] w-full sm:w-auto rounded-xl border-border/60 bg-background text-sm font-medium focus:ring-primary/20 justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Lọc theo ngày</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
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

            {/* Nút xóa bộ lọc ngày */}
            {dateRange?.from && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-11 w-11 rounded-xl shrink-0"
                onClick={() => setDateRange(undefined)}
                title="Xóa bộ lọc ngày"
              >
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}

            {/* Filter Trạng Thái */}
            <Select 
              value={filter.status} 
              onValueChange={(val) => setFilter(prev => ({ ...prev, status: val, page: 1 }))}
            >
              <SelectTrigger className="h-11 min-w-[160px] w-full sm:w-auto rounded-xl border-border/60 bg-background text-sm font-medium focus:ring-primary/20">
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2"><ListFilter className="w-4 h-4 opacity-70" /> Tất cả trạng thái</div>
                </SelectItem>
                <SelectItem value="SUCCESS">
                  <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Thành công</div>
                </SelectItem>
                <SelectItem value="WARNING">
                  <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Cảnh báo</div>
                </SelectItem>
                <SelectItem value="DANGER">
                  <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Thất bại/Lỗi</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />
    </div>
  )
}
