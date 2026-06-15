"use client"

import * as React from "react"
import { Search, CheckCircle, XCircle } from "lucide-react"

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type IncidentData = {
  id: string
  bookingCode: string
  customerName: string
  issueType: string
  status: "REPORTED" | "INVESTIGATING" | "APPROVED" | "REJECTED" | "COMPENSATED" | "CLOSED"
  reportedAt: string
}

const mockData: IncidentData[] = [
  {
    id: "INC-1001",
    bookingCode: "BK-12045",
    customerName: "Lê Minh Tâm",
    issueType: "Làm hỏng đồ đạc",
    status: "REPORTED",
    reportedAt: "2024-03-25T10:00:00Z",
  },
  {
    id: "INC-1002",
    bookingCode: "BK-12030",
    customerName: "Trần Thị C",
    issueType: "Nhân viên đến trễ",
    status: "INVESTIGATING",
    reportedAt: "2024-03-24T15:30:00Z",
  },
  {
    id: "INC-1003",
    bookingCode: "BK-12010",
    customerName: "Nguyễn Hoàng",
    issueType: "Thái độ không tốt",
    status: "CLOSED",
    reportedAt: "2024-03-20T09:15:00Z",
  },
]

export default function AdminIncidentsPage() {
  const [data] = React.useState<IncidentData[]>(mockData)
  const [keyword, setKeyword] = React.useState("")

  const filteredData = React.useMemo(() => {
    if (!keyword) return data;
    return data.filter(item => item.bookingCode.toLowerCase().includes(keyword.toLowerCase()));
  }, [data, keyword]);

  const columns: Column<IncidentData>[] = [
    {
      key: "id",
      title: "Mã Sự cố",
      render: (row) => (
        <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
          {row.id}
        </span>
      ),
    },
    {
      key: "bookingCode",
      title: "Mã Đơn (Booking)",
      render: (row) => (
        <span className="font-mono text-xs">{row.bookingCode}</span>
      ),
    },
    {
      key: "customerName",
      title: "Khách hàng",
      render: (row) => (
        <span className="font-bold">{row.customerName}</span>
      ),
    },
    {
      key: "issueType",
      title: "Phân loại",
      render: (row) => (
        <span className="text-sm">{row.issueType}</span>
      ),
    },
    {
      key: "reportedAt",
      title: "Ngày báo cáo",
      render: (row) => {
        const date = new Date(row.reportedAt)
        return (
          <div className="flex flex-col">
            <span className="font-medium">{date.toLocaleDateString("vi-VN")}</span>
            <span className="text-xs text-muted-foreground">{date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
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
            (row.status === "CLOSED" || row.status === "COMPENSATED" || row.status === "APPROVED") ? "bg-emerald-500/10 text-emerald-500" :
            row.status === "INVESTIGATING" ? "bg-blue-500/10 text-blue-500" :
            row.status === "REPORTED" ? "bg-amber-500/10 text-amber-500" :
            "bg-red-500/10 text-red-500"
          )}>
            {row.status}
          </Badge>
        )
      },
    },
  ]

  const rowActions: RowAction<IncidentData>[] = [
    {
      label: "Bắt đầu điều tra",
      icon: Search,
      onClick: (row) => console.log("Investigate", row.id),
      variant: "default",
    },
    {
      label: "Phê duyệt bồi thường",
      icon: CheckCircle,
      onClick: (row) => console.log("Approve", row.id),
      hidden: (row) => row.status === "CLOSED",
      variant: "default",
    },
    {
      label: "Bác bỏ khiếu nại",
      icon: XCircle,
      onClick: (row) => console.log("Reject", row.id),
      hidden: (row) => row.status === "CLOSED",
      variant: "destructive",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Sự cố (Incidents)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Theo dõi khiếu nại và xử lý bồi thường cho khách hàng.
          </p>
        </div>
      </div>

      <BaseTableList
        columns={columns}
        data={filteredData}
        rowKey="id"
        keyword={keyword}
        onKeywordChange={setKeyword}
        placeholderSearch="Tìm kiếm theo mã đơn..."
        rowActions={rowActions}
        totalItems={filteredData.length}
      />
    </div>
  )
}
